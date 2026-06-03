import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { listenToOpenJobsNear, listenToDriverActiveJob } from '../../services/jobService';
import { listenToNotifications } from '../../services/notificationService';
import { JOB_CATEGORIES } from '../../constants/categories';
import { setDriverOnline } from '../../services/userService';
import { listenToWallet } from '../../services/walletService';
import { Job } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { formatScheduledTime } from '../../utils/formatSchedule';
import { DriverStackParams } from '../../navigation/DriverNavigator';

type Nav = StackNavigationProp<DriverStackParams, 'DriverTabs'>;

function distanceLabel(job: Job, driverLat?: number, driverLng?: number): string {
  if (!driverLat || !driverLng) return '';
  const R = 6371;
  const dLat = ((job.pickup.coords.latitude - driverLat) * Math.PI) / 180;
  const dLon = ((job.pickup.coords.longitude - driverLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((driverLat * Math.PI) / 180) *
      Math.cos((job.pickup.coords.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return dist < 1 ? `${Math.round(dist * 1000)}m away` : `${dist.toFixed(1)}km away`;
}

export default function DriverHomeScreen() {
  const nav = useNavigation<Nav>();
  const { appUser } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(appUser?.isOnline ?? false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const uid = getAuth().currentUser?.uid ?? '';

  useEffect(() => {
    if (!uid) return;
    return listenToWallet(uid, w => setWalletBalance(w?.balance ?? 0));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    return listenToNotifications(uid, items => {
      setUnreadCount(items.filter(i => !i.read).length);
    });
  }, [uid]);

  useEffect(() => {
    const city = appUser?.serviceCity;
    if (!city) { setLoading(false); return; }
    const unsub = listenToOpenJobsNear(city, data => {
      setJobs(data);
      setLoading(false);
    });
    return unsub;
  }, [appUser?.serviceCity]);

  useEffect(() => {
    if (!uid) return;
    return listenToDriverActiveJob(uid, setActiveJob);
  }, [uid]);

  const toggleOnline = async (val: boolean) => {
    setOnline(val);
    await setDriverOnline(uid, val);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.logo}>Move-Me</Text>
        <View style={styles.onlineRow}>
          <TouchableOpacity style={styles.mapBtn} onPress={() => nav.navigate('DemandMap')}>
            <Ionicons name="map-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => nav.navigate('Notifications')} style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.onlineLabel, { color: online ? colors.primary : colors.textMuted }]}>
            {online ? 'Online' : 'Offline'}
          </Text>
          <Switch
            value={online}
            onValueChange={toggleOnline}
            trackColor={{ false: colors.border, true: colors.primary + '60' }}
            thumbColor={online ? colors.primary : colors.textMuted}
          />
        </View>
      </View>

      {/* Low wallet balance warning */}
      {walletBalance !== null && walletBalance < 50 && (
        <TouchableOpacity
          style={[
            styles.walletBanner,
            walletBalance <= 0 && styles.walletBannerCritical,
          ]}
          onPress={() => nav.navigate('Wallet' as any)}
          activeOpacity={0.85}
        >
          <Ionicons
            name="wallet-outline"
            size={18}
            color={walletBalance <= 0 ? '#fff' : '#92400E'}
          />
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.walletBannerTitle,
              walletBalance <= 0 && { color: '#fff' },
            ]}>
              {walletBalance <= 0
                ? 'No wallet balance — offers may be restricted'
                : `Low wallet balance — R${walletBalance.toFixed(2)}`}
            </Text>
            <Text style={[
              styles.walletBannerSub,
              walletBalance <= 0 && { color: 'rgba(255,255,255,0.8)' },
            ]}>
              {walletBalance <= 0
                ? 'Top up now to keep submitting offers and pay cash job commissions'
                : 'Top up to ensure you can pay commission on cash jobs'}
            </Text>
          </View>
          <Text style={[
            styles.walletBannerBtn,
            walletBalance <= 0 && { color: '#fff', borderColor: 'rgba(255,255,255,0.5)' },
          ]}>
            Top Up
          </Text>
        </TouchableOpacity>
      )}

      {activeJob && (
        <TouchableOpacity
          style={styles.activeBanner}
          onPress={() => nav.navigate('TripActive', { jobId: activeJob.id })}
          activeOpacity={0.85}
        >
          <View style={styles.activeBannerLeft}>
            <View style={styles.activePulse} />
            <View>
              <Text style={styles.activeBannerTitle}>
                {activeJob.status === 'accepted' ? 'Job accepted — head to pickup'
                  : activeJob.status === 'arrived' ? 'At pickup — waiting for payment'
                  : 'Trip in progress'}
              </Text>
              <Text style={styles.activeBannerSub} numberOfLines={1}>
                {activeJob.pickup.address} → {activeJob.dropoff.address}
              </Text>
              {activeJob.agreedPrice && (
                <Text style={styles.activeBannerPrice}>R{activeJob.agreedPrice}</Text>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {!appUser?.serviceCity ? (
        <View style={styles.offlineState}>
          <Ionicons name="location-outline" size={64} color={colors.border} />
          <Text style={styles.offlineTitle}>Set your service city</Text>
          <Text style={styles.offlineText}>Go to your Profile tab and set the city you want to operate in to start seeing jobs.</Text>
        </View>
      ) : !online ? (
        <View style={styles.offlineState}>
          <Ionicons name="power-outline" size={64} color={colors.border} />
          <Text style={styles.offlineTitle}>You're offline</Text>
          <Text style={styles.offlineText}>Toggle online to see jobs in {appUser.serviceCity}.</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>{jobs.length} open {jobs.length === 1 ? 'job' : 'jobs'} in {appUser?.serviceCity}</Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>No jobs right now</Text>
              <Text style={styles.emptyText}>Check back soon — jobs appear here as customers post them.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => nav.navigate('JobDetail', { jobId: item.id })}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardLocations}>
                  <View style={styles.locRow}>
                    <Ionicons name="radio-button-on" size={14} color={colors.primary} />
                    <Text style={styles.locText} numberOfLines={1}>{item.pickup.address}</Text>
                  </View>
                  <View style={[styles.locRow, { marginTop: 4 }]}>
                    <Ionicons name="location" size={14} color={colors.danger} />
                    <Text style={styles.locText} numberOfLines={1}>{item.dropoff.address}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
              <View style={styles.cardMeta}>
                {item.category && (() => {
                  const cat = JOB_CATEGORIES.find(c => c.key === item.category);
                  return cat ? (
                    <View style={[styles.catPill, { backgroundColor: cat.color + '18', borderColor: cat.color + '40' }]}>
                      <Ionicons name={cat.icon as any} size={11} color={cat.color} />
                      <Text style={[styles.catPillText, { color: cat.color }]}>{cat.label}</Text>
                    </View>
                  ) : null;
                })()}
                {item.description ? (
                  <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>
                ) : null}
              </View>
              {item.when !== 'now' && (
                <View style={styles.scheduledPill}>
                  <Ionicons name="calendar-outline" size={12} color={colors.info} />
                  <Text style={styles.scheduledText}>{formatScheduledTime(item.when)}</Text>
                </View>
              )}
              <View style={styles.cardFooter}>
                <Text style={styles.byLine}>Posted by {item.posterName}</Text>
                <Text style={styles.dist}>
                  {distanceLabel(item, appUser?.currentLocation?.latitude, appUser?.currentLocation?.longitude)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  logo: { fontSize: 22, fontWeight: '900', color: colors.primary },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineLabel: { fontSize: 14, fontWeight: '700' },
  mapBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary + '12', alignItems: 'center', justifyContent: 'center',
  },
  bellBtn: { position: 'relative' },
  badge: {
    position: 'absolute', top: -4, right: -6,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: colors.white },
  walletBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#FDE68A',
  },
  walletBannerCritical: {
    backgroundColor: '#DC2626',
    borderBottomColor: '#B91C1C',
  },
  walletBannerTitle: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  walletBannerSub: { fontSize: 11, color: '#78350F', marginTop: 1 },
  walletBannerBtn: {
    fontSize: 12, fontWeight: '800', color: '#92400E',
    borderWidth: 1.5, borderColor: '#D97706',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  activeBanner: {
    backgroundColor: colors.primary, margin: 12, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  activeBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  activePulse: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff',
    shadowColor: '#fff', shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
  activeBannerTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  activeBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, flex: 1 },
  activeBannerPrice: { fontSize: 18, fontWeight: '900', color: '#fff', marginTop: 2 },
  offlineState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  offlineTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  offlineText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardLocations: { flex: 1 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  desc: { fontSize: 13, color: colors.textSecondary },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3,
  },
  catPillText: { fontSize: 10, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  byLine: { fontSize: 12, color: colors.textMuted },
  dist: { fontSize: 12, fontWeight: '700', color: colors.info },
  scheduledPill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  scheduledText: { fontSize: 12, fontWeight: '600', color: colors.info },
});
