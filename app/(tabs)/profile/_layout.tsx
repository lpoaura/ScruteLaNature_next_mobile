import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function ProfileLayout() {
    return (
        <>
            <Stack>
                <Stack.Screen name="index" options={{ title: 'Profile', headerShown: false }} />
                <Stack.Screen name="seetings" options={{ presentation: 'card', title: 'Settings' }} />
            </Stack>
            <StatusBar style="auto" />
        </>
    );
}
