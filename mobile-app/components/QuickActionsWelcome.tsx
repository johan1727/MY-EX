import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MessageSquare, Users, Wrench, Heart, Eye, ChevronDown, ChevronUp, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface QuickActionsWelcomeProps {
    onActionPress: (tool: 'conversation' | 'social' | 'stalker' | 'decoder' | 'ex-simulator' | 'chat') => void;
    language?: 'es' | 'en';
}

// Main tools - these are prominently displayed
const MAIN_TOOLS = {
    es: [
        {
            id: 'chat' as const,
            icon: MessageSquare,
            title: 'Hablar con Coach',
            subtitle: 'Tu apoyo emocional 24/7',
            gradient: ['#a855f7', '#6366f1'],
            emoji: '💬',
            description: 'Cuéntame cómo te sientes'
        },
        {
            id: 'ex-simulator' as const,
            icon: Users,
            title: 'Simulador Ex',
            subtitle: 'Practica conversaciones difíciles',
            gradient: ['#ec4899', '#f43f5e'],
            emoji: '🎭',
            description: 'Entrena antes de hablar'
        }
    ],
    en: [
        {
            id: 'chat' as const,
            icon: MessageSquare,
            title: 'Talk to Coach',
            subtitle: 'Your 24/7 emotional support',
            gradient: ['#a855f7', '#6366f1'],
            emoji: '💬',
            description: 'Tell me how you feel'
        },
        {
            id: 'ex-simulator' as const,
            icon: Users,
            title: 'Simulador SOYREMI',
            subtitle: 'Practice difficult conversations',
            gradient: ['#ec4899', '#f43f5e'],
            emoji: '🎭',
            description: 'Train before talking'
        }
    ]
};

// Secondary tools - shown in expandable section
const SECONDARY_TOOLS = {
    es: [
        {
            id: 'decoder' as const,
            icon: Wrench,
            title: 'Decodificar Mensaje',
            subtitle: '¿Qué significa realmente?',
            gradient: ['#8b5cf6', '#6366f1'],
            emoji: '🔧'
        },
        {
            id: 'conversation' as const,
            icon: MessageSquare,
            title: 'Analizar Chat',
            subtitle: 'Patrones en conversaciones',
            gradient: ['#3b82f6', '#8b5cf6'],
            emoji: '📊'
        },
        {
            id: 'social' as const,
            icon: Heart,
            title: 'Analizar Redes',
            subtitle: 'Comportamiento online',
            gradient: ['#ec4899', '#f43f5e'],
            emoji: '💗'
        },
        {
            id: 'stalker' as const,
            icon: Eye,
            title: 'Stalker Detector',
            subtitle: '¿Te está siguiendo?',
            gradient: ['#f59e0b', '#ef4444'],
            emoji: '👁️'
        }
    ],
    en: [
        {
            id: 'decoder' as const,
            icon: Wrench,
            title: 'Decode Message',
            subtitle: 'What does it really mean?',
            gradient: ['#8b5cf6', '#6366f1'],
            emoji: '🔧'
        },
        {
            id: 'conversation' as const,
            icon: MessageSquare,
            title: 'Analyze Chat',
            subtitle: 'Conversation patterns',
            gradient: ['#3b82f6', '#8b5cf6'],
            emoji: '📊'
        },
        {
            id: 'social' as const,
            icon: Heart,
            title: 'Analyze Social Media',
            subtitle: 'Online behavior',
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
        }
    ]
};

export default function QuickActionsWelcome({ onActionPress, language = 'es' }: QuickActionsWelcomeProps) {
    const [showMore, setShowMore] = useState(false);
    const mainTools = MAIN_TOOLS[language];
    const secondaryTools = SECONDARY_TOOLS[language];

    return (
        <View className="flex-1 items-center justify-center px-6">
            {/* Header */}
            <Sparkles size={56} color="#a855f7" />
            <Text className="text-white text-3xl font-bold mt-4 text-center">
                {language === 'es' ? '¡Hola!' : 'Hello!'}
            </Text>
            <Text className="text-gray-400 text-center mt-2 leading-6 mb-6 text-base">
                {language === 'es'
                    ? 'Estoy aquí para ayudarte. ¿Qué necesitas hoy?'
                    : 'I\'m here to help you. What do you need today?'}
            </Text>

            <ScrollView
                className="w-full max-w-md"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
            >
                {/* Main Tools - Always visible */}
                <View className="gap-4 mb-4">
                    {mainTools.map((tool) => (
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
                                        <View className="bg-white/10 rounded-full p-4 mr-4">
                                            <tool.icon size={28} color="white" />
                                        </View>
                                        <View className="flex-1">
                                            <View className="flex-row items-center mb-1">
                                                <Text className="text-2xl mr-2">{tool.emoji}</Text>
                                                <Text className="text-white font-bold text-xl">
                                                    {tool.title}
                                                </Text>
                                            </View>
                                            <Text className="text-gray-400 text-sm">
                                                {tool.subtitle}
                                            </Text>
                                        </View>
                                        <View className="ml-2">
                                            <Text className="text-white text-xl">→</Text>
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Show More Button */}
                <TouchableOpacity
                    onPress={() => setShowMore(!showMore)}
                    className="flex-row items-center justify-center py-3 mb-4"
                >
                    <Text className="text-purple-400 font-medium mr-2">
                        {showMore
                            ? (language === 'es' ? 'Ver menos' : 'Show less')
                            : (language === 'es' ? 'Más herramientas' : 'More tools')
                        }
                    </Text>
                    {showMore ? (
                        <ChevronUp size={18} color="#a855f7" />
                    ) : (
                        <ChevronDown size={18} color="#a855f7" />
                    )}
                </TouchableOpacity>

                {/* Secondary Tools - Collapsible */}
                {showMore && (
                    <View className="gap-3">
                        {secondaryTools.map((tool) => (
                            <TouchableOpacity
                                key={tool.id}
                                onPress={() => onActionPress(tool.id)}
                                activeOpacity={0.8}
                                className="bg-white/5 border border-white/10 rounded-xl p-4"
                            >
                                <View className="flex-row items-center">
                                    <View
                                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                        style={{ backgroundColor: `${tool.gradient[0]}30` }}
                                    >
                                        <tool.icon size={20} color={tool.gradient[0]} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white font-semibold">
                                            {tool.emoji} {tool.title}
                                        </Text>
                                        <Text className="text-gray-500 text-xs mt-0.5">
                                            {tool.subtitle}
                                        </Text>
                                    </View>
                                    <Text className="text-gray-400">→</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

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
