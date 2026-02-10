import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';

/**
 * OAuth Callback Handler
 * This screen handles the redirect from OAuth providers (Google, Discord)
 * It extracts the access token from the URL and sets the session
 */
export default function AuthCallback() {
    const router = useRouter();

    const url = Linking.useURL();

    useEffect(() => {
        if (url) {
            handleCallback(url);
        }
    }, [url]);

    const handleCallback = async (currentUrl: string) => {
        try {
            console.log('[AuthCallback] Starting callback handling with URL:', currentUrl?.substring(0, 50));

            if (currentUrl) {
                // Parse the hash fragment for tokens
                const hashIndex = currentUrl.indexOf('#');
                if (hashIndex !== -1) {
                    const hashParams = new URLSearchParams(currentUrl.substring(hashIndex + 1));
                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');

                    if (accessToken) {
                        console.log('[AuthCallback] Found access token, setting session...');
                        const { error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || '',
                        });

                        if (!error) {
                            console.log('[AuthCallback] Session set successfully, navigating...');
                            // Force navigation to ensure we don't get stuck
                            setTimeout(() => {
                                router.replace('/(tabs)');
                            }, 500);
                        } else {
                            console.error('[AuthCallback] Error setting session:', error);
                            // Fallback to auth if session set fails
                            setTimeout(() => router.replace('/auth'), 1000);
                        }
                        return;
                    }
                }
            }

            // Fallback: Check existing session
            console.log('[AuthCallback] Checking existing session...');
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('[AuthCallback] Found existing session, navigating...');
                router.replace('/(tabs)');
            } else {
                console.log('[AuthCallback] No session found in callback, waiting...');
                // Do NOT redirect to auth immediately, user might just be arriving
            }
        } catch (error) {
            console.error('[AuthCallback] Callback error:', error);
            // Safety net
            setTimeout(() => {
                router.replace('/auth');
            }, 2000);
        }
    };

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#a855f7" />
            <Text style={styles.text}>Iniciando sesión...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        marginTop: 16,
        fontSize: 16,
    },
});
