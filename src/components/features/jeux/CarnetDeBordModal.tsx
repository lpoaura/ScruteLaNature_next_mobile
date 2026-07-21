import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CarnetDeBordModalProps {
  visible: boolean;
  onClose: () => void;
  currentEtapeOrder: number;
  totalEtapes: number;
}

export function CarnetDeBordModal({ visible, onClose, currentEtapeOrder, totalEtapes }: CarnetDeBordModalProps) {
  const progressPercent = (currentEtapeOrder - 1) / totalEtapes;
  
  let message = "";
  if (progressPercent < 0.5) {
    message = "C'est un bon début, continue";
  } else if (progressPercent < 0.75) {
    message = "Bravo, plus de la moitié réalisée";
  } else {
    message = "Tu y es presque.";
  }

  const displayEtape = Math.min(currentEtapeOrder, totalEtapes);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Ionicons name="book-outline" size={32} color="#0087CC" />
            <Text style={styles.title}>Carnet de Bord</Text>
            <Ionicons name="book-outline" size={32} color="#0087CC" style={{ transform: [{ scaleX: -1 }] }} />
          </View>
          
          <View style={styles.divider} />

          <Text style={styles.etapeText}>
            Étape : {displayEtape}/{totalEtapes} - {message}
          </Text>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Fermer</Text>
          </Pressable>
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
    padding: 20,
  },
  container: {
    backgroundColor: '#FAF9F6',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontFamily: 'Georgia',
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
  etapeText: {
    fontSize: 18,
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '600',
    marginBottom: 24,
  },
  closeBtn: {
    backgroundColor: '#007E84',
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
  },
  closeBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
