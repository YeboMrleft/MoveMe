import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { listenToJob } from '../../services/jobService';
import { submitOffer, hasDriverSubmittedOffer } from '../../services/offerService';
import { consumePaymentResult } from '../../services/paymentResultStore';
import { sendPushNotification } from '../../services/notificationService';
import { getRouteDistance, RouteInfo } from '../../services/distanceService';
import { Job } from '../../types';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../hooks/useAuth';
import { DriverStackParams } from '../../navigation/DriverNavigator';

type Nav = StackNavigationProp<DriverStackParams, 'SubmitOffer'>;
type Route = RouteProp<DriverStackParams, 'SubmitOffer'>;

export default function SubmitOfferScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { jobId } = params;
  const { appUser } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingJob, setLoadingJob] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const uid = getAuth().currentUser?.uid ?? '';

  useEffect(() => {
    const unsub = listenToJob(jobId, j => {
      setJob(j);
      setLoadingJob(false);
      if (j && !routeInfo) {
        getRouteDistance(j.pickup.coords, j.dropoff.coords).then(info => {
          if (info) {
            setRouteInfo(info);
            setPrice(p => p || String(info.suggestedMin));
          }
        });
      }
    });
    hasDriverSubmittedOffer(jobId, uid).then(setAlreadySubmitted);
    return unsub;
  }, [jobId, uid]);

  // Auto-submit when returning from PaymentScreen
  useFocusEffect(
    useCallback(() => {
      const result = consumePaymentResult();
      if (result) {
        submitAfterPayment(price, note);
      }
    }, [price, note]),
  );

  const submitAfterPayment = async (priceStr: string, noteStr: string) => {
    if (!appUser || loading) return;
    const parsed = parseFloat(priceStr);
    if (!priceStr || isNaN(parsed) || parsed <= 0) return;
    setLoading(true);
    try {
      await submitOffer({
        jobId,
        driverId: uid,
        driverName: appUser.name,
        driverRating: appUser.rating,
        driverPhoto: appUser.profilePhoto,
        registrationNumber: appUser.registrationNumber,
        verificationStatus: appUser.verificationStatus,
        price: parsed,
        note: noteStr.trim() || undefined,
      });
      if (job?.posterId) {
        sendPushNotification(
          job.posterId,
          'New offer on your job!',
          `${appUser.name} submitted a price of R${parsed.toFixed(0)}`,
          'newOffer'
        );
      }
      Alert.alert(
        'Offer submitted!',
        `Your price of R${parsed.toFixed(0)} has been submitted. You'll be notified if the customer selects you.`,
        [{ text: 'OK', onPress: () => nav.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const parsed = parseFloat(price);
    if (!price || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid price', 'Enter a valid amount in rands.');
      return;
    }
    if (!appUser) return;

    if (appUser.verificationStatus === 'rejected') {
      Alert.alert(
        'Verification rejected',
        'Your identity verification was not successful. Please contact support or re-submit your documents.'
      );
      return;
    }

    // Navigate to payment — returns here with paymentComplete: true
    nav.navigate('Payment', {
      purpose: 'driver_offer',
      referenceId: jobId,
      returnTo: 'SubmitOffer',
      extra: { jobId, priceValue: price, noteValue: note },
    });
  };

  if (loadingJob) {
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
        <Text style={styles.headerTitle}>Submit Price</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {job && (
          <View style={styles.jobCard}>
            <View style={styles.locRow}>
              <Ionicons name="radio-button-on" size={14} color={colors.primary} />
              <Text style={styles.locText} numberOfLines={1}>{job.pickup.address}</Text>
            </View>
            <View style={styles.locLine} />
            <View style={styles.locRow}>
              <Ionicons name="location" size={14} color={colors.danger} />
              <Text style={styles.locText} numberOfLines={1}>{job.dropoff.address}</Text>
            </View>
            {job.description ? (
              <Text style={styles.desc}>{job.description}</Text>
            ) : null}
          </View>
        )}

        {routeInfo && (
          <View style={styles.distanceBanner}>
            <View style={styles.distanceRow}>
              <View style={styles.distanceStat}>
                <Ionicons name="map-outline" size={16} color={colors.primary} />
                <Text style={styles.distanceVal}>{routeInfo.distanceKm} km</Text>
              </View>
              <View style={styles.distanceDivider} />
              <View style={styles.distanceStat}>
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text style={styles.distanceVal}>~{routeInfo.durationMin} min</Text>
              </View>
            </View>
            <View style={styles.suggestionRow}>
              <Text style={styles.suggestionLabel}>Suggested price</Text>
              <Text style={styles.suggestionRange}>R{routeInfo.suggestedMin} – R{routeInfo.suggestedMax}</Text>
            </View>
            <Text style={styles.suggestionNote}>
              R80 base + R8–12/km · you can set any price
            </Text>
          </View>
        )}

        {alreadySubmitted ? (
          <View style={styles.alreadyBox}>
            <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
            <Text style={styles.alreadyTitle}>Offer already submitted</Text>
            <Text style={styles.alreadyText}>You can update your price below and resubmit.</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Your price</Text>
        <Text style={styles.sectionDesc}>
          Enter the amount in rands you'd charge for this trip. Be competitive — the customer sees the 3 best offers.
        </Text>

        <Input
          label="Price (R)"
          prefix="R"
          value={price}
          onChangeText={setPrice}
          placeholder="0"
          keyboardType="numeric"
        />

        <Input
          label="Short note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. I have blankets and straps"
          multiline
          numberOfLines={2}
          style={{ height: 70, textAlignVertical: 'top', paddingTop: 10 }}
        />

        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>How it works</Text>
          <View style={styles.howRow}>
            <View style={styles.howDot} />
            <Text style={styles.howText}>All drivers submit their price independently</Text>
          </View>
          <View style={styles.howRow}>
            <View style={styles.howDot} />
            <Text style={styles.howText}>Move-Me selects the 3 best offers based on price and rating</Text>
          </View>
          <View style={styles.howRow}>
            <View style={styles.howDot} />
            <Text style={styles.howText}>The customer picks one and you get notified immediately</Text>
          </View>
        </View>

        <Button
          label={alreadySubmitted ? 'Update Offer — Pay R10' : 'Submit Offer — Pay R10'}
          onPress={handleSubmit}
          loading={loading}
          style={styles.mt}
        />
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
  container: { padding: 20, gap: 0 },
  jobCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 20,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locLine: { width: 2, height: 14, backgroundColor: colors.border, marginLeft: 6, marginVertical: 3 },
  locText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  desc: { fontSize: 13, color: colors.textSecondary, marginTop: 10 },
  distanceBanner: {
    backgroundColor: colors.primary + '12',
    borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: colors.primary + '30', gap: 10,
  },
  distanceRow: { flexDirection: 'row', alignItems: 'center' },
  distanceStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  distanceVal: { fontSize: 15, fontWeight: '800', color: colors.primary },
  distanceDivider: { width: 1, height: 20, backgroundColor: colors.primary + '30' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  suggestionLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  suggestionRange: { fontSize: 16, fontWeight: '900', color: colors.primary },
  suggestionNote: { fontSize: 11, color: colors.textMuted },
  alreadyBox: {
    backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 16,
    alignItems: 'center', gap: 6, marginBottom: 20,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  alreadyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  alreadyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 },
  howItWorks: {
    backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 16,
    marginTop: 8, gap: 10,
  },
  howTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  howText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  mt: { marginTop: 20, marginBottom: 32 },
});
