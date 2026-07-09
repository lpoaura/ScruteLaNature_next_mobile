import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
import type { Jeu, DonneesCalcPyramidal } from '@/src/types/api.types';
import { resolveMediaUrl } from '@/src/services/filesystem.service';

interface PyramidViewProps {
  jeu: Jeu;
  onSuccess: () => void;
  onFail?: () => void;
  forceReveal?: boolean;
}

export function PyramidView({ jeu, onSuccess, onFail, forceReveal }: PyramidViewProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const donnees = jeu.donneesJeu as unknown as DonneesCalcPyramidal | undefined;
  
  // Grille d'origine du backend
  const baseGrid = donnees?.grille || [];
  
  // État local des saisies utilisateur (de même dimension que la grille de base)
  const [userGrid, setUserGrid] = useState<string[][]>([]);

  useEffect(() => {
    // Initialiser l'état local avec les valeurs existantes ou chaîne vide
    const initialGrid = baseGrid.map(row => 
      row.map(cell => cell !== null ? String(cell) : '')
    );
    setUserGrid(initialGrid);
  }, [jeu]);

  useEffect(() => {
    if (forceReveal && donnees?.fullGrid) {
      setUserGrid(donnees.fullGrid.map(row => row.map(String)));
      setIsRevealed(true);
    }
  }, [forceReveal]);

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

  const handleChange = (rowIndex: number, colIndex: number, text: string) => {
    if (isRevealed) return;
    // Ne garder que les nombres
    const numericText = text.replace(/[^0-9]/g, '');
    const newGrid = [...userGrid];
    newGrid[rowIndex] = [...newGrid[rowIndex]];
    newGrid[rowIndex][colIndex] = numericText;
    setUserGrid(newGrid);
  };

  const handleValidate = () => {
    if (isRevealed) return;

    // Vérifier si toutes les cases sont remplies
    const isComplete = userGrid.every(row => row.every(cell => cell.trim() !== ''));
    if (!isComplete) {
      // Ne rien faire si pas fini
      return;
    }

    // Vérifier la logique mathématique (la case du dessus = somme des 2 cases du dessous)
    let isCorrect = true;
    for (let r = 0; r < userGrid.length - 1; r++) {
      for (let c = 0; c < userGrid[r].length; c++) {
        const top = parseInt(userGrid[r][c], 10);
        const bottomLeft = parseInt(userGrid[r+1][c], 10);
        const bottomRight = parseInt(userGrid[r+1][c+1], 10);
        
        if (top !== bottomLeft + bottomRight) {
          isCorrect = false;
          break;
        }
      }
      if (!isCorrect) break;
    }

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

  // Savoir si tout est rempli pour activer le bouton Valider
  const isComplete = userGrid.length > 0 && userGrid.every(row => row.every(cell => cell.trim() !== ''));

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View entering={SlideInRight.springify()} style={[styles.container, shakeStyle]}>
          
          <View style={styles.headerBadge}>
            <Ionicons name="calculator" size={20} color="#6366F1" />
            <Text style={styles.title}>{jeu.titre || 'Calcul Pyramidal'}</Text>
          </View>
          
          {imageSource && (
            <Animated.Image 
              entering={FadeIn.delay(200)}
              source={imageSource} 
              style={styles.image} 
              resizeMode="contain"
            />
          )}

          <View style={styles.card}>
            {jeu.question ? (
              <Text style={styles.questionText}>{jeu.question}</Text>
            ) : null}

            <Text style={styles.instruction}>Remplissez les cases vides pour que chaque brique soit la somme des 2 briques en dessous d'elle.</Text>

            <View style={styles.pyramidContainer}>
              {userGrid.map((row, rIndex) => (
                <View key={`row-${rIndex}`} style={styles.pyramidRow}>
                  {row.map((cellValue, cIndex) => {
                    const isReadOnly = baseGrid[rIndex]?.[cIndex] !== null;
                    return (
                      <View key={`cell-${rIndex}-${cIndex}`} style={styles.brickContainer}>
                        <TextInput
                          style={[
                            styles.brickInput,
                            isReadOnly ? styles.brickReadOnly : styles.brickEditable,
                            isRevealed && isReadOnly ? styles.brickSuccessReadOnly : {},
                            isRevealed && !isReadOnly ? styles.brickSuccessEditable : {}
                          ]}
                          value={cellValue}
                          onChangeText={(t) => handleChange(rIndex, cIndex, t)}
                          editable={!isReadOnly && !isRevealed}
                          keyboardType="number-pad"
                          maxLength={4}
                        />
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            {!isRevealed ? (
              <Pressable 
                style={[styles.validateBtn, !isComplete && styles.validateBtnDisabled]} 
                onPress={handleValidate}
                disabled={!isComplete}
              >
                <Text style={styles.validateBtnText}>Vérifier la pyramide</Text>
                <Ionicons name="checkmark" size={20} color="white" />
              </Pressable>
            ) : (
              <Animated.View entering={FadeIn}>
                <View style={styles.successBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#007E84" />
                  <Text style={styles.successText}>Pyramide validée !</Text>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#EEF2FF', // Indigo très léger
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#4338CA',
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
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  pyramidContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  pyramidRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  brickContainer: {
    width: 60,
    height: 50,
  },
  brickInput: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  brickReadOnly: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
    color: '#374151',
  },
  brickEditable: {
    backgroundColor: '#FFF',
    borderColor: '#6366F1',
    color: '#0087CC',
  },
  brickSuccessReadOnly: {
    backgroundColor: '#D1FAE5',
    borderColor: '#007E84',
    color: '#0087CC',
  },
  brickSuccessEditable: {
    backgroundColor: '#007E84',
    borderColor: '#059669',
    color: '#FFF',
  },
  validateBtn: {
    backgroundColor: '#6366F1',
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
