import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { MessageSquare, Heart, Eye, Wrench, Mic, AlertTriangle, BookOpen, TrendingUp } from 'lucide-react-native';

interface ToolsToolbarProps {
    onToolSelect: (tool: string) => void;
    language?: 'es' | 'en';
}

export default function ToolsToolbar({ onToolSelect, language = 'es' }: ToolsToolbarProps) {
    const [selectedTool, setSelectedTool] = useState<string | null>(null);

    const tools = [
        {
            id: 'decoder',
            icon: Wrench,
            label: language === 'es' ? 'Decodificador' : 'Decoder',
            color: '#8b5cf6',
            tooltip: language === 'es'
                ? 'Analiza mensajes de tu ex y obtén respuestas sugeridas inteligentes'
                : 'Analyze your ex\'s messages and get smart suggested replies'
        },
        {
            id: 'journal',
            icon: BookOpen,
            label: language === 'es' ? 'Diario' : 'Journal',
            color: '#10b981',
            tooltip: language === 'es'
                ? 'Registra tus emociones y obtén análisis semanales de tu progreso'
                : 'Log your emotions and get weekly analysis of your progress'
        },
        {
            id: 'panic',
            icon: AlertTriangle,
            label: language === 'es' ? 'Pánico' : 'Panic',
            color: '#ef4444',
            tooltip: language === 'es'
                ? 'Botón de emergencia con técnicas de respiración y apoyo inmediato'
                : 'Emergency button with breathing techniques and immediate support'
        },
        {
            id: 'progress',
            icon: TrendingUp,
            label: language === 'es' ? 'Progreso' : 'Progress',
            color: '#f59e0b',
            tooltip: language === 'es'
                ? 'Visualiza tu racha sin contacto, logros desbloqueados y estadísticas'
                : 'View your no-contact streak, unlocked achievements, and stats'
        },
        {
            id: 'conversation',
            icon: MessageSquare,
            label: language === 'es' ? 'Analizar Chat' : 'Analyze Chat',
            color: '#3b82f6',
            tooltip: language === 'es'
                ? 'Analiza conversaciones completas con tu ex para detectar patrones'
                : 'Analyze full conversations with your ex to detect patterns'
        },
        {
            id: 'social',
            icon: Heart,
            label: language === 'es' ? 'Redes Sociales' : 'Social Media',
            color: '#ec4899',
            tooltip: language === 'es'
                ? 'Analiza publicaciones de redes sociales de tu ex (Reels, TikToks)'
                : 'Analyze your ex\'s social media posts (Reels, TikToks)'
        },
        {
            id: 'stalker',
            icon: Eye,
            label: language === 'es' ? 'Stalker Detector' : 'Stalker Detector',
            color: '#f97316',
            tooltip: language === 'es'
                ? 'Detecta si tu ex está stalkeando tus redes sociales y obtén consejos'
                : 'Detect if your ex is stalking your social media and get advice'
        },
    ];

    const handleToolPress = (toolId: string) => {
        setSelectedTool(toolId);
        setTimeout(() => {
            setSelectedTool(null);
            onToolSelect(toolId);
        }, 1500);
    };

    return (
        <>
            <View className="border-t border-white/10 bg-[#0a0a0a] py-2">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                    {tools.map((tool) => (
                        <TouchableOpacity
                            key={tool.id}
                            onPress={() => handleToolPress(tool.id)}
                            className="items-center mr-6"
                        >
                            <View
                                className="w-10 h-10 rounded-full items-center justify-center mb-1"
                                style={{ backgroundColor: `${tool.color}20` }}
                            >
                                <tool.icon size={20} color={tool.color} />
                            </View>
                            <Text className="text-gray-400 text-[10px] font-medium">
                                {tool.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Tooltip Modal */}
            <Modal
                visible={selectedTool !== null}
                transparent
                animationType="fade"
            >
                <View className="flex-1 items-center justify-center bg-black/70 px-8">
                    {selectedTool && (
                        <View className="bg-[#1a1a2e] border border-white/20 rounded-2xl p-6 max-w-sm">
                            <View className="flex-row items-center mb-3">
                                {(() => {
                                    const tool = tools.find(t => t.id === selectedTool);
                                    if (!tool) return null;
                                    const Icon = tool.icon;
                                    return (
                                        <>
                                            <View
                                                className="w-12 h-12 rounded-full items-center justify-center mr-3"
                                                style={{ backgroundColor: `${tool.color}30` }}
                                            >
                                                <Icon size={24} color={tool.color} />
                                            </View>
                                            <Text className="text-white text-xl font-bold flex-1">
                                                {tool.label}
                                            </Text>
                                        </>
                                    );
                                })()}
                            </View>
                            <Text className="text-gray-300 text-sm leading-relaxed">
                                {tools.find(t => t.id === selectedTool)?.tooltip}
                            </Text>
                        </View>
                    )}
                </View>
            </Modal>
        </>
    );
}
