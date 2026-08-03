import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Keyboard, } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
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
import type { Jeu, DonneesCaesar } from '@/src/types/api.types';
import { GameQuestion } from "./GameQuestion";
import { resolveMediaUrl } from '@/src/services/filesystem.service';
import { ZoomableImage } from '@/src/components/ui/ZoomableImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CaesarViewProps {
  jeu: Jeu;
  onSuccess: () => void;
  onFail?: () => void;
  forceReveal?: boolean;
}

export function CaesarView({ jeu, onSuccess, onFail, forceReveal }: CaesarViewProps) {
  const insets = useSafeAreaInsets();
  const [answer, setAnswer] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const donnees = jeu.donneesJeu as unknown as DonneesCaesar | undefined;
  const phraseChiffree = donnees?.phraseChiffree || '...';
  const decalage = donnees?.decalage || 0;

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
        
        <View style={styles.headerBadge}>
          <Ionicons name="key" size={20} color="#EB601A" />
          {jeu.titre ? <Text style={styles.title}>{jeu.titre}</Text> : null}
        </View>
        
        {imageSource && (
          <Animated.View entering={FadeIn.delay(200)}>
            <ZoomableImage 
              source={imageSource} 
              style={styles.image} 
            />
          </Animated.View>
        )}

        <View style={styles.card}>
          {jeu.question ? (
            <GameQuestion question={jeu.question} />
          ) : null}

          <View style={styles.cipherBox}>
            <Text style={styles.cipherLabel}>Message codé :</Text>
            <Text style={styles.cipherText}>{phraseChiffree}</Text>
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="Déchiffrez le message..."
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
              <Ionicons name="lock-open" size={20} color="white" />
            </Pressable>
          ) : (
            <Animated.View entering={FadeIn}>
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#007E84" />
                <Text style={styles.successText}>Code percé !</Text>
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
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 16,
    textAlign: 'center',
  },
  cipherBox: {
    backgroundColor: '#1F2937', // Fond sombre façon terminal
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  cipherLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cipherText: {
    color: '#007E84', // Vert fluo
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  validateBtn: {
    backgroundColor: '#EB601A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  validateBtnDisabled: {
    backgroundColor: '#D1D5DB',
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
