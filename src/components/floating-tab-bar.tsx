import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    const onPress = () => {
                        if (Platform.OS === 'ios') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            testID={options.tabBarButtonTestID}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={[
                                styles.tabButton,
                                isFocused && styles.tabButtonActive,
                            ]}
                        >
                            {options.tabBarIcon?.({
                                focused: isFocused,
                                color: isFocused ? '#000' : '#A0A0A0',
                                size: 24,
                            })}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Ce wrapper prend toute la largeur de l'écran
    // et centre la pilule avec alignItems: 'center'
    wrapper: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 18 : 20,
        left: 0,
        right: 0,
        alignItems: 'center', // CENTRE LA PILULE HORIZONTALEMENT
    },
    // Le container pilule blanc
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        borderRadius: 40,
        paddingHorizontal: 7,
        paddingVertical: 5,
        gap: 6,
        // Ombre douce
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 10,
    },
    // Chaque bouton d'onglet
    tabButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
    },
    // Le fond blanc avec ombre de l'onglet actif
    tabButtonActive: {
        backgroundColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
});
