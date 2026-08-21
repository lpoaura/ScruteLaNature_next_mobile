import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, } from 'react-native';
import { Audio } from 'expo-av';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Jeu } from '@/src/types/api.types';
import { GameQuestion } from "./GameQuestion";
import { resolveMediaUrl } from '@/src/services/filesystem.service';
import { ZoomableImage } from '@/src/components/ui/ZoomableImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface InfoViewProps {
  jeu: Jeu;
  onSuccess: () => void;
}

export function InfoView({ jeu, onSuccess }: InfoViewProps) {
  const insets = useSafeAreaInsets();
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false);
  const soundRef = React.useRef<Audio.Sound | null>(null);

  React.useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // En mode hors-ligne, on privilégie l'image téléchargée localement, sinon l'URL réseau
  const imageSource = jeu.imageLocalPath 
    ? { uri: jeu.imageLocalPath.startsWith('file://') ? jeu.imageLocalPath : `file://${jeu.imageLocalPath}` } 
    : jeu.imageUrl 
      ? { uri: resolveMediaUrl(jeu.imageUrl) } 
      : null;

  const audioSource = jeu.audioLocalPath
    ? { uri: jeu.audioLocalPath.startsWith('file://') ? jeu.audioLocalPath : `file://${jeu.audioLocalPath}` }
    : jeu.audioUrl
      ? { uri: resolveMediaUrl(jeu.audioUrl) }
      : null;

  const toggleMainAudio = async () => {
    if (!audioSource) return;
    try {
      if (isPlayingAudio) {
        if (soundRef.current) {
          await soundRef.current.pauseAsync();
          setIsPlayingAudio(false);
        }
      } else {
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: audioSource.uri },
            { shouldPlay: true },
            (status) => {
              if (status.isLoaded && status.didJustFinish) {
                setIsPlayingAudio(false);
              }
            }
          );
          soundRef.current = sound;
        } else {
          await soundRef.current.playAsync();
        }
        setIsPlayingAudio(true);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  return (
    <Animated.View entering={SlideInRight.springify()} style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max((insets?.bottom || 0) + 40, 120) }]} showsVerticalScrollIndicator={false}>
        {jeu.titre ? <Text style={styles.title}>{jeu.titre}</Text> : null}
        
        {imageSource && (
          <Animated.View entering={FadeIn.delay(200)}>
            <ZoomableImage 
              source={imageSource} 
              style={styles.image} 
            />
          </Animated.View>
        )}

        {(jeu.question || jeu.explication || audioSource) && (
          <View style={styles.contentCard}>
            {audioSource && (
              <Pressable style={styles.audioButton} onPress={toggleMainAudio}>
                <Ionicons name={isPlayingAudio ? "pause" : "volume-medium"} size={24} color="white" />
                <Text style={styles.audioButtonText}>
                  {isPlayingAudio ? "Mettre en pause" : "Écouter l'audio"}
                </Text>
              </Pressable>
            )}

            {jeu.question && <GameQuestion question={jeu.question} />}
            {jeu.explication && (
              <Text style={styles.explicationText}>{jeu.explication}</Text>
            )}
          </View>
        )}

        <Pressable style={styles.button} onPress={onSuccess}>
          <Text style={styles.buttonText}>Continuer</Text>
          <Ionicons name="checkmark-circle" size={24} color="white" />
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
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
    color: '#0087CC',
    marginBottom: 12,
  },
  explicationText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0087CC',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
    shadowColor: '#0087CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  audioButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
