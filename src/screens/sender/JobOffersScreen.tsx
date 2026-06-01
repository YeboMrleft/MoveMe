import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { listenToJob, updateJobStatus, createConversation } from '../../services/jobService';
import { listenToJobOffers, scoreAndSelectTop3, updateOfferStatus } from '../../services/offerService';
import { Job, DriverOffer } from '../../types';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import StarRating from '../../components/StarRating';
import TierBadge from '../../components/TierBadge';
import { getDriverTier } from '../../utils/driverTier';
import { SenderStackParams } from '../../navigation/SenderNavigator';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import { consumePaymentResult } from '../../services/paymentResultStore';
import { sendPushNotification } from '../../services/notificationService';
import { addFavouriteDriver, removeFavouriteDriver } from '../../services/userService';

type Nav = StackNavigationProp<SenderStackParams, 'JobOffers'>;
type Route = RouteProp<SenderStackParams, 'JobOffers'>;

function VerifiedBadge() {
  return (
    <View style={styles.verifiedBadge}>
      <Ionicons name="shield-checkmark" size={11} color={colors.white} />
      <Text style={styles.verifiedText}>Verified</Text>
    </View>
  );
}

export default function JobOffersScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { jobId } = params;
  const { appUser } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [allOffers, setAllOffers] = useState<DriverOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<DriverOffer | null>(null);

  useEffect(() => {
    const u1 = listenToJob(jobId, j => { setJob(j); setLoading(false); });
    const u2 = listenToJobOffers(jobId, setAllOffers);
    return () => { u1(); u2(); };
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      const result = consumePaymentResult();
      if (result && pendingOffer) {
        doAccept(pendingOffer);
        setPendingOffer(null);
      }
    }, [pendingOffer]),
  );

  const top3 = scoreAndSelectTop3(allOffers);
  const totalDrivers = allOffers.length;
  const uid = getAuth().currentUser?.uid ?? '';
  const favourites = appUser?.favouriteDriverIds ?? [];

  const toggleFavourite = async (driverId: string) => {
    if (favourites.includes(driverId)) {
      await removeFavouriteDriver(uid, driverId);
    } else {
      await addFavouriteDriver(uid, driverId);
    }
  };

  const doAccept = async (offer: DriverOffer) => {
    if (accepting) return;
    setAccepting(true);
    try {
      await updateJobStatus(jobId, 'accepted', {
        acceptedDriverId: offer.driverId,
        acceptedDriverName: offer.driverName,
        agreedPrice: offer.price,
      });
      await updateOfferStatus(offer.id, 'selected');
      const rejected = allOffers.filter(o => o.id !== offer.id);
      await Promise.all(rejected.map(o => updateOfferStatus(o.id, 'rejected')));
      sendPushNotification(
        offer.driverId,
        'Your offer was accepted!',
        `${appUser?.name ?? 'The customer'} accepted your price of R${offer.price}. Head to the pickup address.`,
        'tripUpdate'
      );
      nav.replace('TripActive', { jobId });
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setAccepting(false);
    }
  };

  const handleAccept = (offer: DriverOffer) => {
    Alert.alert(
      'Accept this driver?',
      `${offer.driverName} — R${offer.price}${offer.note ? `\n"${offer.note}"` : ''}\n\nA R10 platform fee applies.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay R10 & Accept',
          onPress: () => {
            setPendingOffer(offer);
            nav.navigate('Payment', {
              purpose: 'sender_accept',
              referenceId: jobId,
              returnTo: 'JobOffers',
              extra: { jobId },
            });
          },
        },
      ]
    );
  };

  const handleCancelJob = () => {
    Alert.alert(
      'Cancel this job?',
      'The job will be removed and any drivers who responded will be notified.',
      [
        { text: 'Keep job', style: 'cancel' },
        {
          text: 'Cancel job',
          style: 'destructive',
          onPress: async () => {
            await updateJobStatus(jobId, 'cancelled');
            nav.popToTop();
          },
        },
      ]
    );
  };

  const handleChat = async (offer: DriverOffer) => {
    const convId = await createConversation({
      jobId,
      userId: uid,
      driverId: offer.driverId,
      driverName: offer.driverName,
      userName: appUser?.name ?? '',
      quotedPrice: offer.price,
      status: 'active',
    });
    nav.navigate('Chat', {
      conversationId: convId,
      jobId,
      otherName: offer.driverName,
      otherUserId: offer.driverId,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Best Offers</Text>
        <TouchableOpacity onPress={handleCancelJob} style={styles.cancelHeaderBtn}>
          <Text style={styles.cancelHeaderText}>Cancel job</Text>
        </TouchableOpacity>
      </View>

      {job && (
        <View style={styles.jobSummary}>
          <View style={styles.routeRow}>
            <Ionicons name="radio-button-on" size={12} color={colors.primary} />
            <Text style={styles.routeText} numberOfLines={1}>{job.pickup.address}</Text>
          </View>
          <View style={styles.routeRow}>
            <Ionicons name="location" size={12} color={colors.danger} />
            <Text style={styles.routeText} numberOfLines={1}>{job.dropoff.address}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={top3}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {totalDrivers === 0 ? (
              <Text style={styles.waitingText}>Waiting for drivers to respond…</Text>
            ) : top3.length < 3 ? (
              <Text style={styles.waitingText}>
                {totalDrivers} offer{totalDrivers !== 1 ? 's' : ''} received — showing best {top3.length}
              </Text>
            ) : (
              <Text style={styles.topText}>
                Top 3 from {totalDrivers} driver{totalDrivers !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.emptyTitle}>Waiting for drivers…</Text>
            <Text style={styles.emptySubtext}>Nearby verified drivers can see your job and are submitting prices.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.offerCard, index === 0 && styles.topOffer]}>
            {index === 0 && (
              <View style={styles.bestBadge}>
                <Ionicons name="trophy" size={12} color={colors.black} />
                <Text style={styles.bestText}>Best Match</Text>
              </View>
            )}

            <View style={styles.offerTop}>
              {item.driverPhoto ? (
                <Image source={{ uri: item.driverPhoto }} style={styles.driverPhoto} />
              ) : (
                <Avatar name={item.driverName} size={56} />
              )}
              <View style={styles.driverInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.driverName}>{item.driverName}</Text>
                  {item.verificationStatus === 'verified' && <VerifiedBadge />}
                  <TierBadge tier={getDriverTier(item.driverRating > 0 ? 1 : 0, item.driverRating)} />
                  {favourites.includes(item.driverId) && (
                    <View style={styles.favBadge}>
                      <Ionicons name="heart" size={10} color="#E11D48" />
                      <Text style={styles.favBadgeText}>Favourite</Text>
                    </View>
                  )}
                </View>
                <StarRating value={Math.round(item.driverRating)} size={14} />
                <Text style={styles.ratingNum}>
                  {item.driverRating > 0 ? item.driverRating.toFixed(1) : 'New driver'}
                </Text>
                {item.registrationNumber && (
                  <Text style={styles.regNum}>{item.registrationNumber}</Text>
                )}
              </View>
              <View style={styles.priceCol}>
                <Text style={styles.price}>R{item.price}</Text>
                <TouchableOpacity onPress={() => toggleFavourite(item.driverId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons
                    name={favourites.includes(item.driverId) ? 'heart' : 'heart-outline'}
                    size={22}
                    color={favourites.includes(item.driverId) ? '#E11D48' : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {item.note ? (
              <View style={styles.noteBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.noteText}>"{item.note}"</Text>
              </View>
            ) : null}

            <View style={styles.offerActions}>
              <Button
                label="Chat"
                onPress={() => handleChat(item)}
                variant="outline"
                style={styles.chatBtn}
              />
              <Button
                label={accepting ? 'Confirming…' : `Accept — R${item.price}`}
                onPress={() => handleAccept(item)}
                loading={accepting}
                style={styles.acceptBtn}
              />
            </View>
          </View>
        )}
      />
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
  cancelHeaderBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  cancelHeaderText: { fontSize: 14, fontWeight: '600', color: colors.danger },
  jobSummary: {
    backgroundColor: colors.surface, padding: 14, gap: 4,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  list: { padding: 16, gap: 14 },
  listHeader: { marginBottom: 4 },
  waitingText: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
  topText: { fontSize: 13, fontWeight: '700', color: colors.text },
  empty: { alignItems: 'center', paddingTop: 60, gap: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptySubtext: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 18 },

  offerCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  topOffer: {
    borderColor: colors.accent, borderWidth: 2,
    shadowColor: colors.accent, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bestBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  bestText: { fontSize: 11, fontWeight: '800', color: colors.black },

  offerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverPhoto: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.border },
  driverInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driverName: { fontSize: 16, fontWeight: '800', color: colors.text },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  verifiedText: { fontSize: 10, fontWeight: '700', color: colors.white },
  ratingNum: { fontSize: 12, color: colors.textSecondary },
  regNum: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  priceCol: { alignItems: 'center', gap: 6 },
  price: { fontSize: 28, fontWeight: '900', color: colors.primary },
  favBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF0F3', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: '#FECDD3',
  },
  favBadgeText: { fontSize: 10, fontWeight: '700', color: '#E11D48' },

  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 10,
  },
  noteText: { flex: 1, fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 18 },

  offerActions: { flexDirection: 'row', gap: 10 },
  chatBtn: { flex: 1 },
  acceptBtn: { flex: 1.5 },
});
