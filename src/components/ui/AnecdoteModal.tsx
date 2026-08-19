import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZoomableImage } from './ZoomableImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AnecdoteModalProps {
  visible: boolean;
  onClose: () => void;
  anecdote: {
    content: string;
    imageUrl?: string | null;
  } | null;
}

export function AnecdoteModal({ visible, onClose, anecdote }: AnecdoteModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!anecdote) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modalContent,
          isDark ? styles.darkModalContent : styles.lightModalContent,
          { marginTop: insets.top + 20, marginBottom: insets.bottom + 20 }
        ]}>
          
          <View style={styles.header}>
            <Text style={[styles.title, isDark ? styles.darkTitle : styles.lightTitle]}>
              Le saviez-vous ?
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={isDark ? '#E2E8F0' : '#475569'} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {anecdote.imageUrl && (
              <View style={styles.imageContainer}>
                <ZoomableImage 
                  source={{ uri: anecdote.imageUrl }} 
                  style={styles.image} 
                  showExpandIcon={true}
                  resizeMode="contain" 
                />
              </View>
            )}
            <Text style={[styles.text, isDark ? styles.darkText : styles.lightText]}>
              {anecdote.content}
            </Text>
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    flexShrink: 1, // Allow modal to shrink if content is small
  },
  lightModalContent: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  darkModalContent: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  lightTitle: {
    color: '#064E3B', // emerald-900
  },
  darkTitle: {
    color: '#D1FAE5', // emerald-100
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  lightText: {
    color: '#065F46', // emerald-800
  },
  darkText: {
    color: '#A7F3D0', // emerald-200
  },
});
