import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Crown, Check, Sparkles, Star, Flame } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getOfferings, purchasePackage } from '../lib/revenuecat';
import { PurchasesPackage } from 'react-native-purchases';
import { supabase } from '../lib/supabase';

interface Plan {
    id: string;
    name: string;
    icon: any;
    color: string;
    features: string[];
    popular?: boolean;
    best?: boolean;
    monthlyPackage?: PurchasesPackage;
    yearlyPackage?: PurchasesPackage;
}

export default function PremiumScreen() {
    const router = useRouter();
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);

    // Static plan definitions - will be matched with RevenueCat packages
    const planDefinitions: Omit<Plan, 'monthlyPackage' | 'yearlyPackage'>[] = [
        {
            id: 'explorer',
            name: 'Explorer',
            icon: Star,
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
            color: '#f59e0b',
            features: [
                'Uso extendido sin interrupciones',
                'Respuestas más largas y detalladas',
                'Decodificador de mensajes incluido',
                'Respuestas prioritarias',
            ],
            popular: true,
        },
        {
            id: 'phoenix',
            name: 'Phoenix',
            icon: Sparkles,
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

    useEffect(() => {
        loadOfferings();
    }, []);

    const loadOfferings = async () => {
        try {
            setLoading(true);
            const offerings = await getOfferings();
            if (offerings?.current?.availablePackages) {
                setPackages(offerings.current.availablePackages);
                console.log('📦 Loaded packages:', offerings.current.availablePackages.map(p => p.identifier));
            }
        } catch (error) {
            console.error('Error loading offerings:', error);
            Alert.alert('Error', 'No se pudieron cargar los planes. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const getPackageForPlan = (planId: string, period: 'monthly' | 'yearly'): PurchasesPackage | undefined => {
        // PRIORITY 1: Check for free trial package (warrior-freetrial-7d)
        if (planId === 'warrior' && period === 'monthly') {
            const trialPkg = packages.find(pkg =>
                pkg.identifier.toLowerCase().includes('warrior') &&
                pkg.identifier.toLowerCase().includes('freetrial')
            );
            if (trialPkg) {
                console.log('✅ Found free trial package:', trialPkg.identifier);
                return trialPkg;
            }
        }

        // PRIORITY 2: Regular monthly/yearly packages
        const suffix = period === 'monthly' ? 'monthly' : 'yearly';
        return packages.find(pkg =>
            pkg.identifier.toLowerCase().includes(planId.toLowerCase()) &&
            pkg.identifier.toLowerCase().includes(suffix) &&
            !pkg.identifier.toLowerCase().includes('freetrial') // Exclude trial packages from regular search
        );
    };

    const getPackagePrice = (planId: string, period: 'monthly' | 'yearly'): string => {
        const pkg = getPackageForPlan(planId, period);
        if (pkg) {
            return pkg.product.priceString;
        }
        return '---';
    };

    const getIntroPrice = (planId: string, period: 'monthly' | 'yearly'): string | null => {
        const pkg = getPackageForPlan(planId, period);
        if (pkg?.product?.introPrice) {
            return pkg.product.introPrice.priceString;
        }
        return null;
    };

    const hasFreeTrial = (planId: string, period: 'monthly' | 'yearly'): boolean => {
        const pkg = getPackageForPlan(planId, period);
        // Check if package identifier includes 'freetrial' or if intro price is 0
        if (pkg) {
            const isTrialPackage = pkg.identifier.toLowerCase().includes('freetrial');
            const hasIntroPrice = pkg.product?.introPrice?.price === 0;
            return isTrialPackage || hasIntroPrice;
        }
        return false;
    };

    const getTrialDuration = (planId: string, period: 'monthly' | 'yearly'): string => {
        const pkg = getPackageForPlan(planId, period);
        if (pkg?.identifier.toLowerCase().includes('7d')) {
            return '7 días';
        }
        // Default to checking intro price period if available
        if (pkg?.product?.introPrice?.periodNumberOfUnits) {
            return `${pkg.product.introPrice.periodNumberOfUnits} días`;
        }
        return '7 días';
    };

    const handleSelectPlan = async (planId: string) => {
        // CRITICAL: Verify user is logged in before allowing purchase
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || user.is_anonymous) {
            Alert.alert(
                '🔐 Cuenta requerida',
                'Para suscribirte a un plan premium, necesitas tener una cuenta. Tu suscripción se guardará en tu cuenta para que puedas acceder desde cualquier dispositivo.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Iniciar sesión',
                        onPress: () => router.push('/auth')
                    }
                ]
            );
            return;
        }

        const pkg = getPackageForPlan(planId, billingPeriod);

        if (!pkg) {
            Alert.alert(
                'Plan no disponible',
                'Este plan no está disponible actualmente. Por favor intenta con otro plan.',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            setPurchasing(true);
            console.log('🛒 Purchasing:', pkg.identifier, 'for user:', user.id);

            const result = await purchasePackage(pkg);

            if (result.success) {
                Alert.alert(
                    '🎉 ¡Compra exitosa!',
                    'Tu suscripción ha sido activada. ¡Disfruta de todas las funciones premium!',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else if (result.error !== 'cancelled') {
                Alert.alert(
                    'Error en la compra',
                    result.error || 'Hubo un problema con la compra. Intenta de nuevo.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Purchase error:', error);
            Alert.alert('Error', 'Hubo un problema con la compra. Intenta de nuevo.');
        } finally {
            setPurchasing(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#f59e0b" />
                <Text style={styles.loadingText}>Cargando planes...</Text>
            </View>
        );
    }

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
                    {planDefinitions.map((plan) => {
                        const price = getPackagePrice(plan.id, billingPeriod);
                        const IconComponent = plan.icon;
                        const hasPackage = getPackageForPlan(plan.id, billingPeriod) !== undefined;

                        return (
                            <TouchableOpacity
                                key={plan.id}
                                style={[
                                    styles.planCard,
                                    plan.popular && styles.planCardPopular,
                                    plan.best && styles.planCardBest,
                                    !hasPackage && styles.planCardDisabled,
                                ]}
                                onPress={() => handleSelectPlan(plan.id)}
                                disabled={purchasing || !hasPackage}
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
                                    {hasFreeTrial(plan.id, billingPeriod) && (
                                        <View style={styles.freeTrialBadge}>
                                            <Text style={styles.freeTrialText}>
                                                🎁 {getTrialDuration(plan.id, billingPeriod).toUpperCase()} GRATIS
                                            </Text>
                                        </View>
                                    )}
                                    {hasFreeTrial(plan.id, billingPeriod) ? (
                                        <View>
                                            <Text style={[styles.planPrice, { color: plan.color }]}>
                                                {price}
                                            </Text>
                                            <Text style={styles.planPeriod}>
                                                después del trial
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                            <Text style={[styles.planPrice, { color: plan.color }]}>
                                                {price}
                                            </Text>
                                            <Text style={styles.planPeriod}>
                                                /{billingPeriod === 'yearly' ? 'año' : 'mes'}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.planFeatures}>
                                    {plan.features.map((feature, i) => (
                                        <View key={i} style={styles.featureRow}>
                                            <Check size={14} color="#22c55e" />
                                            <Text style={styles.featureText}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={[styles.selectBtn, { backgroundColor: hasPackage ? plan.color : '#444' }]}>
                                    {purchasing ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.selectBtnText}>
                                            {!hasPackage ? 'No disponible' :
                                                hasFreeTrial(plan.id, billingPeriod) ?
                                                    `Comenzar Prueba Gratis ${getTrialDuration(plan.id, billingPeriod)}` :
                                                    `Elegir ${plan.name}`}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.disclaimer}>
                    Se renovará automáticamente. Cancela cuando quieras desde Google Play.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 16,
        fontSize: 16,
    },
    headerSafe: {
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
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
        backgroundColor: '#1A1A1A',
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
    planCardDisabled: {
        opacity: 0.5,
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
        marginBottom: 16,
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
    freeTrialBadge: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 8,
        alignSelf: 'flex-start',
    },
    freeTrialText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#000',
        letterSpacing: 0.5,
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
    disclaimer: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 20,
    },
});
