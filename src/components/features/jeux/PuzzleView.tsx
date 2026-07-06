import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, ScrollView } from 'react-native';
import Animated, { FadeIn, SlideInRight, useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Jeu } from '@/src/types/api.types';
import { resolveMediaUrl } from '@/src/services/filesystem.service';

interface PuzzleViewProps {
  jeu: Jeu;
  onSuccess: () => void;
  onFail?: () => void;
  forceReveal?: boolean;
}

const GRID_SIZE = 3;

interface PuzzlePieceProps {
  pieceValue: number;
  currentIndex: number;
  isRevealed: boolean;
  imageSource: any;
  pieceSize: number;
  puzzleSize: number;
  onPress: () => void;
}

function PuzzlePiece({ pieceValue, currentIndex, isRevealed, imageSource, pieceSize, puzzleSize, onPress }: PuzzlePieceProps) {
  const col = currentIndex % GRID_SIZE;
  const row = Math.floor(currentIndex / GRID_SIZE);
  
  const targetX = col * pieceSize;
  const targetY = row * pieceSize;

  // Initialisation immédiate sans animation à la première frame
  const translateX = useSharedValue(targetX);
  const translateY = useSharedValue(targetY);

  useEffect(() => {
    translateX.value = withTiming(targetX, { duration: 200 });
    translateY.value = withTiming(targetY, { duration: 200 });
  }, [targetX, targetY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value }
      ]
    };
  });

  if (pieceValue === 8 && !isRevealed) {
    // Case vide
    return (
      <Animated.View style={[{ position: 'absolute', width: pieceSize, height: pieceSize }, animatedStyle]}>
        <View style={styles.emptyPiece} />
      </Animated.View>
    );
  }

  const originalRow = Math.floor(pieceValue / GRID_SIZE);
  const originalCol = pieceValue % GRID_SIZE;

  return (
    <Animated.View style={[{ position: 'absolute', width: pieceSize, height: pieceSize }, animatedStyle]}>
      <Pressable style={styles.pieceBox} onPress={onPress}>
        <View style={styles.imageMask}>
          {imageSource && (
            <Animated.Image 
              source={imageSource} 
              style={[
                styles.puzzleImage,
                {
                  width: puzzleSize,
                  height: puzzleSize,
                  left: -originalCol * pieceSize,
                  top: -originalRow * pieceSize,
                }
              ]} 
              resizeMode="cover"
            />
          )}
          {!isRevealed && <View style={styles.pieceOverlay} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function PuzzleView({ jeu, onSuccess, onFail, forceReveal }: PuzzleViewProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [pieces, setPieces] = useState<number[]>([]);
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (forceReveal) {
      setPieces([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      setIsRevealed(true);
    }
  }, [forceReveal]);
  
  const puzzleSize = Math.min(width, 600) - 48; // Max 600px
  const pieceSize = puzzleSize / GRID_SIZE;
  
  const imageSource = jeu.imageLocalPath 
    ? { uri: jeu.imageLocalPath.startsWith('file://') ? jeu.imageLocalPath : `file://${jeu.imageLocalPath}` } 
    : jeu.imageUrl 
      ? { uri: resolveMediaUrl(jeu.imageUrl) } 
      : null;

  // Animation d'erreur
  const shakeTranslateX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }],
  }));

  // Initialisation du puzzle
  useEffect(() => {
    let state = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // 8 est la case vide
    let emptyIdx = 8;
    let lastEmptyIdx = -1;
    
    // Mélange par mouvements aléatoires depuis la fin pour garantir la solvabilité
    // Utilisation d'un garde-fou pour ne pas annuler le coup précédent (lastEmptyIdx)
    for (let i = 0; i < 150; i++) {
      const neighbors = [];
      const row = Math.floor(emptyIdx / GRID_SIZE);
      const col = emptyIdx % GRID_SIZE;
      
      if (row > 0) neighbors.push(emptyIdx - GRID_SIZE); // Haut
      if (row < GRID_SIZE - 1) neighbors.push(emptyIdx + GRID_SIZE); // Bas
      if (col > 0) neighbors.push(emptyIdx - 1); // Gauche
      if (col < GRID_SIZE - 1) neighbors.push(emptyIdx + 1); // Droite
      
      const validNeighbors = neighbors.filter(n => n !== lastEmptyIdx);
      const nextToMove = validNeighbors.length > 0 
        ? validNeighbors[Math.floor(Math.random() * validNeighbors.length)] 
        : neighbors[0];
        
      [state[emptyIdx], state[nextToMove]] = [state[nextToMove], state[emptyIdx]];
      lastEmptyIdx = emptyIdx;
      emptyIdx = nextToMove;
    }
    
    setPieces(state);
  }, [jeu]);

  const handlePressPiece = (index: number) => {
    if (isRevealed) return;

    const emptyIndex = pieces.indexOf(8);
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const emptyRow = Math.floor(emptyIndex / GRID_SIZE);
    const emptyCol = emptyIndex % GRID_SIZE;

    const isAdjacent = (Math.abs(row - emptyRow) === 1 && col === emptyCol) || 
                       (Math.abs(col - emptyCol) === 1 && row === emptyRow);

    if (isAdjacent) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newPieces = [...pieces];
      [newPieces[index], newPieces[emptyIndex]] = [newPieces[emptyIndex], newPieces[index]];
      setPieces(newPieces);
      checkWin(newPieces);
    } else {
      // Secousse légère si on clique sur une pièce bloquée
      shakeTranslateX.value = withSequence(
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  };

  const checkWin = (currentPieces: number[]) => {
    const isWin = currentPieces.every((val, i) => val === i);
    if (isWin) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsRevealed(true);
    }
  };

  const handleBypass = () => {
    // Permettre de passer pour les tests (Bypass)
    setPieces([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRevealed(true);
  };

  return (
    <Animated.View style={[styles.container, shakeStyle]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBadge}>
          <Ionicons name="extension-puzzle" size={24} color="#0EA5E9" />
          <Text style={styles.title}>{jeu.titre || 'Taquin'}</Text>
        </View>
        
        {jeu.question ? (
          <Text style={styles.questionText}>{jeu.question}</Text>
        ) : (
          <Text style={styles.questionText}>Reconstituez l'image en faisant glisser les pièces.</Text>
        )}

        {/* ZONE DU PUZZLE */}
        <View style={[styles.puzzleBoard, { width: puzzleSize, height: puzzleSize }]}>
          {pieces.map((pieceValue, index) => (
            <PuzzlePiece
              key={`piece-${pieceValue}`}
              pieceValue={pieceValue}
              currentIndex={index}
              isRevealed={isRevealed}
              imageSource={imageSource}
              pieceSize={pieceSize}
              puzzleSize={puzzleSize}
              onPress={() => handlePressPiece(index)}
            />
          ))}
        </View>

        {!isRevealed && (
          <Pressable style={styles.bypassBtn} onPress={handleBypass}>
            <Text style={styles.bypassText}>Passer le puzzle (Mode Facile)</Text>
          </Pressable>
        )}

        {isRevealed && (
          <Animated.View entering={FadeIn}>
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.successText}>Image reconstituée !</Text>
            </View>
            
            <Animated.View entering={SlideInRight.springify()} style={styles.explicationContainer}>
              {jeu.explication && (
                <Text style={styles.explicationText}>{jeu.explication}</Text>
              )}
              <Pressable style={styles.continueButton} onPress={onSuccess}>
                <Text style={styles.continueButtonText}>Continuer</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </Pressable>
            </Animated.View>
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E0F2FE',
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0284C7',
  },
  questionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 24,
    textAlign: 'center',
  },
  puzzleBoard: {
    backgroundColor: '#CBD5E1',
    borderWidth: 2,
    borderColor: '#334155',
    marginBottom: 24,
    alignSelf: 'center',
    position: 'relative', // Pour permettre le placement absolu des pièces
    overflow: 'hidden',
  },
  pieceBox: {
    width: '100%',
    height: '100%',
    // Plus de padding, pour ne pas couper l'image en morceaux distants
  },
  emptyPiece: {
    width: '100%',
    height: '100%',
    backgroundColor: '#94A3B8', // Gris foncé pour le trou
  },
  imageMask: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  puzzleImage: {
    position: 'absolute',
  },
  pieceOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  bypassBtn: {
    paddingVertical: 12,
  },
  bypassText: {
    color: '#64748B',
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
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
