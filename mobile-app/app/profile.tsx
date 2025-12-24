import React from 'react';
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
import { ArrowLeft, User, Crown, Trash2, LogOut } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
    const router = useRouter();
    const [showPlans, setShowPlans] = React.useState(false);

    const plans = [
        {
            id: 'free',
            name: 'Gratuito',
            price: '$0',
            current: true,
            features: ['1 perfil', '10 mensajes/día', 'Análisis básico']
        },
        {
            id: 'monthly',
            name: 'Premium Mensual',
            price: '$9.99/mes',
            current: false,
            features: ['Perfiles ilimitados', 'Chat ilimitado', 'Memoria IA']
        },
        {
            id: 'yearly',
            name: 'Premium Anual',
            price: '$99.99/año',
            current: false,
            badge: 'AHORRA 50%',
            features: ['Todo de mensual', 'Updates exclusivas', 'Prioridad soporte']
        },
    ];

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Mi Perfil</Text>
                    <View style={styles.headerSpacer} />
                </View>
            </SafeAreaView>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <LinearGradient
                        colors={['#a855f7', '#6366f1']}
                        style={styles.avatar}
                    >
                        <User size={40} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.userName}>Usuario REMI</Text>
                    <TouchableOpacity
                        style={styles.planBadge}
                        onPress={() => setShowPlans(!showPlans)}
                    >
                        <Text style={styles.planBadgeText}>Plan Gratuito</Text>
                        <Text style={styles.planBadgeIcon}>{showPlans ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Plans Dropdown */}
                {showPlans && (
                    <View style={styles.plansContainer}>
                        <Text style={styles.plansTitle}>Planes Disponibles</Text>
                        {plans.map((plan) => (
                            <TouchableOpacity
                                key={plan.id}
                                style={[
                                    styles.planCard,
                                    plan.current && styles.planCardCurrent,
                                    plan.id === 'yearly' && styles.planCardPopular,
                                ]}
                                onPress={() => !plan.current && router.push('/premium')}
                            >
                                <View style={styles.planHeader}>
                                    <View>
                                        <Text style={styles.planName}>{plan.name}</Text>
                                        <Text style={styles.planPrice}>{plan.price}</Text>
                                    </View>
                                    {plan.badge && (
                                        <View style={styles.planBadgeTag}>
                                            <Text style={styles.planBadgeTagText}>{plan.badge}</Text>
                                        </View>
                                    )}
                                    {plan.current && (
                                        <View style={styles.currentTag}>
                                            <Text style={styles.currentTagText}>ACTUAL</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.planFeatures}>
                                    {plan.features.map((f, i) => (
                                        <Text key={i} style={styles.featureText}>✓ {f}</Text>
                                    ))}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Upgrade CTA */}
                <TouchableOpacity
                    style={styles.upgradeCard}
                    onPress={() => router.push('/premium')}
                >
                    <Crown size={24} color="#f59e0b" />
                    <View style={styles.upgradeContent}>
                        <Text style={styles.upgradeTitle}>Actualizar Plan</Text>
                        <Text style={styles.upgradeDesc}>Desbloquea todas las funciones de REMI</Text>
                    </View>
                </TouchableOpacity>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>1</Text>
                        <Text style={styles.statLabel}>Perfil</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Chats</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>∞</Text>
                        <Text style={styles.statLabel}>Días</Text>
                    </View>
                </View>

                {/* Danger Zone */}
                <View style={styles.dangerSection}>
                    <Text style={styles.dangerTitle}>Zona de Peligro</Text>
                    <TouchableOpacity style={styles.dangerButton}>
                        <Trash2 size={20} color="#ef4444" />
                        <Text style={styles.dangerButtonText}>Eliminar todos mis datos</Text>
                    </TouchableOpacity>
                </View>
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
        padding: 20,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    userName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
    },
    userPlan: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    upgradeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        gap: 12,
    },
    upgradeContent: {
        flex: 1,
    },
    upgradeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f59e0b',
    },
    upgradeDesc: {
        fontSize: 13,
        color: '#9ca3af',
        marginTop: 2,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    dangerSection: {
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginTop: 24,
    },
    dangerTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ef4444',
        letterSpacing: 1,
        marginBottom: 12,
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
    },
    dangerButtonText: {
        fontSize: 15,
        color: '#ef4444',
    },
    planBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 8,
        gap: 6,
    },
    planBadgeText: {
        fontSize: 13,
        color: '#a855f7',
        fontWeight: '600',
    },
    planBadgeIcon: {
        fontSize: 10,
        color: '#a855f7',
    },
    plansContainer: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    plansTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#9ca3af',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    planCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    planCardCurrent: {
        borderColor: 'rgba(168, 85, 247, 0.5)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
    },
    planCardPopular: {
        borderColor: 'rgba(245, 158, 11, 0.5)',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    planName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    planPrice: {
        fontSize: 13,
        color: '#a855f7',
        marginTop: 2,
    },
    planBadgeTag: {
        backgroundColor: '#f59e0b',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    planBadgeTagText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#000',
    },
    currentTag: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    currentTagText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#000',
    },
    planFeatures: {
        gap: 4,
    },
    featureText: {
        fontSize: 12,
        color: '#9ca3af',
    },
});
