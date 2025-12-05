import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Crown, Zap, Flame, Sparkles } from 'lucide-react-native';

export default function Paywall() {
    const router = useRouter();

    const plans = [
        {
            name: 'Warrior',
            price: '$4.99',
            period: '/mes',
            color: ['#3b82f6', '#2563eb'],
            icon: Zap,
            features: [
                '100 mensajes/día (25 cada 3h)',
                '3 perfiles de Ex Simulator',
                '30 simulaciones/mes',
                '40 mensajes por simulación',
                '15 análisis de Decoder/semana',
                'Diario inteligente',
                'Sin anuncios'
            ],
            popular: false
        },
        {
            name: 'Premium',
            price: '$9.99',
            period: '/mes',
            color: ['#a855f7', '#9333ea'],
            icon: Crown,
            features: [
                '300 mensajes/día (50 cada 3h)',
                '5 perfiles de Ex Simulator',
                '75 simulaciones/mes',
                '60 mensajes por simulación',
                '50 análisis de Decoder/semana',
                'Diario con insights avanzados',
                'Prioridad en respuestas',
                'Sin anuncios'
            ],
            popular: true
        },
        {
            name: 'Phoenix',
            price: '$19.99',
            period: '/mes',
            color: ['#f59e0b', '#d97706'],
            icon: Flame,
            features: [
                '1000 mensajes/día (100 cada 3h)',
                '10 perfiles de Ex Simulator',
                '200 simulaciones/mes',
                '100 mensajes por simulación',
                'Decoder ilimitado',
                'Análisis de redes sociales',
                'Modo Stalker Detector',
                'Insights semanales personalizados',
                'Acceso anticipado a nuevas funciones',
                'Soporte prioritario'
            ],
            popular: false
        }
    ];

    return (
        <View className="flex-1 bg-[#0a0a0a]">
            <LinearGradient
                colors={['#1a1a2e', '#16213e', '#0a0a0a']}
                className="flex-1"
            >
                <ScrollView className="flex-1 px-6 pt-12">
                    {/* Header */}
                    <View className="items-center mb-8">
                        <Sparkles size={48} color="#a855f7" />
                        <Text className="text-white text-3xl font-bold mt-4 text-center">
                            Elige tu Plan
                        </Text>
                        <Text className="text-gray-400 text-center mt-2">
                            Acelera tu recuperación con herramientas premium
                        </Text>
                    </View>

                    {/* Plans */}
                    {plans.map((plan, index) => {
                        const Icon = plan.icon;
                        return (
                            <View key={index} className="mb-4">
                                {plan.popular && (
                                    <View className="bg-purple-600 rounded-t-2xl py-2">
                                        <Text className="text-white text-center font-bold text-sm">
                                            🔥 MÁS POPULAR
                                        </Text>
                                    </View>
                                )}
                                <View className={`bg-white/5 border-2 ${plan.popular ? 'border-purple-500 rounded-b-2xl' : 'border-white/10 rounded-2xl'
                                    } p-6`}>
                                    {/* Plan Header */}
                                    <View className="flex-row items-center justify-between mb-4">
                                        <View className="flex-row items-center">
                                            <View className={`p-2 rounded-full mr-3`} style={{
                                                backgroundColor: plan.color[0] + '33'
                                            }}>
                                                <Icon size={24} color={plan.color[0]} />
                                            </View>
                                            <View>
                                                <Text className="text-white text-2xl font-bold">
                                                    {plan.name}
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="items-end">
                                            <Text className="text-white text-3xl font-bold">
                                                {plan.price}
                                            </Text>
                                            <Text className="text-gray-400 text-sm">
                                                {plan.period}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Features */}
                                    <View className="mb-6">
                                        {plan.features.map((feature, idx) => (
                                            <View key={idx} className="flex-row items-start mb-3">
                                                <Check size={18} color="#22c55e" className="mr-2 mt-0.5" />
                                                <Text className="text-gray-300 flex-1 leading-6">
                                                    {feature}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* CTA Button */}
                                    <TouchableOpacity>
                                        <LinearGradient
                                            colors={plan.color}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            className="rounded-2xl py-4"
                                        >
                                            <Text className="text-white text-center font-bold text-lg">
                                                Comenzar con {plan.name}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}

                    {/* Footer */}
                    <View className="items-center py-8">
                        <Text className="text-gray-500 text-sm text-center mb-2">
                            Cancela en cualquier momento
                        </Text>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text className="text-gray-400 text-center">
                                Continuar con plan gratuito
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}
