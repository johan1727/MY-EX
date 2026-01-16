import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Animated,
    Alert,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    X,
    Plus,
    MessageCircle,
    Sparkles,
    User,
    Crown,
    Settings,
    Lock,
    FileText,
    LogIn,
    LogOut,
    ChevronUp,
    ChevronDown,
    Eye,
    Trash2,
    HelpCircle,
} from 'lucide-react-native';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking } from 'react-native';
import { useSubscription } from '@/lib/SubscriptionContext';
import { SUBSCRIPTION_CONFIG, SubscriptionTier } from '../lib/subscriptions';

interface Profile {
    id: string;
    supabaseId?: string; // Added for Supabase profiles
    exName: string;
    lastMessage?: string;
    timestamp?: string;
}

interface ProfileDrawerProps {
    visible: boolean;
    onClose: () => void;
    currentProfileId?: string | null;
    onProfileDeleted?: () => void;
    onProfileSwitch?: (profile: Profile) => void;
}

export default function ProfileDrawer({
    visible,
    onClose,
    currentProfileId,
    onProfileDeleted,
    onProfileSwitch
}: ProfileDrawerProps) {
    const router = useRouter();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const { tier } = useSubscription();
    const isPremium = tier !== 'survivor';
    const [isGuest, setIsGuest] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [slideAnim] = useState(new Animated.Value(-300));
    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    // Custom Alert State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

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

    useEffect(() => {
        if (visible) {
            loadProfiles();
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                friction: 8,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: -300,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const loadProfiles = async () => {
        try {
            // Check auth status
            const { data: { user } } = await supabase.auth.getUser();
            setUserId(user?.id || null); // Set userId

            if (user) {
                setUserId(user.id);
                setUserEmail(user.email || null);
                // Load from Supabase
                const { data } = await supabase
                    .from('ex_profiles')
                    .select('id, ex_name, updated_at')
                    .eq('user_id', user.id)
                    .order('updated_at', { ascending: false })
                    .limit(10);

                if (data) {
                    setProfiles(data.map(p => ({
                        id: p.id, // Use Supabase ID as local ID for now
                        supabaseId: p.id, // Store Supabase ID separately
                        exName: p.ex_name,
                        timestamp: p.updated_at
                    })));
                }

                setIsGuest(false);
            } else {
                // Load from local storage (guest mode) - load ALL profiles
                const allProfilesJson = await storage.getItem('exSimulator_allProfiles');
                if (allProfilesJson) {
                    const allProfiles = JSON.parse(allProfilesJson);
                    console.log('[ProfileDrawer] Guest mode - loaded profiles:', allProfiles.length);
                    setProfiles(allProfiles.map((p: any) => ({
                        id: p.id || 'local',
                        exName: p.exName || 'Perfil Local',
                        timestamp: p.createdAt
                    })));
                } else {
                    // Fallback: try loading current profile only
                    const localProfile = await storage.getItem('exSimulator_currentProfile');
                    if (localProfile) {
                        const parsed = JSON.parse(localProfile);
                        setProfiles([{
                            id: parsed.id || 'local',
                            exName: parsed.exName || 'Perfil Local',
                            timestamp: parsed.createdAt
                        }]);
                    } else {
                        setProfiles([]);
                    }
                }
                setIsGuest(true);
                setUserId(null);
                setUserEmail(null);
            }
        } catch (error) {
            console.error('Error loading profiles:', error);
        }
    };


    const handleProfileSelect = async (profile: Profile) => {
        console.log('[ProfileDrawer] handleProfileSelect CLICKED:', profile.exName);
        try {
            // Clear cached analysis view to force reload of selected profile
            await storage.removeItem('analysis_view_profile');
            // ... (saving profile to storage) ...

            // In guest mode logic
            console.log('[ProfileDrawer] Saving to storage...');
            const allProfilesJson = await storage.getItem('exSimulator_allProfiles');
            if (allProfilesJson) {
                const allProfiles = JSON.parse(allProfilesJson);
                const fullProfile = allProfiles.find((p: any) => p.id === profile.id);
                if (fullProfile) {
                    await storage.setItem('exSimulator_currentProfile', JSON.stringify(fullProfile));
                } else {
                    await storage.setItem('exSimulator_currentProfile', JSON.stringify(profile));
                }
            } else {
                await storage.setItem('exSimulator_currentProfile', JSON.stringify(profile));
            }

            console.log('[ProfileDrawer] Calling onProfileSwitch:', !!onProfileSwitch);
            if (onProfileSwitch) {
                onProfileSwitch(profile);
            } else {
                // Force navigation to root triggers re-render
                router.dismissAll();
                setTimeout(() => {
                    router.replace('/');
                }, 100);
            }
            onClose();
        } catch (error) {
            console.error('[ProfileDrawer] Error selecting profile:', error);
        }
    };

    const handleNewSimulation = () => {
        console.log('[ProfileDrawer] handleNewSimulation CLICKED - Tier:', tier);
        try {
            // Safety check for tier and config
            if (!tier || !SUBSCRIPTION_CONFIG[tier as SubscriptionTier]) {
                console.error('[ProfileDrawer] Invalid tier or config missing for:', tier);
                Alert.alert('Error', 'Hubo un problema al verificar tu suscripción. Reintenta en un momento.');
                return;
            }

            // Enforce profile limits
            const limit = SUBSCRIPTION_CONFIG[tier as SubscriptionTier]?.limits?.simulatorAnalyses || 0;
            const currentCount = Array.isArray(profiles) ? profiles.length : 0;
            console.log('[ProfileDrawer] Check limit:', currentCount, '/', limit);

            // If unlimited (-1) or not reached limit, proceed
            if (limit === -1 || currentCount < limit) {
                console.log('[ProfileDrawer] Navigating to import...');
                onClose();
                // Direct navigation to test if timeout was issue, or keep timeout
                setTimeout(() => {
                    router.push('/tools/ex-simulator/import');
                }, 100);
                return;
            }

            // Limit reached
            console.log('[ProfileDrawer] Limit reached, showing alert');
            showAlert(
                'Límite de perfiles alcanzado',
                `Tu plan actual (${SUBSCRIPTION_CONFIG[tier as SubscriptionTier]?.name}) solo permite ${limit} perfil(es).\n\nMejora a Premium para crear perfiles ilimitados y desbloquear todo el potencial.`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Mejorar Plan',
                        style: 'default', // formatting logic above will now use Premium style for warning type
                        onPress: () => {
                            closeAlert();
                            onClose();
                            router.push('/paywall');
                        }
                    }
                ],
                'warning'
            );
        } catch (e) {
            console.error('[ProfileDrawer] Error in handleNewSimulation:', e);
        }
    };

    const handleCoachPress = () => {
        onClose();
        router.push('/coach');
    };

    const handleUpgradePress = () => {
        onClose();
        router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // Reset state
        setProfiles([]);
        onClose();
        router.replace('/auth');
    };

    const performDelete = async (profile: Profile) => {
        try {
            console.log('[Delete] Executing deletion for:', profile.id, profile.exName);

            // Delete from Supabase if user is logged in
            if (userId && profile.supabaseId) {
                const { error } = await supabase
                    .from('ex_profiles')
                    .delete()
                    .eq('id', profile.supabaseId)
                    .eq('user_id', userId);

                if (error) console.error('Error deleting from Supabase:', error);
            }

            // Delete from local storage list
            const allProfiles = await storage.getItem('exSimulator_allProfiles');
            if (allProfiles) {
                const parsed = JSON.parse(allProfiles);
                const updated = parsed.filter((p: Profile) => p.id !== profile.id);
                console.log('[Delete] Updating local storage with', updated.length, 'profiles');
                await storage.setItem('exSimulator_allProfiles', JSON.stringify(updated));
            }

            // Clear specific profile data and conversation
            await storage.removeItem(`exSimulator_conversation_${profile.id}`);
            if (profile.supabaseId) {
                await storage.removeItem(`exSimulator_conversation_${profile.supabaseId}`);
            }

            // FORCE DELETE for 'local' guest profile OR current profile
            if (profile.id === 'local' || currentProfileId === profile.id || (profile.supabaseId && currentProfileId === profile.supabaseId)) {
                console.log('[Delete] Clearing current profile stats');
                await storage.removeItem('exSimulator_currentProfile');
                await storage.removeItem('analysis_view_profile');
            }

            if (profile.id === 'local') {
                try {
                    await storage.removeItem('exSimulator_analyzeData');
                } catch (e) { }
            }

            // Reload profiles to update UI
            await loadProfiles();

            // Notify parent to clear state
            if (onProfileDeleted) {
                onProfileDeleted();
            }

            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
            }, 2500);

        } catch (error) {
            console.error('Error deleting profile:', error);
            showAlert('Error', 'No se pudo eliminar el perfil completamente. Intenta de nuevo.', [{ text: 'OK' }], 'error');
        }
    };

    const handleDeleteProfile = async (profile: Profile) => {
        setProfileToDelete(profile);
        setShowDeleteConfirm(true);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <Animated.View
                    style={[
                        styles.drawer,
                        { transform: [{ translateX: slideAnim }] }
                    ]}
                    onStartShouldSetResponder={() => true}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>REMI</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* New Simulation Button */}
                        <TouchableOpacity
                            style={styles.newSimButton}
                            onPress={handleNewSimulation}
                        >
                            <Plus size={20} color="#fff" />
                            <Text style={styles.newSimText}>Nueva simulación</Text>
                        </TouchableOpacity>

                        {/* Profiles List */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Tus perfiles</Text>
                            {profiles.length === 0 ? (
                                <Text style={styles.emptyText}>
                                    No hay perfiles aún. Crea uno nuevo arriba.
                                </Text>
                            ) : (
                                profiles.map(profile => (
                                    <View key={profile.id}>
                                        <TouchableOpacity
                                            style={[
                                                styles.profileItem,
                                                currentProfileId === profile.id && styles.profileItemActive
                                            ]}
                                            onPress={() => handleProfileSelect(profile)}
                                        >
                                            <MessageCircle size={20} color="#9ca3af" />
                                            <Text style={styles.profileName} numberOfLines={1}>{profile.exName}</Text>
                                            <Text style={styles.profileChatHint}>Chatear →</Text>
                                        </TouchableOpacity>

                                        {/* Action Buttons */}
                                        <View style={styles.profileActions}>
                                            {/* Analysis Button */}



                                            {/* Delete Button */}
                                            <TouchableOpacity
                                                style={styles.deleteBtn}
                                                onPress={() => handleDeleteProfile(profile)}
                                            >
                                                <Trash2 size={14} color="#ef4444" />
                                                <Text style={styles.deleteBtnText}>Eliminar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* Coach IA */}
                        <TouchableOpacity
                            style={styles.coachButton}
                            onPress={handleCoachPress}
                        >
                            <Sparkles size={18} color="#a855f7" style={{ marginRight: 8 }} />
                            <Text style={styles.coachText}>Coach IA</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Footer / Account Section (Legacy Style) */}
                    <View style={styles.footer}>
                        {/* Dropdown Menu (Appears above button) */}
                        {showUserMenu && (
                            <View style={styles.userMenuContent}>
                                {/* Settings inside Dropdown */}
                                <TouchableOpacity style={styles.userMenuItem} onPress={() => { onClose(); router.push('/profile'); }}>
                                    <User size={16} color="#9ca3af" />
                                    <Text style={styles.userMenuText}>Mi Perfil</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.userMenuItem} onPress={() => { onClose(); router.push('/preferences'); }}>
                                    <Settings size={16} color="#9ca3af" />
                                    <Text style={styles.userMenuText}>Preferencias</Text>
                                </TouchableOpacity>

                                {!isGuest && (
                                    <TouchableOpacity
                                        style={styles.userMenuItem}
                                        onPress={async () => {
                                            await handleLogout();
                                        }}
                                    >
                                        <LogIn size={16} color="#9ca3af" />
                                        <Text style={styles.userMenuText}>Cambiar cuenta</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity style={styles.userMenuItem} onPress={() => { onClose(); router.push('/legal/privacy'); }}>
                                    <Lock size={16} color="#9ca3af" />
                                    <Text style={styles.userMenuText}>Privacidad</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.userMenuItem} onPress={() => { onClose(); router.push('/legal/terms'); }}>
                                    <FileText size={16} color="#9ca3af" />
                                    <Text style={styles.userMenuText}>Términos</Text>
                                </TouchableOpacity>

                                <View style={styles.userMenuDivider} />

                                {!isPremium && (
                                    <>
                                        <TouchableOpacity
                                            style={styles.upgradeMenuItem}
                                            onPress={() => {
                                                onClose();
                                                router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall');
                                            }}
                                        >
                                            <Crown size={16} color="#f59e0b" />
                                            <Text style={styles.upgradeMenuText}>Ver Planes Premium</Text>
                                        </TouchableOpacity>
                                        <View style={styles.userMenuDivider} />
                                    </>
                                )}

                                {isGuest ? (
                                    <TouchableOpacity
                                        style={styles.userMenuItem}
                                        onPress={() => {
                                            onClose();
                                            router.push('/auth');
                                        }}
                                    >
                                        <LogIn size={16} color="#22c55e" />
                                        <Text style={[styles.userMenuText, { color: '#22c55e' }]}>Iniciar sesión</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.userMenuItem}
                                        onPress={handleLogout}
                                    >
                                        <LogOut size={16} color="#ef4444" />
                                        <Text style={[styles.userMenuText, { color: '#ef4444' }]}>Cerrar sesión</Text>
                                    </TouchableOpacity>
                                )}

                            </View>
                        )}

                        {/* Guest Banner */}
                        {isGuest && !showUserMenu && (
                            <View style={styles.guestBanner}>
                                <Text style={styles.guestBannerText}>
                                    Estás en modo invitado. Tus chats se guardan solo en este dispositivo.
                                </Text>
                            </View>
                        )}

                        {/* User Profile Button */}
                        <TouchableOpacity
                            style={styles.userBtn}
                            onPress={() => setShowUserMenu(!showUserMenu)}
                        >
                            <View style={[styles.userAvatar, isGuest && { backgroundColor: '#6b7280' }]}>
                                <User size={20} color="#fff" />
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName} numberOfLines={1}>
                                    {isGuest ? 'Invitado' : (userEmail || 'Mi cuenta')}
                                </Text>
                                <Text style={isGuest ? styles.userPlanFree : (isPremium ? styles.userPlan : styles.userPlanFree)}>
                                    {isGuest ? 'Plan Gratuito' : (isPremium ? 'Premium' : 'Plan Gratuito')}
                                </Text>
                            </View>
                            {showUserMenu ? (
                                <ChevronUp size={16} color="#9ca3af" />
                            ) : (
                                <ChevronDown size={16} color="#9ca3af" />
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </TouchableOpacity>

            {/* Custom Delete Confirmation Overlay */}
            {showDeleteConfirm && (
                <View style={[styles.alertOverlay, { zIndex: 9999, elevation: 5 }]}>
                    <View style={styles.alertBox}>
                        <View style={styles.alertIconContainer}>
                            <Trash2 size={32} color="#ef4444" />
                        </View>
                        <Text style={styles.alertTitle}>¿Eliminar perfil?</Text>
                        <Text style={styles.alertMessage}>
                            Estás a punto de eliminar a <Text style={{ fontWeight: 'bold', color: '#fff' }}>"{profileToDelete?.exName}"</Text>.
                            {"\n\n"}Esta acción borrará el análisis y todo el historial de conversación para siempre.
                        </Text>
                        <View style={styles.alertButtons}>
                            <TouchableOpacity
                                style={styles.alertButtonCancel}
                                onPress={() => setShowDeleteConfirm(false)}
                            >
                                <Text style={styles.alertButtonCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.alertButtonConfirm}
                                onPress={() => {
                                    setShowDeleteConfirm(false);
                                    if (profileToDelete) performDelete(profileToDelete);
                                }}
                            >
                                <Text style={styles.alertButtonConfirmText}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Custom Generic Alert Overlay (for Upsell) */}
            {customAlert.visible && (
                <View style={[styles.alertOverlay, { zIndex: 9999, elevation: 5 }]}>
                    <View style={styles.alertBox}>
                        <View style={[
                            styles.alertIconContainer,
                            customAlert.type === 'error' ? { backgroundColor: 'rgba(239, 68, 68, 0.1)' } :
                                customAlert.type === 'warning' ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } :
                                    customAlert.type === 'success' ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' } :
                                        { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                        ]}>
                            {customAlert.type === 'error' && <Trash2 size={32} color="#ef4444" />} {/* Fallback icon */}
                            {customAlert.type === 'warning' && <Crown size={32} color="#f59e0b" />}
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
                                    style={styles.alertButtonConfirm}
                                    onPress={closeAlert}
                                >
                                    <Text style={styles.alertButtonConfirmText}>OK</Text>
                                </TouchableOpacity>
                            ) : (
                                customAlert.buttons.map((btn, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            btn.style === 'cancel' ? styles.alertButtonCancel :
                                                btn.style === 'default' && customAlert.type === 'warning' ? styles.alertButtonPremium : // Use premium style for warning/upsell
                                                    styles.alertButtonConfirm,
                                            { flex: 1, marginHorizontal: 4 }
                                        ]}
                                        onPress={() => {
                                            if (btn.onPress) btn.onPress();
                                            else closeAlert();
                                        }}
                                    >
                                        <Text style={[
                                            btn.style === 'cancel' ? styles.alertButtonCancelText :
                                                btn.style === 'default' && customAlert.type === 'warning' ? styles.alertButtonPremiumText :
                                                    styles.alertButtonConfirmText
                                        ]}>{btn.text}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>
                </View>
            )}

            {/* Success Overlay */}
            {showSuccessModal && (
                <View style={[styles.alertOverlay, { zIndex: 9999, elevation: 5 }]}>
                    <View style={[styles.alertBox, { alignItems: 'center', paddingTop: 30, paddingBottom: 30 }]}>
                        <View style={[styles.alertIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                            <Sparkles size={32} color="#22c55e" />
                        </View>
                        <Text style={[styles.alertTitle, { marginTop: 16 }]}>¡Perfil Eliminado!</Text>
                        <Text style={[styles.alertMessage, { textAlign: 'center', marginTop: 8 }]}>
                            El perfil ha sido borrado correctamente.
                        </Text>
                    </View>
                </View>
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    drawer: {
        width: 320,
        height: '100%',
        backgroundColor: '#000000',
        borderRightWidth: 1,
        borderRightColor: '#333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    newSimButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 20,
    },
    newSimText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    emptyText: {
        color: '#6b7280',
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 20,
    },
    profileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 10,
        marginBottom: 2,
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#333',
    },
    profileItemActive: {
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderColor: 'rgba(168, 85, 247, 0.3)',
    },
    profileName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    coachButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.2)',
    },
    coachIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    coachText: {
        color: '#a855f7',
        fontSize: 14,
        fontWeight: '500',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        padding: 16,
    },
    accountSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(96, 165, 250, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    accountTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    accountPlan: {
        color: '#6b7280',
        fontSize: 12,
    },
    upgradeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fbbf24',
        borderRadius: 10,
        paddingVertical: 12,
        gap: 8,
    },
    upgradeText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '700',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 12,
        marginBottom: 4,
    },
    menuItemText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
    },
    // Legacy Account Styles
    userMenuContent: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    upgradeMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: 8,
        marginBottom: 4,
    },
    upgradeMenuText: {
        color: '#f59e0b',
        fontSize: 14,
        fontWeight: '600',
    },
    userMenuDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 4,
    },
    userMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    userMenuText: {
        color: '#e5e7eb',
        fontSize: 14,
        fontWeight: '500',
    },
    guestBanner: {
        padding: 12,
        marginBottom: 12,
        backgroundColor: '#1A1A1A',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    guestBannerText: {
        color: '#9ca3af',
        fontSize: 12,
        textAlign: 'center',
    },
    userBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    userPlan: {
        color: '#f59e0b',
        fontSize: 12,
        marginTop: 2,
    },
    userPlanFree: {
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 2,
    },
    // New Analysis Button Style
    profileActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        marginLeft: 26, // Indent to align with profile name slightly or tree structure
    },
    analysisBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.2)',
        flex: 1,
    },
    analysisBtnText: {
        fontSize: 11,
        color: '#a855f7',
        marginLeft: 4,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    deleteBtnText: {
        fontSize: 11,
        color: '#ef4444',
        marginLeft: 4,
    },
    profileChatHint: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
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
    },
    alertButtonCancelText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    alertButtonConfirm: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: '#ef4444',
        alignItems: 'center',
    },
    alertButtonConfirmText: {
        color: '#ef4444',
        fontWeight: '600',
        fontSize: 15,
    },
    alertButtonPremium: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#f59e0b',
        alignItems: 'center',
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    alertButtonPremiumText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 15,
    },
});
