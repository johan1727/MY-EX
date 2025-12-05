import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useSubscription } from '../lib/SubscriptionContext';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

interface FeatureGateProps {
    feature: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
    const { checkFeatureAccess, tier } = useSubscription();
    const router = useRouter();
    const hasAccess = checkFeatureAccess(feature);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id || 'NO USER');
        });
    }, []);

    if (hasAccess) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    return (
        <View className="flex-1 justify-center items-center p-6 bg-black/50 rounded-3xl border border-white/10 m-4">
            <View className="bg-purple-500/20 p-4 rounded-full mb-4">
                <Lock size={32} color="#a855f7" />
            </View>

            <Text className="text-white text-xl font-bold mb-2 text-center">
                Función Premium
            </Text>

            <Text className="text-gray-400 text-center mb-6">
                Actualiza a Warrior o Phoenix para desbloquear esta herramienta y acelerar tu recuperación.
            </Text>

            {/* DEBUG INFO */}
            <View className="mb-4 p-2 bg-red-500/10 rounded border border-red-500/20">
                <Text className="text-red-400 text-xs text-center">
                    Debug: Feature={feature}, Access={hasAccess ? 'YES' : 'NO'}
                </Text>
                <Text className="text-red-400 text-xs text-center">
                    Tier={tier}, User={userId ? userId.slice(0, 8) + '...' : 'Checking...'}
                </Text>
            </View>

            <TouchableOpacity
                onPress={() => router.push('/paywall')}
                className="w-full rounded-xl overflow-hidden"
            >
                <LinearGradient
                    colors={['#a855f7', '#7c3aed']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="py-3 items-center"
                >
                    <Text className="text-white font-bold text-lg">
                        Ver Planes
                    </Text>
                </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => router.back()}
                className="mt-4 py-2"
            >
                <Text className="text-gray-400 font-semibold">Volver</Text>
            </TouchableOpacity>
        </View>
    );
}
