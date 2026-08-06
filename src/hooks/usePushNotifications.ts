import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token ?? null));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Action à effectuer quand l'utilisateur clique sur la notification (ex: redirection)
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | undefined;

  // Configuration du canal de notification obligatoire pour Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notifications LPO',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0087CC',
      showBadge: true,
      enableVibrate: true,
    });
  }

  if (!Device.isDevice) {
    console.log('[PushNotifications] Les notifications Push requièrent un appareil physique (indisponible sur émulateur/simulateur).');
    return null;
  }

  try {
    const permissions = await Notifications.getPermissionsAsync();
    let isGranted = permissions.status === 'granted';
    if (!isGranted) {
      const requested = await Notifications.requestPermissionsAsync();
      isGranted = requested.status === 'granted';
    }
    if (!isGranted) {
      console.warn('[PushNotifications] Permission refusée ou bloquée (sur Android 13+, nécessite la permission POST_NOTIFICATIONS dans app.json / manifest).');
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

    if (!projectId) {
      console.error('[PushNotifications] EAS Project ID introuvable dans app.json.');
    }

    const response = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = response.data;
    console.log('[PushNotifications] Token Expo généré avec succès :', token);
  } catch (e: any) {
    if (e?.message?.includes('Expo Go') || e?.message?.includes('projectId') || e?.message?.includes('remote push')) {
      console.warn(
        "[PushNotifications] Attention : Depuis Expo SDK 51+, les notifications Push distantes n'opèrent plus directement dans Expo Go. Vous devez tester sur une application compilée (APK / AAB) ou via un Expo Dev Client (expo run:android / expo run:ios).",
      );
    } else {
      console.error('[PushNotifications] Erreur lors de la récupération de l\'Expo Push Token :', e);
    }
  }

  return token ?? null;
}
