import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/src/store/settings.store';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STORAGE_KEYS } from '@/src/constants/config';
import { saveString } from '@/src/utils/storage';

const { width } = Dimensions.get('window');

// ─── Données des slides ───────────────────────────────────────────────────────

const SLIDES = [
  {
    id: '1',
    emoji: '🗺️',
    title: 'Choisis une balade',
    subtitle: 'Découvrez des parcours nature créés par les équipes LPO dans votre région.',
    bg: '#E8F5E9',
    accent: '#2D6A4F',
  },
  {
    id: '2',
    emoji: '📥',
    title: 'Télécharge pour jouer sans réseau',
    subtitle: 'Emportez la balade dans votre poche. Elle fonctionne entièrement hors-ligne en forêt.',
    bg: '#E3F2FD',
    accent: '#1565C0',
  },
  {
    id: '3',
    emoji: '🌿',
    title: 'Résous les énigmes en pleine nature',
    subtitle: 'Suivez votre mascotte, observez la faune et découvrez les secrets de la nature.',
    bg: '#FFF3E0',
    accent: '#E65100',
  },
];

// ─── Composant Slide ──────────────────────────────────────────────────────────

function Slide({ item, isDark }: { item: (typeof SLIDES)[0]; isDark: boolean }) {
  return (
    <View style={[styles.slide, { backgroundColor: isDark ? '#1E293B' : item.bg, width }]}>
      <Text style={styles.slideEmoji}>{item.emoji}</Text>
      <Text style={[styles.slideTitle, { color: isDark ? '#60A5FA' : item.accent }]}>{item.title}</Text>
      <Text style={[styles.slideSubtitle, isDark && styles.darkTextMuted]}>{item.subtitle}</Text>
    </View>
  );
}

// ─── Indicateur de pagination ─────────────────────────────────────────────────

function Dot({ index, activeIndex }: { index: number; activeIndex: number }) {
  const isActive = index === activeIndex;
  const width = useSharedValue(isActive ? 24 : 8);

  useEffect(() => {
    width.value = withSpring(isActive ? 24 : 8);
  }, [isActive]);

  const style = useAnimatedStyle(() => ({
    width: width.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: SLIDES[activeIndex].accent },
        style,
      ]}
    />
  );
}

// ─── Écran Onboarding ─────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const settingsTheme = useSettingsStore((state: any) => state.theme);
  const isDark = (settingsTheme === 'system' ? systemColorScheme : settingsTheme) === 'dark';
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    }
  ).current;

  const handleSkip = async () => {
    await saveString(STORAGE_KEYS.ONBOARDING_DONE, 'true');
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleSkip();
    }
  };

  const isLast = activeIndex === SLIDES.length - 1;
  const accent = SLIDES[activeIndex].accent;

  return (
    <View style={[styles.container, isDark && styles.darkContainer, { paddingBottom: insets.bottom + 24 }]}>
      {/* Bouton "Passer" */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        {!isLast && (
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: isDark ? '#60A5FA' : accent }]}>Passer</Text>
          </Pressable>
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Slide item={item} isDark={isDark} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        style={styles.flatList}
      />

      {/* Footer : dots + bouton */}
      <View style={styles.footer}>
        {/* Indicateurs de pagination */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} index={i} activeIndex={activeIndex} />
          ))}
        </View>

        {/* Bouton principal */}
        <Pressable
          style={[styles.nextButton, { backgroundColor: isDark ? '#3B82F6' : accent }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {isLast ? 'Commencer' : 'Suivant'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 24,
    alignItems: 'flex-end',
    height: 60,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  slideEmoji: {
    fontSize: 80,
    marginBottom: 8,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
  },
  slideSubtitle: {
    fontSize: 17,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 24,
    paddingTop: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  darkContainer: { backgroundColor: '#0F172A' },
  darkText: { color: '#F8FAFC' },
  darkTextMuted: { color: '#94A3B8' },
});
