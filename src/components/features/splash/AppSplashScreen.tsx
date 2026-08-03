import { useEffect, useRef } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AppSplashScreenProps {
  onFinished: () => void;
}

export function AppSplashScreen({ onFinished }: AppSplashScreenProps) {
  const insets = useSafeAreaInsets();
  const finishedRef = useRef(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Valeurs partagées Reanimated
  const containerOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);

  const handleFinished = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinished();
  };

  useEffect(() => {
    // 1. Logo : scale spring + fade
    logoOpacity.value = withDelay(150, withTiming(1, { duration: 400 }));
    logoScale.value = withDelay(150, withSpring(1, { damping: 10, stiffness: 80 }));

    // 2. Fade-out → callback via Reanimated (on garde l'écran 2 secondes)
    containerOpacity.value = withDelay(
      2000,
      withTiming(0, { duration: 350 }, (finished) => {
        if (finished) runOnJS(handleFinished)();
      })
    );

    // Sécurité : setTimeout fallback
    const fallback = setTimeout(() => {
      handleFinished();
    }, 2500);

    return () => clearTimeout(fallback);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container, 
        isDark && styles.darkContainer,
        containerStyle, 
        { paddingBottom: insets.bottom + 40 }
      ]}
      pointerEvents="box-only"
    >
      {/* Logo uniquement */}
      <Animated.Image 
        source={require('@/assets/images/Logo_bleu_SLN-ecritures.png')} 
        style={[styles.logoImage, logoStyle]} 
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  darkContainer: {
    backgroundColor: '#0F172A',
  },
  logoImage: {
    width: 250,
    height: 250,
  },
});
