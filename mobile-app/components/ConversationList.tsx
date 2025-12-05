import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { MessageSquare, MoreVertical, Edit2, Trash2, Plus, Search, Check, X } from 'lucide-react-native';

export interface Conversation {
    id: string;
    title: string;
    last_message_at: string;
    message_count: number;
    created_at: string;
}

interface ConversationListProps {
    conversations: Conversation[];
    activeId: string | null;
    onSelect: (id: string) => void;
    onRename: (id: string, newTitle: string) => void;
    onDelete: (id: string) => void;
    onNew: () => void;
}

export default function ConversationList({
    conversations,
    activeId,
    onSelect,
    onRename,
    onDelete,
    onNew
}: ConversationListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null);

    const filteredConversations = conversations.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleStartEdit = (conv: Conversation) => {
        setEditingId(conv.id);
        setEditTitle(conv.title);
        setMenuVisibleId(null);
    };

    const handleSaveEdit = () => {
        if (editingId && editTitle.trim()) {
            onRename(editingId, editTitle.trim());
            setEditingId(null);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Eliminar conversación',
            '¿Estás seguro? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => {
                        onDelete(id);
                        setMenuVisibleId(null);
                    }
                }
            ]
        );
    };

    return (
        <View className="flex-1">
            {/* Search and New Chat */}
            <View className="px-4 py-3 border-b border-white/10">
                <TouchableOpacity
                    onPress={onNew}
                    className="flex-row items-center justify-center bg-purple-600 rounded-xl py-3 mb-3 active:bg-purple-700"
                >
                    <Plus size={20} color="white" className="mr-2" />
                    <Text className="text-white font-semibold">Nueva Conversación</Text>
                </TouchableOpacity>

                <View className="flex-row items-center bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                    <Search size={16} color="#9ca3af" className="mr-2" />
                    <TextInput
                        placeholder="Buscar..."
                        placeholderTextColor="#9ca3af"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="flex-1 text-white text-sm h-8"
                    />
                </View>
            </View>

            {/* Conversations List */}
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="px-2 py-2">
                    <Text className="text-gray-500 text-xs font-semibold uppercase mb-2 px-3">
                        Historial
                    </Text>

                    {filteredConversations.length === 0 ? (
                        <View className="items-center justify-center py-8 opacity-50">
                            <MessageSquare size={32} color="#6b7280" />
                            <Text className="text-gray-500 text-xs mt-2 text-center">
                                {searchQuery ? 'No se encontraron resultados' : 'No hay conversaciones'}
                            </Text>
                        </View>
                    ) : (
                        filteredConversations.map((conv) => (
                            <View key={conv.id} className="mb-1 relative z-0">
                                <TouchableOpacity
                                    onPress={() => onSelect(conv.id)}
                                    className={`flex-row items-center px-3 py-3 rounded-xl group ${activeId === conv.id ? 'bg-white/10' : 'hover:bg-white/5'
                                        }`}
                                >
                                    <MessageSquare
                                        size={18}
                                        color={activeId === conv.id ? '#ffffff' : '#9ca3af'}
                                        className="mr-3"
                                    />

                                    {editingId === conv.id ? (
                                        <View className="flex-1 flex-row items-center">
                                            <TextInput
                                                value={editTitle}
                                                onChangeText={setEditTitle}
                                                className="flex-1 text-white text-sm bg-black/50 rounded px-2 py-1 mr-2 border border-purple-500"
                                                autoFocus
                                                onSubmitEditing={handleSaveEdit}
                                            />
                                            <TouchableOpacity onPress={handleSaveEdit} className="p-1">
                                                <Check size={16} color="#22c55e" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => setEditingId(null)} className="p-1">
                                                <X size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <>
                                            <View className="flex-1 mr-2">
                                                <Text
                                                    numberOfLines={1}
                                                    className={`text-sm ${activeId === conv.id ? 'text-white font-medium' : 'text-gray-400'}`}
                                                >
                                                    {conv.title}
                                                </Text>
                                                <Text className="text-[10px] text-gray-600 mt-0.5">
                                                    {new Date(conv.last_message_at || conv.created_at || Date.now()).toLocaleDateString()}
                                                </Text>
                                            </View>

                                            <TouchableOpacity
                                                onPress={() => setMenuVisibleId(menuVisibleId === conv.id ? null : conv.id)}
                                                className={`p-1 rounded-lg ${menuVisibleId === conv.id ? 'bg-white/10' : ''}`}
                                            >
                                                <MoreVertical size={16} color="#6b7280" />
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </TouchableOpacity>

                                {/* Context Menu */}
                                {menuVisibleId === conv.id && (
                                    <View className="absolute right-2 top-10 bg-[#1a1a2e] border border-white/10 rounded-lg p-1 z-50 shadow-lg min-w-[120px]">
                                        <TouchableOpacity
                                            onPress={() => handleStartEdit(conv)}
                                            className="flex-row items-center px-3 py-2 hover:bg-white/5 rounded-md"
                                        >
                                            <Edit2 size={14} color="#9ca3af" className="mr-2" />
                                            <Text className="text-gray-300 text-xs">Renombrar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDelete(conv.id)}
                                            className="flex-row items-center px-3 py-2 hover:bg-white/5 rounded-md"
                                        >
                                            <Trash2 size={14} color="#ef4444" className="mr-2" />
                                            <Text className="text-red-400 text-xs">Eliminar</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
