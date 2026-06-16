import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Star, X } from 'lucide-react-native';
import { socialService } from '@/src/services/social.service';

interface ReviewModalProps {
  visible: boolean;
  parcoursId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({ visible, parcoursId, onClose, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Veuillez sélectionner une note.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await socialService.submitReview({
        parcoursId,
        rating,
        comment: comment.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      setError('Erreur lors de l\'envoi de votre avis. Réessayez plus tard.');
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
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Qu'avez-vous pensé de ce parcours ?</Text>
                <Pressable onPress={onClose} style={styles.closeButton}>
                  <X size={24} color="#64748b" />
                </Pressable>
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Stars */}
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <Star
                      size={40}
                      color={star <= rating ? '#fbbf24' : '#cbd5e1'}
                      fill={star <= rating ? '#fbbf24' : 'transparent'}
                    />
                  </Pressable>
                ))}
              </View>
              <Text style={styles.ratingText}>
                {rating === 1 && 'Très décevant'}
                {rating === 2 && 'Décevant'}
                {rating === 3 && 'Passable'}
                {rating === 4 && 'Très bien'}
                {rating === 5 && 'Excellent !'}
                {rating === 0 && 'Choisissez une note'}
              </Text>

              {/* Comment Input */}
              <TextInput
                style={styles.input}
                placeholder="Laissez un commentaire (optionnel)..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
                maxLength={500}
              />

              {/* Submit Button */}
              <Pressable
                style={[
                  styles.submitButton,
                  (rating === 0 || isSubmitting) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={rating === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitText}>Envoyer mon avis</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  keyboardView: {
    width: '100%',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    paddingTop: 16,
    fontSize: 16,
    color: '#334155',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
