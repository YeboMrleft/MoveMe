import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Props {
  opacity: Animated.Value;
}

const FLAG_COLORS = ['#002395', '#E03C31', '#FFFFFF', '#007A4D', '#FFB612', '#000000'];

export default function MoveMeSplash({ opacity }: Props) {
  const circleScale = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const topBarTranslate = useRef(new Animated.Value(-20)).current;
  const bottomBarTranslate = useRef(new Animated.Value(20)).current;
  const barsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Background bloom
      Animated.spring(circleScale, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
      // Logo springs in
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      ]),
      // Tagline fades in
      Animated.timing(tagOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      // Flag bars slide in
      Animated.parallel([
        Animated.timing(barsOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(topBarTranslate, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
        Animated.spring(bottomBarTranslate, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity }]}>

      {/* Radial bloom */}
      <Animated.View
        style={[styles.bloomCircle, { transform: [{ scale: circleScale }] }]}
        pointerEvents="none"
      />

      {/* Logo image */}
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.tagBlock, { opacity: tagOpacity }]}>
        <Animated.Text style={styles.tagline}>Need a bakkie? Got a bakkie?</Animated.Text>
        <View style={styles.tagDivider} />
        <Animated.Text style={styles.taglineSub}>Let's connect.</Animated.Text>
      </Animated.View>

      {/* Flag stripes — top */}
      <Animated.View
        style={[styles.topBar, { opacity: barsOpacity, transform: [{ translateY: topBarTranslate }] }]}
      >
        {FLAG_COLORS.map((c, i) => (
          <View key={i} style={[styles.stripe, { backgroundColor: c }]} />
        ))}
      </Animated.View>

      {/* Flag stripes — bottom */}
      <Animated.View
        style={[styles.bottomBar, { opacity: barsOpacity, transform: [{ translateY: bottomBarTranslate }] }]}
      >
        {[...FLAG_COLORS].reverse().map((c, i) => (
          <View key={i} style={[styles.stripe, { backgroundColor: c }]} />
        ))}
      </Animated.View>

      <Animated.Text style={[styles.madeIn, { opacity: tagOpacity }]}>
        Made in South Africa
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#032B1A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bloomCircle: {
    position: 'absolute',
    width: width * 1.8,
    height: width * 1.8,
    borderRadius: width * 0.9,
    backgroundColor: '#05421D',
    alignSelf: 'center',
    top: -(width * 0.4),
  },

  logoWrap: {
    marginBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  logo: {
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: (width * 0.72) * 0.22,
  },

  tagBlock: { alignItems: 'center', gap: 6 },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.3,
    fontWeight: '400',
  },
  tagDivider: {
    width: 24, height: 1,
    backgroundColor: 'rgba(255,182,18,0.5)',
    marginVertical: 2,
  },
  taglineSub: {
    fontSize: 15,
    color: '#FFB612',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 7, flexDirection: 'row',
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 7, flexDirection: 'row',
  },
  stripe: { flex: 1 },

  madeIn: {
    position: 'absolute',
    bottom: 20,
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
