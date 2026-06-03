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
import { listenToUserJobs, listenToDriverJobHistory } from '../../services/jobService';
import { Job } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { JOB_CATEGORIES } from '../../constants/categories';

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
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip History</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statVal}>{totalTrips}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={[styles.statCard, styles.statDivider]}>
                  <Text style={styles.statVal}>
                    {isDriver ? `R${totalAmount.toLocaleString('en-ZA')}` : `R${totalAmount.toLocaleString('en-ZA')}`}
                  </Text>
                  <Text style={styles.statLabel}>{isDriver ? 'Earned' : 'Spent'}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statVal}>{jobs.filter(j => j.status === 'cancelled').length}</Text>
                  <Text style={styles.statLabel}>Cancelled</Text>
                </View>
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
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'Your trip history will appear here.'
                  : `No ${filter} trips to show.`}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const cat = item.category
              ? JOB_CATEGORIES.find(c => c.key === item.category)
              : null;
            const isCompleted = item.status === 'completed';
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => nav.navigate('TripActive', { jobId: item.id })}
                activeOpacity={0.8}
              >
                {/* Status bar */}
                <View style={[
                  styles.statusBar,
                  { backgroundColor: isCompleted ? colors.primary : colors.textMuted },
                ]} />

                <View style={styles.cardContent}>
                  {/* Route */}
                  <View style={styles.routeRow}>
                    <Ionicons name="radio-button-on" size={12} color={colors.primary} />
                    <Text style={styles.addr} numberOfLines={1}>{item.pickup.address}</Text>
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.routeRow}>
                    <Ionicons name="location" size={12} color={colors.danger} />
                    <Text style={styles.addr} numberOfLines={1}>{item.dropoff.address}</Text>
                  </View>

                  {/* Meta row */}
                  <View style={styles.metaRow}>
                    {cat && (
                      <View style={[styles.catPill, { backgroundColor: cat.color + '18' }]}>
                        <Ionicons name={cat.icon as any} size={10} color={cat.color} />
                        <Text style={[styles.catText, { color: cat.color }]}>{cat.label}</Text>
                      </View>
                    )}
                    <Text style={styles.dateText}>{timeAgo(item.createdAt)}</Text>
                    {isCompleted && item.agreedPrice ? (
                      <Text style={styles.priceText}>R{item.agreedPrice}</Text>
                    ) : (
                      <Text style={styles.cancelledText}>Cancelled</Text>
                    )}
                  </View>

                  {/* Driver / customer name */}
                  {isDriver ? (
                    item.posterName ? (
                      <Text style={styles.nameText}>
                        <Ionicons name="person-outline" size={11} color={colors.textMuted} /> {item.posterName}
                      </Text>
                    ) : null
                  ) : (
                    item.acceptedDriverName ? (
                      <Text style={styles.nameText}>
                        <Ionicons name="car-outline" size={11} color={colors.textMuted} /> {item.acceptedDriverName}
                      </Text>
                    ) : null
                  )}
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.border} style={styles.chevron} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  list: { padding: 16, gap: 12 },

  statsRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden', marginBottom: 16,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  statVal: { fontSize: 20, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 },

  filters: { gap: 8, paddingBottom: 16 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterTextActive: { color: colors.white },

  card: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  statusBar: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeLine: { width: 1, height: 12, backgroundColor: colors.border, marginLeft: 5 },
  addr: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  catText: { fontSize: 10, fontWeight: '700' },
  dateText: { fontSize: 11, color: colors.textMuted },
  priceText: { marginLeft: 'auto', fontSize: 15, fontWeight: '900', color: colors.primary },
  cancelledText: { marginLeft: 'auto', fontSize: 12, fontWeight: '700', color: colors.textMuted },
  nameText: { fontSize: 12, color: colors.textMuted },
  chevron: { alignSelf: 'center', paddingRight: 12 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
