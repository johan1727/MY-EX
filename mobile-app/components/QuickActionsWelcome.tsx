import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MessageSquare, Wrench, Heart, Eye, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface QuickActionsWelcomeProps {
    onActionPress: (tool: 'conversation' | 'social' | 'stalker' | 'decoder') => void;
    language?: 'es' | 'en';
}

const TOOLS = {
    es: [
        {
            id: 'conversation' as const,
            icon: MessageSquare,
            title: 'Analizar Conversación',
            subtitle: 'Descubre patrones ocultos en tus chats',
            gradient: ['#3b82f6', '#8b5cf6'],
            emoji: '💬'
        },
        {
            id: 'social' as const,
            icon: Heart,
            title: 'Revisar Redes Sociales',
            subtitle: 'Analiza su comportamiento online',
            gradient: ['#ec4899', '#f43f5e'],
            emoji: '💗'
        },
        {
            id: 'stalker' as const,
            icon: Eye,
            title: 'Detector de Stalking',
            subtitle: '¿Te está siguiendo?',
            gradient: ['#f59e0b', '#ef4444'],
            emoji: '👁️'
        },
        {
            id: 'decoder' as const,
            icon: Wrench,
            title: 'Decodificar Mensaje',
            subtitle: '¿Qué significa realmente?',
            gradient: ['#8b5cf6', '#6366f1'],
            emoji: '🔧'
        }
    ],
    en: [
        {
            id: 'conversation' as const,
            icon: MessageSquare,
            title: 'Analyze Conversation',
            subtitle: 'Discover hidden patterns in your chats',
            gradient: ['#3b82f6', '#8b5cf6'],
            emoji: '💬'
        },
        {
            id: 'social' as const,
            icon: Heart,
            title: 'Check Social Media',
            subtitle: 'Analyze their online behavior',
            gradient: ['#ec4899', '#f43f5e'],
            emoji: '💗'
        },
        {
            id: 'stalker' as const,
            icon: Eye,
            title: 'Stalker Detector',
            subtitle: 'Are they following you?',
            gradient: ['#f59e0b', '#ef4444'],
            emoji: '👁️'
        },
        {
            id: 'decoder' as const,
            icon: Wrench,
            title: 'Decode Message',
            subtitle: 'What does it really mean?',
            gradient: ['#8b5cf6', '#6366f1'],
            emoji: '🔧'
        }
    ]
};

export default function QuickActionsWelcome({ onActionPress, language = 'es' }: QuickActionsWelcomeProps) {
    const tools = TOOLS[language];

    return (
        <View className="flex-1 items-center justify-center px-6">
            {/* Header */}
            <Sparkles size={64} color="#a855f7" />
            <Text className="text-white text-3xl font-bold mt-6 text-center">
                {language === 'es' ? '¡Hola!' : 'Hello!'}
            </Text>
            <Text className="text-gray-400 text-center mt-3 leading-6 mb-8 text-base">
                {language === 'es'
                    ? 'Estoy aquí para ayudarte. ¿Qué quieres hacer hoy?'
                    : 'I\'m here to help you. What would you like to do today?'}
            </Text>

            {/* Tool Cards */}
            <ScrollView
                className="w-full max-w-md"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
            >
                <View className="gap-4">
                    {tools.map((tool) => (
                        <TouchableOpacity
                            key={tool.id}
                            onPress={() => onActionPress(tool.id)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={tool.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="rounded-2xl p-0.5"
                            >
                                <View className="bg-[#1a1a2e] rounded-2xl p-5">
                                    <View className="flex-row items-center">
                                        {/* Icon */}
                                        <View className="bg-white/10 rounded-full p-3 mr-4">
                                            <tool.icon size={24} color="white" />
                                        </View>

                                        {/* Content */}
                                        <View className="flex-1">
                                            <View className="flex-row items-center mb-1">
                                                <Text className="text-2xl mr-2">{tool.emoji}</Text>
                                                <Text className="text-white font-bold text-lg">
                                                    {tool.title}
                                                </Text>
                                            </View>
                                            <Text className="text-gray-400 text-sm leading-5">
                                                {tool.subtitle}
                                            </Text>
                                        </View>

                                        {/* Arrow */}
                                        <View className="ml-2">
                                            <Text className="text-white text-xl">→</Text>
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Bottom hint */}
                <Text className="text-gray-500 text-center mt-6 text-sm">
                    {language === 'es'
                        ? 'O simplemente escribe tu mensaje abajo'
                        : 'Or just type your message below'}
                </Text>
            </ScrollView>
        </View>
    );
}
