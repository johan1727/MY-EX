import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { X, Check, Zap, Crown, Sprout } from 'lucide-react-native';
import { SubscriptionTier, SUBSCRIPTION_CONFIG, calculateSavings } from '../lib/subscriptions';
import { useLanguage } from '../lib/i18n';

export default function PaywallScreen() {
    const router = useRouter();
    const { language } = useLanguage();
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>(SubscriptionTier.WARRIOR);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

    const plans = [
        {
            tier: SubscriptionTier.SURVIVOR,
            icon: Sprout,
            gradient: ['#22c55e', '#16a34a'],
            popular: false
        },
        {
            tier: SubscriptionTier.WARRIOR,
            icon: Zap,
            gradient: ['#3b82f6', '#2563eb'],
            popular: true
        },
        {
            tier: SubscriptionTier.PHOENIX,
            icon: Crown,
            gradient: ['#a855f7', '#9333ea'],
            popular: false
        }
    ];

    const getPrice = (tier: SubscriptionTier) => {
        const config = SUBSCRIPTION_CONFIG[tier];
        if (tier === SubscriptionTier.SURVIVOR) return 'Free';

        if (billingPeriod === 'yearly' && config.yearlyPrice) {
            const monthlyEquivalent = (config.yearlyPrice / 12).toFixed(2);
            return `$${monthlyEquivalent}/mo`;
        }

        return `$${config.price}/mo`;
    };

    const handleSubscribe = () => {
        // TODO: Integrate with RevenueCat or Stripe
        console.log('Subscribe to:', selectedPlan, billingPeriod);
        router.back();
    };

    return (
        <View className="flex-1 bg-black">
            <StatusBar style="light" />

            <LinearGradient
                colors={['#0a0a0a', '#1a1a2e', '#16213e', '#0a0a0a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 py-4">
                    <Text className="text-white text-2xl font-bold">
                        {language === 'es' ? 'Elige tu Plan' : 'Choose Your Plan'}
                    </Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <X size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                    {/* Billing Period Toggle */}
                    <View className="flex-row bg-white/5 rounded-2xl p-1 mb-6">
                        <TouchableOpacity
                            onPress={() => setBillingPeriod('monthly')}
                            className={`flex-1 py-3 rounded-xl ${billingPeriod === 'monthly' ? 'bg-purple-600' : ''
                                }`}
                        >
                            <Text className={`text-center font-semibold ${billingPeriod === 'monthly' ? 'text-white' : 'text-gray-400'
                                }`}>
                                {language === 'es' ? 'Mensual' : 'Monthly'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setBillingPeriod('yearly')}
                            className={`flex-1 py-3 rounded-xl ${billingPeriod === 'yearly' ? 'bg-purple-600' : ''
                                }`}
                        >
                            <View>
                                <Text className={`text-center font-semibold ${billingPeriod === 'yearly' ? 'text-white' : 'text-gray-400'
                                    }`}>
                                    {language === 'es' ? 'Anual' : 'Yearly'}
                                </Text>
                                <Text className="text-green-400 text-xs text-center">
                                    {language === 'es' ? 'Ahorra 17%' : 'Save 17%'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Plans */}
                    {plans.map(({ tier, icon: Icon, gradient, popular }) => {
                        const config = SUBSCRIPTION_CONFIG[tier];
                        const isSelected = selectedPlan === tier;

                        return (
                            <TouchableOpacity
                                key={tier}
                                onPress={() => setSelectedPlan(tier)}
                                className={`mb-4 rounded-3xl border-2 ${isSelected ? 'border-purple-500' : 'border-white/10'
                                    } ${popular ? 'relative' : ''}`}
                            >
                                {popular && (
                                    <View className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 px-4 py-1 rounded-full z-10">
                                        <Text className="text-white text-xs font-bold">
                                            {language === 'es' ? 'MÁS POPULAR' : 'MOST POPULAR'}
                                        </Text>
                                    </View>
                                )}

                                <LinearGradient
                                    colors={isSelected ? gradient : ['#1a1a2e', '#1a1a2e']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    className="p-6 rounded-3xl"
                                >
                                    <View className="flex-row items-center justify-between mb-4">
                                        <View className="flex-row items-center">
                                            <View className="w-12 h-12 bg-white/10 rounded-full items-center justify-center mr-3">
                                                <Icon size={24} color="white" />
                                            </View>
                                            <View>
                                                <Text className="text-white text-xl font-bold">
                                                    {config.name} {config.badge}
                                                </Text>
                                                <Text className="text-2xl font-black text-white">
                                                    {getPrice(tier)}
                                                </Text>
                                            </View>
                                        </View>
                                        {isSelected && (
                                            <View className="w-6 h-6 bg-purple-500 rounded-full items-center justify-center">
                                                <Check size={16} color="white" />
                                            </View>
                                        )}
                                    </View>

                                    {/* Features */}
                                    <View className="space-y-2">
                                        <FeatureItem
                                            text={config.features.dailyMessages === -1
                                                ? (language === 'es' ? 'Mensajes ilimitados' : 'Unlimited messages')
                                                : `${config.features.dailyMessages} ${language === 'es' ? 'mensajes/día' : 'messages/day'}`
                                            }
                                        />
                                        <FeatureItem
                                            text={config.features.messageDecoder === -1
                                                ? (language === 'es' ? 'Decodificador ilimitado' : 'Unlimited decoder')
                                                : `${config.features.messageDecoder} ${language === 'es' ? 'análisis/semana' : 'analysis/week'}`
                                            }
                                        />
                                        {config.features.analytics !== 'none' && (
                                            <FeatureItem
                                                text={language === 'es'
                                                    ? `Análisis ${config.features.analytics === 'daily' ? 'diario' : 'semanal'}`
                                                    : `${config.features.analytics === 'daily' ? 'Daily' : 'Weekly'} analytics`
                                                }
                                            />
                                        )}
                                        {config.features.panicButton === 'advanced' && (
                                            <FeatureItem
                                                text={language === 'es' ? 'Botón de pánico avanzado' : 'Advanced panic button'}
                                            />
                                        )}
                                        {config.features.vault && (
                                            <FeatureItem
                                                text={language === 'es' ? 'Bóveda secreta con PIN' : 'Secret vault with PIN'}
                                            />
                                        )}
                                        {config.features.coachingSessions && (
                                            <FeatureItem
                                                text={language === 'es' ? 'Sesiones de coaching guiadas' : 'Guided coaching sessions'}
                                            />
                                        )}
                                        {config.features.prioritySupport && (
                                            <FeatureItem
                                                text={language === 'es' ? 'Soporte prioritario' : 'Priority support'}
                                            />
                                        )}
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    })}

                    {/* Testimonials */}
                    <View className="bg-white/5 rounded-3xl p-6 mb-6">
                        <Text className="text-white text-lg font-bold mb-4">
                            {language === 'es' ? '¿Por qué My Ex Coach?' : 'Why My Ex Coach?'}
                        </Text>
                        <Text className="text-gray-300 leading-6">
                            {language === 'es'
                                ? '"Esta app me salvó en mis peores momentos. El botón de pánico me detuvo de cometer errores que hubiera lamentado." - María, 28'
                                : '"This app saved me in my darkest moments. The panic button stopped me from making mistakes I would have regretted." - Sarah, 28'
                            }
                        </Text>
                    </View>

                    {/* CTA */}
                    <TouchableOpacity
                        onPress={handleSubscribe}
                        className="mb-8"
                    >
                        <LinearGradient
                            colors={['#a855f7', '#3b82f6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="rounded-2xl p-4"
                        >
                            <Text className="text-white text-center font-bold text-lg">
                                {selectedPlan === SubscriptionTier.SURVIVOR
                                    ? (language === 'es' ? 'Continuar Gratis' : 'Continue Free')
                                    : (language === 'es' ? 'Comenzar Ahora' : 'Start Now')
                                }
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text className="text-gray-500 text-xs text-center mb-8">
                        {language === 'es'
                            ? 'Cancela en cualquier momento. Sin compromisos.'
                            : 'Cancel anytime. No commitments.'
                        }
                    </Text>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <View className="flex-row items-center">
            <View className="w-5 h-5 bg-green-500/20 rounded-full items-center justify-center mr-2">
                <Check size={12} color="#22c55e" />
            </View>
            <Text className="text-white">{text}</Text>
        </View>
    );
}
