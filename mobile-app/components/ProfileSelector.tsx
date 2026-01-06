import React, { useState, useEffect } from 'react';

import { View, Text, Modal, TouchableOpacity, FlatList, ActivityIndicator, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Plus, Check, ChevronDown, User, Trash2, X, HelpCircle, Sparkles, LogOut } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ExProfile, profilesStorage } from '../lib/profiles';

interface ProfileSelectorProps {
    currentProfile: ExProfile | null;
    onProfileChange: (profile: ExProfile) => void;
    onNewProfile: () => void;
}

export default function ProfileSelector({
    currentProfile,
    onProfileChange,
    onNewProfile
}: ProfileSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [profiles, setProfiles] = useState<ExProfile[]>([]);
    const [showNewModal, setShowNewModal] = useState(false);

    const [newName, setNewName] = useState('');

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
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        const allProfiles = await profilesStorage.getAllProfiles();
        setProfiles(allProfiles);
    };

    const handleSelectProfile = async (profile: ExProfile) => {
        await profilesStorage.setActiveProfile(profile.id);
        onProfileChange(profile);
        setIsOpen(false);
    };

    const handleCreateNew = async () => {
        if (!newName.trim()) {
            showAlert('Error', 'Por favor ingresa un nombre', [{ text: 'OK' }], 'error');
            return;
        }

        const newProfile = await profilesStorage.createProfile(newName.trim());
        await loadProfiles();
        onProfileChange(newProfile);
        setNewName('');
        setShowNewModal(false);
        onNewProfile();
    };

    const handleDeleteProfile = async (profile: ExProfile) => {
        showAlert(
            'Eliminar Perfil',
            `¿Estás seguro de eliminar el perfil de ${profile.exName}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        await profilesStorage.deleteProfile(profile.id);
                        await loadProfiles();
                        if (currentProfile?.id === profile.id) {
                            const remaining = await profilesStorage.getAllProfiles();
                            if (remaining.length > 0) {
                                onProfileChange(remaining[0]);
                            }
                        }
                        closeAlert();
                    },
                },
            ],
            'warning'
        );
    };

    return (
        <View style={styles.container}>
            {/* Current Profile Button */}
            <TouchableOpacity
                style={styles.selector}
                onPress={() => setIsOpen(!isOpen)}
            >
                <LinearGradient
                    colors={['#a855f7', '#6366f1']}
                    style={styles.avatar}
                >
                    <Text style={styles.avatarText}>
                        {currentProfile?.exName.charAt(0).toUpperCase() || '?'}
                    </Text>
                </LinearGradient>
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                        {currentProfile?.exName || 'Sin perfil'}
                    </Text>
                    <Text style={styles.stats}>
                        {currentProfile?.messageCount?.toLocaleString() || 0} mensajes
                    </Text>
                </View>
                <ChevronDown size={20} color="#9ca3af" />
            </TouchableOpacity>

            {/* Dropdown */}
            {isOpen && (
                <View style={styles.dropdown}>
                    <Text style={styles.dropdownTitle}>Perfiles</Text>

                    {profiles.map((profile) => (
                        <TouchableOpacity
                            key={profile.id}
                            style={styles.dropdownItem}
                            onPress={() => handleSelectProfile(profile)}
                        >
                            <LinearGradient
                                colors={['#a855f7', '#6366f1']}
                                style={styles.miniAvatar}
                            >
                                <Text style={styles.miniAvatarText}>
                                    {profile.exName.charAt(0).toUpperCase()}
                                </Text>
                            </LinearGradient>
                            <Text style={styles.dropdownItemText} numberOfLines={1}>
                                {profile.exName}
                            </Text>
                            {currentProfile?.id === profile.id && (
                                <Check size={16} color="#22c55e" />
                            )}
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => handleDeleteProfile(profile)}
                            >
                                <Trash2 size={14} color="#ef4444" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            setIsOpen(false);
                            setShowNewModal(true);
                        }}
                    >
                        <Plus size={18} color="#a855f7" />
                        <Text style={styles.addButtonText}>Nuevo Perfil</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* New Profile Modal */}
            <Modal visible={showNewModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Nuevo Perfil</Text>
                            <TouchableOpacity onPress={() => setShowNewModal(false)}>
                                <X size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>¿Cómo se llama tu ex?</Text>
                        <TextInput
                            style={styles.input}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="Nombre"
                            placeholderTextColor="#6b7280"
                        />

                        <TouchableOpacity
                            style={styles.createButton}
                            onPress={handleCreateNew}
                        >
                            <Text style={styles.createButtonText}>Crear Perfil</Text>
                        </TouchableOpacity>
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
                        <Text style={styles.alertMessage}>
                            {customAlert.message}
                        </Text>
                        <View style={styles.alertButtons}>
                            {!customAlert.buttons || customAlert.buttons.length === 0 ? (
                                <TouchableOpacity
                                    style={[styles.alertButton, styles.alertButtonPrimary]}
                                    onPress={closeAlert}
                                >
                                    <Text style={styles.alertButtonText}>OK</Text>
                                </TouchableOpacity>
                            ) : (
                                customAlert.buttons.map((btn, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            styles.alertButton,
                                            btn.style === 'cancel' ? styles.alertButtonCancel :
                                                btn.style === 'destructive' ? styles.alertButtonDestructive :
                                                    styles.alertButtonPrimary
                                        ]}
                                        onPress={() => {
                                            if (btn.onPress) btn.onPress();
                                            else closeAlert();
                                        }}
                                    >
                                        <Text style={[
                                            styles.alertButtonText,
                                            btn.style === 'destructive' && { color: '#ef4444' }
                                        ]}>{btn.text}</Text>
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
        marginBottom: 8,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    stats: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
    dropdown: {
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        marginTop: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.3)',
    },
    dropdownTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9ca3af',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    miniAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniAvatarText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    dropdownItemText: {
        flex: 1,
        fontSize: 14,
        color: '#fff',
        marginLeft: 10,
    },
    deleteBtn: {
        padding: 6,
        marginLeft: 8,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.3)',
        borderRadius: 8,
        borderStyle: 'dashed',
    },
    addButtonText: {
        fontSize: 14,
        color: '#a855f7',
        marginLeft: 8,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 340,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    modalLabel: {
        fontSize: 14,
        color: '#9ca3af',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.3)',
    },
    createButton: {
        backgroundColor: '#a855f7',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
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
        backgroundColor: '#333',
    },
    alertButtonDestructive: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    alertButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
});
