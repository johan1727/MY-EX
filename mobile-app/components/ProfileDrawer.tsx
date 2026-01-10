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
    RefreshCw,
    Trash2,
    HelpCircle,
} from 'lucide-react-native';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking } from 'react-native';
import { useSubscription } from '@/lib/SubscriptionContext';
import { SUBSCRIPTION_CONFIG, SubscriptionTier } from '../lib/subscriptions';
import PremiumUpgradeModal from './PremiumUpgradeModal';


// Dynamic import for Google Sign-In
let GoogleSignin: any = null;
try {
    if (Platform.OS !== 'web') {
        GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    }
} catch (e) {
    console.log('[ProfileDrawer] GoogleSignin not available');
}

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
    onProfileSwitch?: () => void; // Callback to trigger reload in parent
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
    const { tier, checkSubscriptionStatus } = useSubscription();
    const isPremium = tier !== 'survivor';
    const [isGuest, setIsGuest] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [slideAnim] = useState(new Animated.Value(-300));
    const [userId, setUserId] = useState<string | null>(null); // Added userId state
    // Custom Alert State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Premium Modal State
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [premiumLimitMessage, setPremiumLimitMessage] = useState('');


    useEffect(() => {
        if (visible) {
            checkSubscriptionStatus(); // Force sync with Supabase/RevenueCat
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
            }
        } catch (error) {
            console.error('Error loading profiles:', error);
        }
    };


    const handleProfileSelect = async (profile: Profile) => {
        try {
            // Clear cached analysis view to force reload of selected profile
            await storage.removeItem('analysis_view_profile');

            let fullProfileData = null;

            // 1. Try to fetch from Supabase if we have a valid ID
            if (profile.supabaseId || (profile.id && profile.id.length > 30)) {
                try {
                    const { data, error } = await supabase
                        .from('ex_profiles')
                        .select('profile_data')
                        .eq('id', profile.supabaseId || profile.id)
                        .single();

                    if (data && data.profile_data) {
                        console.log('[ProfileDrawer] fetched full profile for chat:', profile.exName);
                        fullProfileData = {
                            ...data.profile_data,
                            id: profile.id,
                            supabaseId: profile.supabaseId || profile.id
                        };
                    }
                } catch (err) {
                    console.error('[ProfileDrawer] Supabase fetch error:', err);
                }
            }

            // 2. Fallback to Local Storage (exSimulator_allProfiles)
            if (!fullProfileData) {
                const allProfilesJson = await storage.getItem('exSimulator_allProfiles');
                if (allProfilesJson) {
                    const allProfiles = JSON.parse(allProfilesJson);
                    const fullProfile = allProfiles.find((p: any) => p.id === profile.id);
                    if (fullProfile) {
                        console.log('[ProfileDrawer] Loading full profile from storage:', fullProfile.id);
                        fullProfileData = fullProfile;
                    }
                }
            }

            // 3. Last fallback
            if (!fullProfileData) {
                console.warn('[ProfileDrawer] Full profile not found for chat, using minimal');
                fullProfileData = profile;
            }

            await storage.setItem('exSimulator_currentProfile', JSON.stringify(fullProfileData));

            onClose();
            // Trigger parent reload if callback provided
            if (onProfileSwitch) {
                onProfileSwitch();
            } else {
                router.replace('/(tabs)');
            }
        } catch (error) {
            console.error('[ProfileDrawer] Error selecting profile:', error);
        }
    };




    const handleNewSimulation = async () => {
        // Enforce profile limits
        const limit = SUBSCRIPTION_CONFIG[tier as SubscriptionTier]?.limits?.simulatorAnalyses || 1;

        // If unlimited (-1) or not reached limit, proceed
        if (limit === -1 || profiles.length < limit) {
            // Clear previous state to avoid confusion
            await storage.removeItem('exSimulator_analyzeData');
            await storage.removeItem('analysis_view_profile');
            onClose();
            router.push('/tools/ex-simulator/import');
            return;
        }

        // 🚨 LIMIT REACHED - Show attractive upgrade modal
        // 🚨 LIMIT REACHED - Show attractive upgrade modal
        setShowPremiumModal(true);
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

    // 🔄 Switch Account - Forces full Google logout to allow different account login
    const handleSwitchAccount = async () => {
        try {
            // First, sign out from Supabase
            await supabase.auth.signOut();

            // Then, fully revoke Google access to force account picker on next login
            if (GoogleSignin && Platform.OS !== 'web') {
                try {
                    await GoogleSignin.signOut();
                    await GoogleSignin.revokeAccess(); // This forces account picker next time
                    console.log('[ProfileDrawer] ✅ Google access revoked');
                } catch (googleErr) {
                    console.log('[ProfileDrawer] Google signOut skipped:', googleErr);
                }
            }

            // Clear local storage
            await storage.removeItem('exSimulator_currentProfile');
            await storage.removeItem('exSimulator_allProfiles');

            setProfiles([]);
            onClose();
            router.replace('/auth');
        } catch (error) {
            console.error('[ProfileDrawer] Switch account error:', error);
            // Still try to navigate even if error
            onClose();
            router.replace('/auth');
        }
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
            const allProfiles = await storage.getItem('exSimulator_profiles');
            if (allProfiles) {
                const parsed = JSON.parse(allProfiles);
                const updated = parsed.filter((p: Profile) => p.id !== profile.id);
                await storage.setItem('exSimulator_profiles', JSON.stringify(updated));
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
            Alert.alert('Error', 'No se pudo eliminar el perfil.');
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
                                    <>
                                        <TouchableOpacity
                                            style={styles.userMenuItem}
                                            onPress={handleSwitchAccount}
                                        >
                                            <RefreshCw size={16} color="#06b6d4" />
                                            <Text style={[styles.userMenuText, { color: '#06b6d4' }]}>Cambiar de cuenta</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.userMenuItem}
                                            onPress={handleLogout}
                                        >
                                            <LogOut size={16} color="#ef4444" />
                                            <Text style={[styles.userMenuText, { color: '#ef4444' }]}>Cerrar sesión</Text>
                                        </TouchableOpacity>
                                    </>
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
                                <Text style={styles.userName}>
                                    {isGuest ? 'Invitado' : 'Mi cuenta'}
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

            {/* Custom Delete Confirmation Modal */}
            <Modal
                transparent
                visible={showDeleteConfirm}
                animationType="fade"
                onRequestClose={() => setShowDeleteConfirm(false)}
            >
                <View style={styles.alertOverlay}>
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
            </Modal>

            {/* Success Modal */}
            <Modal
                transparent
                visible={showSuccessModal}
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.alertOverlay}>
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
            </Modal>

            {/* Premium Upgrade Modal used for Limits */}
            <PremiumUpgradeModal
                visible={showPremiumModal}
                onClose={() => setShowPremiumModal(false)}
                onUpgrade={() => {
                    setShowPremiumModal(false);
                    onClose(); // Close drawer
                    router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall');
                }}
                currentTier={tier as string}
                limitType="profiles"
                currentCount={profiles.length}
                maxAllowed={SUBSCRIPTION_CONFIG[tier as SubscriptionTier]?.limits?.simulatorAnalyses || 1}
            />
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
});
