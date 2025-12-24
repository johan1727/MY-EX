import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    const [loading, setLoading] = useState(true);
    const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

    useEffect(() => {
        checkWelcomeStatus();
    }, []);

    const checkWelcomeStatus = async () => {
        try {
            const seen = await AsyncStorage.getItem('hasSeenWelcome');
            setHasSeenWelcome(seen === 'true');
        } catch (e) {
            // If error, show welcome anyway
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#8b5cf6" size="large" />
            </View>
        );
    }

    // If user has seen welcome, go directly to main app
    if (hasSeenWelcome) {
        return <Redirect href="/(tabs)" />;
    }

    // First time user: show welcome/tutorial
    return <Redirect href="/welcome" />;
}
