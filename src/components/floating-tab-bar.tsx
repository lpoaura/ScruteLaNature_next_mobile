import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
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
    // Animation de scale avec un ressort (spring) pour l'effet rebond
    const scale = useSharedValue(1);
    // Animation d'opacité du fond blanc de l'onglet actif
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

// Bouton retour animé
function BackButton({ onPress }: { onPress: () => void }) {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 200 });
        opacity.value = withTiming(1, { duration: 200 });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={animatedStyle}>
            <Pressable
                onPress={() => {
                    if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    onPress();
                }}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Retour"
            >
                <MaterialIcons name="chevron-left" size={28} color="#111" />
            </Pressable>
        </Animated.View>
    );
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const router = useRouter();
    const segments = useSegments();

    // Vérifier si on peut revenir en arrière
    // On regarde l'état du Stack Navigator de l'onglet actif :
    // - nestedState existe (l'onglet a un Stack interne avec _layout.tsx)
    // - Le Stack a plus d'1 écran dans son historique (routes.length > 1)
    // - L'index actuel est > 0 (on n'est pas sur le premier écran)
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

    return (
        <View style={styles.wrapper}>
            <BlurView
                intensity={60}
                tint="light"
                style={styles.blurContainer}
            >
                <View style={styles.container}>
                    {/* Bouton retour conditionnel */}
                    {canGoBack && (
                        <BackButton onPress={handleGoBack} />
                    )}

                    {/* Les onglets */}
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
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 28 : 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    blurContainer: {
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
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        paddingVertical: 6,
        gap: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
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
    // Bouton retour — même taille que les onglets pour l'harmonie
    backButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 13,
        borderRadius: 30,
        marginRight: 2,
    },
});
