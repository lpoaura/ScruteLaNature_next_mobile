import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Alert } from 'react-native';
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

interface MiniJeuxManagerProps {
  jeux: Jeu[];
  etape: Etape;
  onAllCompleted: () => void;
  onQuit: () => void;
}

export function MiniJeuxManager({ jeux, etape, onAllCompleted, onQuit }: MiniJeuxManagerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const { completeJeu } = useGameStore();

  useEffect(() => {
    setHintsRevealed(0);
  }, [currentIndex]);

  // S'il n'y a pas de jeu, on complète direct
  if (!jeux || jeux.length === 0) {
    onAllCompleted();
    return null;
  }

  const currentJeu = jeux[currentIndex];

  const handleSuccess = () => {
    // Attribuer 10 points par jeu réussi
    completeJeu(currentJeu.id, 10);

    if (currentIndex < jeux.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Tous les jeux de l'étape sont réussis !
      onAllCompleted();
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
    switch (currentJeu.type) {
      case 'INFO':
        return <InfoView jeu={currentJeu} onSuccess={handleSuccess} />;
      case 'QCM':
        return <QCMView jeu={currentJeu} onSuccess={handleSuccess} />;
      case 'CHARADE':
        return <CharadeView jeu={currentJeu} onSuccess={handleSuccess} />;
      case 'CODE_CAESAR':
        return <CaesarView jeu={currentJeu} onSuccess={handleSuccess} />;
      case 'CALCUL_PYRAMIDAL':
        return <PyramidView jeu={currentJeu} onSuccess={handleSuccess} />;
      case 'ECO_GESTE':
        return <EcoGesteView jeu={currentJeu} onSuccess={handleSuccess} />;
      case 'VALIDATION_LIEU':
        return <ValidationLieuView jeu={currentJeu} etape={etape} onSuccess={handleSuccess} />;
      case 'PUZZLE':
        return <PuzzleView jeu={currentJeu} onSuccess={handleSuccess} />;
      default:
        return (
          <View style={styles.fallbackContainer}>
            <Ionicons name="construct" size={64} color="#F59E0B" />
            <Text style={styles.fallbackText}>Ce jeu ({currentJeu.type}) est en cours de construction.</Text>
            <Pressable style={styles.skipBtn} onPress={handleSuccess}>
              <Text style={styles.skipBtnText}>Passer ce jeu</Text>
            </Pressable>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header avec progression et bouton quitter */}
      <View style={styles.header}>
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
    paddingTop: 60, // Safe area (mocked)
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
    backgroundColor: '#10B981',
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
});
