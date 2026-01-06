import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, ActivityIndicator, TextInput, ScrollView, StyleSheet } from 'react-native';
import { X, Search, MessageSquare, Trash2, Clock, ChevronRight, HelpCircle, Sparkles, LogOut } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { conversationManager } from '../lib/conversationManager';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConversationHistoryProps {
    visible: boolean;
    onClose: () => void;
    onSelectConversation: (conversationId: string, messages: any[]) => void;
}

interface Conversation {
    id: string;
    title: string;
    updated_at: string;
    message_count: number;
}

export default function ConversationHistory({ visible, onClose, onSelectConversation }: ConversationHistoryProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [userId, setUserId] = useState<string | null>(null);

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
            loadConversations();
        }
    }, [visible]);

    useEffect(() => {
        if (searchQuery.trim().length > 2) {
            handleSearch();
        } else if (searchQuery.trim() === '') {
            loadConversations();
        }
    }, [searchQuery]);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            const data = await conversationManager.getConversations(user.id);
            setConversations(data);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const data = await conversationManager.searchConversations(userId, searchQuery);
            setConversations(data);
        } catch (error) {
            console.error('Error searching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectConversation = async (conversationId: string) => {
        try {
            setLoading(true);
            const messages = await conversationManager.getConversationMessages(conversationId);

            // Convert to chat format
            const formattedMessages = messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                sender: msg.role === 'assistant' ? 'ai' : 'user',
                created_at: msg.created_at,
                image: msg.image_url
            }));

            onSelectConversation(conversationId, formattedMessages);
            onClose();
        } catch (error) {
            console.error('Error loading conversation:', error);
            showAlert('Error', 'No se pudo cargar la conversación.', [{ text: 'OK' }], 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConversation = (conversationId: string) => {
        showAlert(
            'Eliminar conversación',
            '¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const success = await conversationManager.deleteConversation(conversationId);
                            if (success) {
                                setConversations(prev => prev.filter(c => c.id !== conversationId));
                                closeAlert();
                            } else {
                                showAlert('Error', 'No se pudo eliminar la conversación.', [{ text: 'OK' }], 'error');
                            }
                        } catch (error) {
                            console.error('Error deleting conversation:', error);
                        }
                    }
                }
            ],
            'warning'
        );
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <BlurView intensity={20} className="flex-1">
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white h-[85%] rounded-t-3xl overflow-hidden">
                        <LinearGradient
                            colors={['#f8fafc', '#ffffff']}
                            className="flex-1"
                        >
                            {/* Header */}
                            <View className="flex-row justify-between items-center p-5 border-b border-gray-100">
                                <Text className="text-xl font-bold text-gray-800">Historial</Text>
                                <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                                    <X size={20} color="#6b7280" />
                                </TouchableOpacity>
                            </View>

                            {/* Search */}
                            <View className="px-5 py-3">
                                <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2">
                                    <Search size={18} color="#9ca3af" />
                                    <TextInput
                                        className="flex-1 ml-2 text-gray-700 text-base"
                                        placeholder="Buscar conversaciones..."
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>
                            </View>

                            {/* List */}
                            {loading && conversations.length === 0 ? (
                                <View className="flex-1 justify-center items-center">
                                    <ActivityIndicator size="large" color="#a855f7" />
                                </View>
                            ) : (
                                <FlatList
                                    data={conversations}
                                    keyExtractor={item => item.id}
                                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                                    ListEmptyComponent={
                                        <View className="items-center justify-center py-10">
                                            <MessageSquare size={48} color="#e5e7eb" />
                                            <Text className="text-gray-400 mt-4 text-center">
                                                No tienes conversaciones guardadas aún.
                                            </Text>
                                        </View>
                                    }
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            onPress={() => handleSelectConversation(item.id)}
                                            className="bg-white p-4 rounded-2xl mb-3 shadow-sm border border-gray-100 flex-row items-center justify-between"
                                        >
                                            <View className="flex-1 mr-3">
                                                <Text className="text-base font-semibold text-gray-800 mb-1" numberOfLines={1}>
                                                    {item.title}
                                                </Text>
                                                <View className="flex-row items-center">
                                                    <Clock size={12} color="#9ca3af" />
                                                    <Text className="text-xs text-gray-400 ml-1">
                                                        {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: es })}
                                                    </Text>
                                                    <Text className="text-xs text-gray-300 mx-2">•</Text>
                                                    <Text className="text-xs text-gray-400">
                                                        {item.message_count} mensajes
                                                    </Text>
                                                </View>
                                            </View>

                                            <View className="flex-row items-center">
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteConversation(item.id)}
                                                    className="p-2 mr-1"
                                                >
                                                    <Trash2 size={18} color="#ef4444" />
                                                </TouchableOpacity>
                                                <ChevronRight size={20} color="#d1d5db" />
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                            )}
                        </LinearGradient>
                    </View>
                </View>
            </BlurView>
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
        </Modal>
    );
}

const styles = StyleSheet.create({
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
