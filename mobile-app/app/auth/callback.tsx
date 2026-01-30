import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { saveAttribution, trackConversion } from '@/lib/attributionService';

/**
 * OAuth Callback Handler
 * This screen handles the redirect from OAuth providers (Google, Discord)
 * It extracts the access token from the URL and sets the session
 */
export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        try {
            console.log('[AuthCallback] Starting callback handling...');

            // Get the current URL
            const url = await Linking.getInitialURL();
            console.log('[AuthCallback] URL:', url?.substring(0, 100));

            if (url) {
                // Parse the hash fragment for tokens
                const hashIndex = url.indexOf('#');
                if (hashIndex !== -1) {
                    const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
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

                            // Track attribution for new user
                            const { data: { user } } = await supabase.auth.getUser();
                            if (user) {
                                console.log('[AuthCallback] Saving attribution for user:', user.id);
                                await saveAttribution(user.id);
                                await trackConversion(user.id, 'registration');
                            }

                            // Add delay to ensure session is fully established
                            setTimeout(() => {
                                router.replace('/(tabs)');
                            }, 500);
                            return;
                        } else {
                            console.error('[AuthCallback] Error setting session:', error);
                        }
                    }
                }
            }

            // If we get here, check if there's already a session
            console.log('[AuthCallback] Checking existing session...');
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('[AuthCallback] Found existing session, navigating...');
                setTimeout(() => {
                    router.replace('/(tabs)');
                }, 500);
            } else {
                console.log('[AuthCallback] No session found, going to auth...');
                // No session, go to login screen
                setTimeout(() => {
                    router.replace('/auth');
                }, 500);
            }
        } catch (error) {
            console.error('[AuthCallback] Callback error:', error);
            setTimeout(() => {
                router.replace('/(tabs)');
            }, 500);
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
