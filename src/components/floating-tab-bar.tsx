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
import { Platform, Pressable, StyleSheet, View } from 'react-native';
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
    children,
}: {
    isFocused: boolean;
    onPress: () => void;
    onLongPress: () => void;
    accessibilityLabel?: string;
    testID?: string;
    children: React.ReactNode;
}) {
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
            {/* Fond animé de l'onglet actif */}
            <Animated.View style={[styles.activeBackground, animatedBgStyle]} />

            {/* Icône animée avec scale spring */}
            <Animated.View style={animatedIconStyle}>
                {children}
            </Animated.View>
        </Pressable>
    );
}

// Bouton retour animé — dans sa propre pilule séparée
// ⚠️ IMPORTANT : Ne JAMAIS mettre opacity:0 sur un parent de GlassView,
// cela désactive complètement l'effet glass natif (limitation UIVisualEffectView d'Apple).
// On utilise translateX + scale pour l'animation d'entrée à la place.
function BackButton({ onPress }: { onPress: () => void }) {
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
                !USE_GLASS && styles.backButtonFallbackBg,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Retour"
        >
            <MaterialIcons name="chevron-left" size={28} color="#111" />
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
                <BlurView
                    intensity={60}
                    tint="light"
                    style={styles.blurPill}
                >
                    {backContent}
                </BlurView>
            )}
        </Animated.View>
    );
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const router = useRouter();
    const segments = useSegments();

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

    // Contenu des onglets (partagé entre les deux rendus)
    const tabButtons = (
        <View style={[
            styles.container,
            !USE_GLASS && styles.containerFallbackBg,
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
                    >
                        {options.tabBarIcon?.({
                            focused: isFocused,
                            color: isFocused ? '#111' : '#A0A0A0',
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
            <View style={styles.wrapper}>
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
        <View style={styles.wrapper}>
            {/* Bouton retour — pilule séparée */}
            {canGoBack && (
                <BackButton onPress={handleGoBack} />
            )}

            {/* Pilule principale — les onglets */}
            <BlurView
                intensity={60}
                tint="light"
                style={styles.blurPill}
            >
                {tabButtons}
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    // ─── Layout ───
    wrapper: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 28 : 20,
        left: 0,
        right: 0,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 15,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.6)',
    },

    // ─── Contenu des onglets ───
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        paddingVertical: 6,
        gap: 2,
    },
    containerFallbackBg: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },

    // ─── Boutons ───
    tabButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderRadius: 30,
    },
    activeBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
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
});
