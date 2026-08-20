# Architecture de l'Application Mobile (Expo / React Native)

L'application mobile (iOS / Android) est l'interface grand public destinée aux joueurs. Elle permet de découvrir des balades, de jouer aux mini-jeux géolocalisés, et de gagner des badges. Elle est développée avec **React Native**, propulsée par le framework **Expo**, et utilise **NativeWind** (Tailwind CSS) pour le style.

## Fichiers principaux à la racine
- **`app.json`** : Configuration vitale de l'application Expo (Nom, icône, version, splash screen, permissions Android/iOS, plugins requis).
- **`package.json`** : Dépendances mobiles.
- **`tailwind.config.js` / `global.css`** : Configuration du style NativeWind.
- **`babel.config.js` / `metro.config.js`** : Configuration de la compilation React Native.
- **Dossiers `android/` et `ios/`** : Dossiers générés (mode prébuild) contenant le code natif (Swift/Kotlin). Ils ne sont généralement pas modifiés manuellement, sauf besoin très spécifique.

## Structure du dossier `app/` (Expo Router)

Comme Next.js, l'application mobile utilise Expo Router (un système de routage basé sur les fichiers).

- **`app/(tabs)/`** : Les pages principales accessibles via la barre de navigation basse (Bottom Tab Bar).
  - **`_layout.tsx`** : Définit la Tab Bar (icônes de navigation).
  - **`index.tsx`** : L'écran d'accueil de l'app (Tableau de bord du joueur, anecdotes, bouton "Scanner").
  - **`profile/`** : L'écran du profil utilisateur (Statistiques, Badg'othèque).
- **`app/(auth)/`** : Écrans de connexion, inscription et réinitialisation de mot de passe (généralement présentés sous forme de modales ou de flow distinct).
- **`app/parcours/`** : Flow principal du jeu.
  - **`[id].tsx`** : La page de présentation détaillée d'un parcours spécifique (Description, distance, bouton pour démarrer).
  - **`jeu/`** : Écran actif de la balade géolocalisée. Contient la carte Mapbox, la position GPS de l'utilisateur en temps réel, et la boussole vers la prochaine étape.

## Structure du dossier `src/`

Regroupe tous les éléments techniques et visuels partagés.

### 1. `src/components/`
L'interface utilisateur est découpée en composants :
- **`ui/`** : Éléments génériques (Boutons, Modales, `ZoomableImage`, Icones).
- **`layout/`** : Composants structurels (ex: `TabletWrapper` pour adapter l'affichage sur iPad/Tablettes Android).
- **`features/`** : Composants métier complexes. Par exemple, `features/jeux/` contient tous les écrans des différents mini-jeux (`QCMView`, `CharadeView`, `PuzzleView`, `GameQuestion`, etc.) ainsi que le gestionnaire `MiniJeuxManager.tsx`.
- **`social/`** : Éléments communautaires (avis, liste d'amis).

### 2. `src/store/` (Gestion d'état globale)
Utilise **Zustand** pour gérer la mémoire de l'application de manière performante.
- **`auth.store.ts`** : Gère la session utilisateur, le token JWT et le mode hors-ligne.
- **`game.store.ts`** : Mémorise l'état d'une partie en cours (parcours actif, étape actuelle, score).

### 3. `src/services/`
Gère la communication avec l'extérieur (APIs) ou le système local.
- **`api.service.ts` / `parcours.service.ts`** : Appels HTTP vers le Backend.
- **`database.service.ts`** : Gère la base de données SQLite locale sur le téléphone, indispensable pour faire fonctionner le jeu en mode hors-ligne en forêt !
- **`filesystem.service.ts`** : Gère le téléchargement et le cache des images et sons sur l'appareil.

### 4. `src/hooks/`
Logique React réutilisable.
- **`use-downloaded-parcours.ts`** : Vérifie l'état de synchronisation hors-ligne d'un parcours.
- **`use-color-scheme.ts`** : Gère le basculement entre Mode Clair et Mode Sombre.

### 5. `src/theme/` & `src/constants/`
Couleurs globales, constantes de l'application, et styles partagés.
