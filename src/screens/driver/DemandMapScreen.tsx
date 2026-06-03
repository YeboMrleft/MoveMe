import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../../constants/colors';
import { listenToOpenJobsNear } from '../../services/jobService';
import { useAuth } from '../../hooks/useAuth';
import { Job } from '../../types';
import MapboxWebView from '../../components/MapboxWebView';
import type WebView from 'react-native-webview';

// SA city fallback centres [lng, lat]
const CITY_CENTRES: Record<string, [number, number]> = {
  'Johannesburg': [28.0473, -26.2041],
  'Cape Town':    [18.4241, -33.9249],
  'Durban':       [31.0218, -29.8587],
  'Pretoria':     [28.1871, -25.7461],
  'Port Elizabeth': [25.6022, -33.9608],
};

export default function DemandMapScreen() {
  const nav = useNavigation<any>();
  const { appUser } = useAuth();
  const webRef = useRef<WebView>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [driverCenter, setDriverCenter] = useState<[number, number] | null>(null);
  const [locError, setLocError] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const city = appUser?.serviceCity ?? '';

  // Get driver's current location on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setLocError(true); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setDriverCenter([loc.coords.longitude, loc.coords.latitude]);
      } catch {
        if (!cancelled) setLocError(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!city) { setJobsLoading(false); return; }
    return listenToOpenJobsNear(city, data => {
      setJobs(data);
      setJobsLoading(false);
    });
  }, [city]);

  const locateMe = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { longitude: lng, latitude: lat } = loc.coords;
      setDriverCenter([lng, lat]);
      webRef.current?.injectJavaScript(
        `(function(){ map.flyTo({ center:[${lng},${lat}], zoom:14, duration:500 }); })(); true;`
      );
    } catch {}
  };

  // City fallback if GPS denied
  const fallbackCenter = CITY_CENTRES[city] ?? [28.0473, -26.2041];
  const mapCenter = driverCenter ?? (locError ? fallbackCenter : null);

  // Job pickup markers
  const markers = [
    // Driver's own location — shown as a distinct marker
    ...(driverCenter ? [{
      id: '__driver__',
      longitude: driverCenter[0],
      latitude: driverCenter[1],
      color: '#1E40AF',
      emoji: '🚚',
    }] : []),
    // Open job markers
    ...jobs.map(job => ({
      id: job.id,
      longitude: job.pickup.coords.longitude,
      latitude: job.pickup.coords.latitude,
      color: colors.primary,
      emoji: '📦',
    })),
  ];

  const loading = jobsLoading || !mapCenter;

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
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>
            {!mapCenter ? 'Getting your location…' : 'Loading jobs…'}
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <MapboxWebView
            center={mapCenter!}
            zoom={13}
            markers={markers}
          />

          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: '#1E40AF' }]} />
            <Text style={styles.legendText}>You</Text>
            <View style={[styles.legendDot, { backgroundColor: colors.primary, marginLeft: 8 }]} />
            <Text style={styles.legendText}>Pickup</Text>
          </View>

          {selectedJob && (
            <View style={styles.jobCard}>
              <View style={styles.routeRow}>
                <Ionicons name="radio-button-on" size={13} color={colors.primary} />
                <Text style={styles.routeText} numberOfLines={1}>{selectedJob.pickup.address}</Text>
              </View>
              <View style={[styles.routeRow, { marginTop: 4 }]}>
                <Ionicons name="location" size={13} color={colors.danger} />
                <Text style={styles.routeText} numberOfLines={1}>{selectedJob.dropoff.address}</Text>
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
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: colors.textSecondary },
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
  legend: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border, elevation: 3,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  legendText: { fontSize: 12, fontWeight: '600', color: colors.text },
  jobCard: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 12, elevation: 8,
  },
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
