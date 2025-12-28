import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    Platform,
    TextInput,
    Modal,
    Alert,
    ScrollView,
    Share,
} from 'react-native';
import {
    X,
    MessageCircle,
    Plus,
    Pencil,
    LogOut,
    User,
    Settings,
    Crown,
    Sparkles,
    MoreHorizontal,
    LogIn,
    HelpCircle,
    ChevronUp,
    ChevronDown,
    Shield,
    Trash2,
    Eye,
    Download,
} from 'lucide-react-native';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { storage } from '@/lib/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 300);

interface SidebarProps {
    visible: boolean;
    onClose: () => void;
    profile: {
        exName: string;
        messageCount: number;
        hasDeepAnalysis?: boolean;
    } | null;
    onNavigate: (screen: 'chat' | 'import' | 'analysis' | 'settings' | 'coach' | 'profile' | 'premium' | 'auth') => void;
    onDelete: () => void;
    onDeleteProfile?: (profileId: string) => void;
    onEditProfile?: (profileId: string, newName: string) => void;
    isPremium?: boolean;
    isGuest?: boolean;
    allProfiles?: any[];
    onSelectProfile?: (profile: any) => void;
    // Coach chat history props
    coachChats?: { id: string; title: string; createdAt: string }[];
    currentCoachChatId?: string;
    onNewCoachChat?: () => void;
    onSelectCoachChat?: (chatId: string) => void;
}

export default function Sidebar({ visible, onClose, profile, onNavigate, onDelete, onDeleteProfile, onEditProfile, isPremium, isGuest, allProfiles = [], onSelectProfile, coachChats = [], currentCoachChatId, onNewCoachChat, onSelectCoachChat }: SidebarProps) {
    const router = useRouter();
    const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    // State for editing profile name
    const [editingProfile, setEditingProfile] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);

    // State for profile options menu
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [menuProfile, setMenuProfile] = useState<any>(null);

    // State for user menu dropdown
    const [showUserMenu, setShowUserMenu] = useState(false);

    // Logout function with confirmation
    const handleLogout = () => {
        haptics.impact(haptics.ImpactFeedbackStyle.Medium);
        setShowUserMenu(false);

        const executeLogout = async () => {
            try {
                // Clear profile-related data only - not everything
                await storage.removeItem('exSimulator_currentProfile');
                await storage.removeItem('exSimulator_allProfiles');
                await storage.removeItem('isGuest');

                console.log('[Logout] ✅ Cleared profile selection data');

                await supabase.auth.signOut();
                onClose();
                router.replace('/auth');
            } catch (error: any) {
                console.error('[Logout] Error:', error);
                if (Platform.OS === 'web') {
                    alert('Error al cerrar sesión: ' + error.message);
                } else {
                    Alert.alert('Error', 'No se pudo cerrar sesión.');
                }
            }
        };

        if (Platform.OS === 'web') {
            const confirmed = confirm('¿Cerrar sesión?');
            if (confirmed) executeLogout();
        } else {
            Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Cerrar Sesión', style: 'destructive', onPress: executeLogout }
            ]);
        }
    };

    const handleEditPress = (p: any) => {
        setEditingProfile(p);
        setEditName(p.exName);
        setShowEditModal(true);
        setShowProfileMenu(false);
    };

    const handleSaveEdit = () => {
        if (editName.trim() && onEditProfile && editingProfile) {
            onEditProfile(editingProfile.id, editName.trim());
        }
        setShowEditModal(false);
        setEditingProfile(null);
    };

    const handleOpenProfileMenu = (p: any) => {
        setMenuProfile(p);
        setShowProfileMenu(true);
    };

    const handleViewAnalysis = () => {
        if (menuProfile) {
            // Save the profile for analysis viewing
            storage.setItem('analysis_view_profile', JSON.stringify(menuProfile));
            setShowProfileMenu(false);
            onClose();
            router.push('/analysis');
        }
    };

    const handleDeleteProfile = () => {
        if (!menuProfile) return;
        setShowProfileMenu(false);

        const doDelete = () => {
            if (onDeleteProfile) {
                onDeleteProfile(menuProfile.id);
            }
            setMenuProfile(null);
        };

        if (Platform.OS === 'web') {
            const confirmed = confirm(`¿Eliminar perfil "${menuProfile.exName}"? Esta acción no se puede deshacer.`);
            if (confirmed) doDelete();
        } else {
            Alert.alert(
                'Eliminar Perfil',
                `¿Eliminar "${menuProfile.exName}"? Esta acción no se puede deshacer.`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: doDelete }
                ]
            );
        }
    };

    const handleExportChat = async () => {
        if (!menuProfile) return;
        setShowProfileMenu(false);

        try {
            // Try ALL possible storage key formats
            // Profile IDs can be: local_*, supabase_*, or just the supabaseId
            const possibleKeys = [
                `exSimulator_conversation_${menuProfile.id}`,
                menuProfile.supabaseId ? `exSimulator_conversation_${menuProfile.supabaseId}` : null,
                // If ID starts with supabase_, also try the original local format
                menuProfile.id?.startsWith('supabase_') ? `exSimulator_conversation_local_${Date.now()}` : null,
            ].filter(Boolean) as string[];

            let savedConv = null;
            for (const key of possibleKeys) {
                savedConv = await storage.getItem(key);
                if (savedConv) {
                    console.log('[Export] Found conversation at:', key);
                    break;
                }
            }

            // NEW: If still not found, try to find from cloud
            if (!savedConv && menuProfile.supabaseId) {
                console.log('[Export] Trying cloud fallback...');
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user?.id) {
                        const { data: cloudConv } = await supabase
                            .from('ex_conversations')
                            .select('messages')
                            .eq('user_id', user.id)
                            .eq('profile_id', menuProfile.supabaseId)
                            .single();
                        if (cloudConv?.messages) {
                            savedConv = JSON.stringify(cloudConv.messages);
                            console.log('[Export] Found conversation in cloud!');
                        }
                    }
                } catch (err) {
                    console.log('[Export] Cloud fallback failed:', err);
                }
            }

            if (!savedConv) {
                Alert.alert(
                    '📭 Sin conversación guardada',
                    `No encontramos mensajes guardados para "${menuProfile.exName}".\n\nAsegúrate de chatear primero con este perfil.`,
                    [{ text: 'Entendido', style: 'default' }]
                );
                return;
            }

            const messages = JSON.parse(savedConv);

            if (messages.length === 0) {
                Alert.alert('📭 Chat vacío', 'La conversación está vacía.');
                return;
            }

            // Format messages for export
            const formattedMessages = messages.map((m: any) => {
                const time = new Date(m.timestamp).toLocaleString();
                const sender = m.role === 'user' ? 'Tú' : menuProfile.exName;
                return `[${time}] ${sender}: ${typeof m.content === 'string' ? m.content : m.content?.text || ''}`;
            }).join('\n\n');

            const exportText = `=== REMI - Conversación con ${menuProfile.exName} ===\nExportado: ${new Date().toLocaleString()}\nTotal mensajes: ${messages.length}\n\n${formattedMessages}`;

            if (Platform.OS === 'web') {
                // Web: copy to clipboard
                navigator.clipboard?.writeText(exportText);
                alert('✅ ¡Conversación copiada al portapapeles!');
            } else {
                // Mobile: share
                await Share.share({
                    message: exportText,
                    title: `Conversación con ${menuProfile.exName}`,
                });
            }
        } catch (error) {
            console.error('Export error:', error);
            Alert.alert('❌ Error', 'No se pudo exportar la conversación. Intenta de nuevo.');
        }
    };

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            setShowUserMenu(false);
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -SIDEBAR_WIDTH,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                <TouchableOpacity style={styles.backdropTouchable} onPress={onClose} activeOpacity={1} />
            </Animated.View>

            {/* Sidebar */}
            <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
                <View style={styles.sidebarContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.logo}>REMI</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    {/* New Simulation Button */}
                    <TouchableOpacity
                        style={styles.newChatBtn}
                        onPress={() => { onNavigate('import'); onClose(); }}
                    >
                        <Plus size={18} color="#fff" />
                        <Text style={styles.newChatText}>Nueva simulación</Text>
                    </TouchableOpacity>

                    {/* Profiles List */}
                    <ScrollView style={styles.profilesContainer} showsVerticalScrollIndicator={false}>
                        {allProfiles && allProfiles.length > 0 && (
                            <Text style={styles.sectionTitle}>Tus perfiles</Text>
                        )}

                        {allProfiles && allProfiles.map((p, index) => {
                            const isActive = profile?.exName === p.exName;
                            const hasAnalysis = p.profile && (p.profile.bigFive || p.profile.attachment);
                            return (
                                <View key={index}>
                                    <TouchableOpacity
                                        style={[styles.profileItem, isActive && styles.profileItemActive]}
                                        onPress={() => {
                                            haptics.selection();
                                            if (onSelectProfile) onSelectProfile(p);
                                            onClose();
                                        }}
                                    >
                                        <MessageCircle size={16} color={isActive ? "#fff" : "#9ca3af"} />
                                        <Text
                                            style={[styles.profileName, isActive && styles.profileNameActive]}
                                            numberOfLines={1}
                                        >
                                            {p.exName}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.editBtn}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleOpenProfileMenu(p);
                                            }}
                                        >
                                            <MoreHorizontal size={16} color="#6b7280" />
                                        </TouchableOpacity>
                                    </TouchableOpacity>

                                    {/* Analysis Button - Always visible */}
                                    {hasAnalysis && (
                                        <TouchableOpacity
                                            style={styles.analysisBtn}
                                            onPress={() => {
                                                storage.setItem('analysis_view_profile', JSON.stringify(p));
                                                onClose();
                                                router.push('/analysis');
                                            }}
                                        >
                                            <Eye size={14} color="#a855f7" />
                                            <Text style={styles.analysisBtnText}>Ver análisis de personalidad</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}


                        {/* Coach IA Section */}
                        <View style={styles.coachSection}>
                            <TouchableOpacity
                                style={styles.coachEmptyBtn}
                                onPress={() => { onNavigate('coach'); onClose(); }}
                            >
                                <Sparkles size={16} color="#a855f7" />
                                <Text style={styles.coachEmptyText}>Coach IA</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                    {/* ChatGPT-style Registration Banner for Guests */}
                    {isGuest && (
                        <View style={styles.guestBanner}>
                            <Text style={styles.guestBannerText}>
                                Guarda tu historial, sincroniza entre dispositivos y personaliza tu experiencia.
                            </Text>
                            <TouchableOpacity
                                style={styles.guestBannerBtn}
                                onPress={() => { onNavigate('auth'); onClose(); }}
                            >
                                <Text style={styles.guestBannerBtnText}>Iniciar sesión o registrarse</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Footer - User Section */}
                    <View style={styles.footer}>
                        {/* User Menu Dropdown (appears above when open) */}
                        {showUserMenu && (
                            <View style={styles.userMenuDropdown}>
                                <TouchableOpacity
                                    style={styles.userMenuItem}
                                    onPress={() => {
                                        setShowUserMenu(false);
                                        onNavigate('profile');
                                        onClose();
                                    }}
                                >
                                    <User size={16} color="#9ca3af" />
                                    <Text style={styles.userMenuText}>Mi perfil</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.userMenuItem}
                                    onPress={() => {
                                        setShowUserMenu(false);
                                        router.push('/preferences');
                                        onClose();
                                    }}
                                >
                                    <Settings size={16} color="#9ca3af" />
                                    <Text style={styles.userMenuText}>Configuración</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.userMenuItem}
                                    onPress={() => {
                                        setShowUserMenu(false);
                                        router.push('/privacy');
                                        onClose();
                                    }}
                                >
                                    <Shield size={16} color="#9ca3af" />
                                    <Text style={styles.userMenuText}>Privacidad</Text>
                                </TouchableOpacity>

                                {/* Premium Plans Option */}
                                <TouchableOpacity
                                    style={styles.userMenuItem}
                                    onPress={() => {
                                        setShowUserMenu(false);
                                        if (isGuest) {
                                            // Redirect to auth first if guest
                                            onNavigate('auth');
                                        } else {
                                            onNavigate('premium');
                                        }
                                        onClose();
                                    }}
                                >
                                    <Crown size={16} color="#f59e0b" />
                                    <Text style={[styles.userMenuText, { color: '#f59e0b' }]}>Ver Planes Premium</Text>
                                </TouchableOpacity>

                                <View style={styles.userMenuDivider} />

                                {isGuest ? (
                                    <TouchableOpacity
                                        style={styles.userMenuItem}
                                        onPress={() => {
                                            setShowUserMenu(false);
                                            onNavigate('auth');
                                            onClose();
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

                        {/* User Profile Button */}
                        <View style={styles.userSection}>
                            <TouchableOpacity
                                style={styles.userBtn}
                                onPress={() => setShowUserMenu(!showUserMenu)}
                            >
                                <View style={[styles.userAvatar, isGuest && { backgroundColor: '#6b7280' }]}>
                                    <User size={16} color="#fff" />
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
                                    <ChevronDown size={18} color="#6b7280" />
                                ) : (
                                    <ChevronUp size={18} color="#6b7280" />
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Upgrade Button */}
                        {!isPremium && (
                            <TouchableOpacity
                                style={styles.upgradeBtn}
                                onPress={() => { onNavigate('premium'); onClose(); }}
                            >
                                <Crown size={14} color="#f59e0b" />
                                <Text style={styles.upgradeText}>Mejorar plan</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Animated.View>

            {/* Edit Profile Modal */}
            <Modal
                visible={showEditModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar nombre</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Nombre del perfil"
                            placeholderTextColor="#6b7280"
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowEditModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={handleSaveEdit}
                            >
                                <Text style={styles.modalSaveText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Profile Options Modal */}
            <Modal
                visible={showProfileMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowProfileMenu(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowProfileMenu(false)}
                >
                    <View style={styles.profileMenuContent}>
                        <Text style={styles.profileMenuTitle}>{menuProfile?.exName}</Text>

                        <TouchableOpacity
                            style={styles.profileMenuItem}
                            onPress={() => handleEditPress(menuProfile)}
                        >
                            <Pencil size={18} color="#9ca3af" />
                            <Text style={styles.profileMenuText}>Editar nombre</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.profileMenuItem}
                            onPress={handleViewAnalysis}
                        >
                            <Eye size={18} color="#a855f7" />
                            <Text style={[styles.profileMenuText, { color: '#a855f7' }]}>Ver análisis</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.profileMenuItem}
                            onPress={handleExportChat}
                        >
                            <Download size={18} color="#22c55e" />
                            <Text style={[styles.profileMenuText, { color: '#22c55e' }]}>Exportar chat</Text>
                        </TouchableOpacity>

                        <View style={styles.profileMenuDivider} />

                        <TouchableOpacity
                            style={styles.profileMenuItem}
                            onPress={handleDeleteProfile}
                        >
                            <Trash2 size={18} color="#ef4444" />
                            <Text style={[styles.profileMenuText, { color: '#ef4444' }]}>Eliminar perfil</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backdropTouchable: {
        flex: 1,
    },
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        backgroundColor: '#171717',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.1)',
    },
    sidebarContent: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    logo: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    closeBtn: {
        padding: 8,
    },
    newChatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        marginBottom: 20,
    },
    newChatText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    profilesContainer: {
        flex: 1,
        paddingHorizontal: 12,
    },
    sectionTitle: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    profileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 2,
    },
    profileItemActive: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    profileName: {
        flex: 1,
        color: '#9ca3af',
        fontSize: 14,
    },
    profileNameActive: {
        color: '#fff',
    },
    editBtn: {
        padding: 4,
    },
    quickActions: {
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    quickAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
    },
    quickActionText: {
        color: '#9ca3af',
        fontSize: 14,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        padding: 12,
    },
    userMenuDropdown: {
        backgroundColor: '#2a2a2a',
        borderRadius: 10,
        marginBottom: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    userMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    userMenuText: {
        color: '#e5e7eb',
        fontSize: 14,
    },
    userMenuDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 6,
    },
    userSection: {
        marginBottom: 10,
    },
    userBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    userPlan: {
        color: '#f59e0b',
        fontSize: 12,
    },
    userPlanFree: {
        color: '#6b7280',
        fontSize: 12,
    },
    upgradeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    upgradeText: {
        color: '#f59e0b',
        fontSize: 13,
        fontWeight: '600',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1f1f1f',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        maxWidth: 300,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 15,
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
    },
    modalCancelText: {
        color: '#9ca3af',
        fontWeight: '500',
    },
    modalSaveBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: '#3b82f6',
    },
    modalSaveText: {
        color: '#fff',
        fontWeight: '600',
    },
    profileMenuContent: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
        width: '85%',
        maxWidth: 280,
    },
    profileMenuTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    profileMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    profileMenuText: {
        color: '#e5e7eb',
        fontSize: 15,
    },
    profileMenuDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 8,
    },
    // Coach IA Section Styles
    coachSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    coachHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    coachHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    coachTitle: {
        color: '#a855f7',
        fontSize: 14,
        fontWeight: '600',
    },
    newChatSmallBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    coachChatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 4,
    },
    coachChatItemActive: {
        backgroundColor: 'rgba(168, 85, 247, 0.3)',
    },
    coachChatTitle: {
        color: '#9ca3af',
        fontSize: 13,
        flex: 1,
    },
    coachChatTitleActive: {
        color: '#fff',
    },
    coachEmptyBtn: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        alignItems: 'center',
    },
    coachEmptyText: {
        color: '#a855f7',
        fontSize: 13,
        fontWeight: '500',
    },
    analysisBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 32,
        marginBottom: 8,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderRadius: 8,
        marginLeft: 26,
    },
    analysisBtnText: {
        color: '#a855f7',
        fontSize: 12,
        fontWeight: '500',
    },
    // ChatGPT-style guest registration banner
    guestBanner: {
        padding: 16,
        marginHorizontal: 12,
        marginBottom: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    guestBannerText: {
        color: '#9ca3af',
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 12,
        textAlign: 'center',
    },
    guestBannerBtn: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
        alignItems: 'center',
    },
    guestBannerBtnText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '600',
    },
});
