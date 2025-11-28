import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Brain, Trash2, Calendar, Tag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import AppHeader from '../../components/AppHeader';
import HamburgerMenu from '../../components/HamburgerMenu';

type Memory = {
    id: string;
    key_fact: string;
    category: string;
    importance_score: number;
    created_at: string;
};

export default function MemoriesScreen() {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [menuVisible, setMenuVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMemories();
    }, []);

    const loadMemories = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_memory')
                .select('*')
                .eq('user_id', user.id)
                .order('importance_score', { ascending: false });

            if (error) throw error;
            setMemories(data || []);
        } catch (error) {
            console.error('Error loading memories:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteMemory = async (id: string) => {
        Alert.alert(
            'Delete Memory',
            'Are you sure you want to delete this memory?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('user_memory')
                                .delete()
                                .eq('id', id);

                            if (error) throw error;
                            loadMemories();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete memory');
                        }
                    }
                }
            ]
        );
    };

    const getCategoryColor = (category: string) => {
        const colors: { [key: string]: string[] } = {
            'personal_info': ['#3b82f6', '#2563eb'],
            'relationship': ['#ef4444', '#dc2626'],
            'emotions': ['#a855f7', '#9333ea'],
            'goals': ['#10b981', '#059669'],
            'default': ['#6b7280', '#4b5563']
        };
        return colors[category] || colors.default;
    };

    const renderMemory = ({ item }: { item: Memory }) => (
        <View className="bg-white/5 border border-white/10 rounded-2xl p-5 mx-6 mb-4">
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 mr-3">
                    <Text className="text-white text-base font-semibold leading-6 mb-2">
                        {item.key_fact}
                    </Text>
                    <View className="flex-row items-center flex-wrap">
                        <View className="flex-row items-center mr-4 mb-2">
                            <Tag size={14} color="#6b7280" />
                            <Text className="text-gray-400 text-xs ml-1 capitalize">
                                {item.category.replace('_', ' ')}
                            </Text>
                        </View>
                        <View className="flex-row items-center mb-2">
                            <Calendar size={14} color="#6b7280" />
                            <Text className="text-gray-400 text-xs ml-1">
                                {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>
                </View>
                <View className="items-end">
                    <View className="mb-2">
                        <LinearGradient
                            colors={getCategoryColor(item.category)}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="px-3 py-1 rounded-full"
                        >
                            <Text className="text-white text-xs font-bold">
                                {item.importance_score}/10
                            </Text>
                        </LinearGradient>
                    </View>
                    <TouchableOpacity
                        onPress={() => deleteMemory(item.id)}
                        className="w-8 h-8 bg-red-500/20 rounded-full items-center justify-center"
                    >
                        <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-black">
            <StatusBar style="light" />

            <LinearGradient
                colors={['#0a0a0a', '#1a1a2e', '#16213e', '#0a0a0a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            <SafeAreaView className="flex-1">
                <AppHeader
                    title="Your Memories"
                    subtitle="What I remember about you"
                    onMenuPress={() => setMenuVisible(true)}
                />

                <HamburgerMenu
                    visible={menuVisible}
                    onClose={() => setMenuVisible(false)}
                />

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <Text className="text-gray-400">Loading memories...</Text>
                    </View>
                ) : memories.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Brain size={64} color="#a855f7" />
                        <Text className="text-white text-2xl font-bold mt-6 text-center">
                            No Memories Yet
                        </Text>
                        <Text className="text-gray-400 text-center mt-3 leading-6">
                            As we chat, I'll remember important things about you and your journey
                        </Text>
                        <View className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 mt-6 w-full">
                            <Text className="text-purple-400 text-sm text-center">
                                💡 The more we talk, the better I can support you
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View className="flex-1">
                        {/* Stats Header */}
                        <View className="px-6 py-4">
                            <View className="bg-white/5 border border-white/10 rounded-2xl p-4 flex-row justify-around">
                                <View className="items-center">
                                    <Text className="text-3xl font-bold text-white">{memories.length}</Text>
                                    <Text className="text-gray-400 text-xs mt-1">Total Memories</Text>
                                </View>
                                <View className="w-px bg-white/10" />
                                <View className="items-center">
                                    <Text className="text-3xl font-bold text-white">
                                        {Math.round(memories.reduce((sum, m) => sum + m.importance_score, 0) / memories.length)}
                                    </Text>
                                    <Text className="text-gray-400 text-xs mt-1">Avg. Importance</Text>
                                </View>
                            </View>
                        </View>

                        {/* Memories List */}
                        <FlatList
                            data={memories}
                            keyExtractor={(item) => item.id}
                            renderItem={renderMemory}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}
