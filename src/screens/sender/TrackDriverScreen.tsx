import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { listenToJob } from '../../services/jobService';
import { Job } from '../../types';
import MapboxWebView from '../../components/MapboxWebView';
import type WebView from 'react-native-webview';

type Params = { TrackDriver: { jobId: string } };

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export default function TrackDriverScreen() {
  const nav = useNavigation<any>();
  const { params } = useRoute<RouteProp<Params, 'TrackDriver'>>();
  const { jobId } = params;
  const webRef = useRef<WebView>(null);

  const [job, setJob] = useState<Job | null>(null);
  const [tick, setTick] = useState(0);
  const fittedRef = useRef(false);
  const mapReady = useRef(false);

  useEffect(() => {
    return listenToJob(jobId, j => {
      setJob(prev => {
        if (j.driverLocation && mapReady.current) {
          // Update driver marker live without re-rendering the whole WebView
          webRef.current?.injectJavaScript(
            `(function(){
              window.addOrUpdateMarker('driver',${j.driverLocation.longitude},${j.driverLocation.latitude},'${colors.primary}','🚚');
              window.updateRoute(
                [[${j.driverLocation.longitude},${j.driverLocation.latitude}],
                 [${j.pickup.coords.longitude},${j.pickup.coords.latitude}],
                 [${j.dropoff.coords.longitude},${j.dropoff.coords.latitude}]],
                '${colors.primary}'
              );
              ${!fittedRef.current ? `
              fittedRef_done=true;
              var lngs=[${j.driverLocation.longitude},${j.pickup.coords.longitude},${j.dropoff.coords.longitude}];
              var lats=[${j.driverLocation.latitude},${j.pickup.coords.latitude},${j.dropoff.coords.latitude}];
              window.fitBounds(
                [Math.min(...lngs),Math.min(...lats)],
                [Math.max(...lngs),Math.max(...lats)],
                {top:80,right:60,bottom:260,left:60}
              );` : ''}
            })(); true;`
          );
          if (!fittedRef.current) fittedRef.current = true;
        }
        return j;
      });
    });
  }, [jobId]);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const centreOnDriver = () => {
    if (!job?.driverLocation) return;
    webRef.current?.injectJavaScript(
      `(function(){ map.flyTo({ center:[${job.driverLocation.longitude},${job.driverLocation.latitude}], zoom:14, duration:400 }); })(); true;`
    );
  };

  const driverLoc = job?.driverLocation ?? null;
  const waiting = !driverLoc;

  // Build initial markers + route for the WebView
  const initialMarkers = job && driverLoc ? [
    { id: 'pickup',  longitude: job.pickup.coords.longitude,  latitude: job.pickup.coords.latitude,  color: colors.primary, emoji: '📍' },
    { id: 'dropoff', longitude: job.dropoff.coords.longitude, latitude: job.dropoff.coords.latitude, color: colors.danger,  emoji: '🏁' },
    { id: 'driver',  longitude: driverLoc.longitude,          latitude: driverLoc.latitude,           color: colors.primary, emoji: '🚚' },
  ] : [];

  const route = job && driverLoc ? {
    coordinates: [
      [driverLoc.longitude, driverLoc.latitude] as [number, number],
      [job.pickup.coords.longitude, job.pickup.coords.latitude] as [number, number],
      [job.dropoff.coords.longitude, job.dropoff.coords.latitude] as [number, number],
    ],
    color: colors.primary,
  } : undefined;

  const center: [number, number] = driverLoc
    ? [driverLoc.longitude, driverLoc.latitude]
    : [28.0473, -26.2041];

  return (
    <View style={styles.root}>
      {!waiting ? (
        <MapboxWebView
          center={center}
          zoom={12}
          markers={initialMarkers}
          route={route}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={styles.waitingBg} />
      )}

      <SafeAreaView edges={['top']} style={styles.headerOverlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Driver</Text>
          {driverLoc ? (
            <TouchableOpacity style={styles.centreBtn} onPress={centreOnDriver}>
              <Ionicons name="locate" size={20} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.cardWrap}>
        <View style={styles.card}>
          {waiting ? (
            <View style={styles.waitingRow}>
              <View style={styles.waitingDot} />
              <View>
                <Text style={styles.waitingTitle}>Waiting for driver location</Text>
                <Text style={styles.waitingSub}>Updates once the driver starts moving</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.driverRow}>
                <View style={styles.liveDot} />
                <Text style={styles.driverName}>{job?.acceptedDriverName ?? 'Your driver'}</Text>
                <Text style={styles.updatedAt}>
                  {job?.driverLocation ? timeAgo(job.driverLocation.updatedAt) : ''}
                  {tick > -1 ? '' : ''}
                </Text>
              </View>
              <View style={styles.routeBlock}>
                <View style={styles.routeItem}>
                  <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.routeText} numberOfLines={1}>{job?.pickup.address}</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routeItem}>
                  <View style={[styles.routeDot, { backgroundColor: colors.danger }]} />
                  <Text style={styles.routeText} numberOfLines={1}>{job?.dropoff.address}</Text>
                </View>
              </View>
              {job?.agreedPrice ? (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Agreed price</Text>
                  <Text style={styles.priceValue}>R{job.agreedPrice}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  waitingBg: { flex: 1, backgroundColor: '#E8EDF0' },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  headerTitle: {
    fontSize: 16, fontWeight: '800', color: colors.text,
    backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, elevation: 3,
  },
  centreBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  cardWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 },
  card: {
    backgroundColor: colors.surface, margin: 12, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  waitingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  waitingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.textMuted, marginTop: 4 },
  waitingTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  waitingSub: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  liveDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.7, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
  driverName: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.text },
  updatedAt: { fontSize: 12, color: colors.textMuted },
  routeBlock: { gap: 0 },
  routeItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 2, height: 14, backgroundColor: colors.border, marginLeft: 4, marginVertical: 2 },
  routeText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  priceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.divider,
  },
  priceLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  priceValue: { fontSize: 22, fontWeight: '900', color: colors.primary },
});
