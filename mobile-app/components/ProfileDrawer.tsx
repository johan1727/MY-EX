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
    Sun,
    Moon,
} from 'lucide-react-native';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Pressable } from 'react-native'; // Added Pressable for hover
import { useSubscription } from '@/lib/SubscriptionContext';
import { useTheme } from '@/lib/ThemeContext'; // Import Theme Context
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
    // isDark prop is deprecated in favor of useTheme
    variant?: 'overlay' | 'sidebar'; // New prop
}

export default function ProfileDrawer({
    visible,
    onClose,
    currentProfileId,
    onProfileDeleted,
    onProfileSwitch,
    variant = 'overlay',
}: ProfileDrawerProps) {
    const router = useRouter();
    const { isDark, toggleTheme } = useTheme(); // Use Global Theme

    // Hover States for Web
    const [hoveredProfile, setHoveredProfile] = useState<string | null>(null);
    const [hoveredCoach, setHoveredCoach] = useState(false);
    const [hoveredMenuItem, setHoveredMenuItem] = useState<string | null>(null);
    const [coachPreview, setCoachPreview] = useState<string | null>(null);

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
            // Load Coach Preview
            const coachMsgs = await storage.getItem('coach_messages');
            if (coachMsgs) {
                const parsed = JSON.parse(coachMsgs);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const lastMsg = parsed[parsed.length - 1];
                    setCoachPreview(lastMsg.content);
                }
            }

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

    const renderDrawerContent = () => (
        <Animated.View
            style={[
                styles.drawer,
                variant === 'sidebar' && { width: '100%', borderRightWidth: 0 },
                !isDark && { backgroundColor: '#ffffff', borderRightColor: '#e5e7eb' },
                variant === 'overlay' && { transform: [{ translateX: slideAnim }] }
            ]}
            onStartShouldSetResponder={() => true}
        >
            {/* Header */}
            <View style={[styles.header, !isDark && { borderBottomColor: '#e5e7eb' }]}>
                <Text style={[styles.title, !isDark && { color: '#000' }]} onPress={() => router.push('/')}>REMI</Text>
                {variant === 'overlay' && (
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color={!isDark ? '#111' : '#fff'} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.content}>
                {/* New Sim Button */}
                <TouchableOpacity
                    style={[
                        styles.newSimButton,
                        !isDark && { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' }
                    ]}
                    onPress={handleNewSimulation}
                >
                    <Plus size={20} color={!isDark ? '#111' : '#fff'} />
                    <Text style={[styles.newSimText, !isDark && { color: '#111' }]}>Nueva simulación</Text>
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
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.profileItem,
                                        variant === 'sidebar' && styles.profileItemSidebar, // Compact for sidebar
                                        !isDark && { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
                                        ((currentProfileId === profile.id || currentProfileId === profile.supabaseId)) &&
                                        (isDark ? styles.profileItemActive : { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }),
                                        hoveredProfile === profile.id && (isDark ? { backgroundColor: '#333' } : { backgroundColor: '#f9fafb' }),
                                        pressed && { opacity: 0.7 }
                                    ]}
                                    onPress={() => handleProfileSelect(profile)}
                                    // @ts-ignore
                                    onHoverIn={() => setHoveredProfile(profile.id)}
                                    // @ts-ignore
                                    onHoverOut={() => setHoveredProfile(null)}
                                >
                                    <MessageCircle size={variant === 'sidebar' ? 16 : 20} color="#9ca3af" />
                                    <Text
                                        style={[
                                            styles.profileName,
                                            variant === 'sidebar' && styles.profileNameSidebar,
                                            !isDark && { color: '#111' }
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {profile.exName}
                                    </Text>
                                    <Text style={[styles.profileChatHint, variant === 'sidebar' && { fontSize: 10 }]} numberOfLines={1}>
                                        {profile.lastMessage ? profile.lastMessage : 'Pulsa para chatear →'}
                                    </Text>
                                </Pressable>

                                <View style={styles.profileActions}>
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

                {/* Coach Button */}
                <Pressable
                    style={({ pressed }) => [
                        styles.coachButton,
                        !isDark && { borderColor: 'rgba(168, 85, 247, 0.4)' },
                        hoveredCoach && (isDark ? { backgroundColor: 'rgba(168, 85, 247, 0.1)' } : { backgroundColor: '#fdf4ff' }),
                        pressed && { opacity: 0.7 }
                    ]}
                    onPress={handleCoachPress}
                    // @ts-ignore
                    onHoverIn={() => setHoveredCoach(true)}
                    // @ts-ignore
                    onHoverOut={() => setHoveredCoach(false)}
                >
                    <Sparkles size={18} color="#a855f7" style={{ marginRight: 8 }} />
                    <View>
                        <Text style={styles.coachText}>Coach IA</Text>
                        <Text style={[styles.profileChatHint, { marginTop: 2 }]} numberOfLines={1}>
                            {coachPreview ? coachPreview : 'Tu espacio seguro →'}
                        </Text>
                    </View>
                </Pressable>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, !isDark && { borderTopColor: '#e5e7eb' }]}>
                {showUserMenu && (
                    <View style={[
                        styles.userMenuContent,
                        !isDark && { backgroundColor: '#ffffff', borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.1, elevation: 4 },
                        { bottom: '100%', marginBottom: 10, maxHeight: 400 }
                    ]}>
                        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.userMenuItem,
                                    hoveredMenuItem === 'profile' && (isDark ? { backgroundColor: '#333' } : { backgroundColor: '#f3f4f6' }),
                                    pressed && { opacity: 0.7 }
                                ]}
                                onPress={() => { if (variant === 'overlay') onClose(); router.push('/profile'); }}
                                // @ts-ignore
                                onHoverIn={() => setHoveredMenuItem('profile')}
                                // @ts-ignore
                                onHoverOut={() => setHoveredMenuItem(null)}
                            >
                                <User size={16} color="#9ca3af" />
                                <Text style={[styles.userMenuText, !isDark && { color: '#374151' }]}>Mi Perfil</Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.userMenuItem,
                                    hoveredMenuItem === 'preferences' && (isDark ? { backgroundColor: '#333' } : { backgroundColor: '#f3f4f6' }),
                                    pressed && { opacity: 0.7 }
                                ]}
                                onPress={() => { if (variant === 'overlay') onClose(); router.push('/preferences'); }}
                                // @ts-ignore
                                onHoverIn={() => setHoveredMenuItem('preferences')}
                                // @ts-ignore
                                onHoverOut={() => setHoveredMenuItem(null)}
                            >
                                <Settings size={16} color="#9ca3af" />
                                <Text style={[styles.userMenuText, !isDark && { color: '#374151' }]}>Preferencias</Text>
                            </Pressable>

                            {/* Theme Toggle in Menu */}
                            <Pressable
                                style={({ pressed }) => [
                                    styles.userMenuItem,
                                    hoveredMenuItem === 'theme' && (isDark ? { backgroundColor: '#333' } : { backgroundColor: '#f3f4f6' }),
                                    pressed && { opacity: 0.7 }
                                ]}
                                onPress={() => {
                                    toggleTheme();
                                }}
                                // @ts-ignore
                                onHoverIn={() => setHoveredMenuItem('theme')}
                                // @ts-ignore
                                onHoverOut={() => setHoveredMenuItem(null)}
                            >
                                {isDark ? <Sun size={16} color="#9ca3af" /> : <Moon size={16} color="#9ca3af" />}
                                <Text style={[styles.userMenuText, !isDark && { color: '#374151' }]}>
                                    {isDark ? 'Modo Claro' : 'Modo Oscuro'}
                                </Text>
                            </Pressable>

                            {!isGuest && (
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.userMenuItem,
                                        hoveredMenuItem === 'switch' && (isDark ? { backgroundColor: '#333' } : { backgroundColor: '#f3f4f6' }),
                                        pressed && { opacity: 0.7 }
                                    ]}
                                    onPress={handleLogout}
                                    // @ts-ignore
                                    onHoverIn={() => setHoveredMenuItem('switch')}
                                    // @ts-ignore
                                    onHoverOut={() => setHoveredMenuItem(null)}
                                >
                                    <LogIn size={16} color="#9ca3af" />
                                    <Text style={[styles.userMenuText, !isDark && { color: '#374151' }]}>Cambiar cuenta</Text>
                                </Pressable>
                            )}

                            <Pressable
                                style={({ pressed }) => [
                                    styles.userMenuItem,
                                    hoveredMenuItem === 'privacy' && (isDark ? { backgroundColor: '#333' } : { backgroundColor: '#f3f4f6' }),
                                    pressed && { opacity: 0.7 }
                                ]}
                                onPress={() => { if (variant === 'overlay') onClose(); router.push('/legal/privacy'); }}
                                // @ts-ignore
                                onHoverIn={() => setHoveredMenuItem('privacy')}
                                // @ts-ignore
                                onHoverOut={() => setHoveredMenuItem(null)}
                            >
                                <Lock size={16} color="#9ca3af" />
                                <Text style={[styles.userMenuText, !isDark && { color: '#374151' }]}>Privacidad</Text>
                            </Pressable>

                            {!isPremium && (
                                <TouchableOpacity
                                    style={[styles.upgradeMenuItem, !isDark && { backgroundColor: '#fef3c7' }]}
                                    onPress={() => {
                                        if (variant === 'overlay') onClose();
                                        router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall');
                                    }}
                                >
                                    <Crown size={16} color="#f59e0b" />
                                    <Text style={styles.upgradeMenuText}>Ver Planes Premium</Text>
                                </TouchableOpacity>
                            )}
                            <View style={[styles.userMenuDivider, !isDark && { backgroundColor: '#e5e7eb' }]} />
                            {isGuest ? (
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.userMenuItem,
                                        hoveredMenuItem === 'login' && (isDark ? { backgroundColor: '#333' } : { backgroundColor: '#f3f4f6' }),
                                        pressed && { opacity: 0.7 }
                                    ]}
                                    onPress={() => { if (variant === 'overlay') onClose(); router.push('/auth'); }}
                                    // @ts-ignore
                                    onHoverIn={() => setHoveredMenuItem('login')}
                                    // @ts-ignore
                                    onHoverOut={() => setHoveredMenuItem(null)}
                                >
                                    <LogIn size={16} color="#22c55e" />
                                    <Text style={[styles.userMenuText, { color: '#22c55e' }]}>Iniciar sesión</Text>
                                </Pressable>
                            ) : (
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.userMenuItem,
                                        hoveredMenuItem === 'logout' && (isDark ? { backgroundColor: '#333' } : { backgroundColor: '#f3f4f6' }),
                                        pressed && { opacity: 0.7 }
                                    ]}
                                    onPress={handleLogout}
                                    // @ts-ignore
                                    onHoverIn={() => setHoveredMenuItem('logout')}
                                    // @ts-ignore
                                    onHoverOut={() => setHoveredMenuItem(null)}
                                >
                                    <LogOut size={16} color="#ef4444" />
                                    <Text style={[styles.userMenuText, { color: '#ef4444' }]}>Cerrar sesión</Text>
                                </Pressable>
                            )}
                        </ScrollView>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.userBtn}
                    onPress={() => setShowUserMenu(!showUserMenu)}
                >
                    <View style={[styles.userAvatar, isGuest && { backgroundColor: '#6b7280' }]}>
                        <User size={20} color="#fff" />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, !isDark && { color: '#111' }]} numberOfLines={1}>
                            {isGuest ? 'Invitado' : (userEmail || 'Mi cuenta')}
                        </Text>
                        <Text style={isGuest ? styles.userPlanFree : (isPremium ? styles.userPlan : styles.userPlanFree)}>
                            {isGuest ? 'Plan Gratuito' : (isPremium ? 'Premium' : 'Plan Gratuito')}
                        </Text>
                    </View>
                    {showUserMenu ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    const renderAlerts = () => (
        <>
            {/* Confirmation Overlay */}
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
                            <TouchableOpacity style={styles.alertButtonCancel} onPress={() => setShowDeleteConfirm(false)}>
                                <Text style={styles.alertButtonCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.alertButtonConfirm} onPress={() => { setShowDeleteConfirm(false); if (profileToDelete) performDelete(profileToDelete); }}>
                                <Text style={styles.alertButtonConfirmText}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
            {/* Generic Alert */}
            {customAlert.visible && (
                <View style={[styles.alertOverlay, { zIndex: 9999, elevation: 5 }]}>
                    <View style={[styles.alertBox, !isDark && { backgroundColor: '#ffffff' }]}>
                        <Text style={[styles.alertTitle, !isDark && { color: '#111' }]}>{customAlert.title}</Text>
                        <Text style={[styles.alertMessage, !isDark && { color: '#4b5563' }]}>{customAlert.message}</Text>
                        <View style={styles.alertButtons}>
                            {(customAlert.buttons || [{ text: 'OK' }]).map((btn, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.alertButtonConfirm, { flex: 1, marginHorizontal: 4 }]}
                                    onPress={() => { if (btn.onPress) btn.onPress(); else closeAlert(); }}
                                >
                                    <Text style={styles.alertButtonConfirmText}>{btn.text}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            )}
            {/* Success */}
            {showSuccessModal && (
                <View style={[styles.alertOverlay, { zIndex: 9999, elevation: 5 }]}>
                    <View style={styles.alertBox}>
                        <Sparkles size={32} color="#22c55e" />
                        <Text style={styles.alertTitle}>¡Perfil Eliminado!</Text>
                    </View>
                </View>
            )}
        </>
    );

    if (variant === 'sidebar') {
        return (
            <View style={{ flex: 1, height: '100%', borderRightWidth: 1, borderRightColor: isDark ? '#333' : '#e5e7eb', backgroundColor: isDark ? '#000' : '#fff' }}>
                {renderDrawerContent()}
                {renderAlerts()}
            </View>
        );
    }

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
                {renderDrawerContent()}
            </TouchableOpacity>
            {renderAlerts()}
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
    profileItemSidebar: {
        paddingVertical: 6,
        paddingHorizontal: 8,
        gap: 6,
        marginBottom: 1,
    },
    profileNameSidebar: {
        fontSize: 12,
    },
    // Legacy Account Styles
    // Legacy Account Styles
    userMenuContent: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 8,
        position: 'absolute',
        bottom: 80, // Fixed position above footer
        left: 16,
        right: 16,
        gap: 2,
        borderWidth: 1,
        borderColor: '#333',
        zIndex: 100,
        maxHeight: 280, // Prevent growing too tall
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
    // Custom Alert Styles (Eleven Labs Modern)
    alertOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    alertBox: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#1c1c1e',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
    },
    alertIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    alertTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    alertMessage: {
        color: '#9ca3af',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    alertButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    alertButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
    },
    alertButtonPrimary: {
        backgroundColor: '#fff',
    },
    alertButtonCancel: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#333',
    },
    alertButtonCancelText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    alertButtonConfirm: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        // Removed border to match cleaner look
    },
    alertButtonConfirmText: {
        color: '#ef4444',
        fontWeight: '600',
        fontSize: 14,
    },
    alertButtonPremium: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#f59e0b',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    alertButtonPremiumText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 14,
    },
});
