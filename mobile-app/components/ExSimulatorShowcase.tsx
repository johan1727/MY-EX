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
            className="rounded-2xl p-6 mx-4 my-4 shadow-lg"
        >
            {/* Header */}
            <View className="flex-row items-center mb-3">
                <Text className="text-3xl mr-2">🎭</Text>
                <Text className="text-white text-2xl font-bold">Ex Simulator</Text>
                <View className="ml-auto bg-yellow-400 px-3 py-1 rounded-full">
                    <Text className="text-xs font-bold text-gray-900">NUEVO</Text>
                </View>
            </View>

            {/* Description */}
            <Text className="text-white/95 text-base mb-2 leading-6">
                Habla con una IA que simula a tu ex basándose en conversaciones reales.
            </Text>
            <Text className="text-white/80 text-sm mb-5 leading-5">
                ✨ Ultra-realista • 💬 Mensajes proactivos • 📊 Análisis de personalidad
            </Text>

            {/* CTA Button */}
            <TouchableOpacity
                className="bg-white rounded-xl py-4 px-6 shadow-md active:opacity-80"
                onPress={() => router.push('/tools/ex-simulator')}
            >
                <View className="flex-row items-center justify-center">
                    <Sparkles size={20} color="#8B5CF6" />
                    <Text className="text-purple-600 font-bold text-lg ml-2">
                        Probar Ahora →
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Features */}
            <View className="flex-row justify-around mt-4 pt-4 border-t border-white/20">
                <View className="items-center">
                    <Text className="text-white/90 text-xs">Importa chats</Text>
                    <Text className="text-white font-semibold">WhatsApp</Text>
                </View>
                <View className="items-center">
                    <Text className="text-white/90 text-xs">Análisis IA</Text>
                    <Text className="text-white font-semibold">Gemini</Text>
                </View>
                <View className="items-center">
                    <Text className="text-white/90 text-xs">Notificaciones</Text>
                    <Text className="text-white font-semibold">Push</Text>
                </View>
            </View>
        </LinearGradient>
    );
}
