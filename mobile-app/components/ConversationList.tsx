import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Alert,
} from 'react-native';
import { Plus, MessageCircle, Trash2, Clock } from 'lucide-react-native';
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

    useEffect(() => {
        loadConversations();
    }, [activeConversationId]);

    const loadConversations = async () => {
        const all = await coachStorage.getAllConversations();
        setConversations(all);
    };

    const handleDelete = (conversation: CoachConversation) => {
        Alert.alert(
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
                    },
                },
            ]
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
});
