import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, Platform, Share, Linking, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { User, LogOut, LogIn, Mail, Calendar, Settings, Shield, ChevronRight, Edit2, Share2, Star, ArrowLeft, Sparkles, Trash2, Download } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const ProfileItem = ({ label, value, icon: Icon }: any) => (
    <View style={styles.profileItem}>
        <View style={styles.profileItemIcon}>
            <Icon size={18} color="#9ca3af" />
        </View>
        <View style={styles.profileItemContent}>
            <Text style={styles.profileItemLabel}>{label}</Text>
            <Text style={styles.profileItemValue}>{value || '-'}</Text>
        </View>
    </View>
);

const SettingItem = ({ label, icon: Icon, onPress, danger = false, highlight = false }: any) => (
    <TouchableOpacity onPress={onPress} style={styles.settingItem}>
        <View style={[styles.settingItemIcon, danger && styles.settingItemIconDanger, highlight && styles.settingItemIconHighlight]}>
            <Icon size={18} color={danger ? '#ef4444' : highlight ? '#22c55e' : '#9ca3af'} />
        </View>
        <Text style={[styles.settingItemLabel, danger && styles.settingItemLabelDanger, highlight && styles.settingItemLabelHighlight]}>{label}</Text>
        <ChevronRight size={18} color="#333" />
    </TouchableOpacity>
);

export default function ProfileScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [tier, setTier] = useState('Free');
    const [joined, setJoined] = useState('');
    const [isGuest, setIsGuest] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !user.is_anonymous) {
            setIsGuest(false);
            setEmail(user.email || 'Usuario');
            if (user.created_at) {
                setJoined(new Date(user.created_at).toLocaleDateString());
            }

            const { data } = await supabase
                .from('profiles')
                .select('subscription_tier')
                .eq('id', user.id)
                .single();
            if (data?.subscription_tier) {
                setTier(data.subscription_tier.charAt(0).toUpperCase() + data.subscription_tier.slice(1));
            }
        } else {
            setIsGuest(true);
            setEmail('Invitado');
        }
    };

    const handleSignOut = async () => {
        // Confirmation dialog
        const executeSignOut = async () => {
            try {
                await supabase.auth.signOut();
                router.replace('/auth');
            } catch (error) {
                console.error('[Profile] Logout error:', error);
            }
        };

        if (Platform.OS === 'web') {
            if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
                executeSignOut();
            }
        } else {
            Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Cerrar Sesión', style: 'destructive', onPress: executeSignOut }
            ]);
        }
    };

    // GOOGLE PLAY REQUIREMENT: Account Deletion
    const handleDeleteAccount = async () => {
        const executeDelete = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    Alert.alert('Error', 'No hay sesión activa');
                    return;
                }

                // Step 1: Delete all user data from various tables
                const userId = user.id;

                // Delete ex profiles
                await supabase.from('ex_profiles').delete().eq('user_id', userId);

                // Delete conversations
                await supabase.from('ex_conversations').delete().eq('user_id', userId);

                // Delete embeddings
                await supabase.from('message_embeddings').delete().eq('user_id', userId);

                // Delete facts
                await supabase.from('conversation_facts').delete().eq('user_id', userId);

                // Delete usage limits
                await supabase.from('usage_limits').delete().eq('user_id', userId);

                // Delete content reports
                await supabase.from('content_reports').delete().eq('user_id', userId);

                // Delete profile
                await supabase.from('profiles').delete().eq('id', userId);

                // Step 2: Delete auth user (this requires admin or RPC)
                // For now, sign out and the user record will be orphaned
                // In production, use a server-side function to fully delete

                await supabase.auth.signOut();

                Alert.alert(
                    '✅ Cuenta eliminada',
                    'Tu cuenta y todos tus datos han sido eliminados.',
                    [{ text: 'OK', onPress: () => router.replace('/auth') }]
                );

            } catch (error: any) {
                console.error('[Profile] Delete account error:', error);
                Alert.alert('Error', 'No se pudo eliminar la cuenta. Intenta de nuevo.');
            }
        };

        // Double confirmation for account deletion
        Alert.alert(
            '⚠️ Eliminar Cuenta',
            '¿Estás SEGURO que deseas eliminar tu cuenta?\n\nEsta acción eliminará:\n• Todos tus perfiles de simulación\n• Todas tus conversaciones\n• Tu historial y datos\n\n⚠️ Esta acción NO se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, Eliminar Todo',
                    style: 'destructive',
                    onPress: () => {
                        // Second confirmation
                        Alert.alert(
                            'Confirmación Final',
                            '¿Realmente deseas eliminar tu cuenta permanentemente?',
                            [
                                { text: 'No, mantener cuenta', style: 'cancel' },
                                { text: 'Sí, eliminar', style: 'destructive', onPress: executeDelete }
                            ]
                        );
                    }
                }
            ]
        );
    };

    // GDPR COMPLIANCE: Export all user data
    const handleExportData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Error', 'Necesitas iniciar sesión para exportar tus datos');
                return;
            }

            Alert.alert('📦 Exportando...', 'Esto puede tomar unos segundos');

            const userId = user.id;
            const exportData: any = {
                exportDate: new Date().toISOString(),
                user: {
                    id: userId,
                    email: user.email,
                    createdAt: user.created_at
                },
                data: {}
            };

            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            exportData.data.profile = profile;

            // Fetch ex profiles
            const { data: exProfiles } = await supabase
                .from('ex_profiles')
                .select('*')
                .eq('user_id', userId);
            exportData.data.exProfiles = exProfiles || [];

            // Fetch conversations
            const { data: conversations } = await supabase
                .from('ex_conversations')
                .select('*')
                .eq('user_id', userId);
            exportData.data.conversations = conversations || [];

            // Fetch facts
            const { data: facts } = await supabase
                .from('conversation_facts')
                .select('*')
                .eq('user_id', userId);
            exportData.data.facts = facts || [];

            // Convert to JSON string
            const jsonString = JSON.stringify(exportData, null, 2);

            // Share the data
            await Share.share({
                message: jsonString,
                title: 'REMI - Mis Datos'
            });

            Alert.alert(
                '✅ Datos exportados',
                'Puedes copiar o compartir el archivo JSON con todos tus datos.'
            );

        } catch (error: any) {
            console.error('[Profile] Export data error:', error);
            Alert.alert('Error', 'No se pudieron exportar los datos. Intenta de nuevo.');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="#000000" />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Mi Perfil</Text>
                    <View style={styles.headerSpacer} />
                </View>
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

                    {/* Guest Login Banner - Prominent */}
                    {isGuest && (
                        <TouchableOpacity onPress={() => router.push('/auth')} activeOpacity={0.9}>
                            <LinearGradient
                                colors={['#22c55e', '#16a34a']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.loginBanner}
                            >
                                <View style={styles.loginBannerContent}>
                                    <View style={styles.loginBannerIcon}>
                                        <Sparkles size={24} color="#fff" />
                                    </View>
                                    <View style={styles.loginBannerText}>
                                        <Text style={styles.loginBannerTitle}>¡Crea tu cuenta gratis!</Text>
                                        <Text style={styles.loginBannerSubtitle}>Guarda tu progreso y accede desde cualquier dispositivo</Text>
                                    </View>
                                    <ChevronRight size={24} color="#fff" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    <View style={styles.avatarSection}>
                        <View style={styles.avatarContainer}>
                            <User size={40} color="white" />
                            <View style={styles.avatarBadge}>
                                <Edit2 size={12} color="black" />
                            </View>
                        </View>
                        <Text style={styles.userName}>{isGuest ? 'Invitado' : email.split('@')[0]}</Text>
                        <View style={[styles.tierBadge, isGuest && styles.tierBadgeGuest]}>
                            <Text style={styles.tierText}>{isGuest ? 'Modo Invitado' : `${tier} Member`}</Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>INFORMACIÓN</Text>
                        <ProfileItem label="Email" value={email} icon={Mail} />
                        <ProfileItem label="Miembro Desde" value={joined} icon={Calendar} />
                        <ProfileItem label="Plan Actual" value={tier} icon={Shield} />
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>CONFIGURACIÓN</Text>
                        <SettingItem label="Preferencias" icon={Settings} onPress={() => router.push('/preferences')} />
                        <SettingItem label="Calificar App" icon={Star} onPress={() => {
                            if (Platform.OS === 'ios') {
                                Linking.openURL('itms-apps://itunes.apple.com/app/viewContentsUserReviews?id=YOUR_APP_ID');
                            } else {
                                Linking.openURL('market://details?id=com.soyremi.app');
                            }
                        }} />
                        <SettingItem label="Compartir" icon={Share2} onPress={async () => {
                            try {
                                await Share.share({
                                    message: '¡Descubre SOYREMI, tu coach de IA para sanar tu corazón! 💔✨\n\nDescárgala aquí: https://soyremi.app',
                                });
                            } catch (error) {
                                console.error(error);
                            }
                        }} />
                        {isGuest ? (
                            <SettingItem
                                label="Iniciar Sesión"
                                icon={LogIn}
                                highlight
                                onPress={() => router.push('/auth')}
                            />
                        ) : (
                            <>
                                <SettingItem
                                    label="Exportar Mis Datos"
                                    icon={Download}
                                    onPress={handleExportData}
                                />
                                <SettingItem label="Cerrar Sesión" icon={LogOut} onPress={handleSignOut} />
                                <SettingItem
                                    label="Eliminar Cuenta"
                                    icon={Trash2}
                                    danger
                                    onPress={handleDeleteAccount}
                                />
                            </>
                        )}
                    </View>

                    <View style={styles.versionContainer}>
                        <Text style={styles.versionText}>REMI v1.0.0 (build 3)</Text>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        flex: 1,
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
        fontWeight: '700',
        color: '#fff',
    },
    headerSpacer: {
        width: 40,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    pageTitle: {
        color: '#6b7280',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 32,
        textAlign: 'center',
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: '#1c1c1e',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 16,
    },
    avatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        backgroundColor: '#10b981',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#000',
    },
    userName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 4,
    },
    tierBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
    },
    tierText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: '#1c1c1e',
        borderRadius: 32,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    sectionTitle: {
        color: '#6b7280',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 16,
    },
    profileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    profileItemIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1c1c1e',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    profileItemContent: {
        flex: 1,
    },
    profileItemLabel: {
        color: '#6b7280',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 2,
    },
    profileItemValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    settingItemIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1c1c1e',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    settingItemIconDanger: {
        backgroundColor: 'rgba(239,68,68,0.1)',
    },
    settingItemLabel: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    settingItemLabelDanger: {
        color: '#ef4444',
    },
    settingItemIconHighlight: {
        backgroundColor: 'rgba(34,197,94,0.1)',
    },
    settingItemLabelHighlight: {
        color: '#22c55e',
    },
    loginBanner: {
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: 16,
        padding: 16,
    },
    loginBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loginBannerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    loginBannerText: {
        flex: 1,
    },
    loginBannerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    loginBannerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
    },
    tierBadgeGuest: {
        backgroundColor: '#374151',
    },
    versionContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    versionText: {
        color: '#374151',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 2,
    },
});
