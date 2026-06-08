import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '@/src/services/auth.service';

const GREEN = '#2D6A4F';
const ERROR_COLOR = '#C62828';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Adresse email invalide.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword({ email: email.trim().toLowerCase() });
      setSuccess(true);
    } catch (err: unknown) {
      // On affiche un succès même en cas d'erreur pour ne pas révéler
      // si l'email existe ou non en base (sécurité)
      setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Écran de confirmation
  if (success) {
    return (
      <View style={[styles.successContainer, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.successEmoji}>📧</Text>
        <Text style={styles.successTitle}>Email envoyé !</Text>
        <Text style={styles.successSubtitle}>
          Si un compte existe pour{' '}
          <Text style={{ fontWeight: '700' }}>{email}</Text>
          , vous recevrez un lien pour réinitialiser votre mot de passe dans quelques minutes.
        </Text>
        <Text style={styles.successHint}>
          Pensez à vérifier vos spams si vous ne le trouvez pas.
        </Text>
        <Pressable
          style={styles.returnButton}
          onPress={() => router.navigate({ pathname: '/(auth)/login' })}
        >
          <Text style={styles.returnButtonText}>Retour à la connexion</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>

        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>
          Saisissez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="votre@email.fr"
            placeholderTextColor="#aaa"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!isLoading}
          />
        </View>

        <Pressable
          style={[styles.submitButton, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Envoyer le lien</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { flex: 1, paddingHorizontal: 24, gap: 20 },
  backButton: { paddingVertical: 8 },
  backText: { color: GREEN, fontSize: 15, fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 15, color: '#666', lineHeight: 22 },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: ERROR_COLOR,
  },
  errorText: { color: ERROR_COLOR, fontSize: 14 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#333' },
  input: {
    height: 52,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111',
  },
  submitButton: {
    height: 54,
    backgroundColor: GREEN,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  // ─── Succès ──────────────────────────────────────────────────────
  successContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  successEmoji: { fontSize: 72 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#111', textAlign: 'center' },
  successSubtitle: { fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 24 },
  successHint: { fontSize: 13, color: '#999', textAlign: 'center', fontStyle: 'italic' },
  returnButton: {
    height: 54,
    backgroundColor: GREEN,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 8,
  },
  returnButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
