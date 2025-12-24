import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Sparkles, MessageCircle, Search, Image as ImageIcon, AlertCircle } from 'lucide-react-native';

interface EmptyStateProps {
    onQuickAction: (prompt: string) => void;
}

const quickActions = [
    {
        icon: MessageCircle,
        emoji: "💬",
        title: "Hablar sobre mis sentimientos",
        prompt: "Me gustaría hablar sobre cómo me siento hoy",
        color: "#ec4899"
    },
    {
        icon: Search,
        emoji: "🔍",
        title: "Analizar un mensaje",
        prompt: "Ayúdame a entender este mensaje de mi ex:",
        color: "#a855f7"
    },
    {
        icon: ImageIcon,
        emoji: "📱",
        title: "Analizar redes sociales",
        prompt: "Quiero analizar una publicación de mi ex en redes sociales",
        color: "#3b82f6"
    },
    {
        icon: AlertCircle,
        emoji: "🆘",
        title: "Necesito ayuda urgente",
        prompt: "Estoy teniendo un momento difícil y necesito apoyo",
        color: "#ef4444"
    }
];

function QuickActionCard({ action, onPress }: { action: typeof quickActions[0], onPress: () => void }) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 150,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="flex-1">
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                className="bg-[#2a2b32] border border-gray-700 rounded-2xl p-4 h-32 justify-between active:border-purple-500/50"
            >
                <View className="flex-row items-center mb-2">
                    <Text className="text-2xl mr-2">{action.emoji}</Text>
                </View>
                <Text className="text-white text-sm font-semibold leading-5">
                    {action.title}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function EmptyState({ onQuickAction }: EmptyStateProps) {
    return (
        <View className="flex-1 justify-center px-6">
            {/* Icon & Title */}
            <View className="items-center mb-12">
                <View className="bg-purple-600/20 rounded-full p-5 mb-6">
                    <Sparkles size={40} color="#a855f7" />
                </View>
                <Text className="text-white text-2xl font-semibold mb-3 text-center">
                    ¿Cómo puedo ayudarte hoy?
                </Text>
                <Text className="text-gray-300 text-base text-center leading-6 max-w-md">
                    Estoy aquí para apoyarte en tu proceso de recuperación emocional
                </Text>
            </View>

            {/* Quick Actions Grid - 2x2 */}
            <View className="gap-3 mb-6">
                <View className="flex-row gap-3">
                    <QuickActionCard
                        action={quickActions[0]}
                        onPress={() => onQuickAction(quickActions[0].prompt)}
                    />
                    <QuickActionCard
                        action={quickActions[1]}
                        onPress={() => onQuickAction(quickActions[1].prompt)}
                    />
                </View>
                <View className="flex-row gap-3">
                    <QuickActionCard
                        action={quickActions[2]}
                        onPress={() => onQuickAction(quickActions[2].prompt)}
                    />
                    <QuickActionCard
                        action={quickActions[3]}
                        onPress={() => onQuickAction(quickActions[3].prompt)}
                    />
                </View>
            </View>
        </View>
    );
}
