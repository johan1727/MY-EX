import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, useWindowDimensions, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Star, Zap, Crown, Flame, ArrowLeft, X, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SUBSCRIPTION_CONFIG, SubscriptionTier } from '../lib/subscriptions';
// import { BlurView } from 'expo-blur';

export default function Paywall() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

    const toggleBilling = () => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly');

    const plans = [
        {
            id: SubscriptionTier.STARTER,
            ...SUBSCRIPTION_CONFIG[SubscriptionTier.STARTER],
            popular: false,
        },
        {
            id: SubscriptionTier.EXPLORER,
            ...SUBSCRIPTION_CONFIG[SubscriptionTier.EXPLORER],
            popular: true,
        },
        {
            id: SubscriptionTier.WARRIOR,
            ...SUBSCRIPTION_CONFIG[SubscriptionTier.WARRIOR],
            popular: false,
        },
        {
            id: SubscriptionTier.PREMIUM,
            ...SUBSCRIPTION_CONFIG[SubscriptionTier.PREMIUM],
            popular: false,
        },
        {
            id: SubscriptionTier.PHOENIX,
            ...SUBSCRIPTION_CONFIG[SubscriptionTier.PHOENIX],
            popular: false,
        },
    ];

    const freePlan = SUBSCRIPTION_CONFIG[SubscriptionTier.SURVIVOR];

    const renderFeature = (text: string, included: boolean = true, darkText: boolean = false) => (
        <View className="flex-row items-start mb-3" key={text}>
            <View className={`w-5 h-5 rounded-full items-center justify-center mr-3 mt-0.5 ${included ? (darkText ? 'bg-black/10' : 'bg-emerald-500/20') : 'bg-gray-800'}`}>
                {included ? <Check size={12} color={darkText ? "#000" : "#10b981"} /> : <X size={12} color="#6b7280" />}
            </View>
            <Text className={`text-sm font-medium flex-1 leading-5 ${darkText ? 'text-gray-800' : (included ? 'text-gray-200' : 'text-gray-500')}`}>
                {text}
            </Text>
        </View>
    );

    return (
        <View className="flex-1 bg-black">
            <LinearGradient
                colors={['#0f172a', '#1e1b4b', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            <SafeAreaView className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View className="p-6 pt-8 items-center relative">
                        <TouchableOpacity
                            onPress={() => {
                                if (router.canGoBack()) {
                                    router.back();
                                } else {
                                    router.push('/(tabs)');
                                }
                            }}
                            className="absolute left-6 top-8 w-10 h-10 bg-white/10 rounded-full items-center justify-center overflow-hidden z-50 border border-white/10 active:bg-white/20"
                        >
                            <ArrowLeft size={20} color="white" />
                        </TouchableOpacity>

                        <View className="mt-8 mb-6 items-center">
                            <View className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-500 to-blue-500 items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
                                <Crown size={32} color="white" fill="white" />
                            </View>
                            <Text className="text-white text-4xl font-black text-center tracking-tight mb-2">
                                SOYREMI <Text className="text-purple-400">Pro</Text>
                            </Text>
                            <Text className="text-gray-400 text-center text-sm max-w-xs leading-relaxed">
                                Desbloquea el potencial completo de tu recuperación con herramientas de IA avanzadas.
                            </Text>
                        </View>

                        {/* Toggle */}
                        <View className="flex-row bg-[#0f172a] p-1 rounded-full border border-white/10 mb-8 w-full max-w-xs shadow-inner">
                            <TouchableOpacity
                                onPress={() => setBillingCycle('monthly')}
                                className={`flex-1 py-2 rounded-full items-center ${billingCycle === 'monthly' ? 'bg-[#1e293b]' : 'transparent'}`}
                            >
                                <Text className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-400'}`}>Mensual</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setBillingCycle('yearly')}
                                className={`flex-1 py-2 rounded-full items-center flex-row justify-center ${billingCycle === 'yearly' ? 'bg-purple-600' : 'transparent'}`}
                            >
                                <Text className={`text-xs font-bold mr-1 ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-400'}`}>Anual</Text>
                                <View className="bg-white/20 px-1.5 rounded text-[9px]">
                                    <Text className="text-[9px] text-white font-bold">-33%</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Plans Container */}
                    <View className={`px-4 ${isDesktop ? 'flex-row justify-center gap-6 flex-wrap' : 'gap-6'}`}>

                        {/* Free Plan Card (Survivor) */}
                        <View className={`bg-[#0f172a]/60 border border-white/5 p-6 rounded-[32px] overflow-hidden relative mb-6 ${isDesktop ? 'w-[300px]' : 'w-full'}`}>
                            <View className="absolute top-4 right-4 bg-gray-800/50 px-2 py-1 rounded-md">
                                <Text className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Plan Actual</Text>
                            </View>

                            <View className="flex-row justify-between items-start mb-4">
                                <View className="p-2 bg-gray-700/30 rounded-xl border border-gray-600/30">
                                    <Sparkles size={20} color="#9ca3af" />
                                </View>
                                <View>
                                    <Text className="text-white text-2xl font-black text-right">$0</Text>
                                    <Text className="text-gray-500 text-[9px] font-bold uppercase tracking-wider text-right">/SIEMPRE</Text>
                                </View>
                            </View>

                            <Text className="text-white text-xl font-bold mb-1">Survivor</Text>
                            <Text className="text-gray-500 text-[10px] mb-4 h-6">Funciones básicas.</Text>

                            <View className="space-y-1 mb-6">
                                {freePlan.features.map(feature => renderFeature(feature, true, false))}
                            </View>

                            <TouchableOpacity disabled className="w-full bg-white/5 border border-white/10 py-3 rounded-xl items-center opacity-50">
                                <Text className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Plan Actual</Text>
                            </TouchableOpacity>
                        </View>


                        {/* Starter Card */}
                        <View className={`bg-[#1e293b]/40 border border-emerald-500/20 p-6 rounded-[32px] overflow-hidden relative mb-6 ${isDesktop ? 'w-[300px]' : 'w-full'}`}>
                            <LinearGradient colors={['rgba(16, 185, 129, 0.05)', 'transparent']} className="absolute inset-0" />

                            <View className="flex-row justify-between items-start mb-4">
                                <View className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    <Sparkles size={20} color="#10b981" />
                                </View>
                                <View>
                                    <Text className="text-white text-2xl font-black text-right">
                                        ${billingCycle === 'monthly' ? SUBSCRIPTION_CONFIG['starter'].price : (SUBSCRIPTION_CONFIG['starter'].yearlyPrice! / 12).toFixed(2)}
                                    </Text>
                                    <View className="flex-row items-center justify-end">
                                        {billingCycle === 'yearly' && <Text className="text-gray-500 text-[10px] line-through mr-1">${SUBSCRIPTION_CONFIG['starter'].price}</Text>}
                                        <Text className="text-gray-500 text-[9px] font-bold uppercase tracking-wider">/MES</Text>
                                    </View>
                                </View>
                            </View>

                            <Text className="text-white text-xl font-bold mb-1">Starter</Text>
                            <Text className="text-gray-500 text-[10px] mb-4 h-6">Primeros pasos hacia la sanación.</Text>

                            <View className="space-y-1 mb-6">
                                {plans[0].features.map(feature => renderFeature(feature, true, false))}
                            </View>

                            <TouchableOpacity className="w-full bg-[#1e293b] border border-emerald-500/30 py-3 rounded-xl items-center">
                                <Text className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">Elegir Starter</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Explorer Card (Popular) */}
                        <View className={`bg-white border-2 border-white p-6 rounded-[32px] overflow-hidden relative mb-6 shadow-xl ${isDesktop ? 'w-[320px] scale-105 z-10' : 'w-full'}`}>
                            <View className="absolute top-0 right-0 bg-black px-3 py-1 rounded-bl-xl">
                                <Text className="text-white text-[9px] font-black uppercase tracking-wider">Popular</Text>
                            </View>

                            <View className="flex-row justify-between items-start mb-4">
                                <View className="p-2 bg-cyan-100 rounded-xl">
                                    <Star size={20} color="#06b6d4" fill="#06b6d4" />
                                </View>
                                <View>
                                    <Text className="text-black text-3xl font-black text-right">
                                        ${billingCycle === 'monthly' ? SUBSCRIPTION_CONFIG['explorer'].price : (SUBSCRIPTION_CONFIG['explorer'].yearlyPrice! / 12).toFixed(2)}
                                    </Text>
                                    <View className="flex-row items-center justify-end">
                                        {billingCycle === 'yearly' && <Text className="text-gray-400 text-[10px] line-through mr-1">${SUBSCRIPTION_CONFIG['explorer'].price}</Text>}
                                        <Text className="text-gray-500 text-[9px] font-bold uppercase tracking-wider">/MES</Text>
                                    </View>
                                </View>
                            </View>

                            <Text className="text-black text-2xl font-bold mb-1">Explorer</Text>
                            <Text className="text-gray-500 text-[10px] mb-4 h-6">Explora tu recuperación con más herramientas.</Text>

                            <View className="space-y-1 mb-8">
                                {plans[1].features.map(feature => renderFeature(feature, true, true))}
                            </View>

                            <TouchableOpacity className="w-full bg-black py-4 rounded-xl items-center shadow-lg">
                                <Text className="text-white font-bold uppercase tracking-widest text-xs">Prueba Gratis</Text>
                            </TouchableOpacity>
                        </View>


                        {/* Warrior Card */}
                        <View className={`bg-[#1e293b]/40 border border-white/5 p-6 rounded-[32px] overflow-hidden relative mb-6 ${isDesktop ? 'w-[300px]' : 'w-full'}`}>
                            <LinearGradient colors={['rgba(59, 130, 246, 0.05)', 'transparent']} className="absolute inset-0" />

                            <View className="flex-row justify-between items-start mb-4">
                                <View className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                    <Zap size={20} color="#60a5fa" fill="#60a5fa" />
                                </View>
                                <View>
                                    <Text className="text-white text-2xl font-black text-right">
                                        ${billingCycle === 'monthly' ? SUBSCRIPTION_CONFIG['warrior'].price : (SUBSCRIPTION_CONFIG['warrior'].yearlyPrice! / 12).toFixed(2)}
                                    </Text>
                                    <View className="flex-row items-center justify-end">
                                        {billingCycle === 'yearly' && <Text className="text-gray-500 text-[10px] line-through mr-1">${SUBSCRIPTION_CONFIG['warrior'].price}</Text>}
                                        <Text className="text-gray-500 text-[9px] font-bold uppercase tracking-wider">/MES</Text>
                                    </View>
                                </View>
                            </View>

                            <Text className="text-white text-xl font-bold mb-1">Warrior</Text>
                            <Text className="text-gray-500 text-[10px] mb-4 h-6">Lo esencial para empezar.</Text>

                            <View className="space-y-1 mb-6">
                                {plans[2].features.map(feature => renderFeature(feature, true, false))}
                            </View>

                            <TouchableOpacity className="w-full bg-[#1e293b] border border-blue-500/30 py-3 rounded-xl items-center">
                                <Text className="text-blue-400 font-bold uppercase tracking-widest text-[10px]">Elegir Warrior</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Premium Card (Popular) */}
                        <View className={`bg-white border-2 border-white p-6 rounded-[32px] overflow-hidden relative mb-6 shadow-xl ${isDesktop ? 'w-[320px] scale-105 z-10' : 'w-full'}`}>
                            <View className="absolute top-0 right-0 bg-black px-3 py-1 rounded-bl-xl">
                                <Text className="text-white text-[9px] font-black uppercase tracking-wider">Popular</Text>
                            </View>

                            <View className="flex-row justify-between items-start mb-4">
                                <View className="p-2 bg-purple-100 rounded-xl">
                                    <Crown size={20} color="#a855f7" fill="#a855f7" />
                                </View>
                                <View>
                                    <Text className="text-black text-3xl font-black text-right">
                                        ${billingCycle === 'monthly' ? SUBSCRIPTION_CONFIG['premium'].price : (SUBSCRIPTION_CONFIG['premium'].yearlyPrice! / 12).toFixed(2)}
                                    </Text>
                                    <View className="flex-row items-center justify-end">
                                        {billingCycle === 'yearly' && <Text className="text-gray-400 text-[10px] line-through mr-1">${SUBSCRIPTION_CONFIG['premium'].price}</Text>}
                                        <Text className="text-gray-500 text-[9px] font-bold uppercase tracking-wider">/MES</Text>
                                    </View>
                                </View>
                            </View>

                            <Text className="text-black text-2xl font-bold mb-1">Premium</Text>
                            <Text className="text-gray-500 text-[10px] mb-4 h-6">El equilibrio perfecto para tu proceso.</Text>

                            <View className="space-y-1 mb-8">
                                {plans[3].features.map(feature => renderFeature(feature, true, true))}
                            </View>

                            <TouchableOpacity className="w-full bg-black py-4 rounded-xl items-center shadow-lg">
                                <Text className="text-white font-bold uppercase tracking-widest text-xs">Prueba Gratis</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Phoenix Card */}
                        <View className={`bg-[#1e293b]/40 border border-purple-500/20 p-6 rounded-[32px] overflow-hidden relative mb-6 ${isDesktop ? 'w-[300px]' : 'w-full'}`}>
                            <LinearGradient colors={['rgba(168, 85, 247, 0.05)', 'transparent']} className="absolute inset-0" />

                            <View className="flex-row justify-between items-start mb-4">
                                <View className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                    <Flame size={20} color="#c084fc" fill="#c084fc" />
                                </View>
                                <View>
                                    <Text className="text-white text-2xl font-black text-right">
                                        ${billingCycle === 'monthly' ? SUBSCRIPTION_CONFIG['phoenix'].price : (SUBSCRIPTION_CONFIG['phoenix'].yearlyPrice! / 12).toFixed(2)}
                                    </Text>
                                    <View className="flex-row items-center justify-end">
                                        {billingCycle === 'yearly' && <Text className="text-gray-500 text-[10px] line-through mr-1">${SUBSCRIPTION_CONFIG['phoenix'].price}</Text>}
                                        <Text className="text-gray-500 text-[9px] font-bold uppercase tracking-wider">/MES</Text>
                                    </View>
                                </View>
                            </View>

                            <Text className="text-white text-xl font-bold mb-1">Phoenix</Text>
                            <Text className="text-gray-500 text-[10px] mb-4 h-6">Máximo poder sin límites.</Text>

                            <View className="space-y-1 mb-6">
                                {plans[4].features.map(feature => renderFeature(feature, true, false))}
                            </View>

                            <TouchableOpacity className="w-full bg-purple-600/20 border border-purple-500/50 py-3 rounded-xl items-center">
                                <Text className="text-purple-300 font-bold uppercase tracking-widest text-[10px]">Elegir Phoenix</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text className="text-gray-600 text-center text-[10px] mt-12 mb-6 px-10">
                        Suscripción auto-renovable. Se cargará a tu cuenta de iTunes/Play Store. Puedes cancelar en cualquier momento desde los ajustes de tu cuenta.
                    </Text>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
