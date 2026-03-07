# 📋 Documentation du Projet — tp-expo-project

> **Dernière mise à jour** : 7 mars 2026  
> **Stack technique** : React Native (Expo SDK 54) + Expo Router v6 + Gluestack UI v3 + NativeWind (TailwindCSS)

---

## 1. Architecture du Projet

Le projet suit une architecture modulaire et séparée entre le **routage** (dossier `app/`) et le **code source** (dossier `src/`).

```
tp-expo-project/
├── app/                      # Expo Router — Définit les routes et la navigation
│   ├── (auth)/               # Groupe de routes pour l'authentification (login, register)
│   ├── (tabs)/               # Groupe pour la navigation par onglets (Bottom Tabs)
│   │   ├── _layout.tsx       # Configuration des onglets (utilise FloatingTabBar)
│   │   ├── index.tsx         # Page Home (Route '/')
│   │   ├── search.tsx        # Page Search
│   │   ├── explore.tsx       # Page Explore
│   │   └── profile/          # Sous-dossier avec Stack interne
│   │       ├── _layout.tsx   # Stack Navigator pour Profile (index + seetings)
│   │       ├── index.tsx     # Page principale Profile
│   │       └── seetings.tsx  # Sous-page Settings (accessible depuis Profile)
│   ├── _layout.tsx           # Layout racine (Providers globaux : Theme, GluestackUI)
│   ├── index.tsx             # Point d'entrée — redirige vers /(tabs)
│   └── modal.tsx             # Page modale
│
├── src/                      # Tout le code source (logique, composants, styles)
│   ├── components/           # Composants React
│   │   ├── common/           # Composants atomiques (boutons, inputs) — à remplir
│   │   ├── features/         # Composants complexes liés à un domaine (ex: UserCard) — à remplir
│   │   ├── ui/               # Composants générés par Gluestack UI (button, gluestack-ui-provider, etc.)
│   │   │   ├── icon-symbol.tsx      # Mapping SF Symbols → Material Icons (Android/Web)
│   │   │   └── icon-symbol.ios.tsx  # Version iOS native (SF Symbols)
│   │   ├── floating-tab-bar.tsx     # ⭐ Barre de navigation flottante (pilule glassmorphism + bouton retour)
│   │   ├── haptic-tab.tsx           # Bouton avec retour haptique pour les onglets
│   │   ├── parallax-scroll-view.tsx # ScrollView avec effet parallax + SafeAreaView automatique
│   │   ├── hello-wave.tsx           # Animation de main qui fait coucou
│   │   ├── themed-text.tsx          # Composant texte avec gestion du thème clair/sombre
│   │   ├── themed-view.tsx          # Composant View avec gestion du thème clair/sombre
│   │   └── external-link.tsx        # Lien externe qui ouvre le navigateur
│   │
│   ├── hooks/                # Hooks personnalisés
│   │   ├── use-color-scheme.ts     # Hook pour détecter le mode clair/sombre
│   │   ├── use-color-scheme.web.ts # Version web du hook
│   │   └── use-theme-color.ts     # Hook pour récupérer une couleur du thème
│   │
│   ├── services/             # Appels API, config Axios/TanStack Query — à remplir
│   ├── store/                # Gestion d'état (Zustand, Redux, Context) — à remplir
│   ├── theme/                # Thème de l'application
│   │   └── theme.ts          # Définition des couleurs (Colors) et polices (Fonts)
│   ├── types/                # Types et interfaces TypeScript — à remplir
│   ├── utils/                # Fonctions utilitaires — à remplir
│   └── constants/            # Constantes globales — à remplir
│
├── assets/                   # Images, polices, vidéos
│   └── images/               # Images statiques (logos, etc.)
│
├── memo/                     # 📋 Dossier de documentation du projet (ce fichier)
│
├── app.json                  # Configuration Expo (userInterfaceStyle: 'light')
├── babel.config.js           # Config Babel (module-resolver pour les alias @/)
├── metro.config.js           # Config Metro (support NativeWind)
├── tailwind.config.js        # Config Tailwind CSS avec les tokens design Gluestack
├── tsconfig.json             # Config TypeScript avec alias @/ → ./
├── global.css                # Fichier CSS global (directives Tailwind)
└── package.json              # Dépendances du projet
```

---

## 2. Stack Technique & Dépendances Clés

| Technologie         | Version   | Rôle                                              |
| ------------------- | --------- | ------------------------------------------------- |
| **Expo SDK**        | 54        | Framework React Native                            |
| **Expo Router**     | v6        | Routage basé sur les fichiers                     |
| **React Native**    | 0.81.5    | Framework mobile                                  |
| **Gluestack UI**    | v3        | Bibliothèque de composants UI (approche Shadcn)   |
| **NativeWind**      | v4        | Tailwind CSS pour React Native                    |
| **TailwindCSS**     | v3.4      | Moteur de classes utilitaires                     |
| **Reanimated**      | v4        | Animations performantes (parallax, spring, etc.)  |
| **expo-haptics**    | v15       | Retour haptique sur iOS                           |
| **expo-blur**       | -         | Effet glassmorphism (BlurView) pour la tab bar    |
| **TypeScript**      | 5.9       | Typage statique                                   |

---

## 3. Système de Navigation

### 3.1 Expo Router (File-based routing)

Le routage est défini par la structure des fichiers dans `app/` :
- `app/_layout.tsx` → Layout racine, enveloppe l'app avec `GluestackUIProvider` et `ThemeProvider`
- `app/index.tsx` → Redirige automatiquement vers `/(tabs)` au lancement
- `app/(tabs)/` → Navigation par onglets (Bottom Tabs)
- `app/(tabs)/profile/` → Stack Navigator interne pour les sous-pages du profil
- `app/(auth)/` → Groupe prévu pour les écrans d'authentification

### 3.2 Providers

Les Providers (`GluestackUIProvider`, `ThemeProvider`) sont déclarés **UNE SEULE FOIS** dans le layout racine `app/_layout.tsx`. Tous les composants enfants y ont accès automatiquement via le contexte React.

```tsx
// app/_layout.tsx → Provider racine
<GluestackUIProvider mode="light">
  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
    <Stack>...</Stack>
  </ThemeProvider>
</GluestackUIProvider>
```

**⚠️ Ne JAMAIS re-déclarer un Provider dans un layout enfant.** Ça créerait un contexte isolé et des bugs.

### 3.3 Onglets et Sous-navigation

Les onglets sont définis dans `app/(tabs)/_layout.tsx`. Chaque onglet pointe vers :
- Un **fichier unique** (`index.tsx`, `search.tsx`, `explore.tsx`), ou
- Un **dossier avec _layout.tsx** (`profile/`) pour les onglets ayant des sous-pages

Pour les onglets avec sous-pages, le `name` dans `<Tabs.Screen>` est le **nom du dossier** :
```tsx
// ✅ Correct
<Tabs.Screen name="profile" />

// ❌ Incorrect
<Tabs.Screen name="profile/index" />
```

### 3.4 Header Natif et `headerShown`

Le header natif est la barre en haut avec le titre et le bouton "Retour" ajoutée par React Navigation.

| `headerShown` | Résultat | Usage |
|---|---|---|
| `true` (défaut) | Barre en haut avec titre + bouton retour | Sous-pages (settings, détails) |
| `false` | Pas de barre, le contenu commence en haut | Pages racines avec ParallaxScrollView |

**Règle** : sur les **sous-pages** accessibles par navigation (comme `seetings.tsx`), toujours laisser `headerShown: true` pour avoir le bouton retour natif automatique.

### 3.5 Presentations (Transitions entre écrans)

La prop `presentation` dans les options d'un `Stack.Screen` contrôle l'animation de transition :

| Valeur | Animation | Usage |
|---|---|---|
| `'card'` | Glissement droite → gauche | Navigation standard |
| `'modal'` | Monte du bas | Formulaires, confirmations |
| `'transparentModal'` | Modal avec fond visible | Overlays, popups |
| `'containedModal'` | Modal arrondi iOS | Style "demi-feuille" |
| `'fullScreenModal'` | Modal plein écran | Formulaires longs |
| `'formSheet'` | Feuille en bas (iOS natif) | Formulaires courts |

---

## 4. Barre de Navigation Flottante (FloatingTabBar)

> **Fichier** : `src/components/floating-tab-bar.tsx`

La barre d'onglets par défaut a été **entièrement remplacée** par un composant custom `FloatingTabBar`.

### 4.1 Pourquoi un composant custom ?

`tabBarStyle` de React Navigation ne permet pas de centrer un élément en `position: absolute` avec une largeur dynamique. Les techniques CSS classiques (`marginHorizontal: 'auto'`, `transform`, `alignSelf`) ne fonctionnent pas car React Navigation impose sa propre structure Flexbox.

### 4.2 Architecture

```
wrapper (position: absolute, left: 0, right: 0, alignItems: 'center')
  └── BlurView (glassmorphism, borderRadius: 40)
       └── container (flexDirection: 'row')
            ├── [BackButton] (conditionnel, avec animation spring)
            ├── TabButton Home  (icône + scale spring)
            ├── TabButton Search
            ├── TabButton Explore
            └── TabButton Profile
```

### 4.3 Fonctionnalités

**🫧 Glassmorphism** : La pilule utilise `expo-blur` (`BlurView` avec `intensity: 60, tint: 'light'`) pour un fond semi-transparent flou.

**🎯 Animations Spring** : Chaque onglet utilise `react-native-reanimated` pour :
- L'icône active grossit (scale `1 → 1.15`) avec un ressort élastique (`damping: 12, stiffness: 180`)
- Le fond blanc de l'onglet actif fait un fade-in (`withTiming`, 200ms)

**📳 Retour haptique** (iOS uniquement via `expo-haptics`) :
- `ImpactFeedbackStyle.Medium` → changement d'onglet
- `ImpactFeedbackStyle.Light` → bouton retour

Valeurs disponibles : `Light < Soft < Medium < Rigid < Heavy`

**⬅️ Bouton Retour conditionnel** : Un bouton `‹` apparaît automatiquement à gauche de la pilule quand l'onglet actif a un **historique de navigation** (ex: `profile/index → profile/seetings`). La détection vérifie :
```tsx
const nestedState = activeRoute.state;
const canGoBack = !!(
    nestedState &&
    nestedState.routes &&
    nestedState.routes.length > 1 &&
    nestedState.index > 0
);
```

### 4.4 Technique de centrage (la seule qui marche sur RN)

- Le `wrapper` est en `position: absolute` et prend toute la largeur (`left: 0, right: 0`)
- Le `container` (la pilule) est centré grâce à `alignItems: 'center'` sur le wrapper
- **Ne jamais** essayer avec `tabBarStyle` + `position: absolute` + `width` fixe

---

## 5. ParallaxScrollView

> **Fichier** : `src/components/parallax-scroll-view.tsx`

Composant de scroll avec un header animé (effet parallax) et gestion automatique de la zone de sécurité.

### 5.1 Props

| Prop | Type | Requis | Description |
|---|---|---|---|
| `headerImage` | `ReactElement \| null` | Optionnel | Image/icône du bandeau. Si absent → SafeAreaView automatique |
| `headerBackgroundColor` | `{ dark: string; light: string }` | Optionnel | Couleur de fond du bandeau |
| `children` | `ReactNode` | Oui | Contenu scrollable |

### 5.2 Fonctionnement

1. **Avec `headerImage`** : Affiche un bandeau de 250px avec effet parallax
   - Scroll vers le bas → l'image bouge plus lentement (effet de profondeur)
   - Overscroll (tirer vers le bas) → l'image grossit (scale 1 → 2)

2. **Sans `headerImage`** : Ajoute automatiquement un `<SafeAreaView edges={['top']} />` pour éviter que le contenu passe sous l'encoche/Dynamic Island

3. **Padding en bas** : `paddingBottom: 100` pour éviter que le contenu soit caché derrière le FloatingTabBar

### 5.3 Quand l'utiliser

| Type de page | ParallaxScrollView ? |
|---|---|
| Page avec contenu scrollable | ✅ Oui |
| Page de login/onboarding centrée | ❌ Non (utiliser `SafeAreaView`) |
| Carte (maps) ou caméra | ❌ Non |
| Modal court | ❌ Non |

---

## 6. Gluestack UI — Configuration & Usage

### 6.1 Installation

```bash
npx gluestack-ui@latest init --path src/components/ui --use-npm
```

Fichiers générés/modifiés : `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `tsconfig.json`, `src/components/ui/gluestack-ui-provider/`

### 6.2 Ajouter de Nouveaux Composants

Gluestack UI v3 suit l'approche **Shadcn UI** (copie locale, pas de dépendance npm) :

```bash
npx gluestack-ui@latest add button      # → src/components/ui/button/
npx gluestack-ui@latest add input       # → src/components/ui/input/
npx gluestack-ui@latest add modal       # → src/components/ui/modal/
```

Import : `import { Button, ButtonText } from '@/src/components/ui/button';`

---

## 7. Système d'Alias et Imports

L'alias `@/` pointe vers la **racine du projet** (`./`).

**Configuré dans** : `tsconfig.json` (`"@/*": ["./*"]`) et `babel.config.js` (`alias: { '@': './' }`)

```tsx
// ✅ Correct
import { Button } from '@/src/components/ui/button';
import { Colors } from '@/src/theme/theme';

// ❌ Incorrect (anciens chemins)
import { Button } from '@/components/ui/button';
```

---

## 8. Icônes — Mapping SF Symbols ↔ Material Icons

> **Fichier** : `src/components/ui/icon-symbol.tsx`

Sur **iOS**, les SF Symbols natifs sont utilisés. Sur **Android/Web**, un fallback vers Material Icons est appliqué via un mapping :

```tsx
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'magnifyingglass': 'search',
  'person.fill': 'person',
  'person.2.badge': 'people',
  'person': 'person',
};
```

**⚠️ Chaque nouvelle icône SF Symbol utilisée dans l'app DOIT être ajoutée dans ce mapping**, sinon elle sera invisible sur Android et Web.

Chercher les noms Material Icons sur [icons.expo.fyi](https://icons.expo.fyi).

---

## 9. Thème & Couleurs

### Fichier : `src/theme/theme.ts`

Définition des couleurs (`Colors`) et polices (`Fonts`). Le thème est en mode `light` (configuré dans `app.json` via `userInterfaceStyle: 'light'` et dans `app/_layout.tsx` via `GluestackUIProvider mode="light"`).

### Tailwind CSS (`tailwind.config.js`)

Tokens Gluestack UI : couleurs sémantiques (`primary`, `error`, `success`...), fonds (`background-0` à `950`), textes (`typography-0` à `950`), ombres (`hard-1` à `5`, `soft-1` à `4`).

---

## 10. Commandes Utiles

```bash
# Démarrer le serveur de développement
npm run start

# Démarrer avec cache vidé (après installation de dépendances ou changement de config)
npm run start -- -c

# Ouvrir sur iOS simulateur / Android / Web
npm run ios | npm run android | npm run web

# Ajouter un composant Gluestack UI
npx gluestack-ui@latest add <nom-du-composant>

# Linting
npm run lint

# Reset du projet (remet le dossier app/ à zéro)
npm run reset-project
```

---

## 11. Points d'Attention & Pièges Connus

1. **Cache Metro** : Après modification de `babel.config.js`, `metro.config.js`, `tailwind.config.js`, ou installation de modules natifs (`expo-blur`, etc.) → relancer avec `npm run start -- -c`.

2. **Imports** : Toujours utiliser `@/src/...` pour les fichiers dans `src/`.

3. **Floating Tab Bar** : Ne jamais centrer avec `tabBarStyle` + `position: absolute` + `width` fixe → toujours utiliser le composant custom `FloatingTabBar`.

4. **`paddingBottom` sur les pages** : Géré automatiquement dans `ParallaxScrollView` (100px). Si tu crées une page sans `ParallaxScrollView`, pense à ajouter le padding toi-même.

5. **Gluestack UI Provider** : Déclaré **une seule fois** dans `app/_layout.tsx`. Ne pas le re-déclarer dans les layouts enfants.

6. **Icônes SF Symbols** : Chaque icône utilisée doit avoir son mapping dans `src/components/ui/icon-symbol.tsx` sinon elle sera invisible sur Android/Web.

7. **`headerShown: false`** : Utiliser uniquement sur les pages racines avec un header visuel custom. Sur les sous-pages, laisser `true` pour avoir le bouton retour natif.

8. **SafeAreaView** : Toujours importer depuis `react-native-safe-area-context` (✅) et jamais depuis `react-native` (❌ deprecated).

9. **Nommage des onglets avec sous-dossiers** : `name` dans `<Tabs.Screen>` = nom du **dossier** (`"profile"`) et non le chemin du fichier (`"profile/index"`).
