import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { colors } from '../../constants/colors';
import { listenToJob } from '../../services/jobService';
import { Job } from '../../types';

// Huawei HMS devices don't have Google Play Services — maps won't load
const isHuawei = Device.manufacturer?.toUpperCase().includes('HUAWEI') ||
  Device.manufacturer?.toUpperCase().includes('HONOR') || false;

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

  const [job, setJob] = useState<Job | null>(null);
  const [tick, setTick] = useState(0);
  const mapRef = useRef<MapView>(null);
  const fittedRef = useRef(false);

  useEffect(() => {
    return listenToJob(jobId, j => {
      setJob(j);
      if (j.driverLocation && !fittedRef.current) {
        fittedRef.current = true;
        fitMap(j);
      }
    });
  }, [jobId]);

  // Refresh "X ago" label every 15 s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const fitMap = (j: Job) => {
    if (!j.driverLocation) return;
    const coords = [
      { latitude: j.driverLocation.latitude, longitude: j.driverLocation.longitude },
      { latitude: j.pickup.coords.latitude, longitude: j.pickup.coords.longitude },
      { latitude: j.dropoff.coords.latitude, longitude: j.dropoff.coords.longitude },
    ];
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 60, bottom: 260, left: 60 },
      animated: true,
    });
  };

  const centreOnDriver = () => {
    if (!job?.driverLocation) return;
    mapRef.current?.animateToRegion({
      latitude: job.driverLocation.latitude,
      longitude: job.driverLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 400);
  };

  const driverCoord = job?.driverLocation
    ? { latitude: job.driverLocation.latitude, longitude: job.driverLocation.longitude }
    : null;

  const waiting = !driverCoord;

  const openInPetalMaps = () => {
    if (!driverCoord) return;
    const url = `petalmaps://navigation?daddr=${driverCoord.latitude},${driverCoord.longitude}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`geo:${driverCoord.latitude},${driverCoord.longitude}`)
    );
  };

  // Huawei fallback: show coordinates card instead of map
  if (isHuawei) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.headerOverlay}>
          <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Driver</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.huaweiWrap}>
          <Ionicons name="map-outline" size={56} color={colors.border} />
          <Text style={styles.huaweiTitle}>Live map not available</Text>
          <Text style={styles.huaweiSub}>
            Google Maps is not supported on this device. Use Petal Maps to see the driver's location.
          </Text>
          {driverCoord ? (
            <>
              <View style={styles.coordCard}>
                <Text style={styles.coordLabel}>Driver's current position</Text>
                <Text style={styles.coordText}>
                  {driverCoord.latitude.toFixed(5)}, {driverCoord.longitude.toFixed(5)}
                </Text>
                {job?.driverLocation?.updatedAt && (
                  <Text style={styles.coordAge}>Updated {timeAgo(job.driverLocation.updatedAt)}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.petalBtn} onPress={openInPetalMaps}>
                <Ionicons name="navigate" size={18} color={colors.white} />
                <Text style={styles.petalBtnText}>Open in Petal Maps</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.coordCard}>
              <Text style={styles.coordLabel}>Waiting for driver location…</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      {job && !waiting ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          showsUserLocation={false}
          showsMyLocationButton={false}
          initialRegion={{
            latitude: driverCoord!.latitude,
            longitude: driverCoord!.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {/* Pickup */}
          <Marker
            coordinate={job.pickup.coords}
            title="Pickup"
            description={job.pickup.address}
            pinColor={colors.primary}
          />

          {/* Dropoff */}
          <Marker
            coordinate={job.dropoff.coords}
            title="Dropoff"
            description={job.dropoff.address}
            pinColor={colors.danger}
          />

          {/* Driver */}
          <Marker
            coordinate={driverCoord!}
            title={job.acceptedDriverName ?? 'Driver'}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.driverMarker}>
              <Ionicons name="car" size={20} color={colors.white} />
            </View>
          </Marker>

          {/* Dashed line: driver → pickup → dropoff */}
          <Polyline
            coordinates={[driverCoord!, job.pickup.coords, job.dropoff.coords]}
            strokeColor={colors.primary}
            strokeWidth={2}
            lineDashPattern={[6, 4]}
          />
        </MapView>
      ) : (
        <View style={styles.waitingBg} />
      )}

      {/* Header overlay */}
      <SafeAreaView edges={['top']} style={styles.headerOverlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Driver</Text>
          {driverCoord ? (
            <TouchableOpacity style={styles.centreBtn} onPress={centreOnDriver}>
              <Ionicons name="locate" size={20} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
      </SafeAreaView>

      {/* Bottom card */}
      <SafeAreaView edges={['bottom']} style={styles.cardWrap}>
        <View style={styles.card}>
          {waiting ? (
            <View style={styles.waitingRow}>
              <View style={styles.waitingDot} />
              <View>
                <Text style={styles.waitingTitle}>Waiting for driver location</Text>
                <Text style={styles.waitingSub}>The driver's position will appear once they start moving</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.driverRow}>
                <View style={[styles.liveDot]} />
                <Text style={styles.driverName}>{job?.acceptedDriverName ?? 'Your driver'}</Text>
                <Text style={styles.updatedAt}>
                  {job?.driverLocation ? timeAgo(job.driverLocation.updatedAt) : ''}
                  {tick > -1 ? '' : ''}
                </Text>
              </View>

              <View style={styles.routeRow}>
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

  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  headerTitle: {
    fontSize: 16, fontWeight: '800', color: colors.text,
    backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  centreBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  driverMarker: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.white,
    shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },

  cardWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
  },
  card: {
    backgroundColor: colors.surface, margin: 12, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },

  huaweiWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 14,
  },
  huaweiTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  huaweiSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  coordCard: {
    width: '100%', backgroundColor: colors.surface, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 4,
  },
  coordLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  coordText: { fontSize: 15, fontWeight: '700', color: colors.text },
  coordAge: { fontSize: 12, color: colors.textMuted },
  petalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  petalBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  waitingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  waitingDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: colors.textMuted, marginTop: 4,
  },
  waitingTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  waitingSub: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },

  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  liveDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.7, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
  driverName: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.text },
  updatedAt: { fontSize: 12, color: colors.textMuted },

  routeRow: { gap: 0 },
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
