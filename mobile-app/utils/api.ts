import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    // 1. Retrieve the token from storage based on the platform
    let token = null;
    if (Platform.OS === 'web') {
        token = localStorage.getItem('jwtToken');
    } else {
        token = await SecureStore.getItemAsync('jwtToken');
    }

    // 2. Set up the headers, merging any custom headers passed in
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // 3. Construct the full URL
    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    const fullUrl = `${API_URL}${endpoint}`;

    // 4. Execute the fetch and return the response
    const response = await fetch(fullUrl, {
        ...options,
        headers,
    });

    // Catch expired/invalid tokens (Spring Security usually returns 401 or 403)
    if (response.status === 401 || response.status === 403) {
        console.warn("Token expired or unauthorized!");
        throw new Error("AUTH_EXPIRED");
    }

    return response;
}