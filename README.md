# Scrute La Nature - App Mobile 📱🦅

Application mobile du projet "Scrute La Nature" pour la LPO, conçue spécialement pour fonctionner en pleine forêt, en mode **Hors-Ligne (Local-First)**.

## 🛠️ Stack Technique

- **Framework** : React Native & Expo
- **Stockage Local** : `expo-sqlite` pour la mémorisation du jeu, des textes et de la file d'attente hors-ligne.
- **Médias et Cartes** : `expo-file-system` pour la mise en cache des images, des sons, et des tuiles OpenStreetMap.
- **Géolocalisation** : Déclencheurs natifs GPS "Triggers" à proximité des étapes de jeu (10 mètres).

## 🧩 Fonctionnalités

- **Téléchargement Hors-Ligne** : Possibilité de télécharger une balade intégrale avant de partir en forêt.
- **Micro-Jeux** : Modules interactifs empilables (QCM, Charades, Code Caesar, Lecteur sonore de chants d'oiseaux).
- **Sciences Participatives** : Prise de photos via l'appareil du téléphone et envois différés (Synchronisation) dès le retour du réseau 4G/Wifi.
- **Gamification** : Profil explorateur, suivi de CO2 économisé, Points d'XP et badges (L'Herbier virtuel).

## 🚀 Démarrage Rapide

1. Assurez-vous d'avoir l'application [Expo Go](https://expo.dev/client) sur votre téléphone portable, ou d'avoir configuré le SDK Android/iOS sur votre machine.
2. Clonez le projet.
3. Installez les dépendances : `npm install`
4. Démarrez l'application localement sur votre terminal : `npx expo start`
5. Scannez le QR Code depuis votre application mobile (ou lancez l'émulateur avec la touche 'i' ou 'a').



ipconfig getifaddr en0

## Compilation

### Configuration des variables d'environnement sur expo pour la compilation

```bash
eas env:create --name EXPO_PUBLIC_API_URL --value "https://..." --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_API_IMAGES --value "https://..." --environment production --visibility plaintext

eas env:create --name EXPO_PUBLIC_API_URL --value "https://..." --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_API_IMAGES --value "https://..." --environment preview --visibility plaintext
```
### Compilation de l'appli sur expo

La version `preview` compile un `apk`, la version `production` un `aab` pour le play store.

```bash
eas build -p android --profile <preview,production>
```