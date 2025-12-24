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
} from 'react-native';
import {
    X,
    MessageCircle,
    Brain,
    Upload,
    Trash2,
    Settings,
    User,
    BarChart3,
    Sparkles,
    Heart,
    Crown,
    HelpCircle,
    Shield,
    Plus,
    MessageSquare,
    Clock,
    Pencil,
} from 'lucide-react-native';
import { haptics } from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.8;

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
    onEditProfile?: (profileId: string, newName: string) => void;
    isPremium?: boolean;
    isGuest?: boolean;
    allProfiles?: any[];
    onSelectProfile?: (profile: any) => void;
}

export default function Sidebar({ visible, onClose, profile, onNavigate, onDelete, onEditProfile, isPremium, isGuest, allProfiles = [], onSelectProfile }: SidebarProps) {
    const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    // State for editing profile name
    const [editingProfile, setEditingProfile] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);

    const handleEditPress = (p: any) => {
        setEditingProfile(p);
        setEditName(p.exName);
        setShowEditModal(true);
    };

    const handleSaveEdit = () => {
        if (editName.trim() && onEditProfile && editingProfile) {
            onEditProfile(editingProfile.id, editName.trim());
        }
        setShowEditModal(false);
        setEditingProfile(null);
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
                <LinearGradient
                    colors={['#1a1a2e', '#16162a', '#0f0f1a']}
                    style={styles.sidebarGradient}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>REMI</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    {/* New Chat Button */}
                    <TouchableOpacity
                        style={styles.newChatButton}
                        onPress={() => { onNavigate('import'); onClose(); }}
                    >
                        <Plus size={20} color="#fff" />
                        <Text style={styles.newChatText}>Nuevo Análisis</Text>
                    </TouchableOpacity>

                    {/* Recent Profiles List */}
                    <View style={styles.recentSection}>
                        <Text style={styles.sectionLabel}>TUS VERSIONES (EXs)</Text>
                        <View style={styles.profileList}>
                            {allProfiles && allProfiles.length > 0 ? (
                                allProfiles.map((p, index) => {
                                    const isActive = profile?.exName === p.exName;
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[styles.profileItem, isActive && styles.profileItemActive]}
                                            onPress={() => {
                                                haptics.selection();
                                                if (onSelectProfile) onSelectProfile(p);
                                                onClose();
                                            }}
                                        >
                                            <LinearGradient
                                                colors={isActive ? ['#a855f7', '#6366f1'] : ['#333', '#333']}
                                                style={styles.profileItemAvatar}
                                            >
                                                <Text style={styles.profileItemInitial}>
                                                    {p.exName.charAt(0).toUpperCase()}
                                                </Text>
                                            </LinearGradient>
                                            <Text style={[styles.profileItemName, isActive && styles.profileItemNameActive]} numberOfLines={1}>
                                                {p.exName}
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.profileEditBtn}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    haptics.selection();
                                                    handleEditPress(p);
                                                }}
                                            >
                                                <Pencil size={16} color="#9ca3af" />
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    );
                                })
                            ) : (
                                <Text style={styles.emptyListText}>No hay perfiles guardados</Text>
                            )}
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Menu Items */}
                    <View style={styles.menuItems}>
                        {/* Simulator Section */}
                        <Text style={styles.sectionLabel}>SIMULADOR</Text>

                        {profile && (
                            <>
                                <MenuItem
                                    icon={<MessageCircle size={22} color="#a855f7" />}
                                    label="Chat con Ex"
                                    onPress={() => {
                                        haptics.impact(haptics.ImpactFeedbackStyle.Light);
                                        onNavigate('chat');
                                        onClose();
                                    }}
                                    primary
                                />
                                <MenuItem
                                    icon={<BarChart3 size={22} color="#6b7280" />}
                                    label="Ver Análisis"
                                    onPress={() => { onNavigate('analysis'); onClose(); }}
                                />
                            </>
                        )}

                        {isGuest && (
                            <MenuItem
                                // @ts-ignore
                                icon={<User size={22} color="#22c55e" />}
                                label="Iniciar Sesión"
                                sublabel="Guarda tu progreso"
                                onPress={() => { onNavigate('auth'); onClose(); }}
                                highlight
                            />
                        )}

                        <MenuItem
                            icon={<Upload size={22} color="#3b82f6" />}
                            label={profile ? "Actualizar Análisis" : "Importar Chat"}
                            onPress={() => { onNavigate('import'); onClose(); }}
                        />

                        {/* Tools Section */}
                        <View style={styles.dividerSmall} />
                        <Text style={styles.sectionLabel}>HERRAMIENTAS</Text>

                        <MenuItem
                            icon={<Heart size={22} color="#ec4899" />}
                            label="Coach de Bienestar"
                            onPress={() => { onNavigate('coach'); onClose(); }}
                        />

                        {/* Premium */}
                        <View style={styles.dividerSmall} />
                        <MenuItem
                            icon={<Crown size={22} color="#f59e0b" />}
                            label="Premium"
                            sublabel="Desbloquea todo"
                            onPress={() => { onNavigate('premium'); onClose(); }}
                            highlight
                        />

                        {/* Account Section */}
                        <View style={styles.dividerSmall} />
                        <Text style={styles.sectionLabel}>CUENTA</Text>

                        <MenuItem
                            icon={<User size={22} color="#6b7280" />}
                            label="Mi Perfil"
                            onPress={() => { onNavigate('profile'); onClose(); }}
                        />

                        <MenuItem
                            icon={<Shield size={22} color="#6b7280" />}
                            label="Privacidad"
                            onPress={() => { onNavigate('settings'); onClose(); }}
                        />

                        {profile && (
                            <>
                                <View style={styles.dividerSmall} />
                                <MenuItem
                                    icon={<Trash2 size={22} color="#ef4444" />}
                                    label="Eliminar Perfil"
                                    onPress={() => { onDelete(); onClose(); }}
                                    danger
                                />
                            </>
                        )}
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>REMI v1.0.0</Text>
                    </View>
                </LinearGradient>
            </Animated.View>

            {/* Edit Profile Modal */}
            <Modal
                visible={showEditModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.editModalOverlay}>
                    <View style={styles.editModalContent}>
                        <Text style={styles.editModalTitle}>Editar Nombre</Text>
                        <TextInput
                            style={styles.editInput}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Nombre del perfil"
                            placeholderTextColor="#6b7280"
                            autoFocus
                        />
                        <View style={styles.editModalButtons}>
                            <TouchableOpacity
                                style={[styles.editModalBtn, styles.editModalCancelBtn]}
                                onPress={() => setShowEditModal(false)}
                            >
                                <Text style={styles.editModalBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.editModalBtn, styles.editModalSaveBtn]}
                                onPress={handleSaveEdit}
                            >
                                <Text style={styles.editModalSaveBtnText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
}

interface MenuItemProps {
    icon: React.ReactNode;
    label: string;
    sublabel?: string;
    onPress: () => void;
    primary?: boolean;
    danger?: boolean;
    highlight?: boolean;
}

function MenuItem({ icon, label, sublabel, onPress, primary, danger, highlight }: MenuItemProps) {
    return (
        <TouchableOpacity
            style={[
                styles.menuItem,
                primary && styles.menuItemPrimary,
                danger && styles.menuItemDanger,
                highlight && styles.menuItemHighlight,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.menuItemIcon}>{icon}</View>
            <View style={styles.menuItemContent}>
                <Text style={[
                    styles.menuItemLabel,
                    primary && styles.menuItemLabelPrimary,
                    danger && styles.menuItemLabelDanger,
                    highlight && styles.menuItemLabelHighlight,
                ]}>
                    {label}
                </Text>
                {sublabel && (
                    <Text style={styles.menuItemSublabel}>{sublabel}</Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
        maxWidth: 320,
    },
    sidebarGradient: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.5,
    },
    closeButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginHorizontal: 12,
        borderRadius: 16,
    },
    profileAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInitial: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
    },
    profileInfo: {
        marginLeft: 14,
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    profileStats: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 2,
    },
    badge: {
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 11,
        color: '#22c55e',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 16,
        marginHorizontal: 20,
    },
    dividerSmall: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: 8,
        marginHorizontal: 20,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6b7280',
        letterSpacing: 1,
        paddingHorizontal: 16,
        marginBottom: 8,
        marginTop: 8,
    },
    menuItems: {
        flex: 1,
        paddingHorizontal: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginVertical: 2,
    },
    menuItemPrimary: {
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
    },
    menuItemDanger: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    menuItemHighlight: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    menuItemIcon: {
        width: 32,
        alignItems: 'center',
    },
    menuItemContent: {
        marginLeft: 12,
        flex: 1,
    },
    menuItemLabel: {
        fontSize: 15,
        color: '#e5e7eb',
        fontWeight: '500',
    },
    menuItemSublabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    menuItemLabelPrimary: {
        color: '#a855f7',
        fontWeight: '600',
    },
    menuItemLabelDanger: {
        color: '#ef4444',
    },
    menuItemLabelHighlight: {
        color: '#f59e0b',
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#4b5563',
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(168, 85, 247, 0.15)', // Purple tint
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.3)',
    },
    newChatText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
        marginLeft: 10,
    },
    recentSection: {
        marginBottom: 8,
    },
    profileList: {
        paddingHorizontal: 12,
    },
    profileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 4,
    },
    profileItemActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    profileItemAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    profileItemInitial: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    profileItemName: {
        color: '#9ca3af',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    profileItemNameActive: {
        color: '#fff',
        fontWeight: '600',
    },
    emptyListText: {
        color: '#6b7280',
        fontSize: 13,
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 8,
    },
    profileEditBtn: {
        padding: 6,
        marginLeft: 8,
    },
    editModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    editModalContent: {
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 320,
    },
    editModalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    editInput: {
        backgroundColor: '#0f0f1a',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#fff',
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.3)',
    },
    editModalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    editModalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    editModalCancelBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    editModalSaveBtn: {
        backgroundColor: '#a855f7',
    },
    editModalBtnText: {
        color: '#9ca3af',
        fontWeight: '600',
    },
    editModalSaveBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
});
