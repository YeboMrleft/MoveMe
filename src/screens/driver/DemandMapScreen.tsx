import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { colors } from '../../constants/colors';
import { listenToOpenJobsNear } from '../../services/jobService';
import { useAuth } from '../../hooks/useAuth';
import { Job } from '../../types';

const isHuawei = Device.manufacturer?.toUpperCase().includes('HUAWEI') ||
  Device.manufacturer?.toUpperCase().includes('HONOR') || false;

export default function DemandMapScreen() {
  const nav = useNavigation<any>();
  const { appUser } = useAuth();
  const mapRef = useRef<MapView>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const city = appUser?.serviceCity ?? '';

  useEffect(() => {
    if (!city) { setLoading(false); return; }
    return listenToOpenJobsNear(city, data => {
      setJobs(data);
      setLoading(false);
      if (data.length > 0) {
        setTimeout(() => {
          const coords = data.map(j => ({
            latitude: j.pickup.coords.latitude,
            longitude: j.pickup.coords.longitude,
          })).filter(c => c.latitude !== 0);
          if (coords.length > 0) {
            mapRef.current?.fitToCoordinates(coords, {
              edgePadding: { top: 80, right: 60, bottom: 280, left: 60 },
              animated: true,
            });
          }
        }, 600);
      }
    });
  }, [city]);

  const locateMe = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    mapRef.current?.animateToRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 500);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Job Demand</Text>
          <Text style={styles.headerSub}>{city} · {jobs.length} open {jobs.length === 1 ? 'job' : 'jobs'}</Text>
        </View>
        <TouchableOpacity onPress={locateMe} style={styles.locateBtn}>
          <Ionicons name="locate-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      ) : isHuawei ? (
        <View style={styles.huaweiWrap}>
          <Ionicons name="map-outline" size={56} color={colors.border} />
          <Text style={styles.huaweiTitle}>Map not available</Text>
          <Text style={styles.huaweiSub}>
            Google Maps is not supported on this device. Browse open jobs from the Jobs tab instead.
          </Text>
          <View style={styles.huaweiCount}>
            <Ionicons name="cube-outline" size={20} color={colors.primary} />
            <Text style={styles.huaweiCountText}>{jobs.length} open job{jobs.length !== 1 ? 's' : ''} in {city}</Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: -26.2041,
              longitude: 28.0473,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5,
            }}
            onPress={() => setSelectedJob(null)}
          >
            {jobs.map(job => (
              <Marker
                key={job.id}
                coordinate={{
                  latitude: job.pickup.coords.latitude,
                  longitude: job.pickup.coords.longitude,
                }}
                onPress={() => setSelectedJob(job)}
              >
                <View style={styles.markerPin}>
                  <Ionicons name="cube-outline" size={14} color={colors.white} />
                </View>
              </Marker>
            ))}
          </MapView>

          {/* Job count legend */}
          <View style={styles.legend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Pickup location</Text>
          </View>

          {/* Selected job card */}
          {selectedJob && (
            <View style={styles.jobCard}>
              <View style={styles.jobCardRoute}>
                <View style={styles.routeRow}>
                  <Ionicons name="radio-button-on" size={13} color={colors.primary} />
                  <Text style={styles.routeText} numberOfLines={1}>{selectedJob.pickup.address}</Text>
                </View>
                <View style={[styles.routeRow, { marginTop: 4 }]}>
                  <Ionicons name="location" size={13} color={colors.danger} />
                  <Text style={styles.routeText} numberOfLines={1}>{selectedJob.dropoff.address}</Text>
                </View>
              </View>
              {selectedJob.description ? (
                <Text style={styles.jobDesc} numberOfLines={1}>{selectedJob.description}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.viewBtn}
                onPress={() => { setSelectedJob(null); nav.navigate('JobDetail', { jobId: selectedJob.id }); }}
                activeOpacity={0.85}
              >
                <Text style={styles.viewBtnText}>View Job</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {jobs.length === 0 && (
            <View style={styles.emptyOverlay}>
              <View style={styles.emptyCard}>
                <Ionicons name="search-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No open jobs in {city}</Text>
                <Text style={styles.emptyText}>Check back soon — new jobs appear here as customers post them.</Text>
              </View>
            </View>
          )}
        </View>
      )}
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
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  locateBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  markerPin: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: colors.white,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  legend: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  legendText: { fontSize: 12, fontWeight: '600', color: colors.text },
  jobCard: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  jobCardRoute: { gap: 0 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  jobDesc: { fontSize: 13, color: colors.textSecondary },
  viewBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 13, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  viewBtnText: { fontSize: 15, fontWeight: '800', color: colors.white },
  emptyOverlay: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
  },
  emptyCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  huaweiWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 14,
  },
  huaweiTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  huaweiSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  huaweiCount: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary + '12', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  huaweiCountText: { fontSize: 15, fontWeight: '700', color: colors.primary },
});
