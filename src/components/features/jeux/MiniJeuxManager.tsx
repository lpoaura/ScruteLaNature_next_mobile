import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Jeu, Etape } from '@/src/types/api.types';
import { InfoView } from './InfoView';
import { QCMView } from './QCMView';
import { CharadeView } from './CharadeView';
import { CaesarView } from './CaesarView';
import { PyramidView } from './PyramidView';
import { EcoGesteView } from './EcoGesteView';
import { ValidationLieuView } from './ValidationLieuView';
import { PuzzleView } from './PuzzleView';

import { useGameStore } from '@/src/store/game.store';
import { TabletWrapper } from '@/src/components/layout/TabletWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MiniJeuxManagerProps {
  jeux: Jeu[];
  etape: Etape;
  onAllCompleted: () => void;
  onQuit: () => void;
}

export function MiniJeuxManager({ jeux, etape, onAllCompleted, onQuit }: MiniJeuxManagerProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);
  const { completeJeu } = useGameStore();

  useEffect(() => {
    // S'il n'y a pas de jeu, on complète direct après le montage
    if (!jeux || jeux.length === 0) {
      onAllCompleted();
    }
  }, [jeux, onAllCompleted]);

  if (!jeux || jeux.length === 0) {
    return null;
  }

  const currentJeu = jeux[currentIndex];

  const handleSuccess = (forceZeroPoints = false) => {
    // Calcul des points selon le nombre d'essais
    const max = currentJeu.maxAttempts || 2;
    let points = 10;
    if (forceZeroPoints) {
      points = 0;
    } else if (attemptsUsed > 0 && max > 0) {
      points = Math.max(0, Math.round(10 * ((max - attemptsUsed) / max)));
    }
    
    completeJeu(currentJeu.id, points);

    if (currentIndex < jeux.length - 1) {
      // On réinitialise les états de manière synchrone AVANT le changement d'index
      // pour que le prochain jeu s'affiche sans "mémoire" de la réussite ou des échecs du précédent
      setHintsRevealed(0);
      setAttemptsUsed(0);
      setHasFailedAll(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      onAllCompleted();
    }
  };

  const handleFail = () => {
    const max = currentJeu.maxAttempts || 2;
    const newAttempts = attemptsUsed + 1;
    setAttemptsUsed(newAttempts);

    if (newAttempts >= max) {
      setHasFailedAll(true);
    } else {
      Alert.alert(
        "Oups !",
        `Mauvaise réponse. Il vous reste ${max - newAttempts} essai${max - newAttempts > 1 ? 's' : ''}.`,
        [{ text: "Réessayer" }]
      );
    }
  };

  const indices: string[] = (currentJeu?.donneesJeu as any)?.indices || [];

  const handleShowHint = () => {
    if (indices.length === 0) return;

    if (hintsRevealed < indices.length) {
      Alert.alert(
        `Indice ${hintsRevealed + 1} / ${indices.length}`,
        indices[hintsRevealed],
        [
          {
            text: "Merci !",
            onPress: () => setHintsRevealed(prev => prev + 1)
          }
        ]
      );
    } else {
      // Tous les indices ont été révélés, on les réaffiche tous
      Alert.alert(
        "Tous vos indices",
        indices.map((ind, i) => `${i + 1}. ${ind}`).join('\n\n'),
        [{ text: "Fermer" }]
      );
    }
  };

  const renderGame = () => {
    const gameProps = {
      jeu: currentJeu,
      onSuccess: () => handleSuccess(false),
      onFail: handleFail,
      forceReveal: hasFailedAll && !currentJeu.isBlocking,
    };

    switch (currentJeu.type) {
      case 'INFO':
        return <InfoView key={currentIndex} {...gameProps} />;
      case 'QCM':
        return <QCMView key={currentIndex} {...gameProps} />;
      case 'CHARADE':
        return <CharadeView key={currentIndex} {...gameProps} />;
      case 'CODE_CAESAR':
        return <CaesarView key={currentIndex} {...gameProps} />;
      case 'CALCUL_PYRAMIDAL':
        return <PyramidView key={currentIndex} {...gameProps} />;
      case 'ECO_GESTE':
        return <EcoGesteView key={currentIndex} {...gameProps} />;
      case 'VALIDATION_LIEU':
        return <ValidationLieuView key={currentIndex} {...gameProps} etape={etape} />;
      case 'PUZZLE':
        return <PuzzleView key={currentIndex} {...gameProps} />;
      default:
        return (
          <View style={styles.fallbackContainer}>
            <Ionicons name="construct" size={64} color="#EB601A" />
            <Text style={styles.fallbackText}>Ce jeu ({currentJeu.type}) est en cours de construction.</Text>
            <Pressable style={styles.skipBtn} onPress={() => handleSuccess(true)}>
              <Text style={styles.skipBtnText}>Passer ce jeu</Text>
            </Pressable>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header avec progression et bouton quitter */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={onQuit} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.progressText}>
          Défi {currentIndex + 1} / {jeux.length}
        </Text>
        
        {indices.length > 0 ? (
          <Pressable onPress={handleShowHint} style={[styles.iconBtn, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="bulb" size={24} color="#D97706" />
            {hintsRevealed < indices.length && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{indices.length - hintsRevealed}</Text>
              </View>
            )}
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Rendu dynamique du mini-jeu */}
      <View style={styles.gameContainer}>
        <TabletWrapper maxWidth={600}>
          {renderGame()}

          {hasFailedAll && (
            <View style={styles.failureOverlay}>
              <ScrollView 
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: 20, paddingBottom: insets.bottom + 40 }} 
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.failureCard}>
                  <Ionicons name="close-circle" size={48} color="#EF4444" />
                <Text style={styles.failureTitle}>Tentatives épuisées</Text>
                <Text style={styles.failureMessage}>
                  {currentJeu.messageEchec || "Ce n'était pas la bonne réponse."}
                </Text>
                
                {!currentJeu.isBlocking && currentJeu.reponse && (
                  <View style={styles.answerBox}>
                    <Text style={styles.answerLabel}>La bonne réponse était :</Text>
                    <Text style={styles.answerText}>{currentJeu.reponse}</Text>
                  </View>
                )}
                
                {!currentJeu.isBlocking && currentJeu.explication && (
                  <Text style={styles.failureExplanation}>{currentJeu.explication}</Text>
                )}
                
                {currentJeu.isBlocking ? (
                  <Pressable style={[styles.continueFailureBtn, { backgroundColor: '#EB601A' }]} onPress={() => setHasFailedAll(false)}>
                    <Text style={styles.continueFailureText}>Réessayer (Obligatoire)</Text>
                    <Ionicons name="refresh" size={20} color="white" />
                  </Pressable>
                ) : (
                  <Pressable style={styles.continueFailureBtn} onPress={() => handleSuccess(true)}>
                    <Text style={styles.continueFailureText}>Continuer (0 point)</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </Pressable>
                )}
              </View>
              </ScrollView>
            </View>
          )}
        </TabletWrapper>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F7F5',
    zIndex: 50, // Au-dessus de la carte
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#F5F7F5',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  gameContainer: {
    flex: 1,
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackText: {
    fontSize: 18,
    color: '#4B5563',
    textAlign: 'center',
    marginVertical: 24,
  },
  skipBtn: {
    backgroundColor: '#007E84',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
  },
  skipBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FEF3C7',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  failureOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', // Dim background to focus on modal
    zIndex: 100,
  },
  failureCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  failureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  failureMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  answerBox: {
    backgroundColor: '#D8E8C5',
    padding: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  answerLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 4,
  },
  answerText: {
    fontSize: 18,
    color: '#047857',
    fontWeight: 'bold',
  },
  failureExplanation: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  continueFailureBtn: {
    backgroundColor: '#007E84',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
  },
  continueFailureText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
