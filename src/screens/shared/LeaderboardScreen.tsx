import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { colors } from '../../constants/colors';
import { getLeaderboard } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';
import Avatar from '../../components/Avatar';
import StarRating from '../../components/StarRating';
import TierBadge from '../../components/TierBadge';
import CityPickerModal from '../../components/CityPickerModal';
import { getDriverTier } from '../../utils/driverTier';

const RANK_COLORS = ['#F59E0B', '#9CA3AF', '#B45309'];
const RANK_ICONS = ['trophy', 'medal', 'ribbon'];

export default function LeaderboardScreen() {
  const nav = useNavigation<any>();
  const { appUser } = useAuth();
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState(appUser?.serviceCity ?? '');
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const uid = getAuth().currentUser?.uid ?? '';

  const load = async (c: string) => {
    if (!c) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await getLeaderboard(c);
      setDrivers(data);
    } catch (e: any) {
      setError(e.message ?? 'Could not load leaderboard.');
      console.error('Leaderboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(city); }, [city]);

  const myRank = drivers.findIndex(d => d.id === uid);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <TouchableOpacity style={styles.cityPill} onPress={() => setCityPickerOpen(true)}>
            <Ionicons name="location-outline" size={12} color={colors.primary} />
            <Text style={styles.cityPillText}>{city || 'Select city'}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {myRank >= 0 && (
        <View style={styles.myRankBanner}>
          <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.myRankText}>
            You are ranked <Text style={styles.myRankNum}>#{myRank + 1}</Text> in {city}
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      ) : error ? (
        <View style={styles.empty}>
          <Ionicons name="warning-outline" size={48} color={colors.danger} />
          <Text style={styles.emptyTitle}>Could not load leaderboard</Text>
          <Text style={[styles.emptyText, { color: colors.danger }]}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => load(city)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="trophy-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>{city ? 'No verified drivers yet' : 'Select a city'}</Text>
              <Text style={styles.emptyText}>
                {city
                  ? 'Complete trips to appear on the leaderboard.'
                  : 'Choose a city to see the top drivers.'}
              </Text>
            </View>
          }
          ListHeaderComponent={
            drivers.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>Top {drivers.length} verified drivers · {city}</Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const isMe = item.id === uid;
            const tier = getDriverTier(item.totalTrips ?? 0, item.rating);
            const isTop3 = index < 3;
            return (
              <View style={[styles.row, isMe && styles.rowMe]}>
                {/* Rank */}
                <View style={styles.rankWrap}>
                  {isTop3 ? (
                    <Ionicons
                      name={RANK_ICONS[index] as any}
                      size={22}
                      color={RANK_COLORS[index]}
                    />
                  ) : (
                    <Text style={styles.rankNum}>#{index + 1}</Text>
                  )}
                </View>

                {/* Avatar */}
                <Avatar name={item.name} uri={item.profilePhoto} size={44} />

                {/* Info */}
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
                      {item.name}{isMe ? ' (you)' : ''}
                    </Text>
                    <TierBadge tier={tier} />
                  </View>
                  <View style={styles.metaRow}>
                    <StarRating value={Math.round(item.rating)} size={12} />
                    <Text style={styles.metaText}>
                      {item.rating > 0 ? item.rating.toFixed(1) : '—'} · {item.totalTrips ?? 0} trips
                    </Text>
                  </View>
                </View>

                {/* Earnings */}
                {item.totalEarned ? (
                  <Text style={styles.earned}>R{item.totalEarned.toLocaleString('en-ZA')}</Text>
                ) : null}
              </View>
            );
          }}
        />
      )}

      <CityPickerModal
        visible={cityPickerOpen}
        selected={city}
        onSelect={c => { setCity(c); }}
        onClose={() => setCityPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerCenter: { alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  cityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primary + '12', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  cityPillText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  myRankBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary + '10', paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.primary + '20',
  },
  myRankText: { fontSize: 13, color: colors.text },
  myRankNum: { fontWeight: '900', color: colors.primary },
  list: { padding: 16, gap: 10 },
  listHeader: { marginBottom: 4 },
  listHeaderText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  rowMe: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primary + '06' },
  rankWrap: { width: 28, alignItems: 'center' },
  rankNum: { fontSize: 14, fontWeight: '800', color: colors.textMuted },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  nameMe: { color: colors.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: colors.textMuted },
  earned: { fontSize: 14, fontWeight: '800', color: colors.primary },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  retryText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
