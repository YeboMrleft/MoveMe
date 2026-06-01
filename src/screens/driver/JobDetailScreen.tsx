import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { listenToJob } from '../../services/jobService';
import { hasDriverSubmittedOffer } from '../../services/offerService';
import { getRouteDistance, RouteInfo } from '../../services/distanceService';
import { JOB_CATEGORIES } from '../../constants/categories';
import { Job } from '../../types';
import { formatScheduledTime } from '../../utils/formatSchedule';
import Button from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { DriverStackParams } from '../../navigation/DriverNavigator';

type Nav = StackNavigationProp<DriverStackParams, 'JobDetail'>;
type Route = RouteProp<DriverStackParams, 'JobDetail'>;

export default function JobDetailScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { jobId } = params;
  const { appUser } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const uid = getAuth().currentUser?.uid ?? '';

  useEffect(() => {
    const unsub = listenToJob(jobId, j => {
      setJob(j);
      setLoading(false);
      if (j && !routeInfo) {
        getRouteDistance(j.pickup.coords, j.dropoff.coords).then(setRouteInfo);
      }
    });
    hasDriverSubmittedOffer(jobId, uid).then(setAlreadySubmitted);
    return unsub;
  }, [jobId, uid]);

  if (loading || !job) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const isOpen = ['open', 'reviewing'].includes(job.status);
  const notVerified = appUser?.verificationStatus !== 'verified';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Route */}
        <View style={styles.routeCard}>
          <View style={styles.locItem}>
            <View style={[styles.locDot, { backgroundColor: colors.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locLabel}>Pickup</Text>
              <Text style={styles.locValue}>{job.pickup.address}</Text>
            </View>
          </View>
          <View style={styles.locConnector} />
          <View style={styles.locItem}>
            <View style={[styles.locDot, { backgroundColor: colors.danger }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locLabel}>Dropoff</Text>
              <Text style={styles.locValue}>{job.dropoff.address}</Text>
            </View>
          </View>
        </View>

        {/* Scheduled time */}
        {job.when !== 'now' && (
          <View style={styles.scheduledCard}>
            <Ionicons name="calendar-outline" size={18} color={colors.info} />
            <View>
              <Text style={styles.scheduledLabel}>Scheduled pickup</Text>
              <Text style={styles.scheduledValue}>{formatScheduledTime(job.when)}</Text>
            </View>
          </View>
        )}

        {/* Distance & price suggestion */}
        {routeInfo && (
          <View style={styles.distanceCard}>
            <View style={styles.distanceStats}>
              <View style={styles.distanceStat}>
                <Ionicons name="map-outline" size={18} color={colors.primary} />
                <Text style={styles.distanceVal}>{routeInfo.distanceKm} km</Text>
                <Text style={styles.distanceLabel}>road distance</Text>
              </View>
              <View style={styles.distanceDivider} />
              <View style={styles.distanceStat}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={styles.distanceVal}>~{routeInfo.durationMin} min</Text>
                <Text style={styles.distanceLabel}>drive time</Text>
              </View>
              <View style={styles.distanceDivider} />
              <View style={styles.distanceStat}>
                <Ionicons name="cash-outline" size={18} color={colors.primary} />
                <Text style={styles.distanceVal}>R{routeInfo.suggestedMin}–{routeInfo.suggestedMax}</Text>
                <Text style={styles.distanceLabel}>suggested</Text>
              </View>
            </View>
          </View>
        )}

        {/* Load photo */}
        {job.loadPhotoUrl ? (
          <View style={styles.photoCard}>
            <Text style={styles.infoLabel}>Load Photo</Text>
            <Image source={{ uri: job.loadPhotoUrl }} style={styles.loadPhoto} resizeMode="cover" />
          </View>
        ) : null}

        {/* Category */}
        {job.category && (() => {
          const cat = JOB_CATEGORIES.find(c => c.key === job.category);
          return cat ? (
            <View style={[styles.catBadge, { backgroundColor: cat.color + '15', borderColor: cat.color + '40' }]}>
              <Ionicons name={cat.icon as any} size={16} color={cat.color} />
              <Text style={[styles.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
            </View>
          ) : null;
        })()}

        {/* Job info */}
        {job.description ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Goods</Text>
            <Text style={styles.infoValue}>{job.description}</Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Posted by</Text>
          <Text style={styles.infoValue}>{job.posterName}</Text>
          <Text style={styles.infoMeta}>{new Date(job.createdAt).toLocaleString('en-ZA')}</Text>
        </View>

        {job.offersCount !== undefined && job.offersCount > 0 && (
          <View style={[styles.infoCard, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <Ionicons name="people-outline" size={20} color={colors.info} />
            <Text style={styles.offersCount}>
              {job.offersCount} driver{job.offersCount !== 1 ? 's' : ''} have submitted a price
            </Text>
          </View>
        )}

        {/* CTA */}
        <View style={styles.cta}>
          {notVerified ? (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={20} color={colors.danger} />
              <Text style={styles.warningText}>
                You need to complete identity verification before submitting offers.
                Go to your Profile to verify.
              </Text>
            </View>
          ) : !isOpen ? (
            <View style={styles.closedBadge}>
              <Text style={styles.closedText}>This job is no longer accepting offers</Text>
            </View>
          ) : (
            <Button
              label={alreadySubmitted ? 'Update My Offer' : 'Submit My Price'}
              onPress={() => nav.navigate('SubmitOffer', { jobId })}
              variant={alreadySubmitted ? 'outline' : 'primary'}
            />
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
  container: { padding: 20, gap: 14 },
  routeCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: colors.border,
  },
  locItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  locDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  locConnector: { width: 2, height: 20, backgroundColor: colors.border, marginLeft: 5, marginVertical: 4 },
  locLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  locValue: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },
  distanceCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  distanceStats: { flexDirection: 'row', alignItems: 'center' },
  distanceStat: { flex: 1, alignItems: 'center', gap: 3 },
  distanceDivider: { width: 1, height: 36, backgroundColor: colors.primary + '25' },
  distanceVal: { fontSize: 15, fontWeight: '900', color: colors.primary },
  distanceLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  scheduledCard: {
    backgroundColor: colors.info + '12', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.info + '30',
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  scheduledLabel: { fontSize: 11, fontWeight: '700', color: colors.info, textTransform: 'uppercase', letterSpacing: 0.4 },
  scheduledValue: { fontSize: 15, fontWeight: '700', color: colors.info, marginTop: 2 },
  photoCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 10,
  },
  loadPhoto: { width: '100%', height: 200, borderRadius: 8 },
  infoCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  infoLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, color: colors.text, marginTop: 4 },
  infoMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  offersCount: { fontSize: 14, fontWeight: '600', color: colors.info },
  cta: { marginTop: 8 },
  warningBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#FFF0EE',
    borderRadius: 10, padding: 14, alignItems: 'flex-start',
  },
  warningText: { flex: 1, fontSize: 13, color: colors.danger, lineHeight: 18 },
  closedBadge: {
    backgroundColor: colors.border, borderRadius: 12, padding: 16, alignItems: 'center',
  },
  closedText: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  catBadgeText: { fontSize: 14, fontWeight: '700' },
});
