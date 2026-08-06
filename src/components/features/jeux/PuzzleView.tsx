import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn, SlideInRight, useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Jeu } from '@/src/types/api.types';
import { GameQuestion } from "./GameQuestion";
import { resolveMediaUrl } from '@/src/services/filesystem.service';
import { ZoomableImage } from '@/src/components/ui/ZoomableImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PuzzleViewProps {
  jeu: Jeu;
  onSuccess: () => void;
  onFail?: () => void;
  forceReveal?: boolean;
}

/**
 * Calcule les dimensions de la grille (cols × rows) à partir du nombre de pièces.
 * Le total de cases = nbPieces + 1 (case vide).
 * On cherche la grille rectangulaire la plus carrée possible.
 */
function getGridDimensions(nbPieces: number): { cols: number; rows: number; totalCells: number } {
  // Mappings prédéfinis pour les valeurs du backoffice
  // nbPieces = nombre de pièces visibles, totalCells inclut la/les cases vides
  const presets: Record<number, { cols: number; rows: number }> = {
    3:  { cols: 2, rows: 2 },  // 4 cases : 3 pièces + 1 vide
    5:  { cols: 3, rows: 2 },  // 6 cases : 5 pièces + 1 vide
    6:  { cols: 3, rows: 3 },  // 9 cases : 6 pièces + 3 vides (on réduit les mouvements, plus facile)
    7:  { cols: 4, rows: 2 },  // 8 cases : 7 pièces + 1 vide
    8:  { cols: 3, rows: 3 },  // 9 cases : 8 pièces + 1 vide (classique)
    10: { cols: 4, rows: 3 },  // 12 cases : 10 pièces + 2 vides
    15: { cols: 4, rows: 4 },  // 16 cases : 15 pièces + 1 vide
  };

  if (presets[nbPieces]) {
    const { cols, rows } = presets[nbPieces];
    return { cols, rows, totalCells: cols * rows };
  }

  // Fallback générique : trouver la grille rectangulaire la plus carrée
  let total = nbPieces + 1;
  
  // Si pas de bonne décomposition, incrémenter total jusqu'à en trouver une
  while (total <= nbPieces + 4) {
    for (let c = Math.ceil(Math.sqrt(total)); c >= 2; c--) {
      if (total % c === 0) {
        let cols = c;
        let rows = total / c;
        if (rows > cols) [cols, rows] = [rows, cols];
        return { cols, rows, totalCells: total };
      }
    }
    total++;
  }
  
  // Dernier recours : grille carrée
  const side = Math.ceil(Math.sqrt(nbPieces + 1));
  return { cols: side, rows: side, totalCells: side * side };
}

interface PuzzlePieceProps {
  pieceValue: number;
  currentIndex: number;
  isRevealed: boolean;
  imageSource: any;
  pieceSizeW: number;
  pieceSizeH: number;
  puzzleWidth: number;
  puzzleHeight: number;
  cols: number;
  rows: number;
  nbPieces: number;
  onPress: () => void;
}

function PuzzlePiece({ pieceValue, currentIndex, isRevealed, imageSource, pieceSizeW, pieceSizeH, puzzleWidth, puzzleHeight, cols, rows, nbPieces, onPress }: PuzzlePieceProps) {
  const col = currentIndex % cols;
  const row = Math.floor(currentIndex / cols);
  
  const targetX = col * pieceSizeW;
  const targetY = row * pieceSizeH;

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

  // Toutes les valeurs >= nbPieces sont des cases vides
  if (pieceValue >= nbPieces && !isRevealed) {
    return (
      <Animated.View style={[{ position: 'absolute', width: pieceSizeW, height: pieceSizeH }, animatedStyle]}>
        <View style={styles.emptyPiece} />
      </Animated.View>
    );
  }

  const originalRow = Math.floor(pieceValue / cols);
  const originalCol = pieceValue % cols;

  return (
    <Animated.View style={[{ position: 'absolute', width: pieceSizeW, height: pieceSizeH }, animatedStyle]}>
      <Pressable style={styles.pieceBox} onPress={onPress}>
        <View style={styles.imageMask}>
          {imageSource && (
            <Animated.Image 
              source={imageSource} 
              style={[
                styles.puzzleImage,
                {
                  width: puzzleWidth,
                  height: puzzleHeight,
                  left: -originalCol * pieceSizeW,
                  top: -originalRow * pieceSizeH,
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
  const insets = useSafeAreaInsets();
  const [isRevealed, setIsRevealed] = useState(false);
  const [pieces, setPieces] = useState<number[]>([]);
  const { width } = useWindowDimensions();

  // Lire nbPieces depuis donneesJeu, fallback à 8 (3×3 classique)
  const nbPieces = (jeu.donneesJeu as any)?.nbPieces ?? 8;
  const { cols, rows, totalCells } = useMemo(() => getGridDimensions(nbPieces), [nbPieces]);
  // La case vide "mobile" est toujours la dernière
  const emptyValue = totalCells - 1;
  // Les cases vides fixes sont les valeurs entre nbPieces et emptyValue-1
  const fixedEmptyValues = useMemo(() => {
    const fixed = new Set<number>();
    for (let i = nbPieces; i < emptyValue; i++) {
      fixed.add(i);
    }
    return fixed;
  }, [nbPieces, emptyValue]);

  useEffect(() => {
    if (forceReveal) {
      setPieces(Array.from({ length: totalCells }, (_, i) => i));
      setIsRevealed(true);
    }
  }, [forceReveal, totalCells]);
  
  const puzzleWidth = Math.min(width, 600) - 48;
  const puzzleHeight = puzzleWidth * (rows / cols); // Adapter la hauteur au ratio
  const pieceSizeW = puzzleWidth / cols;
  const pieceSizeH = puzzleHeight / rows;
  
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
    let state = Array.from({ length: totalCells }, (_, i) => i);
    let emptyIdx = state.indexOf(emptyValue);
    let lastEmptyIdx = -1;
    
    // Mélange par mouvements aléatoires — ne pas déplacer les cases vides fixes
    for (let i = 0; i < 150; i++) {
      const neighbors: number[] = [];
      const row = Math.floor(emptyIdx / cols);
      const col = emptyIdx % cols;
      
      if (row > 0) neighbors.push(emptyIdx - cols);
      if (row < rows - 1) neighbors.push(emptyIdx + cols);
      if (col > 0) neighbors.push(emptyIdx - 1);
      if (col < cols - 1) neighbors.push(emptyIdx + 1);
      
      // Exclure les voisins qui contiennent une case vide fixe
      const validNeighbors = neighbors.filter(n => 
        n !== lastEmptyIdx && !fixedEmptyValues.has(state[n])
      );
      if (validNeighbors.length === 0) continue;
      
      const nextToMove = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        
      [state[emptyIdx], state[nextToMove]] = [state[nextToMove], state[emptyIdx]];
      lastEmptyIdx = emptyIdx;
      emptyIdx = nextToMove;
    }
    
    setPieces(state);
  }, [jeu, totalCells, cols, rows, emptyValue, fixedEmptyValues]);

  const handlePressPiece = (index: number) => {
    if (isRevealed) return;

    const emptyIndex = pieces.indexOf(emptyValue);
    const pieceRow = Math.floor(index / cols);
    const pieceCol = index % cols;
    const emptyRow = Math.floor(emptyIndex / cols);
    const emptyCol = emptyIndex % cols;

    const isAdjacent = (Math.abs(pieceRow - emptyRow) === 1 && pieceCol === emptyCol) || 
                       (Math.abs(pieceCol - emptyCol) === 1 && pieceRow === emptyRow);
    
    // Ne pas permettre de déplacer une case vide fixe
    if (fixedEmptyValues.has(pieces[index])) return;

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
    setPieces(Array.from({ length: totalCells }, (_, i) => i));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRevealed(true);
  };

  return (
    <Animated.View entering={SlideInRight.springify()} style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max((insets?.bottom || 0) + 40, 120) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBadge}>
          <Ionicons name="extension-puzzle" size={24} color="#0EA5E9" />
          {jeu.titre ? <Text style={styles.title}>{jeu.titre}</Text> : null}
        </View>
        
        {jeu.question ? (
          <GameQuestion question={jeu.question} />
        ) : (
          <Text style={styles.questionText}>Reconstituez l'image en faisant glisser les pièces.</Text>
        )}

        {/* ZONE DU PUZZLE */}
        <View style={[styles.puzzleBoard, { width: puzzleWidth, height: puzzleHeight }]}>
          {pieces.map((pieceValue, index) => (
            <PuzzlePiece
              key={`piece-${pieceValue}`}
              pieceValue={pieceValue}
              currentIndex={index}
              isRevealed={isRevealed}
              imageSource={imageSource}
              pieceSizeW={pieceSizeW}
              pieceSizeH={pieceSizeH}
              puzzleWidth={puzzleWidth}
              puzzleHeight={puzzleHeight}
              cols={cols}
              rows={rows}
              nbPieces={nbPieces}
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
              <Ionicons name="checkmark-circle" size={24} color="#007E84" />
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
    alignItems: 'center',
    flexGrow: 1,
    paddingBottom: 120,
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
    color: '#0A0E11',
    marginBottom: 24,
    textAlign: 'center',
  },
  puzzleBoard: {
    backgroundColor: '#CBD5E1',
    borderWidth: 2,
    borderColor: '#202C35',
    marginBottom: 24,
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  pieceBox: {
    width: '100%',
    height: '100%',
  },
  emptyPiece: {
    width: '100%',
    height: '100%',
    backgroundColor: '#94A3B8',
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
