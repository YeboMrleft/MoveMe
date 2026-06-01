import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { listenToJob, updateJobStatus, createConversation, updateJobDriverLocation } from '../../services/jobService';
import { sendPushNotification } from '../../services/notificationService';
import { incrementTotalEarned, addFavouriteDriver, removeFavouriteDriver } from '../../services/userService';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job } from '../../types';
import Button from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { Share } from 'react-native';

type TripParams = { TripActive: { jobId: string } };

const STATUS_LABEL: Record<string, string> = {
  accepted: 'Driver on the way',
  in_progress: 'Trip in progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const STATUS_COLOR: Record<string, string> = {
  accepted: colors.primary,
  in_progress: colors.primary,
  completed: colors.completed,
  cancelled: colors.cancelled,
};

export default function TripActiveScreen() {
  const nav = useNavigation<any>();
  const { params } = useRoute<RouteProp<TripParams, 'TripActive'>>();
  const { jobId } = params;
  const { appUser } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const isDriver = appUser?.role === 'driver';
  const uid = getAuth().currentUser?.uid ?? '';
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);
  const watchingJobId = useRef<string | null>(null);

  useEffect(() => {
    return listenToJob(jobId, setJob);
  }, [jobId]);

  // Driver: start sharing GPS as soon as trip is live (runs once per live status)
  useEffect(() => {
    if (!isDriver || !job) return;
    const isLive = ['accepted', 'in_progress'].includes(job.status);
    if (!isLive || watchingJobId.current === jobId) return; // already watching this job

    watchingJobId.current = jobId;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location permission needed',
          'Please enable location access in your device settings so the customer can track you.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Write current position immediately so sender sees it right away
      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        updateJobDriverLocation(jobId, initial.coords.latitude, initial.coords.longitude);
      } catch {}

      // Then keep updating as the driver moves
      locationWatcher.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 8000 },
        loc => updateJobDriverLocation(jobId, loc.coords.latitude, loc.coords.longitude)
      );
    })();
  }, [isDriver, job?.status, jobId]);

  // Stop watcher when screen unmounts or trip ends
  useEffect(() => {
    return () => {
      locationWatcher.current?.remove();
      locationWatcher.current = null;
      watchingJobId.current = null;
    };
  }, []);

  const handleStartTrip = () => {
    Alert.alert('Start trip?', 'Confirm that you have collected the goods and are on your way.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start',
        onPress: async () => {
          await updateJobStatus(jobId, 'in_progress');
          if (job?.posterId) {
            sendPushNotification(
              job.posterId,
              'Your driver has collected the goods',
              `${appUser?.name ?? 'Your driver'} has picked up your goods and is on the way.`,
              'tripUpdate'
            );
          }
        },
      },
    ]);
  };

  const handleCompleteTrip = () => {
    Alert.alert('Complete trip?', 'Confirm that you have arrived at the dropoff.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          await updateJobStatus(jobId, 'completed');
          if (job?.posterId) {
            sendPushNotification(
              job.posterId,
              'Delivery complete!',
              'Your goods have been delivered. Open the app to rate your driver.',
              'tripUpdate'
            );
          }
          if (job?.agreedPrice) {
            incrementTotalEarned(uid, job.agreedPrice);
          }
          // Prompt for store review after every 5th trip
          const trips = (appUser?.totalTrips ?? 0) + 1;
          if (trips % 5 === 0) {
            const key = `review_prompted_${uid}`;
            const already = await AsyncStorage.getItem(key);
            if (!already && await StoreReview.hasAction()) {
              await StoreReview.requestReview();
              await AsyncStorage.setItem(key, 'true');
            }
          }
          const toUserId = job?.posterId;
          const toName = job?.posterName;
          if (toUserId && toName) {
            nav.replace('Rate', { jobId, toUserId, toName });
          } else {
            nav.popToTop();
          }
        },
      },
    ]);
  };

  const handleChat = async () => {
    if (!job) return;
    const otherUserId = isDriver ? job.posterId : job.acceptedDriverId!;
    const otherName = isDriver ? job.posterName : job.acceptedDriverName ?? 'Driver';
    const convId = await createConversation({
      jobId,
      userId: isDriver ? job.posterId : uid,
      driverId: isDriver ? uid : job.acceptedDriverId!,
      driverName: isDriver ? appUser?.name ?? '' : job.acceptedDriverName ?? '',
      userName: isDriver ? job.posterName : appUser?.name ?? '',
      quotedPrice: job.agreedPrice,
      status: 'active',
    });
    nav.navigate('Chat', {
      conversationId: convId,
      jobId,
      otherName,
      otherUserId,
    });
  };

  const handleCancel = () => {
    Alert.alert('Cancel trip?', 'This will cancel the booking.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: () => updateJobStatus(jobId, 'cancelled').then(() => nav.popToTop()),
      },
    ]);
  };

  if (!job) return null;

  const isLive = ['accepted', 'in_progress'].includes(job.status);
  const isCompleted = job.status === 'completed';
  const badgeColor = STATUS_COLOR[job.status] ?? colors.textMuted;
  const canRateDriver = !isDriver && isCompleted && !job.senderRated;
  const canTrack = !isDriver && isLive && !!job.driverLocation;
  const isFav = appUser?.favouriteDriverIds?.includes(job.acceptedDriverId ?? '') ?? false;

  const shareReceipt = async () => {
    if (!job) return;
    const date = new Date(job.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
    const receipt = [
      'MOVE-ME TRIP RECEIPT',
      '━━━━━━━━━━━━━━━━━━━',
      `Date:     ${date}`,
      `${isDriver ? 'Customer' : 'Driver'}:  ${isDriver ? job.posterName : job.acceptedDriverName ?? '—'}`,
      '',
      `FROM: ${job.pickup.address}`,
      `TO:   ${job.dropoff.address}`,
      job.description ? `Goods: ${job.description}` : '',
      '',
      `Agreed Price:  R${job.agreedPrice ?? '—'}`,
      `Platform Fee:  R10`,
      '',
      `Trip ID: ${job.id}`,
      '━━━━━━━━━━━━━━━━━━━',
      'Thank you for using Move-Me!',
    ].filter(l => l !== null).join('\n');
    await Share.share({ message: receipt, title: 'Move-Me Trip Receipt' });
  };

  const toggleFavouriteDriver = async () => {
    if (!job.acceptedDriverId) return;
    if (isFav) {
      await removeFavouriteDriver(uid, job.acceptedDriverId);
    } else {
      await addFavouriteDriver(uid, job.acceptedDriverId);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isCompleted ? 'Trip Summary' : 'Trip Active'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.statusBadge, { backgroundColor: badgeColor + '18' }]}>
          {isLive && <View style={[styles.statusDot, { backgroundColor: badgeColor }]} />}
          <Text style={[styles.statusText, { color: badgeColor }]}>
            {STATUS_LABEL[job.status] ?? job.status}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>From</Text>
          <Text style={styles.cardValue}>{job.pickup.address}</Text>
          <View style={styles.divider} />
          <Text style={styles.cardLabel}>To</Text>
          <Text style={styles.cardValue}>{job.dropoff.address}</Text>
          {job.description ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.cardLabel}>Goods</Text>
              <Text style={styles.cardValue}>{job.description}</Text>
            </>
          ) : null}
          {job.agreedPrice ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.cardLabel}>Agreed Price</Text>
              <Text style={styles.priceValue}>R{job.agreedPrice}</Text>
            </>
          ) : null}
        </View>

        <TouchableOpacity style={styles.personCard} onPress={handleChat} activeOpacity={0.8}>
          <Ionicons name={isDriver ? 'person-outline' : 'car-outline'} size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.personLabel}>{isDriver ? 'Customer' : 'Driver'}</Text>
            <Text style={styles.personName}>
              {isDriver ? job.posterName : job.acceptedDriverName}
            </Text>
          </View>
          <View style={styles.personActions}>
            {!isDriver && job.acceptedDriverId && (
              <TouchableOpacity onPress={toggleFavouriteDriver} style={styles.heartBtn}>
                <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? '#E11D48' : colors.textMuted} />
              </TouchableOpacity>
            )}
            <View style={styles.chatBtn}>
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.white} />
              <Text style={styles.chatBtnText}>Chat</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Track button — sender only, when driver has shared location */}
        {!isDriver && isLive && (
          <TouchableOpacity
            style={[styles.trackBtn, !canTrack && styles.trackBtnDisabled]}
            onPress={() => canTrack && nav.navigate('TrackDriver', { jobId })}
            activeOpacity={canTrack ? 0.8 : 1}
          >
            <View style={styles.trackLeft}>
              <View style={[styles.trackDot, !canTrack && { backgroundColor: colors.textMuted }]} />
              <View>
                <Text style={[styles.trackTitle, !canTrack && { color: colors.textMuted }]}>
                  {canTrack ? 'Track your driver' : 'Waiting for driver location…'}
                </Text>
                <Text style={styles.trackSub}>
                  {canTrack ? 'See live position on the map' : 'Updates once driver goes online'}
                </Text>
              </View>
            </View>
            {canTrack && <Ionicons name="navigate" size={22} color={colors.primary} />}
          </TouchableOpacity>
        )}

        <View style={styles.actions}>
          {isDriver && job.status === 'accepted' && (
            <Button label="Start Trip" onPress={handleStartTrip} style={styles.mb} />
          )}
          {isDriver && job.status === 'in_progress' && (
            <Button label="Complete Trip" onPress={handleCompleteTrip} style={styles.mb} />
          )}
          {canRateDriver && (
            <Button
              label="Rate Your Driver"
              onPress={() => {
                if (job.acceptedDriverId && job.acceptedDriverName) {
                  nav.replace('Rate', {
                    jobId,
                    toUserId: job.acceptedDriverId,
                    toName: job.acceptedDriverName,
                  });
                }
              }}
              style={styles.mb}
            />
          )}
          {!isDriver && isCompleted && job.senderRated && (
            <View style={styles.ratedBadge}>
              <Ionicons name="star" size={16} color={colors.accent} />
              <Text style={styles.ratedText}>You've rated this trip</Text>
            </View>
          )}
          {isCompleted && (
            <TouchableOpacity style={styles.receiptBtn} onPress={shareReceipt}>
              <Ionicons name="receipt-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.receiptBtnText}>Share Receipt</Text>
            </TouchableOpacity>
          )}
          {isLive && (
            <Button label="Cancel" onPress={handleCancel} variant="danger" />
          )}
        </View>
      </ScrollView>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  container: { padding: 20, gap: 16, paddingBottom: 32 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: colors.border,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 4 },
  priceValue: { fontSize: 24, fontWeight: '900', color: colors.primary, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 12 },
  personCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  personLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  personName: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
  personActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heartBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  chatBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  trackBtn: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 2, borderColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  trackBtnDisabled: {
    borderColor: colors.border, borderWidth: 1,
  },
  trackLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  trackDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  trackTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  trackSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  actions: { gap: 0 },
  mb: { marginBottom: 10 },
  ratedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.accent + '20', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.accent + '40',
  },
  ratedText: { fontSize: 14, fontWeight: '600', color: colors.text },
  receiptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 13,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  receiptBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
});
