import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, Platform, Share, Linking, StyleSheet, Modal, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../lib/SubscriptionContext';
import { SUBSCRIPTION_CONFIG, SubscriptionTier } from '../lib/subscriptions';
import { User, LogOut, LogIn, Mail, Calendar, Settings, Shield, ChevronRight, Edit2, Share2, Star, ArrowLeft, Sparkles, Trash2, Download, HelpCircle, X, Zap, Crown, Heart } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../lib/ThemeContext';

const SettingItem = ({ label, icon: Icon, onPress, danger = false, highlight = false, badge, isDark }: any) => (
    <TouchableOpacity
        onPress={onPress}
        style={[
            styles.settingItem,
            !isDark && { borderBottomColor: '#e5e7eb' }
        ]}
    >
        <View style={[
            styles.settingItemIcon,
            danger && styles.settingItemIconDanger,
            highlight && styles.settingItemIconHighlight,
            !isDark && { backgroundColor: '#f3f4f6' },
            !isDark && danger && { backgroundColor: '#fee2e2' },
            !isDark && highlight && { backgroundColor: '#dcfce7' }
        ]}>
            <Icon size={20} color={danger ? '#ef4444' : highlight ? '#22c55e' : (isDark ? '#fff' : '#4b5563')} />
        </View>
        <Text style={[
            styles.settingItemLabel,
            danger && styles.settingItemLabelDanger,
            highlight && styles.settingItemLabelHighlight,
            !isDark && { color: '#1f2937' },
            !isDark && danger && { color: '#ef4444' }
        ]}>{label}</Text>
        {badge && <View style={styles.settingBadge}><Text style={styles.settingBadgeText}>{badge}</Text></View>}
        <ChevronRight size={18} color={isDark ? "#525252" : "#d1d5db"} />
    </TouchableOpacity>
);

export default function ProfileScreen() {
    const router = useRouter();
    const { isDark } = useTheme(); // Use Theme
    const [email, setEmail] = useState('');
    const [joined, setJoined] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isGuest, setIsGuest] = useState(true);
    const { tier, isLoading } = useSubscription(); // Use context for tier
    const isPremium = tier !== SubscriptionTier.SURVIVOR;
    // Badge State
    const [badgeModalVisible, setBadgeModalVisible] = useState(false);
    const badges = [
        { id: '1', name: 'Primeros Pasos', icon: '🚀', description: 'Creaste tu cuenta en REMI.', unlocked: true },
        { id: '2', name: 'Analista', icon: '🔍', description: 'Completaste tu primer análisis.', unlocked: true },
        { id: '3', name: 'Curioso', icon: '💡', description: 'Enviaste 50 mensajes a tu coach.', unlocked: isPremium },
        { id: '4', name: 'Premium Club', icon: '👑', description: 'Te uniste a la élite de REMI.', unlocked: isPremium },
        { id: '5', name: 'Maestro del Zen', icon: '🧘', description: 'Usaste el Diario Emocional 7 días seguidos.', unlocked: false },
    ];

    const currentPlanConfig = SUBSCRIPTION_CONFIG[tier as SubscriptionTier] || SUBSCRIPTION_CONFIG[SubscriptionTier.SURVIVOR];

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
        setCustomAlert({ visible: true, title, message, buttons, type });
    };

    const closeAlert = () => {
        setCustomAlert(prev => ({ ...prev, visible: false }));
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !user.is_anonymous) {
            setIsGuest(false);
            setEmail(user.email || 'Usuario');
            if (user.user_metadata?.avatar_url) {
                setAvatarUrl(user.user_metadata.avatar_url);
            }
            if (user.created_at) {
                setJoined(new Date(user.created_at).toLocaleDateString());
            }
        } else {
            setIsGuest(true);
            setEmail('Invitado');
            setAvatarUrl(null);
        }
    };

    const handleSignOut = async () => {
        const executeSignOut = async () => {
            try {
                await supabase.auth.signOut();
                router.replace('/auth');
            } catch (error) {
                console.error('[Profile] Logout error:', error);
            }
        };

        if (Platform.OS === 'web') {
            if (confirm('¿Estás seguro que deseas cerrar sesión?')) executeSignOut();
        } else {
            showAlert('Cerrar Sesión', '¿Estás seguro?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Cerrar Sesión', style: 'destructive', onPress: () => { closeAlert(); executeSignOut(); } }
            ], 'warning');
        }
    };

    const handleDeleteAccount = async () => {
        const executeDelete = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const userId = user.id;

                await supabase.from('ex_profiles').delete().eq('user_id', userId);
                await supabase.from('ex_conversations').delete().eq('user_id', userId);
                await supabase.from('profiles').delete().eq('id', userId);
                await supabase.auth.signOut();

                showAlert('✅ Cuenta eliminada', 'Tu cuenta ha sido eliminada.', [{ text: 'OK', onPress: () => { closeAlert(); router.replace('/auth'); } }], 'success');
            } catch (error) {
                console.error(error);
                showAlert('Error', 'Error al eliminar cuenta.', [{ text: 'OK' }], 'error');
            }
        };

        showAlert('⚠️ Eliminar Cuenta', 'Esta acción es irreversible. ¿Eliminar todo?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sí, Eliminar', style: 'destructive', onPress: () => { closeAlert(); executeDelete(); } }
        ], 'warning');
    };

    const handleExportData = async () => {
        showAlert('📦 Exportando...', 'Generando archivo de respaldo...', [], 'info');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            const exportData = {
                user: {
                    email: user.email,
                    id: user.id,
                    metadata: user.user_metadata,
                    tier: tier
                },
                exportedAt: new Date().toISOString(),
                appVersion: "1.0.3"
            };

            const jsonString = JSON.stringify(exportData, null, 2);

            if (Platform.OS === 'web') {
                // Create element with <a> tag
                const link = document.createElement("a");
                const file = new Blob([jsonString], { type: 'application/json' });
                link.href = URL.createObjectURL(file);
                link.download = `remi-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                closeAlert();
                showAlert('✅ Descarga lista', 'El archivo se ha descargado en tu navegador.', [{ text: 'OK', onPress: closeAlert }], 'success');
            } else {
                const result = await Share.share({
                    message: jsonString,
                    title: `REMI Export ${new Date().toLocaleDateString()}`
                });
                if (result.action === Share.sharedAction) {
                    closeAlert();
                }
            }
        } catch (error) {
            console.error(error);
            showAlert('Error', 'No se pudo exportar los datos.', [{ text: 'OK' }], 'error');
        }
    };

    return (
        <View style={[styles.container, !isDark && { backgroundColor: '#ffffff' }]}>
            <StatusBar style={isDark ? "light" : "dark"} backgroundColor={isDark ? "#000000" : "#ffffff"} />
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/(tabs)');
                            }
                        }}
                        style={styles.iconButton}
                    >
                        <ArrowLeft size={24} color={isDark ? "#fff" : "#111"} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, !isDark && { color: '#111' }]}>Perfil</Text>
                    <TouchableOpacity onPress={() => router.push('/preferences')} style={styles.iconButton}>
                        <Settings size={24} color={isDark ? "#fff" : "#111"} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

                    {/* Avatar Selection */}
                    <View style={styles.heroSection}>
                        <View style={styles.avatarWrapper}>
                            <LinearGradient
                                colors={['#a855f7', '#ec4899']}
                                style={styles.avatarGradient}
                            >
                                <View style={styles.avatarContainer}>
                                    {avatarUrl ? (
                                        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                                    ) : (
                                        <User size={48} color="#fff" />
                                    )}
                                </View>
                            </LinearGradient>
                            <View style={styles.percentageBadge}>
                                <Text style={styles.percentageText}>100%</Text>
                            </View>
                        </View>
                        <Text style={[styles.userName, !isDark && { color: '#000' }]}>{isGuest ? 'Invitado' : email.split('@')[0]}</Text>

                        <TouchableOpacity style={[styles.chatStatusButton, !isDark && { backgroundColor: '#f3f4f6' }]} disabled>
                            <View style={[styles.chatStatusDot, { backgroundColor: isPremium ? '#22c55e' : '#9ca3af' }]} />
                            <Text style={[styles.chatStatusText, !isDark && { color: '#374151' }]}>{isPremium ? `Prem: ${tier}` : 'Gratuito'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Premium / Upgrade Card */}
                    <View style={styles.premiumSection}>
                        <LinearGradient
                            colors={isPremium ? ['#1e1e1e', '#1e1e1e'] : ['#7c3aed', '#db2777']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.premiumCard}
                        >
                            <View style={styles.premiumContent}>
                                <View style={styles.premiumHeader}>
                                    <View>
                                        <Text style={styles.premiumTitle}>
                                            {isPremium ? 'Eres Premium' : 'REMI Premium'}
                                        </Text>
                                        <Text style={styles.premiumSubtitle}>
                                            {isPremium
                                                ? `Plan ${SUBSCRIPTION_CONFIG[tier]?.name || tier} activo con funciones premium.`
                                                : 'Desbloquea análisis ilimitados y coaching avanzado con IA.'
                                            }
                                        </Text>
                                    </View>
                                    <View style={styles.premiumIconContainer}>
                                        <Crown size={24} color="#fff" fill={isPremium ? "#fbbf24" : "none"} />
                                    </View>
                                </View>

                                {!isPremium && (
                                    <TouchableOpacity
                                        style={styles.upgradeButton}
                                        onPress={() => router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall')}
                                    >
                                        <Text style={styles.upgradeButtonText}>Mejorar Plan</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Menu Options */}
                    <View style={styles.menuContainer}>
                        <SettingItem label="Preferencias" icon={Settings} onPress={() => router.push('/preferences')} />
                        <SettingItem label="Ayuda y Soporte" icon={HelpCircle} onPress={() => Linking.openURL('mailto:support@soyremi.app')} />
                        <SettingItem label="Insignias" icon={Star} badge="Nuevo" onPress={() => setBadgeModalVisible(true)} />

                        <View style={styles.menuSpacer} />

                        {isGuest ? (
                            <SettingItem label="Iniciar Sesión" icon={LogIn} highlight onPress={() => router.push('/auth')} />
                        ) : (
                            <>
                                <SettingItem label="Exportar Datos" icon={Download} onPress={handleExportData} />
                                <SettingItem label="Cerrar Sesión" icon={LogOut} danger onPress={handleSignOut} />
                                <SettingItem label="Eliminar Cuenta" icon={Trash2} danger onPress={handleDeleteAccount} />
                            </>
                        )}
                    </View>

                    <Text style={styles.versionText}>v1.0.3 (build 17)</Text>
                    <View style={{ height: 40 }} />

                </ScrollView>
            </SafeAreaView>

            {/* Badge Modal */}
            <Modal
                transparent
                visible={badgeModalVisible}
                animationType="slide"
                onRequestClose={() => setBadgeModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Tus Insignias</Text>
                            <TouchableOpacity onPress={() => setBadgeModalVisible(false)}>
                                <X size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {badges.map((badge) => (
                                <View key={badge.id} style={[styles.badgeItem, !badge.unlocked && { opacity: 0.5 }]}>
                                    <View style={styles.badgeIconBg}>
                                        <Text style={{ fontSize: 24 }}>{badge.icon}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.badgeName}>{badge.name}</Text>
                                        <Text style={styles.badgeDesc}>{badge.description}</Text>
                                    </View>
                                    {badge.unlocked ? <View style={styles.badgeUnlocked}><Sparkles size={16} color="#000" /></View> : <View style={styles.badgeLocked}><Shield size={16} color="#666" /></View>}
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

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
                        <Text style={styles.alertMessage}>{customAlert.message}</Text>
                        <View style={styles.alertButtons}>
                            {!customAlert.buttons || customAlert.buttons.length === 0 ? (
                                <TouchableOpacity style={styles.alertButton} onPress={closeAlert}>
                                    <Text style={styles.alertButtonText}>OK</Text>
                                </TouchableOpacity>
                            ) : (
                                customAlert.buttons.map((btn, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.alertButton, btn.style === 'destructive' && styles.alertButtonDestructive]}
                                        onPress={() => { if (btn.onPress) btn.onPress(); else closeAlert(); }}
                                    >
                                        <Text style={[styles.alertButtonText, btn.style === 'destructive' && { color: '#ef4444' }]}>{btn.text}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0c',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    iconButton: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    heroSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
    },
    avatarContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
        backgroundColor: '#0a0a0c',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#0a0a0c',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    percentageBadge: {
        position: 'absolute',
        bottom: 0,
        alignSelf: 'center',
        backgroundColor: '#7c3aed',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 2,
        borderColor: '#000',
    },
    percentageText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    userName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    chatStatusButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    chatStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    chatStatusText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    premiumSection: {
        marginHorizontal: 16,
        marginBottom: 24,
        // Removed external shadow/border effect that looked ugly
    },
    premiumCard: {
        borderRadius: 24,
        padding: 24,
        // Self-contained shadow
        shadowColor: '#a855f7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    premiumContent: {
        width: '100%',
    },
    premiumHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    premiumIconContainer: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    premiumTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    premiumSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        maxWidth: 220,
        lineHeight: 20,
    },
    upgradeButton: {
        backgroundColor: '#fff',
        borderRadius: 30,
        paddingVertical: 14,
        alignItems: 'center',
    },
    upgradeButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    menuContainer: {
        marginHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    menuSpacer: {
        height: 24,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        marginVertical: 2,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    settingItemIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    settingItemIconDanger: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    settingItemIconHighlight: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
    },
    settingItemLabel: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    settingItemLabelDanger: {
        color: '#ef4444',
    },
    settingItemLabelHighlight: {
        color: '#22c55e',
    },
    settingBadge: {
        backgroundColor: '#a855f7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginRight: 8,
    },
    settingBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    versionText: {
        textAlign: 'center',
        color: '#404040',
        fontSize: 12,
        marginTop: 32,
    },
    // Alert Styles
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
        maxWidth: 320,
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'center',
    },
    alertIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    alertTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    alertMessage: {
        color: '#a3a3a3',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    alertButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    alertButton: {
        flex: 1,
        backgroundColor: '#333',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    alertButtonDestructive: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    alertButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end', // Bottom sheet style
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        minHeight: 400
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff'
    },
    badgeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: '#262626',
        padding: 12,
        borderRadius: 12
    },
    badgeIconBg: {
        width: 48,
        height: 48,
        backgroundColor: '#333',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16
    },
    badgeName: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    badgeDesc: {
        color: '#aaa',
        fontSize: 13
    },
    badgeUnlocked: {
        backgroundColor: '#fbbf24',
        padding: 4,
        borderRadius: 12
    },
    badgeLocked: {
        backgroundColor: '#333',
        padding: 4,
        borderRadius: 12
    }
});
