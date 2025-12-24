import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { Flag, Sparkles } from 'lucide-react-native';
import { reportContent, type ContentReport } from '../lib/contentModeration';

interface ChatMessageProps {
    message: {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        isAI?: boolean;
    };
    showReportButton?: boolean;
}

export default function ChatMessage({ message, showReportButton = true }: ChatMessageProps) {
    const [reporting, setReporting] = useState(false);
    const isAI = message.role === 'assistant' || message.isAI;

    const handleReport = async () => {
        if (Platform.OS === 'web') {
            const reasons = [
                'offensive - Contenido ofensivo',
                'inappropriate - Contenido inapropiado',
                'harmful - Contenido dañino',
                'false_information - Información falsa',
                'other - Otro'
            ];

            const reason = prompt(`¿Por qué reportas este contenido?\n\n${reasons.join('\n')}\n\nEscribe la categoría:`);
            if (!reason) return;

            const category = reason.split(' - ')[0] as ContentReport['reason'];
            await submitReport(category);
        } else {
            // Mobile - usar ActionSheet
            Alert.alert(
                'Reportar Contenido',
                '¿Por qué razón reportas este mensaje generado por IA?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Contenido ofensivo', onPress: () => submitReport('offensive') },
                    { text: 'Contenido inapropiado', onPress: () => submitReport('inappropriate') },
                    { text: 'Contenido dañino', onPress: () => submitReport('harmful') },
                    { text: 'Información falsa', onPress: () => submitReport('false_information') },
                    { text: 'Otro', onPress: () => submitReport('other') },
                ]
            );
        }
    };

    const submitReport = async (reason: ContentReport['reason']) => {
        setReporting(true);
        const result = await reportContent({
            message_id: message.id,
            message_content: message.content,
            reason,
            reported_at: new Date().toISOString(),
        });

        setReporting(false);

        if (result.success) {
            if (Platform.OS === 'web') {
                alert('✅ Gracias por tu reporte. Lo revisaremos pronto.');
            } else {
                Alert.alert('Reporte Enviado', 'Gracias por tu reporte. Lo revisaremos pronto.');
            }
        } else {
            if (Platform.OS === 'web') {
                alert('❌ Error al enviar el reporte. Intenta de nuevo.');
            } else {
                Alert.alert('Error', 'No pudimos enviar el reporte. Intenta de nuevo.');
            }
        }
    };

    return (
        <View className={`flex-row ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
            <View className={`max-w-[80%] p-4 rounded-2xl ${message.role === 'user'
                    ? 'bg-purple-600'
                    : 'bg-[#1c1c1e] border border-white/10'
                }`}>
                <Text className="text-white text-base leading-6">
                    {message.content}
                </Text>

                {/* AI Label - Required by Google Play (Jan 2025) */}
                {isAI && (
                    <View className="flex-row items-center mt-3 pt-3 border-t border-white/10">
                        <Sparkles size={12} color="#9ca3af" />
                        <Text className="text-gray-400 text-xs ml-1.5 font-medium">
                            Generado por IA
                        </Text>

                        {/* Report Button - Required by Google Play (Jan 31, 2024) */}
                        {showReportButton && (
                            <TouchableOpacity
                                onPress={handleReport}
                                disabled={reporting}
                                className="ml-auto flex-row items-center bg-red-500/10 px-2 py-1 rounded-lg"
                            >
                                <Flag size={12} color={reporting ? '#999' : '#ef4444'} />
                                <Text className="text-red-400 text-xs ml-1 font-medium">
                                    {reporting ? 'Enviando...' : 'Reportar'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Watermark for Simulator messages */}
                {isAI && message.content.length > 100 && (
                    <Text className="text-gray-600 text-[10px] mt-2 leading-4">
                        🤖 No representa a la persona real | Solo fines terapéuticos privados
                    </Text>
                )}
            </View>
        </View>
    );
}
