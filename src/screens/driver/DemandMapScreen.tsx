import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapboxGL from '@rnmapbox/maps';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { colors } from '../../constants/colors';
import { listenToOpenJobsNear } from '../../services/jobService';
import { useAuth } from '../../hooks/useAuth';
import { Job } from '../../types';

const MAPBOX_TOKEN: string =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ??
  (Constants.expoConfig?.extra as any)?.mapboxToken ?? '';

MapboxGL.setAccessToken(MAPBOX_TOKEN);

export default function DemandMapScreen() {
  const nav = useNavigation<any>();
  const { appUser } = useAuth();
  const cameraRef = useRef<MapboxGL.Camera>(null);
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
          const valid = data
            .map(j => [j.pickup.coords.longitude, j.pickup.coords.latitude] as [number, number])
            .filter(([lng, lat]) => lng !== 0 || lat !== 0);
          if (valid.length === 0) return;
          const lngs = valid.map(c => c[0]);
          const lats = valid.map(c => c[1]);
          cameraRef.current?.fitBounds(
            [Math.max(...lngs), Math.max(...lats)],
            [Math.min(...lngs), Math.min(...lats)],
            { top: 80, right: 60, bottom: 280, left: 60 },
            600,
          );
        }, 600);
      }
    });
  }, [city]);

  const locateMe = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    cameraRef.current?.setCamera({
      centerCoordinate: [loc.coords.longitude, loc.coords.latitude],
      zoomLevel: 13,
      animationDuration: 500,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
      ) : (
        <View style={{ flex: 1 }}>
          <MapboxGL.MapView
            style={{ flex: 1 }}
            styleURL={MapboxGL.StyleURL.Street}
            onPress={() => setSelectedJob(null)}
          >
            <MapboxGL.Camera
              ref={cameraRef}
              zoomLevel={11}
              centerCoordinate={[28.0473, -26.2041]}
            />
            {jobs.map(job => (
              <MapboxGL.PointAnnotation
                key={job.id}
                id={job.id}
                coordinate={[job.pickup.coords.longitude, job.pickup.coords.latitude]}
                onSelected={() => setSelectedJob(job)}
              >
                <View style={styles.markerPin}>
                  <Ionicons name="cube-outline" size={14} color={colors.white} />
                </View>
              </MapboxGL.PointAnnotation>
            ))}
          </MapboxGL.MapView>

          <View style={styles.legend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Pickup location</Text>
          </View>

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
  emptyOverlay: { position: 'absolute', bottom: 24, left: 16, right: 16 },
  emptyCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
});
