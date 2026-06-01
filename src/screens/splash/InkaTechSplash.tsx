import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const MON_W = width * 0.80;
const MON_H = MON_W * 0.66;
const NECK_W = MON_W * 0.12;
const BASE_W = MON_W * 0.42;

interface Props {
  opacity: Animated.Value;
}

const CODE_LINES: Array<{ tokens: Array<{ text: string; color: string }> }> = [
  { tokens: [{ text: '<script>', color: '#64B5F6' }] },
  { tokens: [
    { text: '  const ', color: '#CE93D8' },
    { text: 'app', color: '#80DEEA' },
    { text: ' = ', color: '#E0E0E0' },
    { text: '"Move-Me"', color: '#A5D6A7' },
    { text: ';', color: '#E0E0E0' },
  ]},
  { tokens: [
    { text: '  const ', color: '#CE93D8' },
    { text: 'fleet', color: '#80DEEA' },
    { text: ' = ', color: '#E0E0E0' },
    { text: '"bakkie"', color: '#A5D6A7' },
    { text: ';', color: '#E0E0E0' },
  ]},
  { tokens: [
    { text: '  if ', color: '#CE93D8' },
    { text: '(driver.ready)', color: '#80DEEA' },
    { text: ' {', color: '#E0E0E0' },
  ]},
  { tokens: [
    { text: '    launch', color: '#FFF59D' },
    { text: '(app);', color: '#E0E0E0' },
    { text: ' // 🚀', color: '#546E7A' },
  ]},
  { tokens: [{ text: '  }', color: '#E0E0E0' }] },
  { tokens: [
    { text: '  ', color: '#E0E0E0' },
    { text: '// 0101', color: '#4CAF50' },
  ]},
  { tokens: [{ text: '</script>', color: '#64B5F6' }] },
];

export default function InkaTechSplash({ opacity }: Props) {
  const monitorScale = useRef(new Animated.Value(0.3)).current;
  const monitorOpacity = useRef(new Animated.Value(0)).current;
  const screenGlow = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameTranslate = useRef(new Animated.Value(16)).current;
  const solutionsOpacity = useRef(new Animated.Value(0)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const flagOpacity = useRef(new Animated.Value(0)).current;

  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    // 1. Monitor pops in
    Animated.parallel([
      Animated.spring(monitorScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.timing(monitorOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      // 2. Screen powers on
      Animated.timing(screenGlow, { toValue: 1, duration: 500, useNativeDriver: false }).start(() => {
        // 3. Type code lines
        typeNextLine(0);
      });
    });

    // Cursor blink loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const typeNextLine = (index: number) => {
    if (index >= CODE_LINES.length) {
      // All lines typed — show company name
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(nameOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(nameTranslate, { toValue: 0, tension: 70, friction: 9, useNativeDriver: true }),
        ]).start(() => {
          Animated.parallel([
            Animated.timing(solutionsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(flagOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          ]).start();
        });
      }, 300);
      return;
    }
    setVisibleLines(index + 1);
    setTimeout(() => typeNextLine(index + 1), 220);
  };

  const screenBg = screenGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#0A1628'],
  });

  return (
    <Animated.View style={[styles.container, { opacity }]}>

      {/* Subtle grid */}
      <View style={styles.gridOverlay} pointerEvents="none">
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={`h${i}`} style={[styles.gridH, { top: (height / 7) * i }]} />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={`v${i}`} style={[styles.gridV, { left: (width / 5) * i }]} />
        ))}
      </View>

      <View style={styles.center}>

        {/* ── MONITOR ── */}
        <Animated.View
          style={[
            styles.monitorWrap,
            { opacity: monitorOpacity, transform: [{ scale: monitorScale }] },
          ]}
        >
          {/* Monitor body */}
          <View style={styles.monitorBody}>
            {/* Bezel top bar */}
            <View style={styles.bezelTop}>
              <View style={styles.camDot} />
            </View>

            {/* Screen */}
            <Animated.View style={[styles.screen, { backgroundColor: screenBg }]}>
              {/* Scan-line overlay */}
              <View style={styles.scanLines} pointerEvents="none">
                {Array.from({ length: 18 }).map((_, i) => (
                  <View key={i} style={styles.scanLine} />
                ))}
              </View>

              {/* Code */}
              <View style={styles.codeArea}>
                {CODE_LINES.slice(0, visibleLines).map((line, li) => (
                  <View key={li} style={styles.codeLine}>
                    <Text style={styles.lineNum}>{(li + 1).toString().padStart(2, ' ')} </Text>
                    {line.tokens.map((tok, ti) => (
                      <Text key={ti} style={[styles.codeText, { color: tok.color }]}>
                        {tok.text}
                      </Text>
                    ))}
                    {li === visibleLines - 1 && (
                      <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
                        █
                      </Animated.Text>
                    )}
                  </View>
                ))}
              </View>

              {/* Status bar */}
              <View style={styles.statusBar}>
                <Text style={styles.statusText}>INKA-TECH  ●  JS</Text>
                <Text style={styles.statusText}>UTF-8  ✓</Text>
              </View>
            </Animated.View>
          </View>

          {/* Stand neck */}
          <View style={styles.neck} />

          {/* Stand base */}
          <View style={styles.base} />
        </Animated.View>

        {/* ── COMPANY NAME ── */}
        <Animated.View
          style={[
            styles.nameBlock,
            { opacity: nameOpacity, transform: [{ translateY: nameTranslate }] },
          ]}
        >
          <Text style={styles.nameInka}>INKA</Text>
          <Text style={styles.nameDash}>-</Text>
          <Text style={styles.nameTech}>TECH</Text>
        </Animated.View>

        <Animated.Text style={[styles.solutions, { opacity: solutionsOpacity }]}>
          S O L U T I O N S
        </Animated.Text>

      </View>

      {/* SA flag bar */}
      <Animated.View style={[styles.flagBar, { opacity: flagOpacity }]}>
        {['#000000', '#FFB612', '#007A4D', '#007A4D', '#FFFFFF', '#E03C31', '#002395'].map((c, i) => (
          <View key={i} style={[styles.stripe, { backgroundColor: c }]} />
        ))}
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080C14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridOverlay: { ...StyleSheet.absoluteFillObject },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.025)' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.025)' },

  center: { alignItems: 'center' },

  // Monitor
  monitorWrap: { alignItems: 'center', marginBottom: 28 },
  monitorBody: {
    width: MON_W,
    borderRadius: 14,
    backgroundColor: '#1A2D50',
    shadowColor: '#4FC3F7',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    overflow: 'hidden',
  },
  bezelTop: {
    height: 20,
    backgroundColor: '#1A2D50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#2A4060',
  },
  screen: {
    height: MON_H,
    margin: 10,
    marginTop: 0,
    borderRadius: 6,
    overflow: 'hidden',
  },
  scanLines: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  scanLine: {
    height: 2,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  codeArea: {
    flex: 1,
    padding: 10,
    paddingTop: 8,
  },
  codeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  lineNum: {
    fontSize: 9,
    color: '#2A4060',
    fontFamily: 'monospace',
    width: 20,
  },
  codeText: {
    fontSize: 10.5,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  cursor: {
    fontSize: 10,
    color: '#4FC3F7',
  },
  statusBar: {
    height: 18,
    backgroundColor: '#0D2040',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: 8,
    color: '#2A5080',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },

  // Stand
  neck: {
    width: NECK_W,
    height: 18,
    backgroundColor: '#142240',
  },
  base: {
    width: BASE_W,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#1A2D50',
  },

  // Text
  nameBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  nameInka: {
    fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: 5,
  },
  nameDash: {
    fontSize: 28, fontWeight: '100', color: '#FFB612', marginHorizontal: 2,
  },
  nameTech: {
    fontSize: 36, fontWeight: '200', color: '#FFB612', letterSpacing: 5,
  },
  solutions: {
    fontSize: 11, fontWeight: '600', color: '#3A5070',
    letterSpacing: 5,
  },

  flagBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 6, flexDirection: 'row',
  },
  stripe: { flex: 1 },
});
