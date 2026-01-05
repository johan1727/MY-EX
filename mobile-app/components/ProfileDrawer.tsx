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
} from 'lucide-react-native';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking } from 'react-native';

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
}

export default function ProfileDrawer({
    visible,
    onClose,
    currentProfileId
}: ProfileDrawerProps) {
    const router = useRouter();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isPremium, setIsPremium] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [slideAnim] = useState(new Animated.Value(-300));
    const [userId, setUserId] = useState<string | null>(null); // Added userId state

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

                // Check premium status
                const { data: subscription } = await supabase
                    .from('subscriptions')
                    .select('tier')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .maybeSingle();

                setIsPremium(subscription?.tier !== 'survivor');
                setIsGuest(false);
            } else {
                // Load from local storage (guest mode)
                const localProfile = await storage.getItem('exSimulator_currentProfile');
                if (localProfile) {
                    const parsed = JSON.parse(localProfile);
                    setProfiles([{
                        id: 'local',
                        exName: parsed.exName || 'Perfil Local'
                    }]);
                }
                setIsGuest(true);
            }
        } catch (error) {
            console.error('Error loading profiles:', error);
        }
    };

    const handleProfileSelect = async (profile: Profile) => {
        // Clear cached analysis view to force reload of selected profile
        await storage.removeItem('analysis_view_profile');
        // Load the selected profile
        await storage.setItem('exSimulator_currentProfile', JSON.stringify(profile));
        onClose();
        // Router should already be on /(tabs) which is the chat
        router.replace('/(tabs)');
    };

    const handleNewSimulation = () => {
        onClose();
        router.push('/tools/ex-simulator/import');
    };

    const handleCoachPress = () => {
        onClose();
        router.push('/coach');
    };

    const handleUpgradePress = () => {
        onClose();
        router.push('/paywall');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // Reset state
        setIsPremium(false);
        setProfiles([]);
        onClose();
        router.replace('/auth');
    };

    const handleDeleteProfile = async (profile: Profile) => {
        Alert.alert(
            '⚠️ Eliminar Perfil',
            `¿Estás seguro que deseas eliminar el perfil de "${profile.exName}"?\n\nEsto borrará:\n- El perfil y su análisis\n- Todo el historial de conversación\n- Memorias emocionales guardadas\n\nEsta acción NO se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete from Supabase if user is logged in and profile has a supabaseId
                            if (userId && profile.supabaseId) {
                                const { error } = await supabase
                                    .from('ex_profiles')
                                    .delete()
                                    .eq('id', profile.supabaseId)
                                    .eq('user_id', userId);

                                if (error) {
                                    console.error('Error deleting from Supabase:', error);
                                }
                            }

                            // Delete from local storage (this logic might need refinement if profiles are only from Supabase)
                            // For now, assuming local storage might also hold a list of profiles or current profile
                            const allProfiles = await storage.getItem('exSimulator_profiles');
                            if (allProfiles) {
                                const parsed = JSON.parse(allProfiles);
                                const updated = parsed.filter((p: Profile) => p.id !== profile.id);
                                await storage.setItem('exSimulator_profiles', JSON.stringify(updated));
                            }

                            // Clear conversation history
                            await storage.removeItem(`exSimulator_conversation_${profile.id}`);

                            // If this was the current profile, clear it
                            if (currentProfileId === profile.id) {
                                await storage.removeItem('exSimulator_currentProfile');
                                await storage.removeItem('analysis_view_profile');
                            }

                            // Reload profiles
                            await loadProfiles();

                            Alert.alert('✓ Perfil Eliminado', `El perfil de "${profile.exName}" ha sido eliminado.`);
                        } catch (error) {
                            console.error('Error deleting profile:', error);
                            Alert.alert('Error', 'No se pudo eliminar el perfil. Intenta de nuevo.');
                        }
                    }
                }
            ]
        );
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
                                            <Text style={styles.profileName}>{profile.exName}</Text>
                                        </TouchableOpacity>

                                        {/* Action Buttons */}
                                        <View style={styles.profileActions}>
                                            {/* Analysis Button */}
                                            <TouchableOpacity
                                                style={styles.analysisBtn}
                                                onPress={() => {
                                                    onClose();
                                                    storage.setItem('analysis_view_profile', JSON.stringify(profile));
                                                    router.push('/tools/ex-simulator/analysis');
                                                }}
                                            >
                                                <Eye size={14} color="#a855f7" />
                                                <Text style={styles.analysisBtnText}>Ver análisis de personalidad</Text>
                                            </TouchableOpacity>

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
                                                router.push('/paywall');
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
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        gap: 10,
        marginBottom: 2,
    },
    profileItemActive: {
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
    },
    profileName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
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
});
