import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import Animated, { 
  FadeIn, 
  SlideInRight, 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withTiming, 
  withSpring 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Jeu, DonneesQCM } from '@/src/types/api.types';
import { resolveMediaUrl } from '@/src/services/filesystem.service';

interface QCMViewProps {
  jeu: Jeu;
  onSuccess: () => void;
}

export function QCMView({ jeu, onSuccess }: QCMViewProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  
  // Cast sécurisé des données
  const donnees = jeu.donneesJeu as unknown as DonneesQCM | undefined;
  const options = donnees?.options || [];
  
  const imageSource = jeu.imageLocalPath 
    ? { uri: jeu.imageLocalPath.startsWith('file://') ? jeu.imageLocalPath : `file://${jeu.imageLocalPath}` } 
    : jeu.imageUrl 
      ? { uri: resolveMediaUrl(jeu.imageUrl) } 
      : null;

  // Animation de tremblement (erreur)
  const shakeTranslateX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }],
  }));

  // Comparaison robuste pour éviter les soucis d'espaces ou de majuscules
  const checkIsCorrect = (opt: string) => {
    if (!jeu.reponse) return false;
    return opt.trim().toLowerCase() === jeu.reponse.trim().toLowerCase();
  };

  const handleSelect = (option: string) => {
    if (isRevealed) return; // Empêcher le clic si déjà révélé

    setSelectedOption(option);
    const isCorrect = checkIsCorrect(option);

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsRevealed(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Animation Shake
      shakeTranslateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      // Clear any previous timeout to prevent race conditions
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      timeoutRef.current = setTimeout(() => {
        setSelectedOption(null);
        timeoutRef.current = null;
      }, 500); // reduced from 800ms to feel more responsive
    }
  };

  return (
    <Animated.View entering={SlideInRight.springify()} style={[styles.container, shakeStyle]}>
      <Text style={styles.title}>Question Nature</Text>
      
      {imageSource && (
        <Animated.Image 
          entering={FadeIn.delay(200)}
          source={imageSource} 
          style={styles.image} 
          resizeMode="contain"
        />
      )}

      <Text style={styles.questionText}>{jeu.question}</Text>

      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isSelected = selectedOption === option;
          const isCorrectAnswer = isRevealed && checkIsCorrect(option);
          
          let bgColor = 'white';
          let borderColor = '#D1D5DB';
          let textColor = '#4B5563';

          if (isSelected) {
            bgColor = isCorrectAnswer ? '#10B981' : '#EF4444';
            borderColor = isCorrectAnswer ? '#10B981' : '#EF4444';
            textColor = 'white';
          } else if (isCorrectAnswer) {
            // Si c'est la bonne réponse mais pas sélectionnée (impossible ici car on force)
            bgColor = '#10B981';
            borderColor = '#10B981';
            textColor = 'white';
          }

          return (
            <Pressable
              key={index}
              style={[
                styles.optionButton,
                { backgroundColor: bgColor, borderColor }
              ]}
              onPress={() => handleSelect(option)}
            >
              <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
              {isSelected && isCorrectAnswer && (
                <Ionicons name="checkmark-circle" size={24} color="white" style={styles.optionIcon} />
              )}
              {isSelected && !isCorrectAnswer && (
                <Ionicons name="close-circle" size={24} color="white" style={styles.optionIcon} />
              )}
            </Pressable>
          );
        })}
      </View>

      {isRevealed && (
        <Animated.View entering={SlideInRight.springify()} style={styles.explicationContainer}>
          {jeu.explication && (
            <Text style={styles.explicationText}>{jeu.explication}</Text>
          )}
          <Pressable style={styles.continueButton} onPress={onSuccess}>
            <Text style={styles.continueButtonText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F5F7F5',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 24,
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D6A4F',
    marginBottom: 32,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  optionIcon: {
    marginLeft: 12,
  },
  explicationContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  explicationText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 100,
    gap: 8,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
