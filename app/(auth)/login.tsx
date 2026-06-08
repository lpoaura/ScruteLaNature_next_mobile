import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useAuthStore } from '@/src/store/auth.store';

// ─── Palette ──────────────────────────────────────────────────────────────────
const GREEN = '#2D6A4F';
const GREEN_LIGHT = '#E8F5E9';
const ERROR_COLOR = '#C62828';

// ─── Écran de Connexion ───────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ verified?: string }>();

  const { login, loginAsGuest, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Message de succès si l'utilisateur vient de vérifier son email
  useEffect(() => {
    if (params.verified === 'true') {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [params.verified]);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    try {
      await login({ email: email.trim().toLowerCase(), password });
      // La navigation se fait automatiquement via AuthGuard dans _layout.tsx
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Identifiants incorrects.');
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    try {
      await loginAsGuest();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de continuer en invité.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Titre */}
        <View style={styles.header}>
          <Text style={styles.logo}>🐦</Text>
          <Text style={styles.title}>Scrute la Nature</Text>
          <Text style={styles.subtitle}>Application LPO — Balades Nature</Text>
        </View>

        {/* Message de succès (email vérifié) */}
        {showSuccess && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>
              ✅ Email vérifié ! Vous pouvez maintenant vous connecter.
            </Text>
          </View>
        )}

        {/* ─── Bouton Invité (CTA principal) ─────────────────────────── */}
        <Pressable
          style={[styles.guestButton, isLoading && styles.buttonDisabled]}
          onPress={handleGuestLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.guestButtonIcon}>🎮</Text>
              <View>
                <Text style={styles.guestButtonTitle}>Jouer immédiatement</Text>
                <Text style={styles.guestButtonSubtitle}>
                  Sans compte — votre progression est sauvegardée localement
                </Text>
              </View>
            </>
          )}
        </Pressable>

        {/* Séparateur */}
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>ou se connecter</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* ─── Formulaire connexion ───────────────────────────────────── */}
        <View style={styles.form}>
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
              returnKeyType="next"
              editable={!isLoading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#aaa"
              secureTextEntry
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!isLoading}
            />
          </View>

          <Pressable
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Se connecter</Text>
            )}
          </Pressable>

          {/* Mot de passe oublié */}
          <Pressable
            style={styles.forgotButton}
            onPress={() => router.navigate({ pathname: '/(auth)/forgot-password' })}
          >
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </Pressable>
        </View>

        {/* ─── Lien inscription ────────────────────────────────────────── */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Pas encore de compte ?</Text>
          <Pressable onPress={() => router.navigate({ pathname: '/(auth)/register' })}>
            <Text style={styles.registerLink}>Créer un compte</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logo: {
    fontSize: 56,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: GREEN,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: GREEN,
  },
  successText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '500',
  },
  // ─── Bouton invité ─────────────────────────────────────────────
  guestButton: {
    backgroundColor: GREEN,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  guestButtonIcon: {
    fontSize: 32,
  },
  guestButtonTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  guestButtonSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  // ─── Séparateur ────────────────────────────────────────────────
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  separatorText: {
    color: '#999',
    fontSize: 13,
  },
  // ─── Formulaire ─────────────────────────────────────────────────
  form: {
    gap: 16,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: ERROR_COLOR,
  },
  errorText: {
    color: ERROR_COLOR,
    fontSize: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
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
  loginButton: {
    height: 54,
    backgroundColor: GREEN,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  forgotText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '500',
  },
  // ─── Lien inscription ───────────────────────────────────────────
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  registerText: {
    color: '#666',
    fontSize: 15,
  },
  registerLink: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '600',
  },
});
