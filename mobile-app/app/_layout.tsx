import { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native'; // <-- Add this import
import LoginScreen from './login';

export default function RootLayout() {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user is already logged in when app opens
    useEffect(() => {
        async function checkToken() {
            try {
                let token = null;
                // Fallback to localStorage if testing on Web
                if (Platform.OS === 'web') {
                    token = localStorage.getItem('userToken');
                } else {
                    token = await SecureStore.getItemAsync('userToken');
                }

                setUserToken(token); // This will be null if they aren't logged in
            } catch (error) {
                console.log("SecureStore not available or failed:", error);
                setUserToken(null); // Default to logged out on error
            } finally {
                setIsLoading(false); // Always stop the loading spinner
            }
        }
        checkToken();
    }, []);

    if (isLoading) return null;

    if (!userToken) {
        return (
            <LoginScreen
                onLoginSuccess={async (token) => {
                    // Save the token based on the platform
                    if (Platform.OS === 'web') {
                        localStorage.setItem('userToken', token);
                    } else {
                        await SecureStore.setItemAsync('userToken', token);
                    }
                    setUserToken(token);
                }}
            />
        );
    }

    return (
        <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
    );
}