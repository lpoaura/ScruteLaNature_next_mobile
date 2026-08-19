import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { X, AlertTriangle } from 'lucide-react-native';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { useSettingsStore } from '@/src/store/settings.store';
import { apiClient } from '@/src/lib/api-client';

interface ReportProblemModalProps {
  visible: boolean;
  onClose: () => void;
  parcoursId: string;
  etapeId?: string;
}

export function ReportProblemModal({ visible, onClose, parcoursId, etapeId }: ReportProblemModalProps) {
  const systemColorScheme = useColorScheme();
  const settingsTheme = useSettingsStore((state: any) => state.theme);
  const isDark = (settingsTheme === 'system' ? systemColorScheme : settingsTheme) === 'dark';

  const [type, setType] = useState<'INACCESSIBLE' | 'MISSING_CLUE' | 'TECHNICAL_ERROR' | 'OTHER'>('INACCESSIBLE');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const OPTIONS = [
    { value: 'INACCESSIBLE', label: 'Lieu inaccessible / dangereux' },
    { value: 'MISSING_CLUE', label: 'Indice disparu ou introuvable' },
    { value: 'TECHNICAL_ERROR', label: 'Erreur technique dans le jeu' },
    { value: 'OTHER', label: 'Autre problème' },
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiClient('/signalements', {
        method: 'POST',
        body: JSON.stringify({
          type,
          description,
          parcoursId,
          etapeId,
        }),
      });
      Alert.alert('Merci !', 'Votre signalement a été envoyé à l\'équipe avec succès.');
      onClose();
    } catch (error) {
      console.error('Submit report error:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le signalement. Veuillez réessayer plus tard.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={[styles.modalContent, isDark && styles.darkModalContent]}>
              <View style={styles.header}>
                <View style={styles.headerTitle}>
                  <AlertTriangle size={20} color={isDark ? '#F87171' : '#DC2626'} />
                  <Text style={[styles.title, isDark && styles.darkText]}>Signaler un problème</Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeButton}>
                  <X size={24} color={isDark ? '#94A3B8' : '#64748B'} />
                </Pressable>
              </View>

              <Text style={[styles.subtitle, isDark && styles.darkTextMuted]}>
                L'équipe LPO sera notifiée pour corriger ce parcours.
              </Text>

              <View style={styles.optionsContainer}>
                {OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.optionButton,
                      isDark && styles.darkOptionButton,
                      type === opt.value && styles.optionSelected,
                      type === opt.value && isDark && styles.darkOptionSelected,
                    ]}
                    onPress={() => setType(opt.value as any)}
                  >
                    <View style={[
                      styles.radioCircle,
                      isDark && styles.darkRadioCircle,
                      type === opt.value && styles.radioCircleSelected,
                    ]}>
                      {type === opt.value && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[
                      styles.optionText,
                      isDark && styles.darkText,
                      type === opt.value && styles.optionTextSelected
                    ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={[styles.input, isDark && styles.darkInput]}
                placeholder="Précisez le problème (optionnel)..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />

              <Pressable
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Envoyer le signalement</Text>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  keyboardView: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  darkModalContent: {
    backgroundColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#64748B',
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  darkOptionButton: {
    borderColor: '#334155',
    backgroundColor: '#0F172A',
  },
  optionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  darkOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkRadioCircle: {
    borderColor: '#475569',
  },
  radioCircleSelected: {
    borderColor: '#3B82F6',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  optionText: {
    fontSize: 15,
    fontFamily: 'Nunito_500Medium',
    color: '#334155',
  },
  optionTextSelected: {
    color: '#1D4ED8',
    fontFamily: 'Nunito_700Bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    minHeight: 100,
    marginBottom: 24,
  },
  darkInput: {
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
  },
  submitButton: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
  },
  darkText: {
    color: '#F8FAFC',
  },
  darkTextMuted: {
    color: '#94A3B8',
  },
});
