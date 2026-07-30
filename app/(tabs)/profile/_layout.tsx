import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function ProfileLayout() {
    return (
        <>
            <Stack>
                <Stack.Screen name="index" options={{ title: 'Profile', headerShown: false }} />
                <Stack.Screen name="settings" options={{ presentation: 'card', title: 'Settings', headerShown: false }} />
                <Stack.Screen name="downloads" options={{ headerShown: false }} />
                <Stack.Screen name="history" options={{ headerShown: false }} />
                <Stack.Screen name="friends" options={{ headerShown: false }} />
                <Stack.Screen name="credits" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
        </>
    );
}
