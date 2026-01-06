import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,

    Modal,
} from 'react-native';
import { Plus, MessageCircle, Trash2, Clock, X, HelpCircle, Sparkles, LogOut } from 'lucide-react-native';
import { CoachConversation, coachStorage } from '../lib/coachStorage';

interface ConversationListProps {
    activeConversationId: string | null;
    onSelectConversation: (conversation: CoachConversation) => void;
    onNewConversation: () => void;
}

export default function ConversationList({
    activeConversationId,
    onSelectConversation,
    onNewConversation,
}: ConversationListProps) {
    const [conversations, setConversations] = useState<CoachConversation[]>([]);

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
        loadConversations();
    }, [activeConversationId]);

    const loadConversations = async () => {
        const all = await coachStorage.getAllConversations();
        setConversations(all);
    };

    const handleDelete = (conversation: CoachConversation) => {
        showAlert(
            'Eliminar conversación',
            '¿Estás seguro de eliminar esta conversación?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        await coachStorage.deleteConversation(conversation.id);
                        await loadConversations();
                        closeAlert(); // Make sure to close alert after action
                    },
                },
            ],
            'warning'
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Hoy';
        if (days === 1) return 'Ayer';
        if (days < 7) return `Hace ${days} días`;
        return date.toLocaleDateString();
    };

    const renderItem = ({ item }: { item: CoachConversation }) => (
        <TouchableOpacity
            style={[
                styles.conversationItem,
                activeConversationId === item.id && styles.activeItem,
            ]}
            onPress={() => onSelectConversation(item)}
            onLongPress={() => handleDelete(item)}
        >
            <View style={styles.iconContainer}>
                <MessageCircle size={20} color="#a855f7" />
            </View>
            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                </Text>
                <View style={styles.meta}>
                    <Clock size={12} color="#6b7280" />
                    <Text style={styles.date}>{formatDate(item.lastUpdated)}</Text>
                    <Text style={styles.messageCount}>
                        {item.messages.length} msgs
                    </Text>
                </View>
            </View>
            {activeConversationId === item.id && (
                <View style={styles.activeIndicator} />
            )}
        </TouchableOpacity>
    );

    return (
        <>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Conversaciones</Text>
                    <TouchableOpacity
                        style={styles.newButton}
                        onPress={onNewConversation}
                    >
                        <Plus size={18} color="#a855f7" />
                    </TouchableOpacity>
                </View>

                {conversations.length === 0 ? (
                    <View style={styles.empty}>
                        <MessageCircle size={32} color="#6b7280" />
                        <Text style={styles.emptyText}>
                            Sin conversaciones aún
                        </Text>
                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={onNewConversation}
                        >
                            <Plus size={16} color="#fff" />
                            <Text style={styles.startButtonText}>Nueva</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={conversations}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.list}
                    />

                )}
            </View>
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
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9ca3af',
        textTransform: 'uppercase',
    },
    newButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        paddingVertical: 8,
    },
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 8,
        marginVertical: 2,
        borderRadius: 12,
        backgroundColor: 'transparent',
    },
    activeItem: {
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '500',
        color: '#fff',
        marginBottom: 4,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    date: {
        fontSize: 11,
        color: '#6b7280',
    },
    messageCount: {
        fontSize: 11,
        color: '#6b7280',
        marginLeft: 8,
    },
    activeIndicator: {
        width: 4,
        height: 24,
        borderRadius: 2,
        backgroundColor: '#a855f7',
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 12,
        marginBottom: 16,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#a855f7',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 8,
    },
    startButtonText: {
        fontSize: 14,
        fontWeight: '600',
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
