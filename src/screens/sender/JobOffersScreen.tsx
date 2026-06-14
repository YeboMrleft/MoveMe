import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing, radius, shadows } from '../../constants/spacing';
import { listenToJob, updateJobStatus, createConversation } from '../../services/jobService';
import { listenToJobOffers, scoreAndSelectTop3, updateOfferStatus } from '../../services/offerService';
import { Job, DriverOffer } from '../../types';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import StarRating from '../../components/StarRating';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Divider from '../../components/Divider';
import TierBadge from '../../components/TierBadge';
import { getDriverTier } from '../../utils/driverTier';
import { SenderStackParams } from '../../navigation/SenderNavigator';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import WaitingForDriverAnimation from '../../components/WaitingForDriverAnimation';
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

  useEffect(() => {
    const u1 = listenToJob(jobId, j => { setJob(j); setLoading(false); });
    const u2 = listenToJobOffers(jobId, setAllOffers);
    return () => { u1(); u2(); };
  }, [jobId]);

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
    const driverGets = Math.round(offer.price * 0.88);
    Alert.alert(
      'Accept this driver?',
      `${offer.driverName} — R${offer.price}${offer.note ? `\n"${offer.note}"` : ''}\n\n💳 Pay in-app on arrival: driver gets R${driverGets} (88%) instantly\n💵 Pay cash: driver pays 12% commission from their wallet\n\nNo upfront fee to book.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept Driver', onPress: () => doAccept(offer) },
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
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Best Offers</Text>
        <TouchableOpacity onPress={handleCancelJob} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {job && (
        <Card variant="outlined" padding={4} style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeIcon}>
              <Ionicons name="radio-button-on" size={14} color={colors.primary} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeAddress} numberOfLines={1}>{job.pickup.address}</Text>
            </View>
          </View>
          <Divider variant="inset" margin={2} />
          <View style={styles.routeRow}>
            <View style={styles.routeIcon}>
              <Ionicons name="location" size={14} color={colors.error} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Dropoff</Text>
              <Text style={styles.routeAddress} numberOfLines={1}>{job.dropoff.address}</Text>
            </View>
          </View>
        </Card>
      )}

      <FlatList
        data={top3}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        scrollIndicatorInsets={{ right: 1 }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {totalDrivers === 0 ? (
              <Text style={styles.statusText}>Waiting for drivers to respond…</Text>
            ) : top3.length < 3 ? (
              <Text style={styles.statusText}>
                {totalDrivers} offer{totalDrivers !== 1 ? 's' : ''} received — showing best {top3.length}
              </Text>
            ) : (
              <Text style={styles.statusTitle}>
                Top 3 from {totalDrivers} driver{totalDrivers !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <WaitingForDriverAnimation offerCount={totalDrivers} />
        }
        renderItem={({ item, index }) => (
          <Card
            variant={index === 0 ? 'elevated' : 'outlined'}
            padding={4}
            style={[styles.offerCardWrapper, index === 0 && styles.topOfferWrapper]}
          >
            {index === 0 && (
              <Badge variant="default" size="sm" style={styles.bestBadge}>
                <Ionicons name="trophy" size={12} color={colors.white} />
                <Text style={styles.bestBadgeText}>Best Match</Text>
              </Badge>
            )}

            <View style={styles.offerTop}>
              {item.driverPhoto ? (
                <Image source={{ uri: item.driverPhoto }} style={styles.driverPhoto} />
              ) : (
                <Avatar name={item.driverName} size="md" />
              )}
              <View style={styles.driverInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.driverName} numberOfLines={1}>{item.driverName}</Text>
                  {item.verificationStatus === 'verified' && (
                    <Badge variant="default" size="sm">
                      <Ionicons name="shield-checkmark" size={10} color={colors.white} />
                      <Text style={styles.badgeText}>Verified</Text>
                    </Badge>
                  )}
                </View>
                <View style={styles.ratingRow}>
                  <StarRating value={Math.round(item.driverRating)} size="sm" />
                  <Text style={styles.ratingLabel}>
                    {item.driverRating > 0 ? item.driverRating.toFixed(1) : 'New'}
                  </Text>
                </View>
                {item.registrationNumber && (
                  <Text style={styles.regNumber}>{item.registrationNumber}</Text>
                )}
              </View>
              <View style={styles.priceCol}>
                <Text style={styles.price}>R{item.price}</Text>
                <TouchableOpacity
                  onPress={() => toggleFavourite(item.driverId)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={favourites.includes(item.driverId) ? 'heart' : 'heart-outline'}
                    size={20}
                    color={favourites.includes(item.driverId) ? colors.error : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {item.note && (
              <>
                <Divider variant="inset" margin={2} />
                <View style={styles.noteBox}>
                  <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.noteText}>"{item.note}"</Text>
                </View>
              </>
            )}

            <Divider variant="inset" margin={2} />

            <View style={[styles.commissionBox, { backgroundColor: colors.primary + '08' }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
              <Text style={styles.commissionText}>
                <Text style={styles.commissionBold}>Pay in-app:</Text>
                {' '}Driver gets R{Math.round(item.price * 0.88)} (88%) → Move-Me 12%
              </Text>
            </View>

            <View style={styles.actionRow}>
              <Button
                label="Chat"
                onPress={() => handleChat(item)}
                variant="outline"
                size="md"
                style={styles.chatBtn}
              />
              <Button
                label={accepting ? 'Confirming…' : `Accept`}
                onPress={() => handleAccept(item)}
                loading={accepting}
                size="md"
                style={styles.acceptBtn}
              />
            </View>
          </Card>
        )}
      />
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '08',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  cancelBtn: {
    paddingHorizontal: spacing[2],
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },

  // Route Card
  routeCard: {
    marginHorizontal: spacing[4],
    marginVertical: spacing[4],
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  routeIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  routeInfo: {
    flex: 1,
    gap: spacing[1],
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },

  // List
  listContent: {
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[8],
  },
  listHeader: {
    marginBottom: spacing[2],
  },
  statusText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },

  // Offer Card
  offerCardWrapper: {
    marginHorizontal: 0,
  },
  topOfferWrapper: {
    borderColor: colors.accent,
    borderWidth: 2,
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    alignSelf: 'flex-start',
    marginBottom: spacing[3],
    backgroundColor: colors.accent,
  },
  bestBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.black,
  },

  // Offer Top
  offerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  driverPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.border,
    flexShrink: 0,
  },
  driverInfo: {
    flex: 1,
    gap: spacing[1],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  driverName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  regNumber: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  priceCol: {
    alignItems: 'center',
    gap: spacing[2],
  },
  price: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.5,
  },

  // Note
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Commission
  commissionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.primary + '15',
  },
  commissionText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  commissionBold: {
    fontWeight: '800',
    color: colors.primary,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  chatBtn: {
    flex: 1,
  },
  acceptBtn: {
    flex: 1.2,
  },
});
