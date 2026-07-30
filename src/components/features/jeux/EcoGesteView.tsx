import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Jeu } from '@/src/types/api.types';
import { GameQuestion } from "./GameQuestion";
import { resolveMediaUrl } from '@/src/services/filesystem.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZoomableImage } from '@/src/components/ui/ZoomableImage';

interface EcoGesteViewProps {
  jeu: Jeu;
  onSuccess: () => void;
}

export function EcoGesteView({ jeu, onSuccess }: EcoGesteViewProps) {
  const insets = useSafeAreaInsets();
  
  const imageSource = jeu.imageLocalPath 
    ? { uri: jeu.imageLocalPath.startsWith('file://') ? jeu.imageLocalPath : `file://${jeu.imageLocalPath}` } 
    : jeu.imageUrl 
      ? { uri: resolveMediaUrl(jeu.imageUrl) } 
      : null;

  const hasLink = !!jeu.donneesJeu?.linkUrl;

  return (
    <Animated.View entering={SlideInRight.springify()} style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max((insets?.bottom || 0) + 40, 120) }]} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBadge}>
        <Ionicons name="leaf" size={24} color="#007E84" />
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

      <View style={styles.contentCard}>
        <GameQuestion question={jeu.question} />
        {jeu.explication && (
          <Text style={styles.explicationText}>{jeu.explication}</Text>
        )}
      </View>

      <View style={styles.buttonsContainer}>
        {hasLink && (
          <Pressable 
            style={styles.engageButton} 
            onPress={() => Linking.openURL(jeu.donneesJeu!.linkUrl as string)}
          >
            <Text style={styles.engageButtonText}>
              {jeu.donneesJeu?.linkTitle ? `Je m'engage : ${jeu.donneesJeu.linkTitle as string}` : "Je m'engage !"}
            </Text>
            <Ionicons name="open-outline" size={20} color="white" />
          </Pressable>
        )}

        <Pressable 
          style={[styles.button, hasLink && styles.buttonSecondary]} 
          onPress={onSuccess}
        >
          <Text style={[styles.buttonText, hasLink && styles.buttonTextSecondary]}>Continuer</Text>
          <Ionicons name="arrow-forward" size={24} color={hasLink ? "#007E84" : "white"} />
        </Pressable>
      </View>
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
    flexGrow: 1,
    paddingBottom: 120,
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
  buttonsContainer: {
    gap: 16,
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
  buttonSecondary: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007E84',
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#007E84',
  },
  engageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 18,
    borderRadius: 100,
    gap: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  engageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
