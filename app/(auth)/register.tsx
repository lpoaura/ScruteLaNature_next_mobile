import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSettingsStore } from '@/src/store/settings.store';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store/auth.store';

const GREEN = '#2D6A4F';
const ERROR_COLOR = '#C62828';
const RGPD_URL = 'https://auvergne-rhone-alpes.lpo.fr/projets/scrute-la-nature-politique-de-confidentialite/';

// ─── Validation locale ────────────────────────────────────────────────────────

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Le mot de passe doit faire au moins 8 caractères.';
  return null;
}

// ─── Composant Checkbox ───────────────────────────────────────────────────────

function Checkbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      style={[styles.checkbox, checked && styles.checkboxChecked]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
    </Pressable>
  );
}

// ─── Écran d'inscription ──────────────────────────────────────────────────────

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const settingsTheme = useSettingsStore((state: any) => state.theme);
  const isDark = (settingsTheme === 'system' ? systemColorScheme : settingsTheme) === 'dark';
  const { register, isLoading } = useAuthStore();

  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rgpdAccepted, setRgpdAccepted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    setError('');

    // Validations
    if (!pseudo.trim()) {
      setError('Le pseudo est requis.');
      return;
    }
    if (pseudo.trim().length < 3) {
      setError('Le pseudo doit faire au moins 3 caractères.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Adresse email invalide.');
      return;
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!rgpdAccepted) {
      setError('Vous devez accepter la politique de confidentialité pour créer un compte.');
      return;
    }

    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        pseudo: pseudo.trim(),
        rgpdAccepted: true,
      
});
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    }
  };

  // Écran de succès — demander de vérifier l'email
  if (success) {
    return (
      <View style={[styles.successContainer, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.successEmoji}>📬</Text>
        <Text style={styles.successTitle}>Vérifiez votre boîte mail !</Text>
        <Text style={styles.successSubtitle}>
          Un email de confirmation a été envoyé à{' '}
          <Text style={{ fontWeight: '700' }}>{email}</Text>.{'\n'}
          Cliquez sur le lien pour activer votre compte.
        </Text>
        <Pressable
          style={styles.successButton}
          onPress={() => router.navigate({ pathname: '/(auth)/login' })}
        >
          <Text style={styles.successButtonText}>Retour à la connexion</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.darkContainer]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête */}
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>

        <Text style={[styles.title, isDark && styles.darkText]}>Créer un compte</Text>
        <Text style={[styles.subtitle, isDark && styles.darkTextMuted]}>
          Rejoignez la communauté LPO et sauvegardez votre progression.
        </Text>

        {/* Erreur */}
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={ERROR_COLOR} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Champs */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, isDark && styles.darkTextMuted]}>Pseudo</Text>
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              value={pseudo}
              onChangeText={setPseudo}
              placeholder="Votre pseudo LPO"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              editable={!isLoading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, isDark && styles.darkTextMuted]}>Email</Text>
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.fr"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
              editable={!isLoading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, isDark && styles.darkTextMuted]}>Mot de passe</Text>
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="8 caractères minimum"
              placeholderTextColor="#aaa"
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="next"
              editable={!isLoading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, isDark && styles.darkTextMuted]}>Confirmer le mot de passe</Text>
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Répétez votre mot de passe"
              placeholderTextColor="#aaa"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              editable={!isLoading}
            />
          </View>

          {/* ── Consentement RGPD ── */}
          <Pressable
            style={styles.rgpdRow}
            onPress={() => !isLoading && setRgpdAccepted((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rgpdAccepted }}
          >
            <Checkbox
              checked={rgpdAccepted}
              onChange={setRgpdAccepted}
              disabled={isLoading}
            />
            <Text style={styles.rgpdText}>
              J'ai lu et j'accepte la{' '}
              <Text
                style={styles.rgpdLink}
                onPress={() => Linking.openURL(RGPD_URL)}
              >
                politique de confidentialité
              </Text>{' '}
              de Scrute La Nature (LPO).
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.submitButton,
              (isLoading || !rgpdAccepted) && styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Créer mon compte</Text>
            )}
          </Pressable>
        </View>

        {/* Lien connexion */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Déjà un compte ?</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.loginLink}>Se connecter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { paddingHorizontal: 24, gap: 16 },
  backButton: { paddingVertical: 8, marginBottom: 8 },
  backText: { color: GREEN, fontSize: 15, fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 15, color: '#666', lineHeight: 22 },

  // Erreur
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: ERROR_COLOR,
  },
  errorText: { color: ERROR_COLOR, fontSize: 14, flex: 1 },

  // Formulaire
  form: { gap: 14, marginTop: 8 },
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

  // RGPD
  rgpdRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  rgpdText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  rgpdLink: {
    color: GREEN,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Bouton
  submitButton: {
    height: 54,
    backgroundColor: GREEN,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },

  // Connexion
  loginRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  loginText: { color: '#666', fontSize: 15 },
  loginLink: { color: GREEN, fontSize: 15, fontWeight: '600' },

  // Succès
  successContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  successEmoji: { fontSize: 72 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#111', textAlign: 'center' },
  successSubtitle: { fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 24 },
  successButton: {
    height: 54,
    backgroundColor: GREEN,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 8,
  },
  successButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  darkContainer: { backgroundColor: '#0F172A' },
  darkCard: { backgroundColor: '#1E293B', shadowColor: '#000', borderColor: '#334155' },
  darkText: { color: '#F8FAFC' },
  darkTextMuted: { color: '#94A3B8' },
  darkInput: { backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC' },
});
