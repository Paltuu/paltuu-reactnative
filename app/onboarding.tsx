import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Image } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';

// Equal breathing room between illustration → heading → subheading → dots → button.
const GAP = 20;

const SLIDES = [
  {
    headline: 'Every pet deserves a home',
    copy: 'Thousands of animals across Pakistan are waiting for theirs',
    image: require('../assets/login-journey/image1-home.png'),
  },
  {
    headline: 'Find a vet you can trust',
    copy: 'Discover clinics, read reviews — all in one place',
    image: require('../assets/login-journey/image2-vets.png'),
  },
  {
    headline: 'You found your people',
    copy: "Join Pakistan's largest pet community",
    image: require('../assets/login-journey/image3-community.png'),
  },
];

export default function OnboardingScreen() {
  const [page, setPage] = useState(0);
  const { width, height } = useWindowDimensions();
  const [pagerHeight, setPagerHeight] = useState(height);
  const pagerRef = useRef<PagerView>(null);
  const router = useRouter();
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
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={styles.communitySlide}>
            <View style={[styles.communityImageWrap, { height: pagerHeight * 0.86 }]}>
              <Image
                source={slide.image}
                style={[
                  styles.communityImage,
                  { height: pagerHeight * 0.86 + (i === 2 ? 30 : 0) },
                  i === 2 && styles.communityImageRaised,
                ]}
                resizeMode="cover"
              />
            </View>
            <View
              style={[styles.communityCard, { height: pagerHeight * 0.14 }]}
            >
              <Text
                style={[styles.headline, { marginBottom: 8 }]}
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
  pager: {
    flex: 1,
  },
  communitySlide: {
    flex: 1,
  },
  communityImageWrap: {
    width: '100%',
    overflow: 'hidden',
  },
  communityImage: {
    width: '100%',
  },
  communityImageRaised: {
    transform: [{ translateY: -30 }],
  },
  communityCard: {
    backgroundColor: '#FFFFFF',
    marginTop: -28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
