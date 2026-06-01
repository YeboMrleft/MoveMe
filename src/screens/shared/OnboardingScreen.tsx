import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

interface Slide {
  title: string;
  subtitle: string;
  icon: string;
  bg: string;
  iconColor: string;
}

interface Props {
  isDriver: boolean;
  onDone: () => void;
}

const buildSlides = (isDriver: boolean): Slide[] => [
  {
    title: 'Welcome to Move-Me',
    subtitle: "South Africa's bakkie marketplace.\nMove anything with trusted local drivers.",
    icon: 'car',
    bg: '#1565C0',
    iconColor: '#90CAF9',
  },
  isDriver ? {
    title: 'Browse Jobs & Earn',
    subtitle: 'Browse open jobs in your city, submit your best price and get paid per trip — on your own schedule.',
    icon: 'cash-outline',
    bg: '#0277BD',
    iconColor: '#81D4FA',
  } : {
    title: 'Post a Job in 60 Seconds',
    subtitle: 'Describe your goods and set your route. Drivers in your area compete on price — you pick the best offer.',
    icon: 'create-outline',
    bg: '#0277BD',
    iconColor: '#81D4FA',
  },
  {
    title: 'Track Every Delivery',
    subtitle: "Watch your driver's live location on the map. Chat directly for quick updates.",
    icon: 'navigate',
    bg: '#00838F',
    iconColor: '#80DEEA',
  },
  {
    title: 'Verified & Trusted',
    subtitle: 'Every driver submits their ID, licence, vehicle disc, and photos. Ratings and tier badges keep everyone accountable.',
    icon: 'shield-checkmark',
    bg: '#2E7D32',
    iconColor: '#A5D6A7',
  },
];

export default function OnboardingScreen({ isDriver, onDone }: Props) {
  const slides = buildSlides(isDriver);
  const [idx, setIdx] = useState(0);
  const listRef = useRef<FlatList>(null);

  const next = () => {
    if (idx < slides.length - 1) {
      const next = idx + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIdx(next);
    } else {
      onDone();
    }
  };

  const skip = () => onDone();

  const slide = slides[idx];
  const isLast = idx === slides.length - 1;

  return (
    <View style={[styles.root, { backgroundColor: slide.bg }]}>
      <SafeAreaView style={styles.safe}>
        {/* Skip */}
        {!isLast && (
          <TouchableOpacity style={styles.skipBtn} onPress={skip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Slides */}
        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name={item.icon as any} size={80} color={item.iconColor} />
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          )}
        />

        {/* Bottom */}
        <View style={styles.bottom}>
          {/* Dots */}
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === idx && styles.dotActive]}
              />
            ))}
          </View>

          {/* Button */}
          <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.85}>
            <Text style={styles.nextText}>
              {isLast ? "Let's Go" : 'Next'}
            </Text>
            <Ionicons
              name={isLast ? 'checkmark' : 'arrow-forward'}
              size={20}
              color={slide.bg}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  skipBtn: {
    alignSelf: 'flex-end', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
  },
  skipText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 28,
  },
  iconCircle: {
    width: 180, height: 180, borderRadius: 90,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 30, fontWeight: '900', color: colors.white,
    textAlign: 'center', lineHeight: 36,
  },
  subtitle: {
    fontSize: 16, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 24,
  },
  bottom: {
    paddingHorizontal: 32, paddingBottom: 40, gap: 24,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: { width: 24, backgroundColor: colors.white },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.white, borderRadius: 16,
    paddingVertical: 18,
  },
  nextText: { fontSize: 17, fontWeight: '800', color: colors.primary },
});
