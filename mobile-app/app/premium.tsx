import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Crown, Check, Sparkles, Brain, MessageCircle, Zap, Star, Flame } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Plan {
    id: string;
    name: string;
    icon: any;
    monthlyPrice: number;
    yearlyPrice: number;
    yearlyDiscount: number;
    color: string;
    features: string[];
    popular?: boolean;
    best?: boolean;
    hasTrial?: boolean;
}

export default function PremiumScreen() {
    const router = useRouter();
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

    const plans: Plan[] = [
        {
            id: 'starter',
            name: 'Starter',
            icon: Zap,
            monthlyPrice: 4.99,
            yearlyPrice: 29.99,
            yearlyDiscount: 50,
            color: '#22c55e',
            features: [
                'Chatea con REMI sobre tu proceso',
                'Simula conversaciones con tu ex',
                'Análisis básico de personalidad',
            ],
        },
        {
            id: 'explorer',
            name: 'Explorer',
            icon: Star,
            monthlyPrice: 7.99,
            yearlyPrice: 47.99,
            yearlyDiscount: 50,
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
            icon: Flame,
            monthlyPrice: 12.99,
            yearlyPrice: 77.99,
            yearlyDiscount: 50,
            color: '#f59e0b',
            features: [
                'Uso extendido sin interrupciones',
                'Respuestas más largas y detalladas',
                'Decodificador de mensajes incluido',
                'Respuestas prioritarias',
            ],
            popular: true,
            hasTrial: true,
        },
        {
            id: 'premium',
            name: 'Premium',
            icon: Crown,
            monthlyPrice: 19.99,
            yearlyPrice: 119.99,
            yearlyDiscount: 50,
            color: '#a855f7',
            features: [
                'Límites muy extendidos',
                'Contexto profundo en cada chat',
                'Detección inteligente de red flags',
                'Acceso anticipado a nuevas funciones',
            ],
        },
        {
            id: 'phoenix',
            name: 'Phoenix',
            icon: Sparkles,
            monthlyPrice: 29.99,
            yearlyPrice: 179.99,
            yearlyDiscount: 50,
            color: '#ec4899',
            features: [
                '✨ Los límites más altos',
                'Coaching personalizado con IA avanzada',
                'Soporte VIP prioritario 24/7',
                'Acceso exclusivo a funciones beta',
            ],
            best: true,
        },
    ];

    const handleSelectPlan = (plan: Plan) => {
        const price = billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
        console.log(`Selected ${plan.name} - $${price}/${billingPeriod === 'yearly' ? 'año' : 'mes'}`);
        // TODO: Connect to RevenueCat
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Planes Premium</Text>
                    <View style={styles.headerSpacer} />
                </View>
            </SafeAreaView>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Hero */}
                <LinearGradient
                    colors={['#f59e0b', '#d97706']}
                    style={styles.hero}
                >
                    <Crown size={48} color="#fff" />
                    <Text style={styles.heroTitle}>Elige tu Plan</Text>
                    <Text style={styles.heroSubtitle}>Desbloquea todo el poder de REMI</Text>
                </LinearGradient>

                {/* Billing Toggle */}
                <View style={styles.billingToggle}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, billingPeriod === 'monthly' && styles.toggleBtnActive]}
                        onPress={() => setBillingPeriod('monthly')}
                    >
                        <Text style={[styles.toggleText, billingPeriod === 'monthly' && styles.toggleTextActive]}>
                            Mensual
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, billingPeriod === 'yearly' && styles.toggleBtnActive]}
                        onPress={() => setBillingPeriod('yearly')}
                    >
                        <Text style={[styles.toggleText, billingPeriod === 'yearly' && styles.toggleTextActive]}>
                            Anual
                        </Text>
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>-50%</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Plans */}
                <View style={styles.plansContainer}>
                    {plans.map((plan) => {
                        const price = billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
                        const IconComponent = plan.icon;

                        return (
                            <TouchableOpacity
                                key={plan.id}
                                style={[
                                    styles.planCard,
                                    plan.popular && styles.planCardPopular,
                                    plan.best && styles.planCardBest,
                                ]}
                                onPress={() => handleSelectPlan(plan)}
                            >
                                {plan.popular && (
                                    <View style={styles.popularBadge}>
                                        <Text style={styles.popularBadgeText}>MÁS POPULAR</Text>
                                    </View>
                                )}
                                {plan.best && (
                                    <View style={[styles.popularBadge, { backgroundColor: '#ec4899' }]}>
                                        <Text style={styles.popularBadgeText}>🔥 MEJOR VALOR</Text>
                                    </View>
                                )}

                                <View style={styles.planHeader}>
                                    <View style={[styles.planIcon, { backgroundColor: plan.color + '20' }]}>
                                        <IconComponent size={24} color={plan.color} />
                                    </View>
                                    <Text style={styles.planName}>{plan.name}</Text>
                                </View>

                                <View style={styles.planPricing}>
                                    <Text style={[styles.planPrice, { color: plan.color }]}>
                                        ${price.toFixed(2)}
                                    </Text>
                                    <Text style={styles.planPeriod}>
                                        /{billingPeriod === 'yearly' ? 'año' : 'mes'}
                                    </Text>
                                </View>

                                {billingPeriod === 'yearly' && (
                                    <Text style={styles.saveText}>
                                        Ahorra {plan.yearlyDiscount}% vs mensual
                                    </Text>
                                )}

                                <View style={styles.planFeatures}>
                                    {plan.features.map((feature, i) => (
                                        <View key={i} style={styles.featureRow}>
                                            <Check size={14} color="#22c55e" />
                                            <Text style={styles.featureText}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={[styles.selectBtn, { backgroundColor: plan.color }]}>
                                    <Text style={styles.selectBtnText}>Elegir {plan.name}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Free Trial - 7 Days Warrior */}
                <View style={styles.freeTier}>
                    <View style={styles.trialBadge}>
                        <Text style={styles.trialBadgeText}>🎁 PRUEBA GRATIS</Text>
                    </View>
                    <Text style={styles.freeTierTitle}>7 días gratis con Warrior</Text>
                    <Text style={styles.freeTierDesc}>
                        Obtén acceso completo a todas las funciones de Warrior durante 7 días. Sin compromiso, cancela cuando quieras.
                    </Text>
                    <View style={styles.trialFeatures}>
                        <Text style={styles.trialFeature}>✓ Uso extendido sin interrupciones</Text>
                        <Text style={styles.trialFeature}>✓ Respuestas detalladas y empáticas</Text>
                        <Text style={styles.trialFeature}>✓ Decodificador de mensajes incluido</Text>
                        <Text style={styles.trialFeature}>✓ Respuestas prioritarias</Text>
                    </View>
                    <TouchableOpacity style={styles.trialButton}>
                        <LinearGradient
                            colors={['#f59e0b', '#d97706']}
                            style={styles.trialButtonGradient}
                        >
                            <Text style={styles.trialButtonText}>Comenzar Prueba Gratis</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <Text style={styles.disclaimer}>
                    Se renovará automáticamente. Cancela cuando quieras.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    headerSafe: {
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    headerSpacer: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    hero: {
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginTop: 12,
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    billingToggle: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    toggleBtnActive: {
        backgroundColor: '#2a2a2a',
    },
    toggleText: {
        color: '#6b7280',
        fontWeight: '600',
    },
    toggleTextActive: {
        color: '#fff',
    },
    discountBadge: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    discountText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
    plansContainer: {
        gap: 16,
    },
    planCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    planCardPopular: {
        borderColor: '#f59e0b',
    },
    planCardBest: {
        borderColor: '#ec4899',
    },
    popularBadge: {
        position: 'absolute',
        top: -10,
        right: 16,
        backgroundColor: '#f59e0b',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    popularBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#000',
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    planIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    planName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    planPricing: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    planPrice: {
        fontSize: 28,
        fontWeight: '800',
    },
    planPeriod: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 4,
    },
    saveText: {
        fontSize: 12,
        color: '#22c55e',
        marginBottom: 16,
    },
    planFeatures: {
        marginBottom: 16,
        gap: 8,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    featureText: {
        fontSize: 13,
        color: '#9ca3af',
    },
    selectBtn: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    selectBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    freeTier: {
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        borderRadius: 16,
        padding: 20,
        marginTop: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.3)',
    },
    freeTierTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#a855f7',
        marginBottom: 8,
    },
    freeTierDesc: {
        fontSize: 14,
        color: '#d1d5db',
        textAlign: 'center',
        marginBottom: 16,
    },
    trialBadge: {
        backgroundColor: '#f59e0b',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 12,
    },
    trialBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#000',
    },
    trialFeatures: {
        marginBottom: 16,
    },
    trialFeature: {
        fontSize: 13,
        color: '#d1d5db',
        marginBottom: 4,
    },
    trialButton: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    trialButtonGradient: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    trialButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    disclaimer: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 20,
    },
});
