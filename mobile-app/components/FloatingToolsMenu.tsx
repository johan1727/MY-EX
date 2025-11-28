import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Menu, MessageSquare, Heart, Eye, Wrench, Mic, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface FloatingToolsMenuProps {
    onToolSelect: (tool: 'conversation' | 'social' | 'stalker' | 'decoder') => void;
    language?: 'es' | 'en';
}

const TOOLS = {
    es: {
        analysis: {
            title: 'Análisis',
            items: [
                { id: 'conversation' as const, icon: MessageSquare, label: 'Conversación', color: '#3b82f6' },
                { id: 'social' as const, icon: Heart, label: 'Redes Sociales', color: '#ec4899' }
            ]
        },
        tools: {
            title: 'Herramientas',
            items: [
                { id: 'decoder' as const, icon: Wrench, label: 'Decodificador', color: '#8b5cf6' },
                { id: 'stalker' as const, icon: Eye, label: 'Stalker Detector', color: '#f59e0b' }
            ]
        }
    },
    en: {
        analysis: {
            title: 'Analysis',
            items: [
                { id: 'conversation' as const, icon: MessageSquare, label: 'Conversation', color: '#3b82f6' },
                { id: 'social' as const, icon: Heart, label: 'Social Media', color: '#ec4899' }
            ]
        },
        tools: {
            title: 'Tools',
            items: [
                { id: 'decoder' as const, icon: Wrench, label: 'Decoder', color: '#8b5cf6' },
                { id: 'stalker' as const, icon: Eye, label: 'Stalker Detector', color: '#f59e0b' }
            ]
        }
    }
};

export default function FloatingToolsMenu({ onToolSelect, language = 'es' }: FloatingToolsMenuProps) {
    const [menuVisible, setMenuVisible] = useState(false);
    const tools = TOOLS[language];

    const handleToolSelect = (toolId: 'conversation' | 'social' | 'stalker' | 'decoder') => {
        setMenuVisible(false);
        setTimeout(() => onToolSelect(toolId), 200);
    };

    return (
        <>
            {/* Trigger Button */}
            <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                className="w-9 h-9 items-center justify-center rounded-full bg-white/10 ml-2"
            >
                <Menu size={18} color="#a855f7" />
            </TouchableOpacity>

            {/* Menu Modal */}
            <Modal
                visible={menuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setMenuVisible(false)}
                    className="flex-1 bg-black/60"
                >
                    <View className="flex-1 items-end justify-end p-4 pb-24">
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={(e) => e.stopPropagation()}
                            className="w-64"
                        >
                            <BlurView
                                intensity={80}
                                tint="dark"
                                className="rounded-2xl overflow-hidden border border-white/10"
                            >
                                <LinearGradient
                                    colors={['#1a1a2e', '#16213e']}
                                    className="p-4"
                                >
                                    {/* Header */}
                                    <View className="flex-row items-center justify-between mb-4">
                                        <Text className="text-white font-bold text-lg">
                                            {language === 'es' ? 'Herramientas' : 'Tools'}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => setMenuVisible(false)}
                                            className="bg-white/10 rounded-full p-1"
                                        >
                                            <X size={16} color="#9ca3af" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Analysis Section */}
                                    <View className="mb-4">
                                        <Text className="text-gray-400 text-xs font-semibold mb-2 uppercase">
                                            {tools.analysis.title}
                                        </Text>
                                        {tools.analysis.items.map((item) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                onPress={() => handleToolSelect(item.id)}
                                                className="flex-row items-center bg-white/5 rounded-xl p-3 mb-2"
                                            >
                                                <View
                                                    className="w-8 h-8 rounded-full items-center justify-center mr-3"
                                                    style={{ backgroundColor: `${item.color}20` }}
                                                >
                                                    <item.icon size={16} color={item.color} />
                                                </View>
                                                <Text className="text-white flex-1">{item.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {/* Tools Section */}
                                    <View>
                                        <Text className="text-gray-400 text-xs font-semibold mb-2 uppercase">
                                            {tools.tools.title}
                                        </Text>
                                        {tools.tools.items.map((item) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                onPress={() => handleToolSelect(item.id)}
                                                className="flex-row items-center bg-white/5 rounded-xl p-3 mb-2"
                                            >
                                                <View
                                                    className="w-8 h-8 rounded-full items-center justify-center mr-3"
                                                    style={{ backgroundColor: `${item.color}20` }}
                                                >
                                                    <item.icon size={16} color={item.color} />
                                                </View>
                                                <Text className="text-white flex-1">{item.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </LinearGradient>
                            </BlurView>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}
