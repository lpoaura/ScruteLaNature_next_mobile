import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native';

interface AppSplashScreenProps {
  onFinished: () => void;
}

/**
 * Écran de démarrage animé LPO.
 *
 * Séquence d'animation :
 * 1. Logo 🐦 scale spring (150ms)
 * 2. Titre "Scrute la Nature" slide-up + fade (450ms)
 * 3. Sous-titre fade (700ms)
 * 4. Loader 3 points clignotants (800ms)
 * 5. Fade-out global → onFinished() (2000ms)
 *
 * Double sécurité : setTimeout fallback si Reanimated runOnJS échoue.
 * pointerEvents dynamique : "none" dès la fin de l'animation.
 */
export function AppSplashScreen({ onFinished }: AppSplashScreenProps) {
  const insets = useSafeAreaInsets();
  const finishedRef = useRef(false);

  // Valeurs partagées Reanimated
  const containerOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  const handleFinished = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinished();
  };

  useEffect(() => {
    // 1. Logo : scale spring + fade
    logoOpacity.value = withDelay(150, withTiming(1, { duration: 400 }));
    logoScale.value = withDelay(150, withSpring(1, { damping: 10, stiffness: 80 }));

    // 2. Titre : slide-up + fade
    titleOpacity.value = withDelay(450, withTiming(1, { duration: 350 }));
    titleY.value = withDelay(450, withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }));

    // 3. Sous-titre fade
    subtitleOpacity.value = withDelay(700, withTiming(1, { duration: 300 }));

    // 4. Loader : 3 points en décalé
    const dotDelay = 800;
    const dotDuration = 400;
    const dotSeq = () =>
      withSequence(
        withTiming(1, { duration: dotDuration }),
        withTiming(0.3, { duration: dotDuration })
      );
    dot1.value = withDelay(dotDelay, withSequence(dotSeq(), dotSeq(), dotSeq()));
    dot2.value = withDelay(dotDelay + 150, withSequence(dotSeq(), dotSeq(), dotSeq()));
    dot3.value = withDelay(dotDelay + 300, withSequence(dotSeq(), dotSeq(), dotSeq()));

    // 5. Fade-out → callback via Reanimated
    containerOpacity.value = withDelay(
      2000,
      withTiming(0, { duration: 350 }, (finished) => {
        if (finished) runOnJS(handleFinished)();
      })
    );

    // ─── Sécurité : setTimeout fallback ─────────────────────────────────
    // Si le callback Reanimated ne se déclenche pas (edge case),
    // on force la suppression du splash après 2.5s.
    const fallback = setTimeout(() => {
      handleFinished();
    }, 2500);

    return () => clearTimeout(fallback);
  }, []);

  // Style animé du conteneur
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    // pointerEvents ne peut pas être animé via useAnimatedStyle directement
    // → on le gère via le fallback + unmount
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    // pointerEvents="box-none" permet aux taps de passer à travers
    // une fois que l'opacité est proche de 0
    <Animated.View
      style={[styles.container, containerStyle, { paddingBottom: insets.bottom + 40 }]}
      pointerEvents="box-only"
    >
      {/* Cercles décoratifs */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Logo */}
      <Animated.Image 
        source={require('@/assets/images/icon.png')} 
        style={[styles.logoImage, logoStyle]} 
        resizeMode="contain"
      />

      {/* Titre */}
      <Animated.Text style={[styles.title, titleStyle]}>
        Scrute la Nature
      </Animated.Text>

      {/* Sous-titre */}
      <Animated.Text style={[styles.subtitle, subtitleStyle]}>
        Application nature LPO
      </Animated.Text>

      {/* Loader 3 points */}
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, dot1Style]} />
        <Animated.View style={[styles.dot, dot2Style]} />
        <Animated.View style={[styles.dot, dot3Style]} />
      </View>

      {/* Bas de page */}
      <Animated.Text style={[styles.footer, subtitleStyle]}>
        Ligue pour la Protection des Oiseaux
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0087CC',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    gap: 12,
  },
  circle1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -60,
    left: -60,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 30,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.5,
  },
});
