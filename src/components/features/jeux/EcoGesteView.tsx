import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Jeu } from '@/src/types/api.types';
import { GameQuestion } from "./GameQuestion";
import { resolveMediaUrl } from '@/src/services/filesystem.service';

interface EcoGesteViewProps {
  jeu: Jeu;
  onSuccess: () => void;
}

export function EcoGesteView({ jeu, onSuccess }: EcoGesteViewProps) {
  const imageSource = jeu.imageLocalPath 
    ? { uri: jeu.imageLocalPath.startsWith('file://') ? jeu.imageLocalPath : `file://${jeu.imageLocalPath}` } 
    : jeu.imageUrl 
      ? { uri: resolveMediaUrl(jeu.imageUrl) } 
      : null;

  return (
    <Animated.View entering={SlideInRight.springify()} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBadge}>
        <Ionicons name="leaf" size={24} color="#007E84" />
        <Text style={styles.title}>{jeu.titre || 'Éco-Geste'}</Text>
      </View>
      
      {imageSource && (
        <Animated.Image 
          entering={FadeIn.delay(200)}
          source={imageSource} 
          style={styles.image} 
          resizeMode="contain"
        />
      )}

      <View style={styles.contentCard}>
        <GameQuestion question={jeu.question} />
        {jeu.explication && (
          <Text style={styles.explicationText}>{jeu.explication}</Text>
        )}
      </View>

      <Pressable style={styles.button} onPress={onSuccess}>
        <Text style={styles.buttonText}>Je m'engage !</Text>
        <Ionicons name="heart" size={24} color="white" />
      </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D8E8C5', // Très léger vert
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0087CC',
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
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#007E84',
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0087CC',
    marginBottom: 12,
    lineHeight: 30,
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
    backgroundColor: '#007E84',
    paddingVertical: 18,
    borderRadius: 100,
    gap: 12,
    shadowColor: '#007E84',
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
