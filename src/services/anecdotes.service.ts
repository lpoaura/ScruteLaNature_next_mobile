import { apiService } from './api.service';
import { clearAndSaveAnecdotesLocal, getRandomAnecdoteLocal, type AnecdoteSQLite } from './database.service';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import type { Anecdote } from '../types/api.types';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_IMAGES || 'https://api.scrutelanature.lpo-aura.org/';

function getFullImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Télécharge la dernière liste des anecdotes et met en cache l'image si nécessaire.
 */
export async function syncAnecdotes(): Promise<void> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  try {
    const anecdotes = await apiService.get<Anecdote[]>('/mobile/anecdotes');
    const sqliteAnecdotes: AnecdoteSQLite[] = [];

    for (const a of anecdotes) {
      let localImageUrl: string | null = null;
      
      if (a.imageUrl) {
        const remoteUrl = getFullImageUrl(a.imageUrl);
        if (remoteUrl) {
          const filename = a.imageUrl.split('/').pop() || `anecdote_${a.id}.jpg`;
          const localUri = `${(FileSystem as any).documentDirectory}anecdotes_${filename}`;
          
          try {
            const fileInfo = await FileSystem.getInfoAsync(localUri);
            if (!fileInfo.exists) {
              await FileSystem.downloadAsync(remoteUrl, localUri);
            }
            localImageUrl = localUri;
          } catch (e) {
            console.error('Erreur téléchargement picto anecdote', e);
          }
        }
      }

      sqliteAnecdotes.push({
        id: a.id,
        content: a.content,
        imageUrl: localImageUrl,
        isActive: a.isActive ? 1 : 0,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      });
    }

    await clearAndSaveAnecdotesLocal(sqliteAnecdotes);
  } catch (error) {
    console.error('Erreur de synchro des anecdotes', error);
  }
}

/**
 * Retourne une anecdote locale au hasard pour affichage.
 */
export async function getRandomAnecdote(): Promise<AnecdoteSQLite | null> {
  return getRandomAnecdoteLocal();
}
