import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, TrendingUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface UsageLimitWarningProps {
    currentUsage: number;
    limit: number;
    resetInMinutes?: number;
    limitType: 'hourly' | 'daily';
}

export default function UsageLimitWarning({
    currentUsage,
    limit,
    resetInMinutes,
    limitType
}: UsageLimitWarningProps) {
    const router = useRouter();
    const percentage = (currentUsage / limit) * 100;

    // Only show warning at 80% or above
    if (percentage < 80) return null;

    const isNearLimit = percentage >= 80 && percentage < 90;
    const isVeryNearLimit = percentage >= 90 && percentage < 100;
    const isAtLimit = percentage >= 100;

    const formatResetTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins} minutos`;
    };

    if (isAtLimit) {
        return (
            <View className="mx-5 mb-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                <View className="flex-row items-center mb-2">
                    <AlertTriangle size={20} color="#ef4444" />
                    <Text className="text-red-400 font-bold ml-2">
                        Límite Alcanzado
                    </Text>
                </View>
                <Text className="text-gray-300 text-sm mb-3">
                    Has usado tus {limit} mensajes {limitType === 'hourly' ? 'de esta ventana de 3 horas' : 'del día'}.
                    {resetInMinutes && ` Se resetea en ${formatResetTime(resetInMinutes)}.`}
                </Text>
                <TouchableOpacity
                    onPress={() => router.push('/paywall' as any)}
                    className="overflow-hidden rounded-xl"
                >
                    <LinearGradient
                        colors={['#f59e0b', '#d97706']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        className="py-3"
                    >
                        <Text className="text-white font-bold text-center">
                            Actualizar Plan
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    }

    if (isVeryNearLimit) {
        return (
            <View className="mx-5 mb-3 bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
                <View className="flex-row items-center mb-2">
                    <AlertTriangle size={18} color="#f97316" />
                    <Text className="text-orange-400 font-bold ml-2">
                        ¡Cuidado! Solo te quedan {limit - currentUsage} mensajes
                    </Text>
                </View>
                <Text className="text-gray-300 text-sm">
                    Has usado {currentUsage}/{limit} mensajes {limitType === 'hourly' ? 'en esta ventana' : 'hoy'}.
                    Considera actualizar tu plan para más uso.
                </Text>
            </View>
        );
    }

    if (isNearLimit) {
        return (
            <View className="mx-5 mb-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3">
                <View className="flex-row items-center">
                    <TrendingUp size={16} color="#eab308" />
                    <Text className="text-yellow-400 text-sm ml-2">
                        Has usado {currentUsage}/{limit} mensajes {limitType === 'hourly' ? 'en esta ventana' : 'hoy'}
                    </Text>
                </View>
            </View>
        );
    }

    return null;
}
