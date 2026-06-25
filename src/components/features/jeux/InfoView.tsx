import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Jeu } from '@/src/types/api.types';
import { resolveMediaUrl } from '@/src/services/filesystem.service';

interface InfoViewProps {
  jeu: Jeu;
  onSuccess: () => void;
}

export function InfoView({ jeu, onSuccess }: InfoViewProps) {
  // En mode hors-ligne, on privilégie l'image téléchargée localement, sinon l'URL réseau
  const imageSource = jeu.imageLocalPath 
    ? { uri: jeu.imageLocalPath.startsWith('file://') ? jeu.imageLocalPath : `file://${jeu.imageLocalPath}` } 
    : jeu.imageUrl 
      ? { uri: resolveMediaUrl(jeu.imageUrl) } 
      : null;

  return (
    <Animated.View entering={SlideInRight.springify()} style={styles.container}>
      <Text style={styles.title}>Le saviez-vous ?</Text>
      
      {imageSource && (
        <Animated.Image 
          entering={FadeIn.delay(200)}
          source={imageSource} 
          style={styles.image} 
          resizeMode="contain"
        />
      )}

      <View style={styles.contentCard}>
        <Text style={styles.questionText}>{jeu.question}</Text>
        {jeu.explication && (
          <Text style={styles.explicationText}>{jeu.explication}</Text>
        )}
      </View>

      <Pressable style={styles.button} onPress={onSuccess}>
        <Text style={styles.buttonText}>Continuer</Text>
        <Ionicons name="checkmark-circle" size={24} color="white" />
      </Pressable>
    </Animated.View>
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
    height: 220,
    borderRadius: 16,
    marginBottom: 24,
  },
  contentCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 32,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D6A4F',
    marginBottom: 12,
  },
  explicationText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 18,
    borderRadius: 100,
    gap: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
