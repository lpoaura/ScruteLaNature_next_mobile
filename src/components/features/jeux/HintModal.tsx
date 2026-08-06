import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface HintModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  hints: string[];
  buttonText?: string;
}

export function HintModal({ visible, onClose, title, hints, buttonText = "Merci !" }: HintModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="bulb" size={44} color="#D97706" />
          </View>

          <Text style={styles.title}>{title}</Text>

          <View style={styles.hintsListContainer}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {hints.map((hint, index) => (
                <View key={index} style={[styles.hintItem, index === hints.length - 1 && styles.lastHintItem]}>
                  {hints.length > 1 && (
                    <Text style={styles.hintNumber}>Indice {index + 1}</Text>
                  )}
                  <Text style={styles.hintText}>{hint}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="checkmark-circle-outline" size={22} color="white" />
            <Text style={styles.closeBtnText}>{buttonText}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FAF9F6',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  hintsListContainer: {
    width: '100%',
    maxHeight: 260,
    marginBottom: 24,
  },
  scrollView: {
    width: '100%',
  },
  hintItem: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  lastHintItem: {
    marginBottom: 0,
  },
  hintNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  hintText: {
    fontSize: 16,
    color: '#78350F',
    lineHeight: 24,
  },
  closeBtn: {
    backgroundColor: '#007E84',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 100,
    width: '100%',
    gap: 8,
    shadowColor: '#007E84',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  closeBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
