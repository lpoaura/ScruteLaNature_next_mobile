import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
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
        // Quand l'onglet devient actif :
        // - L'icône grossit avec un ressort élastique
        // - Le fond blanc apparaît progressivement
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

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    return (
        <View style={styles.wrapper}>
            {/* BlurView pour l'effet glassmorphism */}
            <BlurView
                intensity={60}
                tint="light"
                style={styles.blurContainer}
            >
                <View style={styles.container}>
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
    // Wrapper absolu centré en bas de l'écran
    wrapper: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 28 : 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    // BlurView qui forme la pilule
    blurContainer: {
        borderRadius: 40,
        overflow: 'hidden', // Nécessaire pour que le blur reste dans la pilule
        // Ombre extérieure portée (shadow)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 15,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.6)',
    },
    // Rangée de boutons à l'intérieur du blur
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        gap: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    // Chaque zone cliquable d'un onglet
    tabButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 22,
        paddingVertical: 13,
        borderRadius: 30,
    },
    // Fond blanc qui apparaît derrière l'icône active
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
});
