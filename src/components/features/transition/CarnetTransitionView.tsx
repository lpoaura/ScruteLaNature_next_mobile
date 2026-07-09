import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import type { Etape } from '@/src/types/api.types';

interface CarnetTransitionViewProps {
  etape: Etape;
  onContinue: () => void;
}

export function CarnetTransitionView({ etape, onContinue }: CarnetTransitionViewProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Le texte à lire et à afficher. (Vu que transitionText a été supprimé, on génère une intro dynamique)
  const introText = `Vous êtes arrivé à l'étape : ${etape.title}. Prenez le temps d'observer autour de vous. Préparez-vous à relever le défi naturaliste !`;

  useEffect(() => {
    // Si on démonte le composant, on coupe le son
    return () => {
      Speech.stop();
    };
  }, []);

  const handleSpeech = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(introText, {
        language: 'fr-FR',
        rate: 0.9,
        pitch: 1.0,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleContinue = () => {
    Speech.stop();
    onContinue();
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.overlay}>
      <Animated.View entering={SlideInDown.springify()} style={styles.carnetContainer}>
        {/* Style "Carnet de bord" */}
        <View style={styles.paper}>
          <View style={styles.header}>
            <Ionicons name="leaf-outline" size={32} color="#0087CC" />
            <Text style={styles.carnetTitle}>Carnet de Bord</Text>
            <Ionicons name="leaf-outline" size={32} color="#0087CC" style={{ transform: [{ scaleX: -1 }] }} />
          </View>

          <View style={styles.divider} />

          <Text style={styles.etapeTitle}>{etape.title}</Text>
          
          <Text style={styles.storyText}>{introText}</Text>

          <View style={styles.actionsContainer}>
            <Pressable 
              style={[styles.audioBtn, isSpeaking && styles.audioBtnActive]} 
              onPress={handleSpeech}
            >
              <Ionicons name={isSpeaking ? "volume-mute" : "volume-medium"} size={24} color={isSpeaking ? "white" : "#0087CC"} />
              <Text style={[styles.audioBtnText, isSpeaking && { color: 'white' }]}>
                {isSpeaking ? 'Arrêter' : 'Écouter'}
              </Text>
            </Pressable>

            <Pressable style={styles.continueBtn} onPress={handleContinue}>
              <Text style={styles.continueBtnText}>Découvrir l'énigme</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
    zIndex: 100, // Toujours au-dessus de la carte
  },
  carnetContainer: {
    backgroundColor: '#FAF9F6', // Couleur papier écru
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  paper: {
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  carnetTitle: {
    fontFamily: 'Georgia', // Typo serif pour le style carnet
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0087CC',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#D1D5DB',
    marginBottom: 20,
  },
  etapeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  storyText: {
    fontSize: 18,
    color: '#4B5563',
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 32,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D8E8C5',
    paddingVertical: 14,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#BBE2C6',
    gap: 8,
  },
  audioBtnActive: {
    backgroundColor: '#0087CC',
    borderColor: '#0087CC',
  },
  audioBtnText: {
    color: '#0087CC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007E84',
    paddingVertical: 16,
    borderRadius: 100,
    gap: 8,
    shadowColor: '#007E84',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
