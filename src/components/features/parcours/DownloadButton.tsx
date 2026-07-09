import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { parcoursService } from '@/src/services/parcours.service';
import { deleteParcours, isParcoursDownloaded } from '@/src/services/database.service';
import { deleteParcoursFiles } from '@/src/services/filesystem.service';

const GREEN = '#2D6A4F';

type DownloadState = 'checking' | 'idle' | 'downloading' | 'downloaded' | 'error';

interface DownloadButtonProps {
  parcoursId: string;
  onDownloaded?: () => void;
  onPlay?: () => void;
  isPreview?: boolean;
}

/**
 * Bouton intelligent pour le téléchargement d'un parcours hors-ligne.
 *
 * États :
 * - checking   → spinner (vérification base locale)
 * - idle       → "Télécharger pour jouer hors-ligne"
 * - downloading → barre de progression 0→100%
 * - downloaded → "Jouer" (plein) + "Supprimer" (outline)
 * - error      → message d'erreur + "Réessayer"
 */
export function DownloadButton({ parcoursId, onDownloaded, onPlay, isPreview = false }: DownloadButtonProps) {
  const [state, setState] = useState<DownloadState>('checking');
  const [errorMsg, setErrorMsg] = useState('');
  const [pct, setPct] = useState(0);
  const progress = useSharedValue(0);
  const cancelRef = useRef(false);

  useEffect(() => {
    checkDownloadStatus();
    return () => { cancelRef.current = true; };
  }, [parcoursId]);

  const checkDownloadStatus = async () => {
    setState('checking');
    const downloaded = await isParcoursDownloaded(parcoursId);
    if (!cancelRef.current) {
      setState(downloaded ? 'downloaded' : 'idle');
    }
  };

  const handleDownload = async () => {
    setState('downloading');
    progress.value = 0;
    setPct(0);
    cancelRef.current = false;
    setErrorMsg('');

    try {
      await parcoursService.download(
        parcoursId, 
        (p) => {
          progress.value = withTiming(p, { duration: 200 });
          setPct(Math.round(p * 100));
        },
        isPreview
      );

      if (!cancelRef.current) {
        progress.value = withTiming(1, { duration: 300 });
        setPct(100);
        setTimeout(() => {
          setState('downloaded');
          onDownloaded?.();
        }, 400);
      }
    } catch (err) {
      if (!cancelRef.current) {
        setState('error');
        setErrorMsg(err instanceof Error ? err.message : 'Échec du téléchargement');
      }
    }
  };

  const handleDelete = async () => {
    try {
      await deleteParcours(parcoursId);
      await deleteParcoursFiles(parcoursId);
      progress.value = 0;
      setState('idle');
    } catch {
      setErrorMsg('Impossible de supprimer le parcours.');
    }
  };

  // Barre de progression animée
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress.value * 100)}%`,
  }));

  // ─── Rendu par état ───────────────────────────────────────────────────────

  if (state === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} />
      </View>
    );
  }

  if (state === 'downloading') {
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>Téléchargement en cours… {pct}%</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressBarStyle]} />
        </View>
      </View>
    );
  }

  if (state === 'downloaded') {
    return (
      <View style={styles.row}>
        {/* Bouton Jouer */}
        <Pressable
          style={[styles.playButton, { flex: 1 }]}
          onPress={onPlay}
        >
          <Text style={styles.playIcon}>▶</Text>
          <Text style={styles.playText}>Jouer</Text>
        </Pressable>

        {/* Bouton Supprimer */}
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>🗑</Text>
        </Pressable>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠ {errorMsg}</Text>
        <Pressable style={styles.retryButton} onPress={handleDownload}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  // État idle → bouton de téléchargement
  return (
    <Pressable style={styles.downloadButton} onPress={handleDownload}>
      <Text style={styles.downloadIcon}>⬇</Text>
      <View>
        <Text style={styles.downloadTitle}>Télécharger</Text>
        <Text style={styles.downloadSubtitle}>Pour jouer sans connexion</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', padding: 16 },
  row: { flexDirection: 'row', gap: 12 },

  // Téléchargement
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: GREEN,
    borderRadius: 14,
    padding: 16,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  downloadIcon: { fontSize: 24, color: '#fff' },
  downloadTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  downloadSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },

  // Progression
  progressContainer: { gap: 10 },
  progressLabel: { fontSize: 13, color: '#555', textAlign: 'center' },
  progressTrack: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: GREEN, borderRadius: 4 },

  // Jouer
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: GREEN,
    borderRadius: 14,
    padding: 16,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  playIcon: { fontSize: 18, color: '#fff' },
  playText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Supprimer
  deleteButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  deleteText: { fontSize: 20 },

  // Erreur
  errorContainer: { gap: 10 },
  errorText: { fontSize: 13, color: '#C62828', textAlign: 'center' },
  retryButton: {
    height: 44,
    backgroundColor: '#607D8B',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
