import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        // Check current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === 'auth';
        const inOnboarding = segments[0] === 'onboarding';

        if (!session && !inAuthGroup) {
            // Redirect to auth if not logged in
            router.replace('/auth');
        } else if (session && inAuthGroup) {
            // Redirect to onboarding or tabs if logged in
            checkOnboardingStatus();
        }
    }, [session, segments, loading]);

    const checkOnboardingStatus = async () => {
        if (!session?.user) return;

        const { data } = await supabase
            .from('profiles')
            .select('goal')
            .eq('id', session.user.id)
            .single();

        if (!data?.goal) {
            router.replace('/onboarding-extended');
        } else {
            router.replace('/(tabs)');
        }
    };

    return (
        <View className="flex-1">
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="auth" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="onboarding-extended" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="tools/decoder" />
                <Stack.Screen name="tools/panic" />
            </Stack>
            <StatusBar style="auto" />
        </View>
    );
}
