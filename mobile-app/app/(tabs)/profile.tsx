import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, Platform, Share, Linking, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { User, LogOut, Mail, Calendar, Settings, Shield, ChevronRight, Edit2, Share2, Star } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const ProfileItem = ({ label, value, icon: Icon }: any) => (
    <View style={styles.profileItem}>
        <View style={styles.profileItemIcon}>
            <Icon size={18} color="#9ca3af" />
        </View>
        <View style={styles.profileItemContent}>
            <Text style={styles.profileItemLabel}>{label}</Text>
            <Text style={styles.profileItemValue}>{value}</Text>
        </View>
    </View>
);

const SettingItem = ({ label, icon: Icon, onPress, danger = false }: any) => (
    <TouchableOpacity onPress={onPress} style={styles.settingItem}>
        <View style={[styles.settingItemIcon, danger && styles.settingItemIconDanger]}>
            <Icon size={18} color={danger ? '#ef4444' : '#9ca3af'} />
        </View>
        <Text style={[styles.settingItemLabel, danger && styles.settingItemLabelDanger]}>{label}</Text>
        <ChevronRight size={18} color="#333" />
    </TouchableOpacity>
);

export default function ProfileScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [tier, setTier] = useState('Free');
    const [joined, setJoined] = useState('');

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setEmail(user.email || 'Invitado');
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
        }
    };

    const handleSignOut = async () => {
        try {
            if (Platform.OS === 'web') {
                const confirmed = confirm('¿Estás seguro que deseas cerrar sesión?');
                if (confirmed) {
                    await supabase.auth.signOut();
                    router.replace('/auth');
                }
            } else {
                Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Salir',
                        style: 'destructive',
                        onPress: async () => {
                            await supabase.auth.signOut();
                            router.replace('/auth');
                        }
                    }
                ]);
            }
        } catch (error) {
            console.error('[Profile] Logout error:', error);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="#000000" />
            <SafeAreaView style={styles.safeArea}>
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

                    <Text style={styles.pageTitle}>MI PERFIL</Text>

                    <View style={styles.avatarSection}>
                        <View style={styles.avatarContainer}>
                            <User size={40} color="white" />
                            <View style={styles.avatarBadge}>
                                <Edit2 size={12} color="black" />
                            </View>
                        </View>
                        <Text style={styles.userName}>{email.split('@')[0]}</Text>
                        <View style={styles.tierBadge}>
                            <Text style={styles.tierText}>{tier} Member</Text>
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
                        <SettingItem label="Cerrar Sesión" icon={LogOut} danger onPress={handleSignOut} />
                    </View>

                    <View style={styles.versionContainer}>
                        <Text style={styles.versionText}>SOYREMI v1.0.0</Text>
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
    scrollView: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
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
