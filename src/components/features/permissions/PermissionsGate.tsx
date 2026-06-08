import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const GREEN = '#2D6A4F';

interface PermissionStatus {
  location: 'granted' | 'denied' | 'undetermined';
  camera: 'granted' | 'denied' | 'undetermined';
}

interface Props {
  children: React.ReactNode;
}

/**
 * Composant guard pour les permissions natives GPS + Caméra.
 *
 * - Si toutes les permissions sont accordées → affiche les enfants normalement
 * - Sinon → affiche un écran pédagogique LPO expliquant pourquoi les permissions
 *   sont nécessaires et propose de les accorder
 *
 * La caméra n'est pas strictement requise pour naviguer (on peut la refuser
 * et utiliser l'app sans le module observations). Le GPS en revanche est
 * indispensable pour la navigation en forêt.
 */
export function PermissionsGate({ children }: Props) {
  const insets = useSafeAreaInsets();
  const [permissions, setPermissions] = useState<PermissionStatus>({
    location: 'undetermined',
    camera: 'undetermined',
  });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const [locationStatus, cameraStatus] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Camera.getCameraPermissionsAsync(),
    ]);
    setPermissions({
      location: locationStatus.granted ? 'granted' : locationStatus.canAskAgain ? 'undetermined' : 'denied',
      camera: cameraStatus.granted ? 'granted' : cameraStatus.canAskAgain ? 'undetermined' : 'denied',
    });
    setChecked(true);
  };

  const requestLocation = async () => {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    setPermissions((prev) => ({ ...prev, location: granted ? 'granted' : 'denied' }));
  };

  const requestCamera = async () => {
    const { granted } = await Camera.requestCameraPermissionsAsync();
    setPermissions((prev) => ({ ...prev, camera: granted ? 'granted' : 'denied' }));
  };

  const openSettings = () => {
    Linking.openSettings();
  };
  // Pré-calcul des états pour éviter les narrowings TypeScript après les early returns
  const locationGranted = permissions.location === 'granted';
  const locationDenied = permissions.location === 'denied';
  const cameraDenied = permissions.camera === 'denied';
  const cameraGranted = permissions.camera === 'granted';

  // Pas encore vérifié → ne rien afficher (évite le flash)
  if (!checked) return null;

  // GPS accordé → afficher l'app (la caméra est optionnelle)
  if (locationGranted) {
    return <>{children}</>;
  }

  // Afficher l'écran de permissions
  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.emoji}>🌲</Text>
      <Text style={styles.title}>Avant de commencer votre balade</Text>
      <Text style={styles.subtitle}>
        L'application a besoin de quelques autorisations pour fonctionner en pleine nature.
      </Text>

      {/* GPS */}
      <View style={styles.permissionCard}>
        <View style={styles.permissionHeader}>
          <Text style={styles.permissionIcon}>📍</Text>
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionTitle}>Localisation (GPS)</Text>
            <Text style={styles.permissionDesc}>
              Pour vous situer sur la carte du parcours et déclencher les énigmes quand vous approchez d'un point.
            </Text>
          </View>
          <Text style={styles.permissionStatus}>
            {permissions.location === 'granted' ? '✅' : locationDenied ? '❌' : '⏳'}
          </Text>
        </View>
        {!locationGranted && (
          locationDenied ? (
            <Pressable style={styles.settingsButton} onPress={openSettings}>
              <Text style={styles.settingsButtonText}>Ouvrir les paramètres</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.allowButton} onPress={requestLocation}>
              <Text style={styles.allowButtonText}>Autoriser la localisation</Text>
            </Pressable>
          )
        )}
      </View>

      {/* Caméra (optionnelle) */}
      <View style={[styles.permissionCard, styles.optionalCard]}>
        <View style={styles.permissionHeader}>
          <Text style={styles.permissionIcon}>📷</Text>
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionTitle}>
              Appareil photo <Text style={styles.optionalBadge}>(optionnel)</Text>
            </Text>
            <Text style={styles.permissionDesc}>
              Pour photographier les espèces de faune et flore que vous observez pendant la balade.
            </Text>
          </View>
          <Text style={styles.permissionStatus}>
            {permissions.camera === 'granted' ? '✅' : permissions.camera === 'denied' ? '❌' : '⏳'}
          </Text>
        </View>
        {!cameraGranted && (
          cameraDenied ? (
            <Pressable style={styles.settingsButtonOutline} onPress={openSettings}>
              <Text style={styles.settingsButtonOutlineText}>Ouvrir les paramètres</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.allowButtonOutline} onPress={requestCamera}>
              <Text style={styles.allowButtonOutlineText}>Autoriser la caméra</Text>
            </Pressable>
          )
        )}
      </View>

      <Text style={styles.footer}>
        🔒 Vos données restent sur votre appareil. Le GPS n'est utilisé que lorsque l'application est ouverte.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 24,
    gap: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 64 },
  title: { fontSize: 22, fontWeight: '700', color: '#111', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
  permissionCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  optionalCard: {
    borderStyle: 'dashed',
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  permissionIcon: { fontSize: 28 },
  permissionInfo: { flex: 1 },
  permissionTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  permissionDesc: { fontSize: 13, color: '#666', lineHeight: 19, marginTop: 2 },
  permissionStatus: { fontSize: 20 },
  optionalBadge: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999',
    fontStyle: 'italic',
  },
  allowButton: {
    height: 44,
    backgroundColor: GREEN,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  allowButtonOutline: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowButtonOutlineText: { color: GREEN, fontWeight: '600', fontSize: 14 },
  settingsButton: {
    height: 44,
    backgroundColor: '#607D8B',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  settingsButtonOutline: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#607D8B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonOutlineText: { color: '#607D8B', fontWeight: '600', fontSize: 14 },
  footer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
