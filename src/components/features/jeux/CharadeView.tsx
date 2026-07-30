import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Keyboard, ScrollView } from 'react-native';
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
import { Audio } from 'expo-av';
import type { Jeu } from '@/src/types/api.types';
import { GameQuestion } from "./GameQuestion";
import { resolveMediaUrl } from '@/src/services/filesystem.service';
import { ZoomableImage } from '@/src/components/ui/ZoomableImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CharadeViewProps {
  jeu: Jeu;
  onSuccess: () => void;
  onFail?: () => void;
  forceReveal?: boolean;
}

export function CharadeView({ jeu, onSuccess, onFail, forceReveal }: CharadeViewProps) {
  const insets = useSafeAreaInsets();
  const [answer, setAnswer] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  React.useEffect(() => {
    if (forceReveal) {
      setAnswer(jeu.reponse || '');
      setIsRevealed(true);
    }
  }, [forceReveal]);

  React.useEffect(() => {
    if (isRevealed) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 400); // Wait for keyboard dismiss and layout animation
    }
  }, [isRevealed]);

  const imageSource = jeu.imageLocalPath 
    ? { uri: jeu.imageLocalPath.startsWith('file://') ? jeu.imageLocalPath : `file://${jeu.imageLocalPath}` } 
    : jeu.imageUrl 
      ? { uri: resolveMediaUrl(jeu.imageUrl) } 
      : null;

  const audioSource = jeu.audioLocalPath
    ? { uri: jeu.audioLocalPath.startsWith('file://') ? jeu.audioLocalPath : `file://${jeu.audioLocalPath}` }
    : jeu.audioUrl
      ? { uri: resolveMediaUrl(jeu.audioUrl) }
      : null;

  const toggleMainAudio = async () => {
    if (!audioSource) return;
    try {
      if (isPlayingAudio) {
        if (soundRef.current) {
          await soundRef.current.pauseAsync();
          setIsPlayingAudio(false);
        }
      } else {
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: audioSource.uri },
            { shouldPlay: true },
            (status) => {
              if (status.isLoaded && status.didJustFinish) {
                setIsPlayingAudio(false);
              }
            }
          );
          soundRef.current = sound;
        } else {
          await soundRef.current.playAsync();
        }
        setIsPlayingAudio(true);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

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
      onFail?.();
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Animated.View entering={SlideInRight.springify()} style={[styles.container, shakeStyle]}>
        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max((insets?.bottom || 0) + 40, 120) }]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {jeu.titre ? <Text style={styles.title}>{jeu.titre}</Text> : null}
          
          {imageSource && (
            <Animated.View entering={FadeIn.delay(200)}>
              <ZoomableImage 
                source={imageSource} 
                style={styles.image} 
              />
            </Animated.View>
          )}

          <View style={styles.card}>
            <GameQuestion question={jeu.question} />
            
            {audioSource && (
              <Pressable style={styles.audioButton} onPress={toggleMainAudio}>
                <Ionicons name={isPlayingAudio ? "pause" : "volume-medium"} size={24} color="white" />
                <Text style={styles.audioButtonText}>
                  {isPlayingAudio ? "Mettre en pause" : "Écouter l'indice"}
                </Text>
              </Pressable>
            )}

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
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 200);
              }}
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
                  <Ionicons name="checkmark-circle" size={24} color="#007E84" />
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
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
    paddingBottom: 120,
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
    color: '#0087CC',
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
  audioButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },
  audioButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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
    color: '#007E84',
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
    backgroundColor: '#007E84',
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
