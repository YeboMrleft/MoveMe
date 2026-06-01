import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors } from '../constants/colors';

const { width: W } = Dimensions.get('window');
const PARK_X = W * 0.42;
const TRUCK_START = -90;

const MESSAGES = [
  'Fuelling up to come collect your load…',
  'Alerting verified bakkies in your area…',
  'Drivers are reviewing your job…',
  'Finding you the best deal nearby…',
  'A bakkie is getting ready for you…',
  'Checking the route to your pickup…',
];

export default function WaitingForDriverAnimation({ offerCount }: { offerCount: number }) {
  const truckX    = useRef(new Animated.Value(TRUCK_START)).current;
  const fuelPct   = useRef(new Animated.Value(0)).current;
  const msgOpacity = useRef(new Animated.Value(1)).current;
  const dashOffset = useRef(new Animated.Value(0)).current;
  const pulse1    = useRef(new Animated.Value(0)).current;
  const pulse2    = useRef(new Animated.Value(0)).current;
  const pulse3    = useRef(new Animated.Value(0)).current;

  const [parked, setParked] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  // ── road scroll ──────────────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.timing(dashOffset, { toValue: -56, duration: 700, useNativeDriver: true })
    ).start();
  }, []);

  // ── truck drives in → parks → radar + fuel ───────────────────
  useEffect(() => {
    Animated.timing(truckX, {
      toValue: PARK_X, duration: 2400, useNativeDriver: true,
    }).start(() => {
      setParked(true);
      Animated.timing(fuelPct, { toValue: 1, duration: 2200, useNativeDriver: false }).start();

      const makePulse = (val: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(val, { toValue: 1, duration: 1800, useNativeDriver: true }),
            Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        );
      makePulse(pulse1, 0).start();
      makePulse(pulse2, 600).start();
      makePulse(pulse3, 1200).start();
    });
  }, []);

  // ── message cycling ───────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(msgOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
        .start(() => {
          setMsgIndex(i => (i + 1) % MESSAGES.length);
          Animated.timing(msgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        });
    }, 2800);
    return () => clearInterval(id);
  }, []);

  const radarStyle = (val: Animated.Value) => ({
    opacity: val.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.5, 0] }),
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.1, 3.5] }) }],
  });

  return (
    <View style={styles.root}>

      {/* ── SCENE ───────────────────────────────────────────── */}
      <View style={styles.scene}>

        {/* Sky */}
        <View style={styles.sky}>
          <View style={styles.sun} />
          <View style={[styles.cloud, { left: W * 0.08, top: 22, width: 64 }]} />
          <View style={[styles.cloud, { left: W * 0.08 + 30, top: 14, width: 44, height: 18 }]} />
          <View style={[styles.cloud, { left: W * 0.62, top: 30, width: 50 }]} />
          <View style={[styles.cloud, { left: W * 0.62 + 20, top: 20, width: 36, height: 16 }]} />
        </View>

        {/* Petrol station — right side */}
        <View style={styles.stationWrap}>
          {/* Canopy */}
          <View style={styles.canopy} />
          <View style={[styles.canopyPole, { left: 10 }]} />
          <View style={[styles.canopyPole, { right: 10 }]} />
          {/* Pump */}
          <View style={styles.pumpBox}>
            <View style={styles.pumpScreen} />
            <View style={styles.pumpNozzleWrap}>
              <View style={styles.pumpNozzle} />
            </View>
          </View>
          <Text style={styles.pumpLabel}>FUEL</Text>
        </View>

        {/* Radar circles — centred on parked truck */}
        <Animated.View style={[styles.radar, radarStyle(pulse1)]} />
        <Animated.View style={[styles.radar, radarStyle(pulse2)]} />
        <Animated.View style={[styles.radar, radarStyle(pulse3)]} />

        {/* Road */}
        <View style={styles.road}>
          <View style={styles.dashTrack}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Animated.View
                key={i}
                style={[styles.dash, { left: i * 56, transform: [{ translateX: dashOffset }] }]}
              />
            ))}
          </View>
        </View>

        {/* Truck */}
        <Animated.Text style={[styles.truck, { transform: [{ translateX: truckX }] }]}>
          🚚
        </Animated.Text>

        {/* Fuel gauge — appears after parking */}
        {parked && (
          <View style={styles.fuelGauge}>
            <Text style={styles.fuelGaugeLabel}>⛽ Fuelling up</Text>
            <View style={styles.fuelTrack}>
              <Animated.View style={[styles.fuelFill, {
                width: fuelPct.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }]} />
            </View>
          </View>
        )}
      </View>

      {/* ── INFO PANEL ──────────────────────────────────────── */}
      <View style={styles.infoPanel}>
        <Animated.Text style={[styles.message, { opacity: msgOpacity }]}>
          {MESSAGES[msgIndex]}
        </Animated.Text>

        <View style={styles.statusRow}>
          <View style={[styles.dot, offerCount > 0 && styles.dotActive]} />
          {offerCount > 0 ? (
            <Text style={styles.offerText}>
              {offerCount} driver{offerCount !== 1 ? 's' : ''} responded — scroll down to review
            </Text>
          ) : (
            <Text style={styles.searchText}>Searching for drivers in your area…</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const RADAR_SIZE = 90;
const TRUCK_BOTTOM = 36;

const styles = StyleSheet.create({
  root: { width: '100%' },

  // Scene
  scene: { height: 260, position: 'relative', overflow: 'hidden' },

  sky: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 60,
    backgroundColor: '#C9E8F7',
  },
  sun: {
    position: 'absolute', top: 18, right: 28,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FFD84D',
    shadowColor: '#FFB612', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  cloud: {
    position: 'absolute', height: 22, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },

  // Petrol station
  stationWrap: {
    position: 'absolute', right: 24, bottom: 58, alignItems: 'center', width: 80,
  },
  canopy: {
    width: 80, height: 8, backgroundColor: '#007A4D', borderRadius: 3,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  canopyPole: {
    position: 'absolute', top: 8, width: 6, height: 36, backgroundColor: '#555', borderRadius: 2,
  },
  pumpBox: {
    marginTop: 36, width: 28, height: 40, backgroundColor: '#333', borderRadius: 4,
    alignItems: 'center', paddingTop: 6,
  },
  pumpScreen: {
    width: 16, height: 10, backgroundColor: '#00FF88', borderRadius: 2, opacity: 0.8,
  },
  pumpNozzleWrap: {
    position: 'absolute', right: -10, top: 10,
  },
  pumpNozzle: {
    width: 10, height: 6, backgroundColor: '#666', borderRadius: 2,
  },
  pumpLabel: {
    fontSize: 9, fontWeight: '800', color: '#007A4D', marginTop: 2, letterSpacing: 1,
  },

  // Radar
  radar: {
    position: 'absolute',
    width: RADAR_SIZE, height: RADAR_SIZE, borderRadius: RADAR_SIZE / 2,
    borderWidth: 2, borderColor: colors.primary,
    left: PARK_X + 24 - RADAR_SIZE / 2,
    bottom: TRUCK_BOTTOM + 14,
  },

  // Road
  road: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
    backgroundColor: '#555',
  },
  dashTrack: {
    position: 'absolute', top: 27, left: 0, right: 0, height: 6, overflow: 'hidden',
  },
  dash: {
    position: 'absolute', width: 36, height: 6, borderRadius: 3, backgroundColor: '#FFD84D',
  },

  // Truck
  truck: {
    position: 'absolute', bottom: TRUCK_BOTTOM, fontSize: 48,
  },

  // Fuel gauge
  fuelGauge: {
    position: 'absolute', bottom: 66, left: PARK_X + 58,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, gap: 4, minWidth: 110,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  fuelGaugeLabel: { fontSize: 10, fontWeight: '700', color: colors.text },
  fuelTrack: {
    height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden',
  },
  fuelFill: {
    height: 6, backgroundColor: '#25C265', borderRadius: 3,
  },

  // Info panel
  infoPanel: {
    padding: 20, paddingTop: 16, alignItems: 'center', gap: 12,
  },
  message: {
    fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center', lineHeight: 22,
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent,
  },
  dotActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.7, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
  offerText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  searchText: { fontSize: 13, color: colors.textSecondary },
});
