import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import {
    GlassContainer,
    GlassView,
    isGlassEffectAPIAvailable,
    isLiquidGlassAvailable,
} from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { Colors } from '@/src/theme/theme';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

// Détection Liquid Glass au démarrage
const USE_GLASS = isGlassEffectAPIAvailable();
const LIQUID_GLASS_DESIGN = isLiquidGlassAvailable();
console.log(`🫧 FloatingTabBar → Liquid Glass API: ${USE_GLASS ? '✅ ACTIF' : '❌ Non disponible'}`);
console.log(`🫧 FloatingTabBar → Liquid Glass Design: ${LIQUID_GLASS_DESIGN ? '✅ ACTIF' : '❌ Désactivé (UIDesignRequiresCompatibility ou Xcode < 26)'}`);
if (!USE_GLASS && Platform.OS === 'ios') {
    console.warn('⚠️ Liquid Glass non disponible sur iOS. Vérifiez que l\'app est compilée avec Xcode 26+ (Swift >= 6.2) et que l\'iPhone tourne sous iOS 26+.');
}

// Composant animé pour chaque bouton d'onglet
function TabButton({
    isFocused,
    onPress,
    onLongPress,
    accessibilityLabel,
    testID,
    label,
    children,
}: {
    isFocused: boolean;
    onPress: () => void;
    onLongPress: () => void;
    accessibilityLabel?: string;
    testID?: string;
    label?: string;
    children: React.ReactNode;
}) {
    const colorScheme = useColorScheme() ?? 'light';
    const isDark = colorScheme === 'dark';
    const themeColors = Colors[colorScheme];

    const scale = useSharedValue(1);
    const bgOpacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withSpring(isFocused ? 1.15 : 1, {
            damping: 12,
            stiffness: 180,
        });
        bgOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
    }, [isFocused]);

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const animatedBgStyle = useAnimatedStyle(() => ({
        opacity: bgOpacity.value,
    }));

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={accessibilityLabel}
            testID={testID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
        >
            {/* Fond animé dynamique (sombre/clair) selon le thème */}
            <Animated.View style={[
                styles.activeBackground, 
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.85)' },
                animatedBgStyle
            ]} />

            {/* Icône animée avec scale spring */}
            <Animated.View style={animatedIconStyle}>
                {children}
            </Animated.View>

            {/* Label sous l'icône */}
            {label && (
                <Text style={[
                    styles.tabLabel,
                    isFocused ? { color: themeColors.tint } : { color: themeColors.icon },
                ]}>
                    {label}
                </Text>
            )}
        </Pressable>
    );
}

// Bouton retour animé — dans sa propre pilule séparée
// ⚠️ IMPORTANT : Ne JAMAIS mettre opacity:0 sur un parent de GlassView,
// cela désactive complètement l'effet glass natif (limitation UIVisualEffectView d'Apple).
// On utilise translateX + scale pour l'animation d'entrée à la place.
function BackButton({ onPress }: { onPress: () => void }) {
    const colorScheme = useColorScheme() ?? 'light';
    const isDark = colorScheme === 'dark';
    
    const scale = useSharedValue(0.3);
    const translateX = useSharedValue(-20);

    useEffect(() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 200 });
        translateX.value = withSpring(0, { damping: 14, stiffness: 200 });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { scale: scale.value },
        ],
    }));

    const backContent = (
        <Pressable
            onPress={() => {
                if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                onPress();
            }}
            style={[
                styles.backButton,
                !USE_GLASS && (isDark ? styles.backButtonFallbackBgDark : styles.backButtonFallbackBg),
            ]}
            accessibilityRole="button"
            accessibilityLabel="Retour"
        >
            <MaterialIcons name="chevron-left" size={28} color={isDark ? '#FFF' : '#111'} />
        </Pressable>
    );

    return (
        <Animated.View style={animatedStyle}>
            {USE_GLASS ? (
                // Liquid Glass natif iOS 26+
                <GlassView style={styles.glassPill}>
                    {backContent}
                </GlassView>
            ) : (
                // Fallback BlurView (iOS < 26, Android, Web)
                <View style={[styles.shadowContainer, isDark && styles.shadowContainerDark]}>
                    <BlurView
                        intensity={70}
                        tint={isDark ? 'dark' : 'light'}
                        style={[styles.blurPill, isDark && styles.blurPillDark]}
                    >
                        {backContent}
                    </BlurView>
                </View>
            )}
        </Animated.View>
    );
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const router = useRouter();
    const segments = useSegments();
    const colorScheme = useColorScheme() ?? 'light';
    const isDark = colorScheme === 'dark';
    const themeColors = Colors[colorScheme];

    const activeRoute = state.routes[state.index];
    const nestedState = activeRoute.state;
    const canGoBack = !!(
        nestedState &&
        nestedState.routes &&
        nestedState.routes.length > 1 &&
        nestedState.index !== undefined &&
        nestedState.index > 0
    );

    const handleGoBack = () => {
        if (canGoBack) {
            router.back();
        }
    };

    const tabButtons = (
        <View style={[
            styles.container,
            !USE_GLASS && (isDark ? styles.containerFallbackBgDark : styles.containerFallbackBg),
        ]}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === index;

                const onPress = () => {
                    if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }

                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name, route.params);
                    }
                };

                const onLongPress = () => {
                    navigation.emit({
                        type: 'tabLongPress',
                        target: route.key,
                    });
                };

                return (
                    <TabButton
                        key={route.key}
                        isFocused={isFocused}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={options.tabBarButtonTestID}
                        label={options.title ?? route.name}
                    >
                        {options.tabBarIcon?.({
                            focused: isFocused,
                            color: isFocused ? themeColors.tint : themeColors.icon,
                            size: 24,
                        })}
                    </TabButton>
                );
            })}
        </View>
    );

    // ─── Rendu Liquid Glass (iOS 26+) ───
    if (USE_GLASS) {
        return (
            <View style={styles.wrapper} pointerEvents="box-none">
                {/* GlassContainer regroupe les GlassView pour l'effet de fusion */}
                <GlassContainer spacing={12} style={styles.glassWrapper}>
                    {/* Bouton retour — pilule glass séparée */}
                    {canGoBack && (
                        <BackButton onPress={handleGoBack} />
                    )}

                    {/* Pilule principale — les onglets */}
                    <GlassView style={styles.glassPill}>
                        {tabButtons}
                    </GlassView>
                </GlassContainer>
            </View>
        );
    }

    // ─── Rendu Fallback BlurView (iOS < 26, Android, Web) ───
    return (
        <View style={styles.wrapper} pointerEvents="box-none">
            {/* Bouton retour — pilule séparée */}
            {canGoBack && (
                <BackButton onPress={handleGoBack} />
            )}

            {/* Pilule principale — les onglets */}
            <View style={[styles.shadowContainer, isDark && styles.shadowContainerDark]}>
                <BlurView
                    intensity={70}
                    tint={isDark ? 'dark' : 'light'}
                    style={[styles.blurPill, isDark && styles.blurPillDark]}
                >
                    {tabButtons}
                </BlurView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // ─── Layout ───
    wrapper: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 28 : 20,
        // Centrage absolu intelligent et responsive au lieu de left/right: 0
        alignSelf: 'center',
        width: '100%',
        maxWidth: 500, // Sur iPad/Web, ça ne dépassera pas 420px de large
        paddingHorizontal: 20, // Sur petit écran, garantit une marge sur les côtés
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    glassWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },

    // ─── Pilule Glass (iOS 26+) ───
    glassPill: {
        borderRadius: 40,
        overflow: 'hidden',
    },

    // ─── Pilule BlurView (fallback) ───
    blurPill: {
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0, 0, 0, 0.15)', // Plus sombre pour mieux découper sur fond blanc
    },
    blurPillDark: {
        borderColor: 'rgba(255, 255, 255, 0.1)', // Bordure très discrète en Dark Mode
        backgroundColor: 'rgba(0, 0, 0, 0.3)', // Fond de base plus assombri pour ressortir du fond
    },
    shadowContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 15,
        borderRadius: 40,
        backgroundColor: 'transparent',
    },
    shadowContainerDark: {
        shadowColor: '#000',
        shadowOpacity: 0.3, // Ombre plus marquée contre fond foncé
        elevation: 20,
    },

    // ─── Contenu des onglets ───
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        paddingVertical: 6,
        gap: 4,
        flexShrink: 1, // Permet à la pilule de shrinker sans dépasser de l'écran si beaucoup d'onglets
    },
    containerFallbackBg: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    containerFallbackBgDark: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)', // Empêche le voile laiteux blanc
    },

    // ─── Boutons ───
    tabButton: {
        // En enlevant la largeur fixe et ajoutant flex: 1, ils se partagent l'espace de la pilule
        // ou flexShrink pour s'adapter à la taille de l'écran sans créer d'horreurs
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
        borderRadius: 30,
        gap: 3,
        flexShrink: 1,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    // tabLabelActive et tabLabelInactive supprimés : on utilise le hook dynamique themeColors.tint / icon
    activeBackground: {
        ...StyleSheet.absoluteFillObject,
        // backgroundColor défini dynamiquement selon isDark dans <Animated.View>
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    backButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    backButtonFallbackBg: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    backButtonFallbackBgDark: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)', // Rend le bouton retour élégant en sombre
    },
});
