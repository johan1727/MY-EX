import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Check, ArrowLeft, Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../lib/SubscriptionContext';

const PLANS = [
    {
        id: 'explorer',
        name: 'Explorer',
        price: 89,
        annualPrice: 890,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_EXPLORER || 'price_1RsodvP3GWiMooGSMQpJ0KL8', // LIVE Monthly
        annualPriceId: 'price_1Sn4siP3GWiMooGSc336SbzN', // LIVE Annual
        color: '#3b82f6',
        features: [
            'Límites más amplios de uso',
            'Crea múltiples perfiles de ex',
            'Análisis profundo de patrones',
            'REMI recuerda tu historia completa',
        ],
    },
    {
        id: 'warrior',
        name: 'Warrior',
        price: 299,
        annualPrice: 2990,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_WARRIOR || 'price_1RqOMRP3GWiMooGSD5OPjzim', // LIVE Monthly
        annualPriceId: 'price_1Sn4uNP3GWiMooGSsVmPQzAg', // LIVE Annual
        color: '#f97316',
        popular: true,
        features: [
            'Uso extendido sin interrupciones',
            'Respuestas más largas y detalladas',
            'Decodificador de mensajes incluido',
            'Respuestas prioritarias',
        ],
    },
    {
        id: 'phoenix',
        name: 'Phoenix',
        price: 449,
        annualPrice: 4490,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PHOENIX || 'price_1RqOM5P3GWiMooGS8k3BDdW8', // LIVE Monthly
        annualPriceId: 'price_1Sn4uhP3GWiMooGSwqepVrYh', // LIVE Annual
        color: '#ec4899',
        badge: 'MEJOR VALOR',
        features: [
            'Uso ilimitado',
            'Acceso total sin restricciones',
            '20 perfiles de ex',
            'Soporte premium prioritario',
        ],
    },
];

export default function SubscribePage() {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
    const { tier, isLoading: tierLoading } = useSubscription();
    const isPremium = tier !== 'survivor';
    const currentPlanIndex = PLANS.findIndex(p => p.id === tier);

    const handleSubscribe = async (plan: typeof PLANS[0]) => {
        if (Platform.OS !== 'web') {
            alert('Los pagos web solo funcionan en navegador. Por favor usa la app móvil para suscribirte.');
            return;
        }

        setLoading(plan.id);

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/auth');
                return;
            }

            // Determine correct Price ID based on selection
            const selectedPriceId = billingPeriod === 'monthly' ? plan.priceId : plan.annualPriceId;

            // Call API to create checkout session
            const response = await fetch('/api/stripe/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: selectedPriceId,
                    userId: user.id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al crear sesión de pago');
            }

            // Redirect to Stripe Checkout
            if (Platform.OS === 'web') {
                window.location.href = data.sessionUrl;
            }
        } catch (error: any) {
            console.error('Error subscribing:', error);
            alert(error.message || 'Error al procesar el pago');
        } finally {
            setLoading(null);
        }
    };

    return (
        <LinearGradient
            colors={['#0f0f23', '#1a0a2e', '#2d1b4e']}
            style={styles.container}
        >
            <StatusBar style="light" />
            <SafeAreaView style={{ flex: 1 }}>
                {/* Back Button Header */}
                <View style={styles.backHeader}>
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/(tabs)');
                            }
                        }}
                        style={styles.backButton}
                    >
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {isPremium ? 'Tu Plan Actual' : 'Elige tu plan'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isPremium
                                ? `Actualmente estás en el plan ${tier.charAt(0).toUpperCase() + tier.slice(1)}`
                                : 'Mejora tu experiencia con REMI'
                            }
                        </Text>

                        {/* Billing Period Toggle */}
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[styles.toggleOption, billingPeriod === 'monthly' && styles.toggleOptionActive]}
                                onPress={() => setBillingPeriod('monthly')}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.toggleText, billingPeriod === 'monthly' && styles.toggleTextActive]}>
                                    Mensual
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleOption, billingPeriod === 'annual' && styles.toggleOptionActive]}
                                onPress={() => setBillingPeriod('annual')}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.toggleText, billingPeriod === 'annual' && styles.toggleTextActive]}>
                                    Anual
                                </Text>
                                <View style={styles.saveBadge}>
                                    <Text style={styles.saveBadgeText}>AHORRA 17%</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Plans */}
                    <View style={styles.plansContainer}>
                        {PLANS.map((plan, planIndex) => {
                            const isCurrentPlan = plan.id === tier;
                            const isLowerPlan = planIndex < currentPlanIndex;
                            const isDisabled = isCurrentPlan || isLowerPlan;

                            const displayPrice = billingPeriod === 'monthly' ? plan.price : plan.annualPrice;

                            return (
                                <View
                                    key={plan.id}
                                    style={[
                                        styles.planCard,
                                        plan.popular && styles.popularCard,
                                        isCurrentPlan && styles.currentPlanCard,
                                    ]}
                                >
                                    {isCurrentPlan && (
                                        <View style={styles.currentBadge}>
                                            <Crown size={12} color="#fff" />
                                            <Text style={styles.currentBadgeText}>PLAN ACTUAL</Text>
                                        </View>
                                    )}
                                    {plan.badge && !isCurrentPlan && (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>{plan.badge}</Text>
                                        </View>
                                    )}
                                    {/* Annual Savings Badge on Card */}
                                    {billingPeriod === 'annual' && !isCurrentPlan && (
                                        <View style={styles.annualBadgeCard}>
                                            <Text style={styles.annualBadgeText}>2 MESES GRATIS</Text>
                                        </View>
                                    )}

                                    <Text style={styles.planName}>{plan.name}</Text>

                                    <View style={styles.priceContainer}>
                                        <Text style={styles.currency}>MX$</Text>
                                        <Text style={styles.price}>{displayPrice}.00</Text>
                                        <Text style={styles.period}>/{billingPeriod === 'monthly' ? 'mes' : 'año'}</Text>
                                    </View>

                                    <View style={styles.featuresContainer}>
                                        {plan.features.map((feature, index) => (
                                            <View key={index} style={styles.featureRow}>
                                                <Check size={20} color="#22c55e" />
                                                <Text style={styles.featureText}>{feature}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <TouchableOpacity
                                        style={[
                                            styles.button,
                                            { backgroundColor: isDisabled ? '#4b5563' : plan.color },
                                            loading === plan.id && styles.buttonDisabled,
                                        ]}
                                        onPress={() => handleSubscribe(plan)}
                                        disabled={loading !== null || isDisabled}
                                        activeOpacity={0.8}
                                    >
                                        {loading === plan.id ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.buttonText}>
                                                {isCurrentPlan ? 'Plan Actual' : isLowerPlan ? 'Incluido' : `Elegir ${plan.name}`}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            💳 Pago seguro con Stripe
                        </Text>
                        <Text style={styles.footerText}>
                            ✨ Cancela cuando quieras
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingTop: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    plansContainer: {
        gap: 20,
    },
    planCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    popularCard: {
        borderColor: '#f97316',
        borderWidth: 2,
    },
    badge: {
        position: 'absolute',
        top: -12,
        right: 20,
        backgroundColor: '#ec4899',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    planName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 16,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 24,
    },
    currency: {
        fontSize: 20,
        color: '#9ca3af',
        marginRight: 4,
    },
    price: {
        fontSize: 48,
        fontWeight: '900',
        color: '#fff',
    },
    period: {
        fontSize: 16,
        color: '#9ca3af',
        marginLeft: 4,
    },
    featuresContainer: {
        gap: 12,
        marginBottom: 24,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        flex: 1,
    },
    button: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        alignItems: 'center',
        marginTop: 40,
        gap: 8,
    },
    footerText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
    },
    backHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
    },
    currentPlanCard: {
        borderColor: '#22c55e',
        borderWidth: 2,
    },
    currentBadge: {
        position: 'absolute',
        top: -12,
        left: 20,
        backgroundColor: '#22c55e',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    currentBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 4,
        marginTop: 24,
    },
    toggleOption: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toggleOptionActive: {
        backgroundColor: '#3b82f6',
    },
    toggleText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 16,
        fontWeight: '600',
    },
    toggleTextActive: {
        color: '#fff',
        fontWeight: '700',
    },
    saveBadge: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    saveBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    annualBadgeCard: {
        position: 'absolute',
        top: -12,
        right: 40,
        backgroundColor: '#22c55e',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 10,
    },
    annualBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
});
