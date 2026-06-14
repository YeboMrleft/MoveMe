import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing, radius, shadows } from '../../constants/spacing';
import { listenToUserJobs, listenToDriverJobHistory } from '../../services/jobService';
import { Job } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { JOB_CATEGORIES } from '../../constants/categories';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Divider from '../../components/Divider';

type Filter = 'all' | 'completed' | 'cancelled';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(ts).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HistoryScreen() {
  const nav = useNavigation<any>();
  const { appUser } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const uid = getAuth().currentUser?.uid ?? '';
  const isDriver = appUser?.role === 'driver';

  useEffect(() => {
    if (!uid) return;
    if (isDriver) {
      return listenToDriverJobHistory(uid, data => {
        setJobs(data);
        setLoading(false);
      });
    } else {
      return listenToUserJobs(uid, data => {
        setJobs(data.filter(j => ['completed', 'cancelled'].includes(j.status)));
        setLoading(false);
      });
    }
  }, [uid, isDriver]);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);
  const totalTrips = jobs.filter(j => j.status === 'completed').length;
  const totalAmount = jobs
    .filter(j => j.status === 'completed' && j.agreedPrice)
    .reduce((sum, j) => sum + (j.agreedPrice ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip History</Text>
        <Text style={styles.headerSub}>Your past trips</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading trip history...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              {/* Stats */}
              <View style={styles.statsGrid}>
                <Card variant="outlined" padding={4} style={styles.statBox}>
                  <Text style={styles.statValue}>{totalTrips}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </Card>
                <Card variant="outlined" padding={4} style={styles.statBox}>
                  <Text style={styles.statValue}>R{totalAmount.toLocaleString('en-ZA')}</Text>
                  <Text style={styles.statLabel}>{isDriver ? 'Earned' : 'Spent'}</Text>
                </Card>
                <Card variant="outlined" padding={4} style={styles.statBox}>
                  <Text style={styles.statValue}>{jobs.filter(j => j.status === 'cancelled').length}</Text>
                  <Text style={styles.statLabel}>Cancelled</Text>
                </Card>
              </View>

              {/* Filters */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filters}
              >
                {FILTERS.map(f => (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                    onPress={() => setFilter(f.key)}
                  >
                    <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={56} color={colors.border} />
              <Text style={styles.emptyTitle}>No Trips Yet</Text>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'Your completed trips will appear here.'
                  : `No ${filter} trips to display.`}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const cat = item.category
              ? JOB_CATEGORIES.find(c => c.key === item.category)
              : null;
            const isCompleted = item.status === 'completed';

            return (
              <Card
                variant="outlined"
                padding={4}
                onPress={() => nav.navigate('TripActive', { jobId: item.id })}
                style={styles.tripCard}
              >
                <View style={styles.tripCardContent}>
                  {/* Status indicator */}
                  <View
                    style={[
                      styles.tripStatus,
                      { backgroundColor: isCompleted ? colors.success : colors.error },
                    ]}
                  />

                  {/* Route */}
                  <View style={styles.tripRoute}>
                    <View style={styles.routePoint}>
                      <Ionicons name="radio-button-on" size={14} color={colors.primary} />
                      <Text style={styles.routeAddress} numberOfLines={1}>{item.pickup.address}</Text>
                    </View>
                    <View style={styles.routeConnector} />
                    <View style={styles.routePoint}>
                      <Ionicons name="location" size={14} color={colors.error} />
                      <Text style={styles.routeAddress} numberOfLines={1}>{item.dropoff.address}</Text>
                    </View>
                  </View>

                  <Divider variant="inset" margin={2} />

                  {/* Meta */}
                  <View style={styles.tripMeta}>
                    {cat && (
                      <Badge label={cat.label} variant="info" size="sm" />
                    )}
                    <Text style={styles.tripDate}>{timeAgo(item.createdAt)}</Text>
                    {isCompleted && item.agreedPrice && (
                      <Text style={styles.tripPrice}>R{item.agreedPrice}</Text>
                    )}
                    {item.status === 'cancelled' && (
                      <Badge label="Cancelled" variant="error" size="sm" />
                    )}
                  </View>

                  {/* Other party */}
                  {(isDriver ? item.posterName : item.acceptedDriverName) && (
                    <Text style={styles.tripPerson}>
                      <Ionicons
                        name={isDriver ? 'person' : 'car'}
                        size={11}
                        color={colors.textMuted}
                      />
                      {' '}
                      {isDriver ? item.posterName : item.acceptedDriverName}
                    </Text>
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    shadowColor: colors.shadowSm,
    shadowOpacity: 1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing[1],
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // List
  list: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[8] },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[1],
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Filters
  filters: { gap: spacing[2], paddingBottom: spacing[4], paddingHorizontal: spacing[4] },
  filterChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  // Trip Card
  tripCard: {
    marginHorizontal: 0,
  },
  tripCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  tripStatus: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    alignSelf: 'stretch',
  },

  // Route
  tripRoute: {
    flex: 1,
    gap: spacing[1],
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  routeAddress: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  routeConnector: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
    marginLeft: spacing[2],
  },

  // Trip Meta
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  tripDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tripPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: 'auto',
  },
  tripPerson: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    gap: spacing[4],
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
