import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Text, Pressable, Switch, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/auth.store';
import { useSettingsStore, ThemeType } from '@/src/store/settings.store';
import { useGameStore } from '@/src/store/game.store';
import { ChevronLeft, User, Bell, Volume2, Vibrate, Moon, Download, LogOut, Trash2, ShieldAlert } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Auth State
  const user = useAuthStore((state) => state.user);
  const isGuest = useAuthStore((state) => state.isGuest);
  const logout = useAuthStore((state) => state.logout);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  // Settings State
  const { 
    soundEnabled, setSoundEnabled, 
    vibrationEnabled, setVibrationEnabled, 
    theme, setTheme,
    pushNotificationsEnabled, setPushNotificationsEnabled
  } = useSettingsStore();

  // Local UI State
  const [pseudo, setPseudo] = useState(user?.pseudo || '');
  const [isUpdatingPseudo, setIsUpdatingPseudo] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdatePseudo = async () => {
    if (!pseudo.trim() || pseudo === user?.pseudo) return;
    setIsUpdatingPseudo(true);
    try {
      await updateProfile({ pseudo: pseudo.trim() });
      Alert.alert('Succès', 'Votre pseudo a été mis à jour.');
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de mettre à jour le pseudo.');
      setPseudo(user?.pseudo || ''); // reset
    } finally {
      setIsUpdatingPseudo(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Vider le cache', 
      'Voulez-vous supprimer les parcours téléchargés pour libérer de l\'espace ?', 
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Vider', 
          style: 'destructive', 
          onPress: () => {
            useGameStore.getState().clearAllParcours();
            Alert.alert('Succès', 'Cache vidé avec succès.');
          }
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
      }},
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Suppression du compte', 
      'Attention ! Cette action est irréversible. Toutes vos données seront définitivement effacées conformément au RGPD.', 
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer définitivement', 
          style: 'destructive', 
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccount();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le compte pour le moment.');
              setIsDeleting(false);
            }
          }
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Section: Profil */}
        {!isGuest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profil</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconContainer}>
                  <User size={20} color="#4F46E5" />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Pseudo</Text>
                  <TextInput 
                    style={styles.input}
                    value={pseudo}
                    onChangeText={setPseudo}
                    placeholder="Votre pseudo"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              {pseudo !== user?.pseudo && (
                <Pressable style={styles.saveButton} onPress={handleUpdatePseudo} disabled={isUpdatingPseudo}>
                  {isUpdatingPseudo ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Enregistrer</Text>}
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Section: Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconContainer}>
                <Bell size={20} color="#F59E0B" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingTitle}>Notifications Push</Text>
                <Text style={styles.settingDesc}>Recevez des alertes pour les défis et demandes d'amis.</Text>
              </View>
              <Switch 
                value={pushNotificationsEnabled} 
                onValueChange={setPushNotificationsEnabled} 
                trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Section: Jeu et Audio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expérience de jeu</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.borderBottom]}>
              <View style={styles.iconContainer}>
                <Volume2 size={20} color="#3B82F6" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingTitle}>Effets sonores</Text>
                <Text style={styles.settingDesc}>Sons lors des mini-jeux et succès.</Text>
              </View>
              <Switch 
                value={soundEnabled} 
                onValueChange={setSoundEnabled} 
                trackColor={{ false: '#D1D5DB', true: '#10B981' }}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.iconContainer}>
                <Vibrate size={20} color="#EC4899" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingTitle}>Vibrations</Text>
                <Text style={styles.settingDesc}>Retour haptique pendant la navigation.</Text>
              </View>
              <Switch 
                value={vibrationEnabled} 
                onValueChange={setVibrationEnabled} 
                trackColor={{ false: '#D1D5DB', true: '#10B981' }}
              />
            </View>
          </View>
        </View>

        {/* Section: Apparence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apparence</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconContainer}>
                <Moon size={20} color="#6366F1" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingTitle}>Thème de l'application</Text>
              </View>
            </View>
            <View style={styles.themeOptions}>
              {(['light', 'dark', 'system'] as ThemeType[]).map((t) => (
                <Pressable 
                  key={t}
                  style={[styles.themeButton, theme === t && styles.themeButtonActive]}
                  onPress={() => setTheme(t)}
                >
                  <Text style={[styles.themeText, theme === t && styles.themeTextActive]}>
                    {t === 'light' ? 'Clair' : t === 'dark' ? 'Sombre' : 'Système'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Section: Stockage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stockage local</Text>
          <View style={styles.card}>
            <Pressable style={styles.row} onPress={handleClearCache}>
              <View style={styles.iconContainer}>
                <Download size={20} color="#10B981" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingTitle}>Vider le cache des parcours</Text>
                <Text style={styles.settingDesc}>Supprime les données hors-ligne téléchargées.</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Section: Compte (Zone Danger) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          
          {isGuest && (
            <Pressable 
              style={[styles.card, styles.createAccountCard]}
              onPress={() => router.replace('/(auth)/register')}
            >
              <ShieldAlert size={20} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={styles.createAccountText}>Créer un compte pour sauvegarder</Text>
            </Pressable>
          )}

          <Pressable style={[styles.card, styles.logoutCard]} onPress={handleLogout}>
            <LogOut size={20} color="#4B5563" style={{ marginRight: 12 }} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </Pressable>

          <Pressable 
            style={[styles.card, styles.deleteCard]} 
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            <Trash2 size={20} color="#DC2626" style={{ marginRight: 12 }} />
            <Text style={styles.deleteText}>
              {isDeleting ? 'Suppression...' : 'Supprimer mon compte'}
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  settingDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    padding: 0,
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  themeOptions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  themeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  themeButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  themeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  themeTextActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  createAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  createAccountText: {
    color: '#D97706',
    fontWeight: '600',
    fontSize: 15,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logoutText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 15,
  },
  deleteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FEF2F2',
  },
  deleteText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 15,
  },
});
