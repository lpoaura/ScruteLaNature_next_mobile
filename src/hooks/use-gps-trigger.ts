import { useEffect, useState, useRef } from 'react';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { haversineDistance } from '../utils/distance';
import type { Etape } from '../types/api.types';

// Distance en mètres pour considérer qu'une étape est atteinte
const TRIGGER_DISTANCE_METERS = 10;

interface UseGpsTriggerProps {
  etapes: Etape[];
  currentEtapeOrder: number;
  onStepReached: (etape: Etape) => void;
  isActive: boolean; // Permet de désactiver le trigger (ex: si le jeu est en pause ou déjà en cours)
}

export function useGpsTrigger({
  etapes,
  currentEtapeOrder,
  onStepReached,
  isActive,
}: UseGpsTriggerProps) {
  const [distanceToNext, setDistanceToNext] = useState<number | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  
  // L'étape actuelle à atteindre (order commence à 1, index 0)
  const targetEtape = etapes.find((e) => e.order === currentEtapeOrder);

  useEffect(() => {
    // Si pas actif ou pas d'étape cible, on ne fait rien
    if (!isActive || !targetEtape) {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      setDistanceToNext(null);
      return;
    }

    async function startWatching() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission GPS non accordée pour le trigger');
        return;
      }

      // Si on écoute déjà, on annule l'ancien
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 2, // Mise à jour tous les 2 mètres
          timeInterval: 2000, // ou toutes les 2 secondes
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          
          const distance = haversineDistance(
            latitude,
            longitude,
            targetEtape!.latitude,
            targetEtape!.longitude
          );

          setDistanceToNext(distance);

          // Si on est à l'intérieur du rayon de trigger
          if (distance <= TRIGGER_DISTANCE_METERS) {
            // Haptic Feedback puissant pour prévenir l'utilisateur
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // On déclenche le callback
            onStepReached(targetEtape!);
          }
        }
      );
    }

    startWatching();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, [isActive, targetEtape, onStepReached]);

  return { distanceToNext, targetEtape };
}
