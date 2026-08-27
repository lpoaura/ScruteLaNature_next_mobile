# Scrute La Nature - App Mobile 📱🦅

Application mobile du projet "Scrute La Nature" pour la LPO, conçue spécialement pour fonctionner en pleine forêt, en mode **Hors-Ligne (Local-First)**.

## 🛠️ Stack Technique

- **Framework** : React Native & Expo
- **Stockage Local** : `expo-sqlite` pour la mémorisation du jeu, des textes et de la file d'attente hors-ligne.
- **Médias et Cartes** : `expo-file-system` pour la mise en cache des images, des sons, et des tuiles OpenStreetMap.
- **Géolocalisation** : Déclencheurs natifs GPS "Triggers" à proximité des étapes de jeu (10 mètres).

## 🧩 Fonctionnalités

- **Téléchargement Hors-Ligne** : Possibilité de télécharger une balade intégrale avant de partir en forêt.
- **Mode Escape Game** : Transformation d'un parcours en aventure chronométrée stricte avec écran de "Game Over" si le temps est écoulé.
- **Micro-Jeux** : Modules interactifs empilables (QCM, Charades, Code Caesar, Lecteur sonore de chants d'oiseaux).
- **Sciences Participatives** : Prise de photos via l'appareil du téléphone et envois différés (Synchronisation) dès le retour du réseau 4G/Wifi.
- **Gamification** : Profil explorateur, suivi de CO2 économisé, Points d'XP et badges (L'Herbier virtuel).

---

## 📂 Architecture du Projet

Le code source est organisé selon les bonnes pratiques **Expo Router (App Router)** et une séparation stricte des responsabilités métier dans `src/` :

```text
lpo-balades-mobile/
├── app/                  # (Expo Router) Tous les écrans et la navigation (tabs, modales)
│   ├── (tabs)/           # Écrans principaux avec la barre de navigation basse
│   ├── _layout.tsx       # Layout racine, configuration du thème et Providers
│   └── index.tsx         # Point d'entrée de l'application
├── assets/               # Images statiques, icônes, polices (Fonts)
└── src/                  # Cœur métier et logique de l'application
    ├── components/       # Composants UI réutilisables (Boutons, Cartes, etc.)
    ├── constants/        # Variables globales, couleurs de thème, configurations
    ├── hooks/            # Hooks React personnalisés (ex: usePushNotifications)
    ├── services/         # Appels API (Axios), base de données SQLite (Offline)
    ├── store/            # États globaux Zustand (AuthStore, ParcoursStore)
    ├── theme/            # Configuration NativeWind / TailwindCSS
    ├── types/            # Définitions TypeScript globales (Interfaces, DTOs)
    └── utils/            # Fonctions utilitaires (Haversine, formatage de dates)
```

---

## 🚀 Démarrage Rapide

1. Assurez-vous d'avoir l'application [Expo Go](https://expo.dev/client) sur votre téléphone portable, ou d'avoir configuré le SDK Android/iOS sur votre machine.
2. Clonez le projet.
3. Installez les dépendances : `npm install`
4. Démarrez l'application localement sur votre terminal : `npx expo start`
5. Scannez le QR Code depuis votre application mobile (ou lancez l'émulateur avec la touche 'i' ou 'a').

---

## 🔔 Notifications Push (Configurations cruciales)

L'application utilise **Expo Push Notifications** pour gérer de façon unifiée l'envoi vers Android (FCM) et iOS (APNs). Cependant, **plusieurs prérequis stricts** s'appliquent pour les builds en production (APK/AAB) :

### 1. Android (Firebase Cloud Messaging obligatoire)
Il n'est pas possible de recevoir des notifications Push sur un APK Android autonome sans relier l'application à Firebase.
- **`google-services.json`** : Un projet Firebase (gratuit) doit être créé pour le package `fr.lpo.scrutelanature`. Le fichier `google-services.json` généré doit être placé à la racine du projet et référencé dans `app.json` sous `android.googleServicesFile`.
- **Clé de service FCM V1** : Expo (sur `expo.dev` ou via `eas credentials`) doit posséder la clé de compte de service Firebase JSON pour avoir l'autorisation de réveiller les appareils Android.

### 2. iOS (Apple Push Notification service)
Firebase n'est pas utilisé pour iOS. 
- Il faut générer une clé d'authentification Push (`.p8` APNs Auth Key) sur votre compte **Apple Developer**.
- Envoyer cette clé sur le tableau de bord d'Expo. L'envoi sera géré directement d'Expo vers les serveurs Apple.

### 3. Tests en local (Ce qui ne marche PAS)
- ❌ **Émulateurs / Simulateurs** : Le hook `usePushNotifications` bloque sciemment la demande de token sur émulateur (`!Device.isDevice`) car ni iOS ni Android standard ne supportent correctement les notifications distantes virtuelles dans ce contexte.
- ❌ **Expo Go** : Depuis Expo SDK 51, l'application classique *Expo Go* ne permet plus la réception de notifications push distantes.
- ✅ **La bonne méthode de test** : Branchez un appareil Android physique en USB et compilez l'application nativement dessus en exécutant `npx expo run:android` (ou faites un build APK de développement via EAS). L'appareil récupèrera alors un vrai `ExponentPushToken`.

---

## 🛠 Configurations de conformité Android
L'application cible explicitement **Android 16 (Niveau d'API 36)** pour être en avance sur les obligations de sécurité du Google Play Store applicables après août 2026.
Cette configuration est définie conjointement dans :
- `app.json` : `"compileSdkVersion": 36`, `"targetSdkVersion": 36`
- `android/build.gradle` : Bloc `ext { compileSdkVersion = 36; targetSdkVersion = 36 }`

---

## 📈 Guide de Montée en Version (Upgrades)

Pour publier une nouvelle version sur les stores ou mettre à jour le framework, voici les étapes incontournables :

### 1. Publier une mise à jour sur les Stores (Play Store / App Store)
Avant chaque nouveau build destiné à la production (`eas build -p all --profile production`), vous devez **obligatoirement incrémenter les numéros de version** dans `app.json` :
- `"version": "1.x.x"` : C'est le numéro de version public (ex: 1.0.5) visible par les utilisateurs.
- `"android.versionCode": X` : **Doit être incrémenté de +1** à chaque build (ex: 4 -> 5). Google Play refusera tout APK ayant un versionCode déjà existant.
- `"ios.buildNumber": "X.X.X"` : **Doit être incrémenté** pour Apple TestFlight/App Store.

### 2. Mettre à jour Expo (SDK Bump)
Pour passer à la version supérieure d'Expo (ex: SDK 54 vers 55) :
1. Suivez la procédure officielle d'Expo: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
2. Expo mettra automatiquement à jour `package.json` avec les versions natives compatibles.
3. Supprimez le cache et réinstallez : `rm -rf node_modules package-lock.json && npm install`
4. Re-compilez toujours un Dev Client natif pour tester : `npx expo run:android`

---

## 🆕 Dernières Évolutions (Changelog Récent)

Pour faciliter la reprise par d'autres développeurs, voici les corrections UI/UX et système appliquées récemment :

### 1. Synchronisation du Thème (Dark/Light Mode)
- **Problème résolu** : Lorsque l'utilisateur sélectionnait le mode "Système" dans les paramètres, le thème de l'application (NativeWind) ne se synchronisait plus avec les changements dynamiques d'iOS/Android.
- **Solution** : Refonte de la logique dans le fichier layout racine (`app/_layout.tsx`). Utilisation combinée de `Appearance.setColorScheme` (React Native natif) et de `setNativeWindColorScheme` (NativeWind v4) pour forcer la synchronisation des deux moteurs de style.

### 2. Ergonomie UI
- **Écran de connexion** : Réduction de la taille du logo (fixé à 200x200) sur la page de connexion pour qu'il prenne moins de place et évite de pousser les champs de saisie hors de l'écran sur les petits appareils.

### 3. Architecture Mobile
- **Sécurité et Google Play** : Mise à jour proactive du build pour Android API 36 afin de respecter les avertissements de la console Google Play Developer avant la date limite d'Août 2026.
