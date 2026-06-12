import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, { FadeIn, SlideInRight, useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Jeu } from '@/src/types/api.types';
import { resolveMediaUrl } from '@/src/services/filesystem.service';

interface PuzzleViewProps {
  jeu: Jeu;
  onSuccess: () => void;
}

const GRID_SIZE = 3;
const SCREEN_WIDTH = Dimensions.get('window').width;
const PUZZLE_SIZE = SCREEN_WIDTH - 48; // Padding 24x2
const PIECE_SIZE = PUZZLE_SIZE / GRID_SIZE;

export function PuzzleView({ jeu, onSuccess }: PuzzleViewProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [pieces, setPieces] = useState<number[]>([]);
  
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
    // On génère une grille mélangée, mais résoluble (pour faire simple, on mélange aléatoirement 
    // et on vérifie la parité des inversions, ou plus simplement on part d'une grille résolue et on fait N mouvements aléatoires)
    let state = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // 8 est la case vide
    
    // Mélange par mouvements aléatoires depuis la fin pour garantir que c'est résoluble
    let emptyIdx = 8;
    for (let i = 0; i < 100; i++) {
      const neighbors = [];
      const row = Math.floor(emptyIdx / GRID_SIZE);
      const col = emptyIdx % GRID_SIZE;
      
      if (row > 0) neighbors.push(emptyIdx - GRID_SIZE); // Haut
      if (row < GRID_SIZE - 1) neighbors.push(emptyIdx + GRID_SIZE); // Bas
      if (col > 0) neighbors.push(emptyIdx - 1); // Gauche
      if (col < GRID_SIZE - 1) neighbors.push(emptyIdx + 1); // Droite
      
      const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
      
      // Swap
      [state[emptyIdx], state[randomNeighbor]] = [state[randomNeighbor], state[emptyIdx]];
      emptyIdx = randomNeighbor;
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
    <Animated.View entering={SlideInRight.springify()} style={[styles.container, shakeStyle]}>
      <View style={styles.headerBadge}>
        <Ionicons name="extension-puzzle" size={24} color="#0EA5E9" />
        <Text style={styles.title}>Taquin</Text>
      </View>
      
      {jeu.question ? (
        <Text style={styles.questionText}>{jeu.question}</Text>
      ) : (
        <Text style={styles.questionText}>Reconstituez l'image en faisant glisser les pièces.</Text>
      )}

      {/* ZONE DU PUZZLE */}
      <View style={styles.puzzleBoard}>
        {pieces.map((pieceValue, index) => {
          if (pieceValue === 8 && !isRevealed) {
            // Case vide
            return <View key={`empty-${index}`} style={[styles.pieceBox, styles.emptyPiece]} />;
          }

          const originalRow = Math.floor(pieceValue / GRID_SIZE);
          const originalCol = pieceValue % GRID_SIZE;

          return (
            <Pressable 
              key={`piece-${pieceValue}`} 
              style={[styles.pieceBox]} 
              onPress={() => handlePressPiece(index)}
            >
              <View style={styles.imageMask}>
                {imageSource && (
                  <Animated.Image 
                    source={imageSource} 
                    style={[
                      styles.puzzleImage,
                      {
                        left: -originalCol * PIECE_SIZE,
                        top: -originalRow * PIECE_SIZE,
                      }
                    ]} 
                    resizeMode="cover"
                  />
                )}
                {/* On peut ajouter une légère bordure pour différencier les pièces */}
                {!isRevealed && <View style={styles.pieceOverlay} />}
              </View>
            </Pressable>
          );
        })}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F0F9FF', // Sky blue très léger
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
    width: PUZZLE_SIZE,
    height: PUZZLE_SIZE,
    backgroundColor: '#CBD5E1',
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 2,
    borderColor: '#334155',
    marginBottom: 24,
    alignSelf: 'center',
  },
  pieceBox: {
    width: PIECE_SIZE,
    height: PIECE_SIZE,
    padding: 1, // Petit espace entre les pièces
  },
  emptyPiece: {
    backgroundColor: '#94A3B8', // Gris foncé pour le trou
  },
  imageMask: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  puzzleImage: {
    width: PUZZLE_SIZE,
    height: PUZZLE_SIZE,
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
