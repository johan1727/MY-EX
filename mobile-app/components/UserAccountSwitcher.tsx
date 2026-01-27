import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { SessionManager, StoredSession } from '../lib/SessionManager';
import { Plus, Settings, LogOut } from 'lucide-react-native';
import { useTheme } from '../lib/ThemeContext';
import { useRouter } from 'expo-router';
import { useLanguage } from '../lib/i18n';

interface UserAccountSwitcherProps {
    onClose: () => void;
    onAddAccount: () => void;
    variant?: 'inline' | 'modal';
}

export default function UserAccountSwitcher({ onClose, onAddAccount, variant = 'modal' }: UserAccountSwitcherProps) {
    const { t } = useLanguage();
    const { isDark } = useTheme();
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [savedSessions, setSavedSessions] = useState<StoredSession[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            // Ensure current is saved
            if (user) await SessionManager.saveCurrentSession();

            const sessions = await SessionManager.getSavedSessions();
            setSavedSessions(sessions);
        } catch (error) {
            console.error('Error loading session data:', error);
        }
    };

    const handleSwitch = async (userId: string) => {
        if (userId === currentUser?.id) return;

        setLoading(true);
        const success = await SessionManager.switchToUser(userId);
        setLoading(false);

        if (success) {
            onClose();
            router.replace('/(tabs)');
        } else {
            Alert.alert('Error', 'No se pudo cambiar de cuenta. La sesión puede haber expirado.');
            await SessionManager.removeSession(userId);
            loadData();
        }
    };

    const handleSignOut = async () => {
        setLoading(true);
        try {
            await supabase.auth.signOut();
            if (currentUser?.id) {
                await SessionManager.removeSession(currentUser.id);
            }
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            setLoading(false);
            onClose();
            router.replace('/auth');
        }
    };

    // Filter sessions: Exclude current user from "Other accounts" list
    const otherSessions = savedSessions.filter(s => s.user_id !== currentUser?.id);

    return (
        <View style={[styles.container, isDark && { backgroundColor: '#1e1e1e', borderColor: '#333' }]}>

            {/* 1. Top Section: Current User Info & Manage Button */}
            <View style={styles.topSection}>
                {currentUser ? (
                    <>
                        <View style={styles.avatarLarge}>
                            {currentUser.user_metadata?.avatar_url ? (
                                <Image
                                    source={{ uri: currentUser.user_metadata.avatar_url }}
                                    style={{ width: 44, height: 44, borderRadius: 22 }}
                                />
                            ) : (
                                <Text style={styles.avatarTextLarge}>
                                    {(currentUser.email?.[0] || 'U').toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <Text style={[styles.nameLarge, isDark && { color: '#eee' }]}>
                            {t('welcome')}, {currentUser.user_metadata?.full_name?.split(' ')[0] || 'User'}!
                        </Text>
                        <Text style={[styles.emailLarge, isDark && { color: '#aaa' }]}>{currentUser.email}</Text>

                        <TouchableOpacity
                            style={[styles.manageBtn, isDark && { borderColor: '#555' }]}
                            onPress={() => { onClose(); router.push('/profile'); }}
                        >
                            <Text style={[styles.manageText, isDark && { color: '#eee' }]}>{t('drawer_my_profile')}</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                        <Text style={[styles.nameLarge, isDark && { color: '#eee' }]}>{t('drawer_guest')}</Text>
                        <TouchableOpacity
                            style={[styles.manageBtn, { marginTop: 12, backgroundColor: '#a855f7', borderWidth: 0 }]}
                            onPress={() => { onClose(); router.push('/auth'); }}
                        >
                            <Text style={[styles.manageText, { color: '#fff' }]}>{t('drawer_sign_in')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={[styles.divider, isDark && { backgroundColor: '#333' }]} />

            {/* 2. Switch Account Header */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={[styles.sectionTitle, isDark && { color: '#eee' }]}>
                    {t('drawer_switch_account')}
                </Text>
            </View>

            {/* 3. Account List */}
            <View style={styles.scrollArea}>
                {otherSessions.length > 0 ? (
                    <View style={styles.accountList}>
                        {otherSessions.map(session => (
                            <TouchableOpacity
                                key={session.user_id}
                                style={styles.accountRow}
                                onPress={() => handleSwitch(session.user_id)}
                                disabled={loading}
                            >
                                <View style={styles.avatarSmall}>
                                    {session.user_metadata?.avatar_url ? (
                                        <Image
                                            source={{ uri: session.user_metadata.avatar_url }}
                                            style={{ width: 32, height: 32, borderRadius: 16 }}
                                        />
                                    ) : (
                                        <Text style={styles.avatarTextSmall}>
                                            {(session.email?.[0] || 'U').toUpperCase()}
                                        </Text>
                                    )}
                                </View>
                                <View style={styles.accountInfo}>
                                    <Text style={[styles.nameSmall, isDark && { color: '#eee' }]}>
                                        {session.user_metadata?.full_name || session.email.split('@')[0]}
                                    </Text>
                                    <Text style={[styles.emailSmall, isDark && { color: '#aaa' }]} numberOfLines={1}>
                                        {session.email}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    // Empty State not needed, just shows nothing if no other accounts
                    null
                )}
            </View>

            {/* 4. Add Another Account */}
            <TouchableOpacity
                style={styles.actionRow}
                onPress={async () => {
                    await SessionManager.prepareAddAccount();
                    onAddAccount(); // This triggers parent to navigate to Auth
                }}
            >
                <View style={[styles.iconBox, { backgroundColor: 'transparent' }]}>
                    <Plus size={22} color={isDark ? '#aaa' : '#555'} />
                </View>
                <Text style={[styles.actionText, isDark && { color: '#eee' }]}>{t('drawer_add_account')}</Text>
            </TouchableOpacity>

            {/* 5. Manage Accounts */}
            <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                    Alert.alert(
                        'Administrar cuentas',
                        '¿Deseas cerrar sesión de la cuenta actual o eliminar cuentas guardadas?',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Cerrar Sesión Actual', onPress: handleSignOut, style: 'destructive' },
                        ]
                    );
                }}
            >
                <View style={[styles.iconBox, { backgroundColor: 'transparent' }]}>
                    <Settings size={20} color={isDark ? '#aaa' : '#555'} />
                </View>
                <Text style={[styles.actionText, isDark && { color: '#eee' }]}>Administrar cuentas en este dispositivo</Text>
            </TouchableOpacity>

            {/* Footer Links */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 12, marginTop: 4 }}>
                <TouchableOpacity onPress={() => router.push('/privacy')}>
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>{t('drawer_privacy')} • {t('terms_of_service')}</Text>
                </TouchableOpacity>
            </View>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#a855f7" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingVertical: 8,
    },
    topSection: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    avatarLarge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#e9d5ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    avatarTextLarge: {
        color: '#a855f7',
        fontSize: 20,
        fontWeight: 'bold',
    },
    nameLarge: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
        marginBottom: 2,
    },
    emailLarge: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12,
    },
    manageBtn: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 16,
    },
    manageText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#111',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#888',
        marginBottom: 8,
        marginLeft: 0
    },
    scrollArea: {
        maxHeight: 250,
    },
    accountList: {
        marginBottom: 8,
    },
    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    avatarSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e9d5ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    avatarTextSmall: {
        color: '#a855f7',
        fontSize: 16,
        fontWeight: '600',
    },
    accountInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    nameSmall: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111',
        marginBottom: 2,
    },
    emailSmall: {
        fontSize: 12,
        color: '#666',
    },
    divider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginVertical: 8,
        marginHorizontal: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 14,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
    },
});
