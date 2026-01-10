import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Lock, Sparkles, Zap, Crown } from 'lucide-react-native';


interface PremiumUpgradeModalProps {
    visible: boolean;
    onClose: () => void;
    onUpgrade: () => void;
    currentTier: string;
    limitType: 'profiles' | 'analysis' | 'messages';
    currentCount: number;
    maxAllowed: number;
}

export default function PremiumUpgradeModal({
    visible,
    onClose,
    onUpgrade,
    currentTier,
    limitType,
    currentCount,
    maxAllowed,
}: PremiumUpgradeModalProps) {
    const getLimitMessage = () => {
        switch (limitType) {
            case 'profiles':
                return `Has alcanzado el límite de ${maxAllowed} ${maxAllowed === 1 ? 'perfil' : 'perfiles'} en el plan gratuito`;
            case 'analysis':
                return `Has alcanzado el límite de ${maxAllowed} análisis este mes`;
            case 'messages':
                return `Has alcanzado el límite de ${maxAllowed} mensajes`;
            default:
                return 'Has alcanzado el límite de tu plan actual';
        }
    };

    const plans = [
        {
            name: 'EXPLORER',
            icon: Sparkles,
            color: '#06b6d4',
            price: '$4.99/mes',
            popular: false,
            benefits: [
                'Hasta 3 perfiles de ex',
                '150 análisis al mes',
                '100 mensajes por conversación',
                'Bóveda de secretos privada',
            ],
        },
        {
            name: 'WARRIOR',
            icon: Zap,
            color: '#3b82f6',
            price: '$9.99/mes',
            popular: true,
            benefits: [
                'Hasta 5 perfiles de ex',
                '200 análisis al mes',
                '500 mensajes por conversación',
                'Análisis diario de progreso',
            ],
        },
        {
            name: 'PHOENIX',
            icon: Crown,
            color: '#ec4899',
            price: '$24.99/mes',
            popular: false,
            benefits: [
                '10 perfiles de ex',
                '1000 análisis al mes',
                '2000 mensajes por conversación',
                'Soporte VIP prioritario 24/7',
            ],
        },
    ];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Header with gradient */}
                        <LinearGradient
                            colors={['#a855f7', '#ec4899']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.header}
                        >
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={onClose}
                            >
                                <X size={24} color="#fff" />
                            </TouchableOpacity>

                            <View style={styles.lockContainer}>
                                <Lock size={48} color="#fff" />
                            </View>

                            <Text style={styles.title}>
                                🚀 Desbloquea Todo tu Potencial
                            </Text>
                            <Text style={styles.subtitle}>
                                {getLimitMessage()}
                            </Text>
                        </LinearGradient>

                        {/* Plans */}
                        <View style={styles.plansContainer}>
                            <Text style={styles.plansTitle}>
                                Con Premium tendrás:
                            </Text>

                            {plans.map((plan, index) => {
                                const Icon = plan.icon;
                                return (
                                    <View
                                        key={index}
                                        style={[
                                            styles.planCard,
                                            plan.popular && styles.planCardPopular,
                                        ]}
                                    >
                                        {plan.popular && (
                                            <View style={styles.popularBadge}>
                                                <Text style={styles.popularText}>
                                                    MÁS POPULAR
                                                </Text>
                                            </View>
                                        )}

                                        <View style={styles.planHeader}>
                                            <View
                                                style={[
                                                    styles.planIconContainer,
                                                    { backgroundColor: `${plan.color}20` },
                                                ]}
                                            >
                                                <Icon size={24} color={plan.color} />
                                            </View>
                                            <View style={styles.planInfo}>
                                                <Text
                                                    style={[
                                                        styles.planName,
                                                        { color: plan.color },
                                                    ]}
                                                >
                                                    {plan.name}
                                                </Text>
                                                <Text style={styles.planPrice}>
                                                    {plan.price}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.benefitsList}>
                                            {plan.benefits.map((benefit, i) => (
                                                <View
                                                    key={i}
                                                    style={styles.benefitRow}
                                                >
                                                    <View
                                                        style={[
                                                            styles.checkmark,
                                                            {
                                                                backgroundColor: `${plan.color}30`,
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.checkmarkText,
                                                                { color: plan.color },
                                                            ]}
                                                        >
                                                            ✓
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.benefitText}>
                                                        {benefit}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        {/* CTA Buttons */}
                        <View style={styles.buttonsContainer}>
                            <TouchableOpacity
                                style={styles.upgradeButton}
                                onPress={onUpgrade}
                            >
                                <LinearGradient
                                    colors={['#a855f7', '#ec4899']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.upgradeGradient}
                                >
                                    <Text style={styles.upgradeButtonText}>
                                        Ver Planes Premium
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.laterButton}
                                onPress={onClose}
                            >
                                <Text style={styles.laterButtonText}>
                                    Tal vez luego
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({

    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    header: {
        padding: 24,
        paddingTop: 40,
        alignItems: 'center',
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    lockContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
    },
    plansContainer: {
        padding: 20,
    },
    plansTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
    },
    planCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },
    planCardPopular: {
        borderColor: '#f59e0b',
    },
    popularBadge: {
        position: 'absolute',
        top: -8,
        right: 16,
        backgroundColor: '#f59e0b',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    popularText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000',
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    planIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    planPrice: {
        fontSize: 14,
        color: '#9ca3af',
    },
    benefitsList: {
        gap: 8,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkmark: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    checkmarkText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    benefitText: {
        fontSize: 14,
        color: '#d1d5db',
        flex: 1,
    },
    buttonsContainer: {
        padding: 20,
        paddingTop: 0,
        gap: 12,
    },
    upgradeButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    upgradeGradient: {
        padding: 16,
        alignItems: 'center',
    },
    upgradeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    laterButton: {
        padding: 16,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#374151',
    },
    laterButtonText: {
        fontSize: 14,
        color: '#9ca3af',
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.9)', // Darker opaque background
        zIndex: 9999, // High z-index
    },
    modalContainer: {
        width: '90%',
        maxHeight: '85%',
        backgroundColor: '#121212', // Solid background
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
        elevation: 10, // Shadow for Android
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
});
