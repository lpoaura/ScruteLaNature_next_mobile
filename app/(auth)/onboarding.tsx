import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  SharedValue,
  interpolate,
  Extrapolation,
  interpolateColor,
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
    image: require('@/src/assets/images/onboarding/slide1.png'),
    title: 'Choisis une balade',
    subtitle: 'Découvrez des parcours nature créés par les équipes LPO dans votre région.',
    bgLight: '#D8E8C5',
    bgDark: '#0087CC',
    accent: '#007E84',
  },
  {
    id: '2',
    emoji: '🎒',
    image: require('@/src/assets/images/onboarding/slide2.png'),
    title: 'Télécharge pour jouer',
    subtitle: 'Emportez la balade dans votre poche. Elle fonctionne entièrement hors-ligne en forêt.',
    bgLight: '#E0F2FE',
    bgDark: '#0C4A6E',
    accent: '#0EA5E9',
  },
  {
    id: '3',
    emoji: '🔍',
    image: require('@/src/assets/images/onboarding/slide3.png'),
    title: 'Résous les énigmes',
    subtitle: 'Suivez votre animateur LPO, observez la faune et découvrez les secrets de la nature.',
    bgLight: '#FFF7ED',
    bgDark: '#78350F',
    accent: '#EB601A',
  },
];

// ─── Composant Slide Animé (Parallax) ─────────────────────────────────────────

interface SlideProps {
  item: (typeof SLIDES)[0];
  index: number;
  scrollX: SharedValue<number>;
  isDark: boolean;
}

function Slide({ item, index, scrollX, isDark }: SlideProps) {
  // Animation Parallax pour l'Emoji/Image
  const imageAnimatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [width * 0.5, 0, -width * 0.5], // L'image bouge plus vite que la page
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5], // Effet de zoom in/out
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateX }, { scale }],
      opacity,
    };
  });

  // Animation Parallax pour le Texte (plus lent)
  const textAnimatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [width * 0.2, 0, -width * 0.2],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  return (
    <View style={[styles.slide, { width }]}>
      {/* Conteneur de l'image (Prêt pour la graphiste) */}
      <View style={styles.imageContainer}>
        {item.image ? (
          <Animated.Image 
            source={item.image} 
            style={[styles.fullImage, imageAnimatedStyle]} 
            resizeMode="contain" 
          />
        ) : (
          <Animated.View style={[styles.emojiWrapper, imageAnimatedStyle, { backgroundColor: isDark ? item.bgDark : item.bgLight }]}>
            <Text style={styles.slideEmoji}>{item.emoji}</Text>
          </Animated.View>
        )}
      </View>

      {/* Conteneur du texte */}
      <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
        <Text style={[styles.slideTitle, { color: isDark ? '#F8FAFC' : '#1F2937' }]}>{item.title}</Text>
        <Text style={[styles.slideSubtitle, isDark ? styles.darkTextMuted : styles.lightTextMuted]}>{item.subtitle}</Text>
      </Animated.View>
    </View>
  );
}

// ─── Indicateur de pagination animé ───────────────────────────────────────────

function Paginator({ scrollX, isDark }: { scrollX: SharedValue<number>; isDark: boolean }) {
  return (
    <View style={styles.dotsContainer}>
      {SLIDES.map((_, i) => {
        const animatedDotStyle = useAnimatedStyle(() => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          
          const dotWidth = interpolate(
            scrollX.value,
            inputRange,
            [8, 24, 8],
            Extrapolation.CLAMP
          );

          const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.3, 1, 0.3],
            Extrapolation.CLAMP
          );

          return {
            width: dotWidth,
            opacity,
          };
        });

        // La couleur du dot dépend du slide actif
        const color = SLIDES[i].accent;

        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: color },
              animatedDotStyle,
            ]}
          />
        );
      })}
    </View>
  );
}

// ─── Écran Onboarding Principal ───────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const settingsTheme = useSettingsStore((state: any) => state.theme);
  const isDark = (settingsTheme === 'system' ? systemColorScheme : settingsTheme) === 'dark';
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<Animated.FlatList<any>>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleSkip = async () => {
    await saveString(STORAGE_KEYS.ONBOARDING_DONE, 'true');
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleSkip();
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;
  const currentAccent = SLIDES[currentIndex].accent;

  // Animation de fond global (transition de couleurs)
  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      scrollX.value,
      SLIDES.map((_, i) => i * width),
      SLIDES.map((s) => (isDark ? '#0F172A' : '#F8FAFC')) // Fond principal uniforme
    );
    return { backgroundColor };
  });

  return (
    <Animated.View style={[styles.container, animatedBackgroundStyle, { paddingBottom: insets.bottom + 24 }]}>
      {/* Header : Bouton Passer */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: isDark ? '#94A3B8' : '#6B7280' }]}>Passer</Text>
        </Pressable>
      </View>

      {/* FlatList Animée */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <Slide item={item} index={index} scrollX={scrollX} isDark={isDark} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        style={styles.flatList}
      />

      {/* Footer : Glassmorphism / Carte du bas */}
      <View style={styles.footer}>
        <Paginator scrollX={scrollX} isDark={isDark} />

        <Pressable
          style={[styles.nextButton, { backgroundColor: currentAccent }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {isLast ? 'Commencer' : 'Suivant'}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    alignItems: 'flex-end',
    height: 60,
    zIndex: 10,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  imageContainer: {
    flex: 0.6,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '90%',
    height: '90%',
  },
  emojiWrapper: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  slideEmoji: {
    fontSize: 100,
  },
  textContainer: {
    flex: 0.4,
    width: '100%',
    alignItems: 'center',
    paddingTop: 40,
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  lightTextMuted: { color: '#4B5563' },
  darkTextMuted: { color: '#94A3B8' },
  footer: {
    paddingHorizontal: 32,
    gap: 32,
    paddingTop: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
