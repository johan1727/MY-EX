import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Sparkles } from 'lucide-react-native';

interface EmptyStateProps {
    onQuickAction: (action: string) => void;
}

const examplePrompts = [
    "Me gustaría hablar sobre mis sentimientos",
    "¿Podrías darme algunos temas para empezar?",
    "Necesito ayuda para procesar mi ruptura"
];

export default function EmptyState({ onQuickAction }: EmptyStateProps) {
    return (
        <View className="flex-1 justify-center px-6">
            {/* Icon & Title */}
            <View className="items-center mb-12">
                <View className="bg-purple-500/10 rounded-full p-5 mb-6">
                    <Sparkles size={40} color="#8B5CF6" />
                </View>
                <Text className="text-white text-2xl font-semibold mb-3 text-center">
                    ¿Cómo puedo ayudarte hoy?
                </Text>
                <Text className="text-gray-400 text-base text-center leading-6 max-w-md">
                    Estoy aquí para apoyarte en tu proceso de recuperación emocional
                </Text>
            </View>

            {/* Example Prompts */}
            <View className="gap-3 mb-6">
                {examplePrompts.map((prompt, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => onQuickAction('chat')}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 active:bg-white/10"
                    >
                        <Text className="text-gray-300 text-[15px]">
                            {prompt}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}
