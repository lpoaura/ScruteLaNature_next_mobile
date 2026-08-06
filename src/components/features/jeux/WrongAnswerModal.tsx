import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface WrongAnswerModalProps {
  visible: boolean;
  onRetry: () => void;
  remainingAttempts?: number;
  maxAttempts?: number;
  customTitle?: string;
  customMessage?: string;
  customTip?: string;
  customButtonText?: string;
}

export function WrongAnswerModal({
  visible,
  onRetry,
  remainingAttempts,
  maxAttempts,
  customTitle,
  customMessage,
  customTip,
  customButtonText,
}: WrongAnswerModalProps) {
  const isLastAttempt = remainingAttempts === 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRetry}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icône d'alerte */}
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
          </View>

          {/* Titre & Message principal */}
          <Text style={styles.title}>{customTitle || "Oups !"}</Text>
          <Text style={styles.message}>
            {customMessage || "Ce n'est pas tout à fait la bonne réponse."}
          </Text>

          {/* Badge du nombre d'essais restants */}
          {remainingAttempts !== undefined && maxAttempts !== undefined && (
            <View style={[styles.attemptsBox, isLastAttempt && styles.attemptsBoxWarning]}>
              <Ionicons
                name={isLastAttempt ? "warning-outline" : "shield-checkmark-outline"}
                size={22}
                color={isLastAttempt ? "#D97706" : "#007E84"}
              />
              <Text style={[styles.attemptsText, isLastAttempt && styles.attemptsTextWarning]}>
                Il vous reste {remainingAttempts} essai{remainingAttempts > 1 ? 's' : ''} sur {maxAttempts}
              </Text>
            </View>
          )}

          {/* Indice ou rappel de règle spécifique au jeu */}
          {customTip && (
            <View style={styles.tipBox}>
              <Ionicons name="bulb-outline" size={22} color="#D97706" />
              <Text style={styles.tipText}>{customTip}</Text>
            </View>
          )}

          {/* Bouton d'action */}
          <Pressable style={styles.retryBtn} onPress={onRetry}>
            <Ionicons
              name={customButtonText ? "checkmark-circle-outline" : "refresh-circle-outline"}
              size={22}
              color="white"
            />
            <Text style={styles.retryBtnText}>
              {customButtonText || "Réessayer"}
            </Text>
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
    borderColor: '#FEE2E2',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  attemptsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 20,
    gap: 10,
    width: '100%',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#B2DFDB',
  },
  attemptsBoxWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  attemptsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007E84',
  },
  attemptsTextWarning: {
    color: '#92400E',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 14,
    marginBottom: 24,
    gap: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
    fontWeight: '500',
  },
  retryBtn: {
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
  retryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
