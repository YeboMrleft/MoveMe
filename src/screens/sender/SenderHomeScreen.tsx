import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { colors } from '../../constants/colors';
import { listenToUserJobs } from '../../services/jobService';
import { listenToNotifications } from '../../services/notificationService';
import { Job } from '../../types';
import Button from '../../components/Button';
import ShareModal from '../../components/ShareModal';
import { formatScheduledTime } from '../../utils/formatSchedule';
import { generateReferralCode } from '../../services/userService';
import { SenderStackParams } from '../../navigation/SenderNavigator';

type Nav = StackNavigationProp<SenderStackParams, 'SenderTabs'>;

const STATUS_LABEL: Record<string, string> = {
  open: 'Waiting for drivers',
  negotiating: 'Drivers responding',
  accepted: 'Driver confirmed',
  in_progress: 'Trip in progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  open: colors.pending,
  negotiating: colors.info,
  accepted: colors.primary,
  in_progress: colors.primary,
  completed: colors.completed,
  cancelled: colors.cancelled,
};

export default function SenderHomeScreen() {
  const nav = useNavigation<Nav>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [shareVisible, setShareVisible] = useState(false);
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);
  const shownCompletion = useRef<Set<string>>(new Set());
  const uid = getAuth().currentUser?.uid ?? '';
  const referralCode = uid ? generateReferralCode(uid) : undefined;

  useEffect(() => {
    if (!uid) return;
    return listenToNotifications(uid, items => {
      setUnreadCount(items.filter(i => !i.read).length);
    });
  }, [uid]);

  useEffect(() => {
    const unsub = listenToUserJobs(uid, data => {
      setJobs(data);
      setLoading(false);
      // Show share prompt once per completed job
      const newlyCompleted = data.find(
        j => j.status === 'completed' && !shownCompletion.current.has(j.id)
      );
      if (newlyCompleted) {
        shownCompletion.current.add(newlyCompleted.id);
        setCompletedJobId(newlyCompleted.id);
        setShareVisible(true);
      }
    });
    return unsub;
  }, [uid]);

  const activeJobs = jobs.filter(j => !['completed', 'cancelled'].includes(j.status));
  const pastJobs = jobs.filter(j => ['completed', 'cancelled'].includes(j.status));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.logo}>Move-Me</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShareVisible(true)} style={styles.shareBtn}>
            <Ionicons name="share-social-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => nav.navigate('Notifications')} style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ShareModal
        visible={shareVisible}
        onClose={() => { setShareVisible(false); setCompletedJobId(null); }}
        referralCode={referralCode}
        jobCompleted={!!completedJobId}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={[...activeJobs, ...pastJobs]}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Button
              label="+ Post a New Job"
              onPress={() => nav.navigate('PostJob')}
              style={styles.postBtn}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>No jobs yet</Text>
              <Text style={styles.emptyText}>Post your first job and get bakkie drivers to respond.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isActive = ['accepted', 'in_progress'].includes(item.status);
            const hasLocation = isActive && !!item.driverLocation;
            return (
              <TouchableOpacity
                style={[styles.card, isActive && styles.cardActive]}
                onPress={() => {
                  if (isActive || item.status === 'completed') {
                    nav.navigate('TripActive', { jobId: item.id });
                  } else if (['open', 'negotiating'].includes(item.status)) {
                    nav.navigate('JobOffers', { jobId: item.id });
                  }
                }}
                activeOpacity={0.8}
              >
                {isActive && (
                  <View style={styles.activePill}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activePillText}>
                      {item.status === 'in_progress' ? 'Trip in progress' : 'Driver on the way'}
                    </Text>
                  </View>
                )}
                <View style={styles.cardRow}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardFrom} numberOfLines={1}>{item.pickup.address}</Text>
                    <Text style={styles.cardArrow}>→</Text>
                    <Text style={styles.cardTo} numberOfLines={1}>{item.dropoff.address}</Text>
                    {item.description ? (
                      <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
                    ) : null}
                    {item.when !== 'now' && (
                      <View style={styles.scheduledPill}>
                        <Ionicons name="calendar-outline" size={11} color={colors.info} />
                        <Text style={styles.scheduledText}>{formatScheduledTime(item.when)}</Text>
                      </View>
                    )}
                  </View>
                  {!isActive && (
                    <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
                      <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                        {STATUS_LABEL[item.status]}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardFooter}>
                  {item.agreedPrice ? (
                    <Text style={[styles.price, isActive && { color: colors.primary }]}>R{item.agreedPrice}</Text>
                  ) : null}
                  {isActive && (
                    hasLocation ? (
                      <TouchableOpacity
                        style={styles.trackBtn}
                        onPress={() => nav.navigate('TrackDriver', { jobId: item.id })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="navigate" size={13} color={colors.white} />
                        <Text style={styles.trackBtnText}>Track Driver</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.trackWaiting}>
                        <Ionicons name="locate-outline" size={13} color={colors.textMuted} />
                        <Text style={styles.trackWaitingText}>Locating driver…</Text>
                      </View>
                    )
                  )}
                </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    shadowColor: colors.shadowSm,
    shadowOpacity: 1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  logo: { fontSize: 24, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shareBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accent + '10',
    alignItems: 'center', justifyContent: 'center',
  },
  bellBtn: { position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: colors.white },
  loader: { flex: 1, justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  postBtn: { marginBottom: 8 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowSm,
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  cardActive: {
    borderColor: colors.accent,
    borderWidth: 1.5,
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.accent + '10',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  activePillText: { fontSize: 11, fontWeight: '800', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.3 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardInfo: { flex: 1 },
  cardFrom: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardArrow: { fontSize: 13, color: colors.textMuted, marginVertical: 2 },
  cardTo: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  price: { fontSize: 20, fontWeight: '800', color: colors.primary },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: colors.shadowSm,
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  trackBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  trackWaiting: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  trackWaitingText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  scheduledPill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  scheduledText: { fontSize: 12, fontWeight: '600', color: colors.info },
});
