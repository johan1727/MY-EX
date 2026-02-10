import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Crown, Check, Sparkles, Star, Flame, HelpCircle, X, LogOut } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getOfferings, initializationStatus, initializationError } from '../lib/revenuecat';
import { PurchasesPackage } from 'react-native-purchases';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { useSubscription, SubscriptionTier } from '../lib/SubscriptionContext';

// Helper to rank tiers
const TIER_RANKS: Record<SubscriptionTier, number> = {
    'survivor': 0,
    'explorer': 1,
    'warrior': 2,
    'phoenix': 3
};

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
    const { t } = useLanguage();
    // Get subscription context
    const { purchasePackage, tier } = useSubscription();

    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);

    // Custom Alert State
    interface AlertConfig {
        visible: boolean;
        title: string;
        message: string;
        buttons?: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' | 'confirm' }[];
        type?: 'success' | 'error' | 'info' | 'warning';
    }
    const [customAlert, setCustomAlert] = useState<AlertConfig>({ visible: false, title: '', message: '' });

    const showAlert = (title: string, message: string, buttons?: AlertConfig['buttons'], type: AlertConfig['type'] = 'info') => {
        setCustomAlert({
            visible: true,
            title,
            message,
            buttons,
            type
        });
    };

    const closeAlert = () => {
        setCustomAlert(prev => ({ ...prev, visible: false }));
    };

    // Static plan definitions - will be matched with RevenueCat packages
    const planDefinitions: Omit<Plan, 'monthlyPackage' | 'yearlyPackage'>[] = [
        {
            id: 'explorer',
            name: 'Explorer',
            icon: Star,
            color: '#3b82f6',
            features: [
                t('plan_explorer_1'),
                t('plan_explorer_2'),
                t('plan_explorer_3'),
                t('plan_explorer_4'),
            ],
        },
        {
            id: 'warrior',
            name: 'Warrior',
            icon: Flame,
            color: '#f59e0b',
            features: [
                t('plan_warrior_1'),
                t('plan_warrior_2'),
                t('plan_warrior_3'),
                t('plan_warrior_4'),
            ],
            popular: true,
        },
        {
            id: 'phoenix',
            name: 'Phoenix',
            icon: Sparkles,
            color: '#ec4899',
            features: [
                t('plan_phoenix_1'),
                t('plan_phoenix_2'),
                t('plan_phoenix_3'),
                t('plan_phoenix_4'),
            ],
            best: true,
        },
    ];

    useEffect(() => {
        if (Platform.OS === 'web') {
            // Redirect to Stripe checkout page for web users
            router.replace('/subscribe');
            return;
        }
        loadOfferings();
    }, []);

    const [debugInfo, setDebugInfo] = useState<string>('');
    const [tapCount, setTapCount] = useState(0);

    const loadOfferings = async () => {
        try {
            setLoading(true);
            const offerings = await getOfferings();

            let debugLog = `RC Init: ${!!offerings}\n`;
            debugLog += `Status: ${initializationStatus}\n`;
            if (initializationError) debugLog += `Err: ${initializationError}\n`;

            if (offerings?.current) {
                const pkgs = offerings.current.availablePackages;
                debugLog += `Current Offering: ${offerings.current.identifier}\n`;
                debugLog += `Pkgs: ${pkgs.length}\n`;
                pkgs.forEach(p => {
                    debugLog += `- ${p.identifier} (${p.product.identifier})\n`;
                });
                setPackages(pkgs);
            } else {
                debugLog += 'NO CURRENT OFFERING\n';
            }

            // Credits Offering Logic
            if (offerings?.all?.['credits']) {
                const creditPkgs = offerings.all['credits'].availablePackages;
                debugLog += `Credits Offering Found: ${creditPkgs.length} pkgs\n`;
                creditPkgs.forEach(p => {
                    debugLog += `- ${p.identifier} (${p.product.identifier})\n`;
                });
                // Append credits to main packages list so helper functions can find them if needed,
                // or handle them separately. For now, appending to ensure they are 'known'.
                setPackages(prev => [...prev, ...creditPkgs]);
            } else {
                debugLog += 'NO CREDITS OFFERING\n';
                if (offerings?.all) {
                    debugLog += `All offerings: ${Object.keys(offerings.all).join(', ')}`;
                }
            }

            setDebugInfo(debugLog);
            console.log(debugLog);

        } catch (error: any) {
            console.error('Error loading offerings:', error);
            setDebugInfo(`Error: ${error.message}`);
            showAlert(t('alert_purchase_error_title'), t('alert_error_generic'), [{ text: 'OK' }], 'error');
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
        // Support both English and Spanish identifiers (e.g. 'yearly' OR 'anual', 'monthly' OR 'mensual')
        const suffixes = period === 'monthly' ? ['monthly', 'mensual'] : ['yearly', 'anual', 'annual'];

        return packages.find(pkg => {
            const id = pkg.identifier.toLowerCase();
            const matchesPlan = id.includes(planId.toLowerCase());
            const matchesSuffix = suffixes.some(s => id.includes(s));
            const isNotTrial = !id.includes('freetrial');

            return matchesPlan && matchesSuffix && isNotTrial;
        });
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
        // 1. Verify Authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.is_anonymous) {
            showAlert(
                `🔐 ${t('alert_account_required_title')}`,
                t('alert_account_required_msg'),
                [
                    { text: t('alert_cancel'), style: 'cancel' },
                    { text: t('alert_signin'), onPress: () => { closeAlert(); router.push('/auth'); } }
                ],
                'info'
            );
            return;
        }

        const isCredit = planId.includes('credits');
        let pkgToBuy: PurchasesPackage | undefined;

        // 2. Determine Package to Buy
        if (isCredit) {
            pkgToBuy = packages.find(p => p.identifier === planId);
        } else {
            // Subscription Logic
            // First check if user is downgrading or same tier
            let targetTier: SubscriptionTier = 'survivor';
            if (planId.includes('phoenix')) targetTier = 'phoenix';
            else if (planId.includes('warrior')) targetTier = 'warrior';
            else if (planId.includes('explorer')) targetTier = 'explorer';

            if (TIER_RANKS[tier] > TIER_RANKS[targetTier]) {
                showAlert(t('alert_active_subscription_title'), t('alert_downgrade_not_supported'));
                return;
            }
            if (TIER_RANKS[tier] === TIER_RANKS[targetTier] && !planId.includes('credits')) { // Extra safety check
                // If trying to buy same tier, maybe switching billing period? 
                // For now, let's warn.
                showAlert(
                    'Plan Activo',
                    `Ya tienes el plan ${targetTier.charAt(0).toUpperCase() + targetTier.slice(1)} activo.`,
                    [{ text: 'OK' }],
                    'info'
                );
                return;
            }

            // Try to find exact package first (e.g. warrior:anual)
            pkgToBuy = packages.find(p => p.identifier === planId);

            // Fallback: Use helper if planId is generic 'warrior'
            if (!pkgToBuy) {
                pkgToBuy = getPackageForPlan(planId, billingPeriod);
            }
        }

        if (!pkgToBuy) {
            showAlert(
                t('alert_plan_unavailable_title'),
                t('alert_plan_unavailable_msg') + ` (ID: ${planId})`,
                [{ text: 'OK' }],
                'warning'
            );
            return;
        }

        // 3. Execute Purchase
        try {
            setPurchasing(true);
            console.log('🛒 Purchasing:', pkgToBuy.identifier);

            const { success, error } = await purchasePackage(pkgToBuy);

            if (success) {
                showAlert(
                    `🎉 ${t('alert_purchase_success_title')}`,
                    t('alert_purchase_success_msg'),
                    [{ text: 'OK', onPress: () => { closeAlert(); router.back(); } }],
                    'success'
                );
            } else if (error !== 'cancelled') {
                throw new Error(error);
            }

        } catch (error: any) {
            console.error('Purchase error:', error);
            if (!error.userCancelled) {
                showAlert(t('alert_purchase_error_title'), error.message || t('alert_error_generic'), [{ text: 'OK' }], 'error');
            }
        } finally {
            setPurchasing(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#f59e0b" />
                <Text style={styles.loadingText}>{t('alert_loading_plans')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top']} style={styles.headerSafe}>


                <View style={styles.footer}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('paywall_title')}</Text>
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
                    <Text style={styles.heroTitle}>{t('paywall_hero_title')}</Text>
                    <Text style={styles.heroSubtitle}>{t('paywall_hero_subtitle')}</Text>
                </LinearGradient>

                {/* Billing Toggle */}
                <View style={styles.billingToggle}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, billingPeriod === 'monthly' && styles.toggleBtnActive]}
                        onPress={() => setBillingPeriod('monthly')}
                    >
                        <Text style={[styles.toggleText, billingPeriod === 'monthly' && styles.toggleTextActive]}>
                            {t('paywall_monthly')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, billingPeriod === 'yearly' && styles.toggleBtnActive]}
                        onPress={() => setBillingPeriod('yearly')}
                    >
                        <Text style={[styles.toggleText, billingPeriod === 'yearly' && styles.toggleTextActive]}>
                            {t('paywall_yearly')}
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
                                        <Text style={styles.popularBadgeText}>{t('paywall_popular')}</Text>
                                    </View>
                                )}
                                {plan.best && (
                                    <View style={[styles.popularBadge, { backgroundColor: '#ec4899' }]}>
                                        <Text style={styles.popularBadgeText}>🔥 {t('paywall_best_value')}</Text>
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
                                                🎁 {getTrialDuration(plan.id, billingPeriod).toUpperCase()} {t('paywall_free_trial')}
                                            </Text>
                                        </View>
                                    )}
                                    {hasFreeTrial(plan.id, billingPeriod) ? (
                                        <View>
                                            <Text style={[styles.planPrice, { color: plan.color }]}>
                                                {price}
                                            </Text>
                                            <Text style={styles.planPeriod}>
                                                {t('paywall_after_trial')}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                            <Text style={[styles.planPrice, { color: plan.color }]}>
                                                {price}
                                            </Text>
                                            <Text style={styles.planPeriod}>
                                                /{billingPeriod === 'yearly' ? t('paywall_year') : t('paywall_month')}
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
                                            {!hasPackage ? t('paywall_unavailable') :
                                                hasFreeTrial(plan.id, billingPeriod) ?
                                                    `${t('paywall_start_trial')} ${getTrialDuration(plan.id, billingPeriod)}` :
                                                    `${t('paywall_choose')} ${plan.name}`}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Credits Section (Moved to bottom) */}
                <View style={[styles.plansContainer, { marginTop: 24 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
                            {t('paywall_addons_title') === 'paywall_addons_title' ? 'Paquetes de Minutos' : t('paywall_addons_title')}
                        </Text>
                    </View>

                    {packages.filter(p => p.identifier.includes('credits')).map((pkg) => (
                        <TouchableOpacity
                            key={pkg.identifier}
                            style={[
                                styles.planCard,
                                {
                                    borderColor: '#8b5cf6', // Keep purple theme for credits
                                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                    marginTop: 12
                                }
                            ]}
                            onPress={() => handleSelectPlan(pkg.identifier)}
                            disabled={purchasing}
                        >
                            <View style={styles.planHeader}>
                                <View style={[styles.iconContainer, { backgroundColor: '#8b5cf6' }]}>
                                    <Sparkles size={24} color="#FFF" />
                                </View>
                                <View style={styles.planInfo}>
                                    <Text style={styles.planName}>{pkg.product.title}</Text>
                                    <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
                                </View>
                            </View>
                            <Text style={styles.planDescription}>{pkg.product.description}</Text>
                            <View style={[styles.selectButton, { backgroundColor: '#8b5cf6', marginTop: 12 }]}>
                                <Text style={styles.selectButtonText}>
                                    {purchasing ? '...' : (t('paywall_buy_now') === 'paywall_buy_now' ? 'Comprar Pack' : t('paywall_buy_now'))}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.disclaimer}>
                    {t('paywall_disclaimer')}
                </Text>
            </ScrollView>

            {/* Custom Alert Modal */}
            <Modal
                transparent
                visible={customAlert.visible}
                animationType="fade"
                onRequestClose={closeAlert}
            >
                <View style={styles.alertOverlay}>
                    <View style={styles.alertBox}>
                        <View style={[
                            styles.alertIconContainer,
                            customAlert.type === 'error' ? { backgroundColor: 'rgba(239, 68, 68, 0.1)' } :
                                customAlert.type === 'warning' ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } :
                                    customAlert.type === 'success' ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' } :
                                        { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                        ]}>
                            {customAlert.type === 'error' && <X size={32} color="#ef4444" />}
                            {customAlert.type === 'warning' && <LogOut size={32} color="#f59e0b" />}
                            {customAlert.type === 'success' && <Sparkles size={32} color="#22c55e" />}
                            {customAlert.type === 'info' && <HelpCircle size={32} color="#3b82f6" />}
                        </View>
                        <Text style={styles.alertTitle}>{customAlert.title}</Text>
                        <Text style={styles.alertMessage}>
                            {customAlert.message}
                        </Text>
                        <View style={styles.alertButtons}>
                            {!customAlert.buttons || customAlert.buttons.length === 0 ? (
                                <TouchableOpacity
                                    style={[styles.alertButton, styles.alertButtonPrimary]}
                                    onPress={closeAlert}
                                >
                                    <Text style={styles.alertButtonText}>OK</Text>
                                </TouchableOpacity>
                            ) : (
                                customAlert.buttons.map((btn, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            styles.alertButton,
                                            btn.style === 'cancel' ? styles.alertButtonCancel :
                                                btn.style === 'destructive' ? styles.alertButtonDestructive :
                                                    styles.alertButtonPrimary
                                        ]}
                                        onPress={() => {
                                            if (btn.onPress) btn.onPress();
                                            else closeAlert();
                                        }}
                                    >
                                        <Text style={[
                                            styles.alertButtonText,
                                            btn.style === 'destructive' && { color: '#ef4444' }
                                        ]}>{btn.text}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Hidden Debug View (Tap header title 5 times to toggle) */}
            <TouchableOpacity
                activeOpacity={1}
                onPress={() => setTapCount(p => p + 1)}
                style={{ position: 'absolute', bottom: 0, left: 0, width: 50, height: 50 }}
            />
            {tapCount > 4 && (
                <View style={{ padding: 20, backgroundColor: '#000', opacity: 0.8 }}>
                    <Text style={{ color: '#0f0', fontFamily: 'monospace', fontSize: 10 }}>{debugInfo}</Text>
                    <TouchableOpacity onPress={() => setTapCount(0)}><Text style={{ color: '#fff' }}>Close</Text></TouchableOpacity>
                </View>
            )}
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
    sectionHeader: {
        marginTop: 24,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.5,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    planInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    planDescription: {
        fontSize: 14,
        color: '#9ca3af',
        marginBottom: 16,
        lineHeight: 20,
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
    // Custom Alert Styles
    alertOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    alertBox: {
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    alertIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    alertTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    alertMessage: {
        color: '#9ca3af',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    alertButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    alertButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#333',
        alignItems: 'center',
    },
    alertButtonPrimary: {
        backgroundColor: '#3b82f6',
    },
    alertButtonCancel: {
        backgroundColor: '#333',
    },
    alertButtonDestructive: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    alertButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
});
