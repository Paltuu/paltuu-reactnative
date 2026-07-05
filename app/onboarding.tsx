import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IllustrationPlaceholder } from '../src/components/common/IllustrationPlaceholder';
import { useAuthStore } from '../src/stores/authStore';

// Equal breathing room between illustration → heading → subheading → dots → button.
const GAP = 20;

const SLIDES = [
  {
    headline: 'Every pet deserves a home',
    copy: 'Thousands of animals across Pakistan are waiting for theirs',
    illustration: 'Mascot presenting a cat and dog together — the adoption moment',
    icon: 'heart' as const,
  },
  {
    headline: 'Find a vet you can trust',
    copy: 'Discover clinics, read reviews — all in one place',
    illustration: 'Mascot with a stethoscope, clinic setting',
    icon: 'medkit' as const,
  },
  {
    headline: 'You found your people',
    copy: "Join Pakistan's largest pet community",
    illustration: 'Mascot surrounded by a mix of pets — community feel, warm and full',
    icon: 'people' as const,
  },
];

export default function OnboardingScreen() {
  const [page, setPage] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const markOnboardingSeen = useAuthStore((state) => state.markOnboardingSeen);

  const finish = () => {
    markOnboardingSeen();
    router.replace('/(auth)/welcome');
  };

  const handleNext = () => {
    if (page < SLIDES.length - 1) {
      pagerRef.current?.setPage(page + 1);
    } else {
      finish();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity onPress={finish} style={styles.skipBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={styles.slide}>
            <View style={styles.illustrationZone}>
              <IllustrationPlaceholder label={slide.illustration} icon={slide.icon} style={{ flex: 1 }} />
            </View>

            <View style={{ height: GAP }} />

            <View style={styles.textZone}>
              <Text
                style={styles.headline}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {slide.headline}
              </Text>
              <Text
                style={styles.copy}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {slide.copy}
              </Text>
            </View>
          </View>
        ))}
      </PagerView>

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <View style={[styles.bottom, { width }]}>
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.cta}>
          <Text style={styles.ctaText}>
            {page === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipBtn: {
    position: 'absolute',
    top: 8,
    right: 20,
    zIndex: 10,
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#555555',
  },
  pager: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 20,
  },
  illustrationZone: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 4,
  },
  textZone: {
    alignItems: 'center',
    paddingBottom: GAP,
  },
  headline: {
    fontSize: 28,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: GAP,
  },
  copy: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#555555',
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: GAP,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E0E0E0',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#a03048',
  },
  bottom: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignSelf: 'center',
  },
  cta: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#a03048',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#FFFFFF',
  },
});
