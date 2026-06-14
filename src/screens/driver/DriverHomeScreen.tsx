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
import { spacing, radius, shadows } from '../../constants/spacing';
import { listenToOpenJobsNear, listenToDriverActiveJob } from '../../services/jobService';
import { listenToNotifications } from '../../services/notificationService';
import { JOB_CATEGORIES } from '../../constants/categories';
import { setDriverOnline } from '../../services/userService';
import { listenToWallet } from '../../services/walletService';
import { Job } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { formatScheduledTime } from '../../utils/formatSchedule';
import { DriverStackParams } from '../../navigation/DriverNavigator';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Divider from '../../components/Divider';

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
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>Move-Me</Text>
          <View style={[styles.onlineIndicator, { backgroundColor: online ? colors.success : colors.textMuted }]} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => nav.navigate('DemandMap')}
          >
            <Ionicons name="map-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => nav.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
            {unreadCount > 0 && (
              <Badge
                label={unreadCount > 9 ? '9+' : unreadCount.toString()}
                variant="error"
                size="sm"
                style={styles.notificationBadge}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusBar}
        scrollEnabled={false}
      >
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Status</Text>
          <View style={styles.onlineToggle}>
            <Switch
              value={online}
              onValueChange={toggleOnline}
              trackColor={{ false: colors.border, true: colors.success + '40' }}
              thumbColor={online ? colors.success : colors.textMuted}
            />
            <Text style={[styles.onlineLabel, { color: online ? colors.success : colors.textMuted }]}>
              {online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <Divider variant="inset" style={styles.statusDivider} />

        {walletBalance !== null && (
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Wallet</Text>
            <Text style={[styles.statusValue, walletBalance <= 0 && styles.statusValueCritical]}>
              R{walletBalance.toFixed(2)}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Low Wallet Warning */}
      {walletBalance !== null && walletBalance < 50 && (
        <TouchableOpacity
          style={[
            styles.alertBanner,
            walletBalance <= 0 && styles.alertBannerCritical,
          ]}
          onPress={() => nav.navigate('Wallet' as any)}
          activeOpacity={0.85}
        >
          <Ionicons
            name={walletBalance <= 0 ? 'alert-circle' : 'warning'}
            size={20}
            color={walletBalance <= 0 ? colors.white : colors.warning}
          />
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.alertTitle,
              walletBalance <= 0 && { color: colors.white },
            ]}>
              {walletBalance <= 0
                ? 'No Wallet Balance'
                : 'Low Wallet Balance'}
            </Text>
            <Text style={[
              styles.alertSub,
              walletBalance <= 0 && { color: colors.white + '99' },
            ]}>
              {walletBalance <= 0
                ? 'Top up to submit offers and pay cash commissions'
                : `R${walletBalance.toFixed(2)} remaining`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={walletBalance <= 0 ? colors.white : colors.warning} />
        </TouchableOpacity>
      )}

      {/* Active Job Banner */}
      {activeJob && (
        <TouchableOpacity
          style={styles.activeBanner}
          onPress={() => nav.navigate('TripActive', { jobId: activeJob.id })}
          activeOpacity={0.85}
        >
          <View style={styles.activePulse} />
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Text style={styles.activeBannerTitle}>
              {activeJob.status === 'accepted' ? 'Head to pickup'
                : activeJob.status === 'arrived' ? 'Waiting for payment'
                : 'Trip in progress'}
            </Text>
            <View style={styles.activeBannerRoute}>
              <View style={styles.routeStop}>
                <Ionicons name="radio-button-on" size={12} color={colors.white} />
                <Text style={styles.routeText} numberOfLines={1}>{activeJob.pickup.address}</Text>
              </View>
              <View style={styles.routeStop}>
                <Ionicons name="location" size={12} color={colors.white} />
                <Text style={styles.routeText} numberOfLines={1}>{activeJob.dropoff.address}</Text>
              </View>
            </View>
            {activeJob.agreedPrice && (
              <Text style={styles.activeBannerPrice}>R{activeJob.agreedPrice}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.white} />
        </TouchableOpacity>
      )}

      {!appUser?.serviceCity ? (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={56} color={colors.border} />
          <Text style={styles.emptyStateTitle}>Set Your Service City</Text>
          <Text style={styles.emptyStateText}>Go to Profile and select the city where you want to work.</Text>
        </View>
      ) : !online ? (
        <View style={styles.emptyState}>
          <Ionicons name="power-outline" size={56} color={colors.border} />
          <Text style={styles.emptyStateTitle}>You're Offline</Text>
          <Text style={styles.emptyStateText}>Toggle online above to see available jobs in {appUser.serviceCity}.</Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Finding nearby jobs...</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>
              {jobs.length} available {jobs.length === 1 ? 'job' : 'jobs'} in {appUser?.serviceCity}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={56} color={colors.border} />
              <Text style={styles.emptyStateTitle}>No Jobs Available</Text>
              <Text style={styles.emptyStateText}>Check back soon — new jobs appear here as customers post them.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cat = item.category ? JOB_CATEGORIES.find(c => c.key === item.category) : null;
            const dist = distanceLabel(item, appUser?.currentLocation?.latitude, appUser?.currentLocation?.longitude);

            return (
              <Card
                variant="outlined"
                padding={4}
                onPress={() => nav.navigate('JobDetail', { jobId: item.id })}
                style={styles.jobCard}
              >
                <View style={styles.jobCardContent}>
                  {/* Route */}
                  <View style={styles.routeSection}>
                    <View style={styles.routeItem}>
                      <Ionicons name="radio-button-on" size={16} color={colors.primary} />
                      <Text style={styles.routeAddress} numberOfLines={1}>{item.pickup.address}</Text>
                    </View>
                    <View style={styles.routeItem}>
                      <Ionicons name="location" size={16} color={colors.error} />
                      <Text style={styles.routeAddress} numberOfLines={1}>{item.dropoff.address}</Text>
                    </View>
                  </View>

                  <Divider variant="inset" margin={2} />

                  {/* Meta */}
                  <View style={styles.jobMeta}>
                    {cat && (
                      <Badge
                        label={cat.label}
                        variant="info"
                        size="sm"
                      />
                    )}
                    {item.description && (
                      <Text style={styles.jobDesc} numberOfLines={1}>{item.description}</Text>
                    )}
                    {item.when !== 'now' && (
                      <View style={styles.scheduledTag}>
                        <Ionicons name="calendar-outline" size={12} color={colors.info} />
                        <Text style={styles.scheduledText}>{formatScheduledTime(item.when)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Footer */}
                  <View style={styles.jobFooter}>
                    <View>
                      <Text style={styles.posterName}>{item.posterName}</Text>
                      {dist && <Text style={styles.distance}>{dist}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    shadowColor: colors.shadowSm,
    shadowOpacity: 1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  logo: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: colors.success,
    shadowOpacity: 0.8,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '08',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },

  // Status Bar
  statusBar: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[4],
    alignItems: 'center',
  },
  statusItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  onlineLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusDivider: {
    height: 24,
    backgroundColor: 'transparent',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  statusValueCritical: {
    color: colors.error,
  },

  // Alert Banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.warning + '15',
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    borderRadius: radius.lg,
  },
  alertBannerCritical: {
    backgroundColor: colors.error,
    borderLeftColor: colors.error,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  alertSub: {
    fontSize: 12,
    color: colors.warning + 'CC',
    marginTop: spacing[1],
  },

  // Active Job Banner
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  activePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
    shadowColor: colors.white,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  activeBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  activeBannerRoute: {
    gap: spacing[1],
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  routeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.white + 'DD',
  },
  activeBannerPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.accent,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[4],
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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

  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },

  // List
  list: {
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[8],
  },

  // Job Card
  jobCard: {
    marginHorizontal: 0,
  },
  jobCardContent: {
    gap: spacing[3],
  },

  // Route
  routeSection: {
    gap: spacing[2],
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  routeAddress: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // Job Meta
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  jobDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  scheduledTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  scheduledText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.info,
  },

  // Job Footer
  jobFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  posterName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  distance: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.info,
    marginTop: spacing[1],
  },
});
