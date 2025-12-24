import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';

export default function ExSimulatorShowcase() {
    const router = useRouter();

    return (
        <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-2xl p-4 mx-4 my-2 shadow-lg max-w-md mx-auto w-full"
        >
            {/* Header */}
            <View className="flex-row items-center mb-2">
                <Text className="text-2xl mr-2">🎭</Text>
                <Text className="text-white text-xl font-bold">SOYREMI Simulador</Text>
                <View className="ml-auto bg-yellow-400 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-gray-900">NUEVO</Text>
                </View>
            </View>

            {/* Description */}
            <Text className="text-white/95 text-sm mb-1 leading-5">
                Simula a tu ex con IA basándose en tus chats reales.
            </Text>
            <Text className="text-white/80 text-xs mb-3">
                ✨ Ultra-realista • 💬 Proactivo • 📊 Análisis
            </Text>

            {/* CTA Button */}
            <TouchableOpacity
                className="bg-white rounded-lg py-2 px-4 shadow-sm active:opacity-80"
                onPress={() => router.push('/(tabs)/chat' as any)}
            >
                <View className="flex-row items-center justify-center">
                    <Sparkles size={16} color="#8B5CF6" />
                    <Text className="text-purple-600 font-bold text-sm ml-2">
                        Probar Ahora →
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Features */}
            <View className="flex-row justify-around mt-3 pt-3 border-t border-white/20">
                <View className="items-center">
                    <Text className="text-white/90 text-[10px]">Importa</Text>
                    <Text className="text-white font-semibold text-xs">WhatsApp</Text>
                </View>
                <View className="items-center">
                    <Text className="text-white/90 text-[10px]">Análisis</Text>
                    <Text className="text-white font-semibold text-xs">Gemini</Text>
                </View>
                <View className="items-center">
                    <Text className="text-white/90 text-[10px]">Notificaciones</Text>
                    <Text className="text-white font-semibold text-xs">Push</Text>
                </View>
            </View>
        </LinearGradient>
    );
}
