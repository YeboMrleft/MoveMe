import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, Linking, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { listenToJob, updateJobStatus, markArrived, startTrip, createConversation, updateJobDriverLocation, confirmCashPayment, archiveJobConversations } from '../../services/jobService';
import { listenToWallet, settleJobFromWallet, chargeDriverCommission, cancelJobWithFee } from '../../services/walletService';
import { sendPushNotification } from '../../services/notificationService';
import { incrementTotalEarned, addFavouriteDriver, removeFavouriteDriver } from '../../services/userService';
import { uploadPhoto } from '../../services/storageService';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job } from '../../types';
import Button from '../../components/Button';
import DriverNavMap from '../../components/DriverNavMap';
import { useAuth } from '../../hooks/useAuth';
import { Share } from 'react-native';

type TripParams = { TripActive: { jobId: string } };

const openNavigation = (lat: number, lng: number, label: string) => {
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const wazeUrl   = `waze://?ll=${lat},${lng}&navigate=yes`;

  Linking.canOpenURL(wazeUrl).then(hasWaze => {
    if (hasWaze) {
      Alert.alert(`Navigate to ${label}`, 'Choose your navigation app', [
        { text: 'Waze',        onPress: () => Linking.openURL(wazeUrl) },
        { text: 'Google Maps', onPress: () => Linking.openURL(googleUrl) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Linking.openURL(googleUrl);
    }
  });
};

const STATUS_LABEL: Record<string, string> = {
  accepted:    'Driver on the way',
  arrived:     'Driver has arrived',
  in_progress: 'Trip in progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
};
const STATUS_COLOR: Record<string, string> = {
  accepted:    colors.primary,
  arrived:     '#F59E0B',
  in_progress: colors.primary,
  completed:   colors.completed,
  cancelled:   colors.cancelled,
};

export default function TripActiveScreen() {
  const nav = useNavigation<any>();
  const { params } = useRoute<RouteProp<TripParams, 'TripActive'>>();
  const { jobId } = params;
  const { appUser } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [driverPos, setDriverPos] = useState<{ latitude: number; longitude: number; heading?: number } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [settlingWallet, setSettlingWallet] = useState(false);
  const [pickupPhotoUri, setPickupPhotoUri] = useState<string | null>(null);
  const [deliveryPhotoUri, setDeliveryPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
    const isLive = ['accepted', 'arrived', 'in_progress'].includes(job.status);
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
        setDriverPos({ latitude: initial.coords.latitude, longitude: initial.coords.longitude, heading: initial.coords.heading ?? undefined });
      } catch {}

      // Then keep updating as the driver moves
      locationWatcher.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 8000 },
        loc => {
          updateJobDriverLocation(jobId, loc.coords.latitude, loc.coords.longitude);
          setDriverPos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, heading: loc.coords.heading ?? undefined });
        }
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

  // Sender: listen to wallet balance for wallet payment option
  useEffect(() => {
    if (isDriver || !uid) return;
    return listenToWallet(uid, w => setWalletBalance(w?.balance ?? 0));
  }, [isDriver, uid]);

  const takePhoto = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera needed', 'Please allow camera access in your device settings.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], quality: 0.7, allowsEditing: false,
    });
    return result.canceled ? null : result.assets[0].uri;
  };

  const handleArrived = () => {
    Alert.alert('Confirm arrival', 'Are you at the pickup address?', [
      { text: 'Not yet', style: 'cancel' },
      {
        text: "Yes, I'm here",
        onPress: async () => {
          await markArrived(jobId);
          if (job?.posterId) {
            sendPushNotification(
              job.posterId,
              'Your driver has arrived!',
              `${appUser?.name ?? 'Your driver'} is at the pickup. Open the app to pay and start your move.`,
              'tripUpdate'
            );
          }
        },
      },
    ]);
  };

  const handleStartTripCash = () => {
    Alert.alert('Start trip?', 'Confirm you have collected the goods and the customer has paid cash.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start',
        onPress: async () => {
          await startTrip(jobId);
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
    Alert.alert('Complete trip?', 'Take a photo of the delivered goods as proof of delivery.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take Photo & Complete',
        onPress: async () => {
          const uri = await takePhoto();
          if (!uri) {
            Alert.alert(
              'Photo required',
              'A delivery photo protects you in case of disputes.',
              [
                { text: 'Try Again', onPress: handleCompleteTrip },
                {
                  text: 'Skip (not recommended)',
                  style: 'destructive',
                  onPress: doCompleteTrip,
                },
              ]
            );
            return;
          }
          setDeliveryPhotoUri(uri);
          setUploadingPhoto(true);
          let deliveryPhotoUrl: string | undefined;
          try {
            deliveryPhotoUrl = await uploadPhoto(uri, `jobs/${jobId}/delivery`);
          } catch {}
          setUploadingPhoto(false);
          doCompleteTrip(deliveryPhotoUrl);
        },
      },
    ]);
  };

  const doCompleteTrip = async (deliveryPhotoUrl?: string) => {
    try {
      await updateJobStatus(jobId, 'completed', deliveryPhotoUrl ? { deliveryPhotoUrl } : undefined);
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
      const trips = (appUser?.totalTrips ?? 0) + 1;
      if (trips % 5 === 0) {
        const key = `review_prompted_${uid}`;
        const already = await AsyncStorage.getItem(key);
        if (!already && await StoreReview.hasAction()) {
          await StoreReview.requestReview();
          await AsyncStorage.setItem(key, 'true');
        }
      }
      archiveJobConversations(jobId).catch(() => {});
      const toUserId = job?.posterId;
      const toName = job?.posterName;
      if (toUserId && toName) {
        nav.replace('Rate', { jobId, toUserId, toName });
      } else {
        nav.popToTop();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not complete the trip. Please try again.');
    }
  };

  const COMMISSION = 0.12;

  const handleArrivalWalletPay = () => {
    if (!job?.agreedPrice || !job.acceptedDriverId) return;
    const total = job.agreedPrice;
    const driverGets = Math.round(total * (1 - COMMISSION));
    Alert.alert(
      'Confirm payment',
      `Pay R${total} from your wallet?\n\nYour driver receives R${driverGets} instantly. Move-Me keeps 12% (R${total - driverGets}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Pay R${total} from wallet`,
          onPress: async () => {
            setSettlingWallet(true);
            try {
              await settleJobFromWallet(jobId, uid, job.acceptedDriverId!, total, 'arrival');
              sendPushNotification(
                job.acceptedDriverId!,
                'Payment received — trip starting',
                `R${driverGets} has been added to your wallet. Trip is now active.`,
                'tripUpdate'
              );
            } catch (e: any) {
              Alert.alert('Payment failed', e.message ?? 'Could not complete payment. Please try again.');
            } finally {
              setSettlingWallet(false);
            }
          },
        },
      ]
    );
  };

  const handleWalletSettle = () => {
    if (!job?.agreedPrice || !job.acceptedDriverId) return;
    const amount = job.agreedPrice;
    const driverGets = Math.round(amount * 0.88);
    Alert.alert(
      'Pay from wallet',
      `Pay R${amount} from your wallet?\n\nYour driver receives R${driverGets}. Move-Me keeps 12% (R${amount - driverGets}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Pay R${amount}`,
          onPress: async () => {
            setSettlingWallet(true);
            try {
              await settleJobFromWallet(jobId, uid, job.acceptedDriverId!, amount, 'completion');
              if (job.acceptedDriverId) {
                sendPushNotification(
                  job.acceptedDriverId,
                  'Wallet payment received',
                  `R${amount - 10} has been added to your Move-Me wallet.`,
                  'tripUpdate'
                );
              }
            } catch (e: any) {
              Alert.alert('Payment failed', e.message ?? 'Could not complete wallet payment. Please try again.');
            } finally {
              setSettlingWallet(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmCash = () => {
    const amount = job?.agreedPrice ? `R${job.agreedPrice}` : 'the agreed amount';
    Alert.alert(
      'Confirm cash payment',
      `Have you paid your driver ${amount} in cash?`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, I paid',
          onPress: async () => {
            await confirmCashPayment(jobId);
            if (job?.acceptedDriverId) {
              sendPushNotification(
                job.acceptedDriverId,
                'Cash payment confirmed',
                `${appUser?.name ?? 'Your customer'} has confirmed the cash payment.`,
                'tripUpdate'
              );
              // Charge 12% commission from driver wallet (soft — doesn't block if no wallet)
              if (job?.agreedPrice) {
                chargeDriverCommission(job.acceptedDriverId, jobId, job.agreedPrice).catch(() => {});
              }
            }
          },
        },
      ]
    );
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
    if (!job) return;
    const wasInAppPaid = job.walletSettled && (job.paidAmount ?? 0) > 0;
    const fee = wasInAppPaid ? Math.round((job.paidAmount ?? 0) * 0.2) : 0;
    const refund = wasInAppPaid ? (job.paidAmount ?? 0) - fee : 0;

    const message = wasInAppPaid
      ? `A 20% cancellation fee of R${fee.toFixed(2)} applies.\n\nR${refund.toFixed(2)} will be refunded to your wallet. The driver receives R${(fee / 2).toFixed(2)} compensation.`
      : 'The booking will be cancelled.';

    Alert.alert('Cancel trip?', message, [
      { text: 'No', style: 'cancel' },
      {
        text: wasInAppPaid ? `Cancel — pay R${fee.toFixed(2)} fee` : 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          if (wasInAppPaid) {
            try {
              await cancelJobWithFee(jobId, uid, job.acceptedDriverId);
            } catch {
              await updateJobStatus(jobId, 'cancelled');
            }
          } else {
            await updateJobStatus(jobId, 'cancelled');
          }
          nav.popToTop();
        },
      },
    ]);
  };

  if (!job) return null;

  const isLive = ['accepted', 'arrived', 'in_progress'].includes(job.status);
  const isArrived = job.status === 'arrived';
  const isCompleted = job.status === 'completed';
  const canSenderPay = !isDriver && isArrived && !job.walletSettled && !job.paymentMethod;
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

      {/* Driver navigation map */}
      {isDriver && ['accepted', 'in_progress'].includes(job.status) && job && (
        <View style={styles.driverMap}>
          <DriverNavMap
            driver={driverPos}
            destination={
              job.status === 'accepted' ? job.pickup.coords : job.dropoff.coords
            }
            destinationLabel={job.status === 'accepted' ? 'pickup' : 'dropoff'}
          />
        </View>
      )}

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

        {/* Sender navigation — navigate to pickup to be ready */}
        {!isDriver && isLive && (
          <View style={styles.navCard}>
            <View style={styles.navHeader}>
              <Ionicons name="navigate" size={18} color={colors.primary} />
              <Text style={styles.navTitle}>
                {job.status === 'accepted' ? 'Your pickup location' : 'Your dropoff location'}
              </Text>
            </View>
            <Text style={styles.navAddress} numberOfLines={2}>
              {job.status === 'accepted' ? job.pickup.address : job.dropoff.address}
            </Text>
            <TouchableOpacity
              style={styles.navBtn}
              activeOpacity={0.85}
              onPress={() => {
                const dest = job.status === 'accepted' ? job.pickup : job.dropoff;
                openNavigation(dest.coords.latitude, dest.coords.longitude,
                  job.status === 'accepted' ? 'Pickup' : 'Dropoff');
              }}
            >
              <Ionicons name="navigate-circle" size={22} color={colors.white} />
              <Text style={styles.navBtnText}>Open Navigation</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {/* Driver navigation buttons */}
        {isDriver && isLive && (
          <View style={styles.navCard}>
            <View style={styles.navHeader}>
              <Ionicons name="navigate" size={18} color={colors.primary} />
              <Text style={styles.navTitle}>
                {job.status === 'accepted' ? 'Navigate to Pickup' : 'Navigate to Dropoff'}
              </Text>
            </View>
            <Text style={styles.navAddress} numberOfLines={2}>
              {job.status === 'accepted' ? job.pickup.address : job.dropoff.address}
            </Text>
            <TouchableOpacity
              style={styles.navBtn}
              activeOpacity={0.85}
              onPress={() => {
                const dest = job.status === 'accepted' ? job.pickup : job.dropoff;
                openNavigation(dest.coords.latitude, dest.coords.longitude,
                  job.status === 'accepted' ? 'Pickup' : 'Dropoff');
              }}
            >
              <Ionicons name="navigate-circle" size={22} color={colors.white} />
              <Text style={styles.navBtnText}>
                Open Navigation
              </Text>
            </TouchableOpacity>
            {job.status === 'accepted' && (
              <TouchableOpacity
                style={styles.navBtnSecondary}
                activeOpacity={0.85}
                onPress={() => openNavigation(
                  job.dropoff.coords.latitude,
                  job.dropoff.coords.longitude,
                  'Dropoff',
                )}
              >
                <Ionicons name="map-outline" size={16} color={colors.primary} />
                <Text style={styles.navBtnSecondaryText}>Preview dropoff location</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Sender: arrival payment card */}
        {canSenderPay && job.agreedPrice && (
          <View style={styles.arrivalCard}>
            <View style={styles.arrivalHeader}>
              <Ionicons name="car" size={20} color="#F59E0B" />
              <Text style={styles.arrivalTitle}>Your driver has arrived!</Text>
            </View>
            <Text style={styles.arrivalSub}>Choose how you'd like to pay</Text>

            {/* In-app option */}
            {(() => {
              const driverGets = Math.round(job.agreedPrice * 0.88);
              const hasBalance = walletBalance !== null && walletBalance >= job.agreedPrice;
              return (
                <>
                  <TouchableOpacity
                    style={[styles.payOption, styles.payOptionWallet, !hasBalance && { opacity: 0.7 }]}
                    onPress={handleArrivalWalletPay}
                    disabled={settlingWallet || !hasBalance}
                    activeOpacity={0.85}
                  >
                    <View style={styles.payOptionLeft}>
                      <Ionicons name="wallet-outline" size={22} color={colors.white} />
                      <View>
                        <View style={styles.payOptionTitleRow}>
                          <Text style={styles.payOptionTitle}>Pay in-app</Text>
                          <View style={styles.saveBadge}>
                            <Text style={styles.saveBadgeText}>RECOMMENDED</Text>
                          </View>
                        </View>
                        <Text style={styles.payOptionAmount}>R{job.agreedPrice}</Text>
                        <Text style={styles.payOptionNote}>
                          Driver receives R{driverGets} instantly · guaranteed
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>

                  {!hasBalance && (
                    <TouchableOpacity
                      style={styles.topUpLink}
                      onPress={() => nav.navigate('TopUp' as any)}
                    >
                      <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                      <Text style={styles.topUpLinkText}>
                        {walletBalance !== null
                          ? `Add R${Math.ceil(job.agreedPrice - walletBalance)} to wallet to pay in-app`
                          : 'Top up wallet to pay in-app'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}

            {/* Cash option */}
            <TouchableOpacity
              style={[styles.payOption, styles.payOptionCash]}
              activeOpacity={0.85}
              onPress={() => {
                const commission = Math.round((job.agreedPrice ?? 0) * 0.12);
                Alert.alert(
                  'Pay cash?',
                  `You'll hand R${job.agreedPrice} directly to your driver.\n\nYour driver will pay R${commission} (12%) Move-Me commission from their wallet.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Yes, pay cash',
                      onPress: async () => {
                        await updateJobStatus(jobId, 'in_progress', { paymentMethod: 'cash' });
                        sendPushNotification(
                          job.acceptedDriverId!,
                          'Customer confirmed — cash payment',
                          `${appUser?.name ?? 'Your customer'} will pay R${job.agreedPrice} in cash. Start the trip when ready.`,
                          'tripUpdate'
                        );
                      },
                    },
                  ]
                );
              }}
            >
              <View style={styles.payOptionLeft}>
                <Ionicons name="cash-outline" size={22} color={colors.text} />
                <View>
                  <Text style={[styles.payOptionTitle, { color: colors.text }]}>Pay cash</Text>
                  <Text style={[styles.payOptionAmount, { color: colors.text }]}>R{job.agreedPrice}</Text>
                  <Text style={[styles.payOptionNote, { color: colors.textSecondary }]}>
                    Pay driver directly · 12% commission charged to driver
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Driver: pickup photo prompt */}
        {isDriver && job.status === 'in_progress' && !pickupPhotoUri && !job.pickupPhotoUrl && (
          <TouchableOpacity
            style={styles.photoPromptCard}
            activeOpacity={0.85}
            onPress={async () => {
              const uri = await takePhoto();
              if (!uri) return;
              setPickupPhotoUri(uri);
              uploadPhoto(uri, `jobs/${jobId}/pickup`)
                .then(url => updateJobStatus(jobId, 'in_progress', { pickupPhotoUrl: url } as any))
                .catch(() => {});
            }}
          >
            <Ionicons name="camera-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.photoPromptTitle}>Take pickup photo</Text>
              <Text style={styles.photoPromptSub}>Photo of the collected goods — protects you in disputes</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        {isDriver && job.status === 'in_progress' && (pickupPhotoUri || job.pickupPhotoUrl) && (
          <View style={styles.photoCard}>
            <Text style={styles.photoCardLabel}>Pickup photo</Text>
            <Image
              source={{ uri: pickupPhotoUri ?? job.pickupPhotoUrl }}
              style={styles.photoThumb}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Completed: delivery photo display */}
        {isCompleted && (deliveryPhotoUri || job.deliveryPhotoUrl) && (
          <View style={styles.photoCard}>
            <Text style={styles.photoCardLabel}>Proof of delivery</Text>
            <Image
              source={{ uri: deliveryPhotoUri ?? job.deliveryPhotoUrl }}
              style={styles.photoThumb}
              resizeMode="cover"
            />
          </View>
        )}

        <View style={styles.actions}>
          {isDriver && job.status === 'accepted' && (
            <Button label="I've Arrived" onPress={handleArrived} style={styles.mb} />
          )}
          {isDriver && isArrived && job.paymentMethod === 'cash' && (
            <Button label="Start Trip" onPress={handleStartTripCash} style={styles.mb} />
          )}
          {isDriver && isArrived && !job.paymentMethod && (
            <View style={styles.waitingPaymentBadge}>
              <Ionicons name="time-outline" size={18} color="#F59E0B" />
              <Text style={styles.waitingPaymentText}>Waiting for customer payment…</Text>
            </View>
          )}
          {isDriver && job.status === 'in_progress' && (
            <Button
              label={uploadingPhoto ? 'Uploading photo…' : 'Complete Trip'}
              onPress={uploadingPhoto ? () => {} : handleCompleteTrip}
              style={styles.mb}
            />
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
            <>
              {/* Wallet payment — sender pays driver from wallet */}
              {!isDriver && !job.walletSettled && !job.cashConfirmedBySender && job.agreedPrice && (
                walletBalance !== null && walletBalance >= job.agreedPrice ? (
                  <TouchableOpacity
                    style={styles.walletPayBtn}
                    onPress={handleWalletSettle}
                    disabled={settlingWallet}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="wallet-outline" size={20} color={colors.white} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cashBtnTitle}>Pay from wallet</Text>
                      <Text style={styles.cashBtnSub}>
                        R{job.agreedPrice} · wallet balance R{walletBalance.toFixed(2)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.white} />
                  </TouchableOpacity>
                ) : null
              )}
              {!isDriver && job.walletSettled && (
                <View style={[styles.cashConfirmedBadge, { borderColor: '#7C3AED40', backgroundColor: '#7C3AED10' }]}>
                  <Ionicons name="wallet" size={20} color="#7C3AED" />
                  <Text style={[styles.cashConfirmedText, { color: '#7C3AED' }]}>
                    Paid R{job.agreedPrice} from wallet
                  </Text>
                </View>
              )}
              {isDriver && job.walletSettled && (
                <View style={[styles.cashConfirmedBadge, { borderColor: '#7C3AED40', backgroundColor: '#7C3AED10' }]}>
                  <Ionicons name="wallet" size={20} color="#7C3AED" />
                  <Text style={[styles.cashConfirmedText, { color: '#7C3AED' }]}>
                    R{job.agreedPrice ? job.agreedPrice - 10 : '—'} added to your wallet
                  </Text>
                </View>
              )}

              {/* Cash payment handshake — only show if wallet not used */}
              {!isDriver && !job.walletSettled && !job.cashConfirmedBySender && (
                <TouchableOpacity style={styles.cashBtn} onPress={handleConfirmCash} activeOpacity={0.85}>
                  <Ionicons name="cash-outline" size={20} color={colors.white} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cashBtnTitle}>Confirm cash payment</Text>
                    <Text style={styles.cashBtnSub}>
                      Pay your driver {job.agreedPrice ? `R${job.agreedPrice}` : 'the agreed amount'} in cash
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.white} />
                </TouchableOpacity>
              )}
              {!isDriver && job.cashConfirmedBySender && (
                <View style={styles.cashConfirmedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  <Text style={styles.cashConfirmedText}>Cash payment confirmed</Text>
                </View>
              )}
              {isDriver && !job.walletSettled && (
                <View style={[styles.cashConfirmedBadge, job.cashConfirmedBySender && { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]}>
                  <Ionicons
                    name={job.cashConfirmedBySender ? 'checkmark-circle' : 'cash-outline'}
                    size={20}
                    color={job.cashConfirmedBySender ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.cashConfirmedText, !job.cashConfirmedBySender && { color: colors.textMuted }]}>
                    {job.cashConfirmedBySender
                      ? `Customer confirmed R${job.agreedPrice ?? '—'} cash payment`
                      : `Waiting for customer to confirm cash payment`}
                  </Text>
                </View>
              )}
            </>
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
  driverMap: { height: 320 },
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
  navCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: colors.primary,
    gap: 10,
    shadowColor: colors.primary, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  navHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navTitle: { fontSize: 15, fontWeight: '800', color: colors.primary },
  navAddress: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  navBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  navBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  navBtnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8,
  },
  navBtnSecondaryText: { fontSize: 13, fontWeight: '600', color: colors.primary },
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
    borderRadius: 12, paddingVertical: 13, marginTop: 10,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  receiptBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  // Arrival payment card
  arrivalCard: {
    backgroundColor: colors.surface, borderRadius: 18, padding: 16,
    borderWidth: 2, borderColor: '#F59E0B',
    shadowColor: '#F59E0B', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 4, gap: 10,
  },
  arrivalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrivalTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  arrivalSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  payOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, padding: 14, gap: 12,
  },
  payOptionWallet: { backgroundColor: colors.primary },
  payOptionCash: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  payOptionLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  payOptionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payOptionTitle: { fontSize: 15, fontWeight: '800', color: colors.white },
  payOptionAmount: { fontSize: 22, fontWeight: '900', color: colors.white, marginTop: 2 },
  payOptionNote: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  saveBadge: {
    backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  saveBadgeText: { fontSize: 10, fontWeight: '900', color: colors.primary },
  topUpLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 4, marginTop: -4,
  },
  topUpLinkText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  photoPromptCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: colors.primary + '40',
    borderStyle: 'dashed',
  },
  photoPromptTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  photoPromptSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  photoCard: {
    backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  photoCardLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, padding: 12, paddingBottom: 8,
  },
  photoThumb: { width: '100%', height: 180 },
  waitingPaymentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F59E0B18', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#F59E0B40', marginBottom: 10,
  },
  waitingPaymentText: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },

  walletPayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#7C3AED', borderRadius: 14, padding: 16,
    marginBottom: 10,
  },
  cashBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.primary, borderRadius: 14, padding: 16,
    marginBottom: 10,
  },
  cashBtnTitle: { fontSize: 15, fontWeight: '800', color: colors.white },
  cashBtnSub: { fontSize: 12, color: colors.white + 'CC', marginTop: 2 },
  cashConfirmedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  cashConfirmedText: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
});
