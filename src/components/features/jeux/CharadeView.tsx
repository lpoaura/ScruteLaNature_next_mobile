import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import Animated, { 
  FadeIn, 
  SlideInRight, 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Jeu } from '@/src/types/api.types';
import { resolveMediaUrl } from '@/src/services/filesystem.service';

interface CharadeViewProps {
  jeu: Jeu;
  onSuccess: () => void;
}

export function CharadeView({ jeu, onSuccess }: CharadeViewProps) {
  const [answer, setAnswer] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);

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

  const handleValidate = () => {
    Keyboard.dismiss();
    
    if (isRevealed) return;
    if (!answer.trim()) return;

    // Nettoyage pour la comparaison (minuscules, pas d'accents)
    const normalize = (str: string) => 
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const expected = normalize(jeu.reponse || '');
    const provided = normalize(answer);

    const isCorrect = expected === provided;

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsRevealed(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shakeTranslateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View entering={SlideInRight.springify()} style={[styles.container, shakeStyle]}>
        <Text style={styles.title}>Charade</Text>
        
        {imageSource && (
          <Animated.Image 
            entering={FadeIn.delay(200)}
            source={imageSource} 
            style={styles.image} 
            resizeMode="contain"
          />
        )}

        <View style={styles.card}>
          <Text style={styles.questionText}>{jeu.question}</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Votre réponse..."
            value={answer}
            onChangeText={setAnswer}
            editable={!isRevealed}
            onSubmitEditing={handleValidate}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />

          {!isRevealed ? (
            <Pressable 
              style={[styles.validateBtn, !answer.trim() && styles.validateBtnDisabled]} 
              onPress={handleValidate}
              disabled={!answer.trim()}
            >
              <Text style={styles.validateBtnText}>Valider</Text>
              <Ionicons name="checkmark" size={20} color="white" />
            </Pressable>
          ) : (
            <Animated.View entering={FadeIn}>
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.successText}>Bonne réponse !</Text>
              </View>
            </Animated.View>
          )}
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
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
    height: 180,
    borderRadius: 16,
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D6A4F',
    marginBottom: 24,
    lineHeight: 28,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  validateBtn: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  validateBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  validateBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  successText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 16,
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
