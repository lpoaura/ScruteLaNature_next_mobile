import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/src/services/auth.service';

const GREEN = '#2D6A4F';
const ERROR_COLOR = '#C62828';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    setError('');

    if (!token) {
      setError('Token de réinitialisation invalide ou manquant.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({ token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réinitialisation du mot de passe.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.successContainer, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>Mot de passe modifié !</Text>
        <Text style={styles.successSubtitle}>
          Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
        </Text>
        <Pressable
          style={styles.successButton}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.successButtonText}>Retour à la connexion</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={GREEN} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        <Text style={styles.title}>Nouveau mot de passe</Text>
        <Text style={styles.subtitle}>
          Veuillez entrer votre nouveau mot de passe ci-dessous.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color={ERROR_COLOR} style={{ marginTop: 2 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nouveau mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="********"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="********"
            />
          </View>

          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading || !password || !confirmPassword}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Valider le mot de passe</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 4 },
  backText: { color: GREEN, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 32, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 32, lineHeight: 24 },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: ERROR_COLOR,
    alignItems: 'flex-start',
    gap: 8,
  },
  errorText: { color: ERROR_COLOR, fontSize: 14, flex: 1, lineHeight: 20 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
  },
  button: {
    backgroundColor: GREEN,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successContainer: { flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 24 },
  successEmoji: { fontSize: 64, marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', marginBottom: 12, textAlign: 'center' },
  successSubtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  successButton: { backgroundColor: GREEN, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center' },
  successButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
