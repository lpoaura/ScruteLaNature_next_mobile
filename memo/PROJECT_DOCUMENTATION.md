# 📋 Documentation du Projet — tp-expo-project

> **Dernière mise à jour** : 4 mars 2026  
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
│   │   └── explore.tsx       # Page Explore
│   ├── _layout.tsx           # Layout racine (Providers globaux : Theme, GluestackUI)
│   ├── index.tsx             # Point d'entrée — redirige vers /(tabs)
│   └── modal.tsx             # Page modale
│
├── src/                      # Tout le code source (logique, composants, styles)
│   ├── components/           # Composants React
│   │   ├── common/           # Composants atomiques (boutons, inputs) — à remplir
│   │   ├── features/         # Composants complexes liés à un domaine (ex: UserCard) — à remplir
│   │   ├── ui/               # Composants générés par Gluestack UI (button, gluestack-ui-provider, etc.)
│   │   ├── floating-tab-bar.tsx  # ⭐ Composant custom de la barre de navigation flottante (pilule)
│   │   ├── haptic-tab.tsx        # Bouton avec retour haptique pour les onglets
│   │   ├── parallax-scroll-view.tsx # ScrollView avec effet parallax sur le header
│   │   ├── hello-wave.tsx        # Animation de main qui fait coucou
│   │   ├── themed-text.tsx       # Composant texte avec gestion du thème clair/sombre
│   │   ├── themed-view.tsx       # Composant View avec gestion du thème clair/sombre
│   │   └── external-link.tsx     # Lien externe qui ouvre le navigateur
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
├── app.json                  # Configuration Expo
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
| **Reanimated**      | v4        | Animations performantes (parallax, gestures)      |
| **expo-haptics**    | v15       | Retour haptique sur iOS                           |
| **TypeScript**      | 5.9       | Typage statique                                   |

---

## 3. Système de Navigation

### 3.1 Expo Router (File-based routing)

Le routage est défini par la structure des fichiers dans `app/` :
- `app/_layout.tsx` → Layout racine, enveloppe l'app avec `GluestackUIProvider` et `ThemeProvider`
- `app/index.tsx` → Redirige automatiquement vers `/(tabs)` au lancement
- `app/(tabs)/` → Navigation par onglets (Bottom Tabs)
- `app/(auth)/` → Groupe prévu pour les écrans d'authentification

### 3.2 Barre de Navigation Flottante (Floating Pill Tab Bar)

> **Fichier** : `src/components/floating-tab-bar.tsx`

La barre d'onglets par défaut de React Navigation a été **entièrement remplacée** par un composant custom `FloatingTabBar`. C'est la seule méthode fiable pour obtenir un menu "pilule flottante" parfaitement centré en bas de l'écran.

**Pourquoi un composant custom ?**  
La propriété `tabBarStyle` de React Navigation ne permet pas de centrer correctement un élément en `position: absolute` avec une largeur fixe. Les techniques CSS classiques (`marginHorizontal: 'auto'`, `transform: translateX`, `alignSelf: 'center'`) ne fonctionnent pas dans ce contexte car React Navigation impose sa propre structure Flexbox interne.

**Comment ça marche :**

```tsx
// Dans app/(tabs)/_layout.tsx :
<Tabs tabBar={(props) => <FloatingTabBar {...props} />}>
```

**Architecture du composant :**
```
wrapper (position: absolute, left: 0, right: 0, alignItems: 'center')
  └── container (flexDirection: 'row', borderRadius: 40, backgroundColor semi-transparent)
       ├── TabButton (icône Home)
       ├── TabButton (icône Search)
       └── TabButton (icône Explore)
```

**Technique de centrage (la seule qui marche sur RN) :**
- Le `wrapper` est en `position: absolute` et prend toute la largeur (`left: 0, right: 0`)
- Le `container` (la pilule) est centré grâce à `alignItems: 'center'` sur le wrapper
- La pilule a un fond blanc semi-transparent (`rgba(255, 255, 255, 0.75)`)
- L'onglet actif a un fond gris clair (`#F0F0F0`) avec une ombre légère

**Gestion du retour haptique :**
- Sur iOS, un léger retour haptique est déclenché à chaque pression d'onglet via `expo-haptics`

**⚠️ Important :**
- Comme le menu est en `position: absolute`, il flotte au-dessus du contenu
- Un `paddingBottom: 100` a été ajouté dans `ParallaxScrollView` (`src/components/parallax-scroll-view.tsx`) pour que les derniers éléments de chaque page ne soient pas cachés derrière le menu

---

## 4. Gluestack UI — Configuration & Usage

### 4.1 Installation

Gluestack UI v3 a été installé avec :
```bash
npx gluestack-ui@latest init --path src/components/ui --use-npm
```

Cela a généré/modifié :
- `babel.config.js` — Ajout de `nativewind/babel` et `module-resolver`
- `metro.config.js` — Configuration pour NativeWind
- `tailwind.config.js` — Tous les tokens de design Gluestack (couleurs, ombres, typographies)
- `global.css` — Directives Tailwind (`@tailwind base; @tailwind components; @tailwind utilities;`)
- `tsconfig.json` — Alias `@/` configuré
- `src/components/ui/gluestack-ui-provider/` — Provider principal

### 4.2 Provider

Dans `app/_layout.tsx`, l'application est enveloppée avec :
```tsx
<GluestackUIProvider mode="dark">
  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
    {/* ... Stack Navigator ... */}
  </ThemeProvider>
</GluestackUIProvider>
```

### 4.3 Ajouter de Nouveaux Composants

Gluestack UI v3 suit l'approche **Shadcn UI** : les composants ne sont pas une dépendance npm, ils sont copiés directement dans le projet via la CLI.

```bash
# Exemples :
npx gluestack-ui@latest add button      # → src/components/ui/button/
npx gluestack-ui@latest add input       # → src/components/ui/input/
npx gluestack-ui@latest add modal       # → src/components/ui/modal/
npx gluestack-ui@latest add card        # → src/components/ui/card/
npx gluestack-ui@latest add text        # → src/components/ui/text/
npx gluestack-ui@latest add heading     # → src/components/ui/heading/
npx gluestack-ui@latest add icon        # → src/components/ui/icon/
```

Les composants sont ensuite importés depuis `@/src/components/ui/` :
```tsx
import { Button, ButtonText } from '@/src/components/ui/button';
```

---

## 5. Système d'Alias et Imports

### Alias `@/`

L'alias `@/` pointe vers la **racine du projet** (`./`).

**Configuré dans :**
- `tsconfig.json` → `"@/*": ["./*"]`
- `babel.config.js` → `alias: { '@': './' }`

**Convention d'import :**
```tsx
// ✅ Correct
import { Button } from '@/src/components/ui/button';
import { Colors } from '@/src/theme/theme';
import { useColorScheme } from '@/src/hooks/use-color-scheme';

// ❌ Incorrect (anciens chemins, ne pas utiliser)
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
```

> **Historique** : Les dossiers `components/`, `hooks/` et `constants/` étaient initialement à la racine. Ils ont été déplacés dans `src/`. Tous les imports du projet ont été mis à jour pour utiliser `@/src/...`.

---

## 6. Thème & Couleurs

### Fichier : `src/theme/theme.ts`

Ce fichier contient les définitions des couleurs (`Colors`) et des polices (`Fonts`) utilisées dans l'application.

> **Historique** : Ce fichier était initialement dans `src/constants/theme.ts`. Le dossier `constants/` a été renommé en `theme/` pour mieux refléter son contenu.

### Tailwind CSS

Le fichier `tailwind.config.js` contient l'intégralité des tokens de design Gluestack UI :
- Couleurs sémantiques : `primary`, `secondary`, `error`, `success`, `warning`, `info`
- Couleurs de fond : `background-0` à `background-950`
- Couleurs de texte : `typography-0` à `typography-950`
- Ombres prédéfinies : `hard-1` à `hard-5`, `soft-1` à `soft-4`

---

## 7. Icônes

### Fichier : `src/components/ui/icon-symbol.tsx`

Les icônes utilisent **MaterialIcons** via `@expo/vector-icons`. Un mapping SF Symbols → Material Icons est défini :

```tsx
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
};
```

Pour ajouter de nouvelles icônes, il suffit d'ajouter une entrée dans ce mapping. Chercher les noms disponibles sur [icons.expo.fyi](https://icons.expo.fyi).

---

## 8. Commandes Utiles

```bash
# Démarrer le serveur de développement
npm run start

# Démarrer avec cache vidé (après installation de dépendances ou changement de config)
npm run start -- -c

# Ouvrir sur iOS simulateur
npm run ios

# Ouvrir sur Android
npm run android

# Ouvrir sur le web
npm run web

# Ajouter un composant Gluestack UI
npx gluestack-ui@latest add <nom-du-composant>

# Linting
npm run lint

# Reset du projet (remet le dossier app/ à zéro)
npm run reset-project
```

---

## 9. Points d'Attention & Pièges Connus

1. **Cache Metro** : Après toute modification de `babel.config.js`, `metro.config.js`, ou `tailwind.config.js`, il faut relancer avec `npm run start -- -c` pour vider le cache.

2. **Imports après déplacement de fichiers** : Si tu déplaces un fichier ou un dossier, pense à mettre à jour tous les imports dans le projet. L'alias `@/` pointe vers la racine, donc les chemins doivent commencer par `@/src/...` pour les fichiers dans `src/`.

3. **Floating Tab Bar** : Ne jamais essayer de centrer la barre d'onglets avec `tabBarStyle` + `position: absolute` + `width` fixe. Ça ne fonctionne pas. Utiliser toujours le composant custom `FloatingTabBar` avec la technique `wrapper (left:0, right:0, alignItems: center)`.

4. **`paddingBottom` sur les pages** : Toutes les pages affichées dans les onglets doivent avoir un padding en bas suffisant (~100px) pour que le contenu ne soit pas caché derrière le menu flottant. C'est actuellement géré dans `ParallaxScrollView`.

5. **Gluestack UI Provider** : L'import du provider doit pointer vers `@/src/components/ui/gluestack-ui-provider` et non `@/components/ui/gluestack-ui-provider`.
