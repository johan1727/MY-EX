import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Check, ArrowLeft, Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../lib/SubscriptionContext';
import PlanFeaturesModal from '../components/PlanFeaturesModal';
import ConfettiCannon from 'react-native-confetti-cannon';

import { PLANS } from '../lib/constants';

// ... (rest of imports/component logic)

{/* Footer */ }
// Footer removed from global scope

export default function SubscribePage() {
    const router = useRouter();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const { tier, packages, purchasePackage } = useSubscription();
    const isPremium = tier !== 'survivor';

    // Confetti Logic
    const [showConfetti, setShowConfetti] = useState(false);
    const prevTierRef = useRef(tier);

    // Confetti Logic removed from useEffect to avoid false positives on load
    // It is now triggered only after a successful purchase action.


    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
    const [loading, setLoading] = useState<string | null>(null);

    // Determines current plan index for UI logic
    const currentPlanIndex = PLANS.findIndex(p => p.id === tier);


    // ...


    const handleSubscribe = async (plan: typeof PLANS[0]) => {
        setLoading(plan.id);

        try {
            // === NATIVE MOBILE PAYMENTS (RevenueCat) ===
            if (Platform.OS !== 'web') {
                if (!packages || packages.length === 0) {
                    Alert.alert('Error', 'No se pudieron cargar los paquetes de suscripción. Intenta más tarde.');
                    return;
                }

                // Find matching package
                // Strategy: Look for package identifier containing plan ID (e.g. 'warrior') and period ('monthly'/'annual')
                const targetIdentifierSnippet = `${plan.id}_${billingPeriod}`; // e.g. "warrior_monthly"

                // Flexible matching:
                // 1. Exact match on package identifier? (Usually configured as such)
                // 2. Or match on product identifier
                const packageToBuy = packages.find(pkg =>
                    pkg.identifier.toLowerCase().includes(plan.id.toLowerCase()) &&
                    (billingPeriod === 'monthly' ? pkg.packageType === 'MONTHLY' : pkg.packageType === 'ANNUAL')
                );

                if (!packageToBuy) {
                    console.log('Available packages:', packages.map(p => p.identifier));
                    Alert.alert('No disponible', `El plan ${plan.name} (${billingPeriod}) no está configurado en la tienda aún.`);
                    return;
                }

                try {
                    await purchasePackage(packageToBuy);
                    // Success is handled by the Context/Listener usually, but we can show confetti here
                    setShowConfetti(true);
                    setShowSuccessModal(true);
                } catch (e: any) {
                    if (!e.userCancelled) {
                        Alert.alert('Error', e.message);
                    }
                } finally {
                    setLoading(null);
                }
                return;
            }

            // === WEB PAYMENTS (Stripe) ===
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/auth');
                return;
            }

            const selectedPriceId = billingPeriod === 'monthly' ? plan.priceId : plan.annualPriceId;
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const response = await fetch(`${supabaseUrl}/functions/v1/create-stripe-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
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

            window.location.href = data.sessionUrl;

        } catch (error: any) {
            console.error('Error subscribing:', error);
            alert(error.message || 'Error al procesar el pago');
        } finally {
            setLoading(null);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#ffffff', '#f3f4f6']}
                style={StyleSheet.absoluteFill}
            />

            {showConfetti && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, pointerEvents: 'none' }}>
                    <ConfettiCannon
                        count={200}
                        origin={{ x: -10, y: 0 }}
                        autoStart={true}
                        fadeOut={true}
                        onAnimationEnd={() => setShowConfetti(false)}
                    />
                </View>
            )}

            <PlanFeaturesModal
                visible={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                planName={tier === 'survivor' ? 'Phoenix' : tier.charAt(0).toUpperCase() + tier.slice(1)}
            />

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
                        <ArrowLeft size={24} color="#111827" />
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
                                    <Text style={styles.saveBadgeText}>-17%</Text>
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

                                    <Text style={[styles.planName, { color: '#111827' }]}>{plan.name}</Text>

                                    <View style={styles.priceContainer}>
                                        <Text style={styles.currency}>MX$</Text>
                                        <Text style={[styles.price, { color: '#111827' }]}>{displayPrice}.00</Text>
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
                                            { backgroundColor: isDisabled ? '#9ca3af' : plan.color },
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // bg handled by LinearGradient
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
        color: '#111827', // Dark
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280', // Gray-500
    },
    plansContainer: {
        gap: 20,
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%'
    },
    planCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
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
        marginBottom: 16,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 24,
    },
    currency: {
        fontSize: 20,
        color: '#6b7280',
        marginRight: 4,
    },
    price: {
        fontSize: 48,
        fontWeight: '900',
    },
    period: {
        fontSize: 16,
        color: '#6b7280',
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
        color: '#374151',
        flex: 1,
    },
    button: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
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
        paddingBottom: 40
    },
    footerText: {
        color: '#9ca3af',
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
        backgroundColor: '#f3f4f6',
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
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    toggleText: {
        color: '#6b7280',
        fontSize: 16,
        fontWeight: '600',
    },
    toggleTextActive: {
        color: '#111827',
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
