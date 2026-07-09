import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── SecureStore (tokens JWT — chiffré sur l'appareil) ────────────────────────

/**
 * Sauvegarde une valeur sensible dans le SecureStore chiffré.
 * Utilisé pour les access token et refresh token.
 */
export async function saveSecure(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

/**
 * Récupère une valeur depuis le SecureStore chiffré.
 */
export async function getSecure(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key);
}

/**
 * Supprime une valeur du SecureStore chiffré.
 */
export async function deleteSecure(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

// ─── AsyncStorage (données non-sensibles) ─────────────────────────────────────

/**
 * Sauvegarde un objet JSON dans AsyncStorage.
 */
export async function saveJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/**
 * Récupère un objet JSON depuis AsyncStorage.
 */
export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Supprime une valeur d'AsyncStorage.
 */
export async function deleteStorage(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

/**
 * Sauvegarde une string simple dans AsyncStorage.
 */
export async function saveString(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

/**
 * Récupère une string depuis AsyncStorage.
 */
export async function getString(key: string): Promise<string | null> {
  return await AsyncStorage.getItem(key);
}
