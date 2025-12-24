import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Smile, Frown, Calendar } from 'lucide-react-native';

interface PersonalityPhase {
    id: string;
    name: string;
    period: string;
    description: string;
    traits: {
        attachment: string;
        tone: string;
        communication: string;
    };
    examples: string[];
    icon: any;
    gradient: string[];
}

interface Props {
    profileData: any;
    onSelect: (phaseId: string) => void;
}

export default function PersonalitySelector({ profileData, onSelect }: Props) {
    const [selectedPhase, setSelectedPhase] = useState<string>('');
    const router = useRouter();

    // Detect phases from analysis
    const phases: PersonalityPhase[] = detectPhases(profileData);

    const handleSelect = (phaseId: string) => {
        setSelectedPhase(phaseId);

        // Save selection to profile
        const updatedProfile = {
            ...profileData,
            selectedPhase: phaseId
        };
        localStorage.setItem('exSimulator_currentProfile', JSON.stringify(updatedProfile));

        // Callback
        onSelect(phaseId);
    };

    return (
        <View className="flex-1 bg-[#0a0a0a] p-6">
            <Text className="text-white text-2xl font-bold mb-2">
                ¿Qué versión quieres simular?
            </Text>
            <Text className="text-gray-400 text-base mb-6">
                El análisis detectó diferentes momentos de la relación
            </Text>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {phases.map((phase) => (
                    <TouchableOpacity
                        key={phase.id}
                        onPress={() => handleSelect(phase.id)}
                        className="mb-4"
                    >
                        <LinearGradient
                            colors={selectedPhase === phase.id ? ['#a855f7', '#ec4899'] : ['#1a1a1a', '#0f0f0f']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="rounded-2xl p-5 border-2"
                            style={{
                                borderColor: selectedPhase === phase.id ? '#a855f7' : '#333'
                            }}
                        >
                            <View className="flex-row items-center mb-3">
                                <View className="bg-purple-500/20 p-3 rounded-full mr-3">
                                    <phase.icon size={24} color="#a855f7" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-xl font-bold">{phase.name}</Text>
                                    <Text className="text-gray-400 text-sm">{phase.period}</Text>
                                </View>
                            </View>

                            <Text className="text-gray-300 text-base mb-3">
                                {phase.description}
                            </Text>

                            <View className="bg-black/30 rounded-xl p-3 mb-3">
                                <Text className="text-purple-400 text-xs font-semibold mb-2">CARACTERÍSTICAS:</Text>
                                <Text className="text-gray-300 text-sm">
                                    Apego: <Text className="text-white font-semibold">{phase.traits.attachment}</Text>
                                </Text>
                                <Text className="text-gray-300 text-sm">
                                    Tono: <Text className="text-white font-semibold">{phase.traits.tone}</Text>
                                </Text>
                                <Text className="text-gray-300 text-sm">
                                    Comunicación: <Text className="text-white font-semibold">{phase.traits.communication}</Text>
                                </Text>
                            </View>

                            <View className="bg-black/30 rounded-xl p-3">
                                <Text className="text-purple-400 text-xs font-semibold mb-2">EJEMPLOS:</Text>
                                {phase.examples.map((example, idx) => (
                                    <Text key={idx} className="text-gray-400 text-sm italic mb-1">
                                        "{example}"
                                    </Text>
                                ))}
                            </View>

                            {selectedPhase === phase.id && (
                                <View className="mt-3 bg-purple-500/20 rounded-lg p-2">
                                    <Text className="text-purple-300 text-center text-sm font-semibold">
                                        ✓ Seleccionado
                                    </Text>
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {selectedPhase && (
                <TouchableOpacity
                    onPress={() => router.push('/tools/ex-simulator/chat' as any)}
                    className="mt-4"
                >
                    <LinearGradient
                        colors={['#a855f7', '#ec4899']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="rounded-full py-4 px-6"
                    >
                        <Text className="text-white text-center text-lg font-bold">
                            Comenzar Simulación
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </View>
    );
}

/**
 * Detect different personality phases from the analysis
 */
function detectPhases(profileData: any): PersonalityPhase[] {
    const profile = profileData.profile;

    // Basic phases based on typical relationship progression
    const phases: PersonalityPhase[] = [
        {
            id: 'happy_start',
            name: '💕 Inicio (Enamorados)',
            period: 'Primeros meses',
            description: 'Cuando todo era nuevo y emocionante. Comunicación abierta, mucho afecto.',
            traits: {
                attachment: 'Seguro/Ansioso',
                tone: 'Cariñoso y entusiasta',
                communication: 'Abierta y frecuente'
            },
            examples: [
                'te extraño mucho 💕',
                'cuando nos vemos?',
                'jajaja me haces reír mucho'
            ],
            icon: Heart,
            gradient: ['#ec4899', '#f97316']
        },
        {
            id: 'best_moment',
            name: '🌟 Mejor Momento',
            period: 'Pico de felicidad',
            description: 'El momento más estable y feliz. Balance perfecto entre intimidad y espacio.',
            traits: {
                attachment: profile.attachmentStyle || 'Seguro',
                tone: profile.emotionalTone || 'Feliz',
                communication: profile.communicationStyle || 'Directa'
            },
            examples: profile.commonPhrases?.slice(0, 3) || [
                'te amo',
                'eres el mejor',
                'gracias por todo'
            ],
            icon: Smile,
            gradient: ['#a855f7', '#ec4899']
        },
        {
            id: 'current',
            name: '📅 Momento Actual (Analizado)',
            period: 'Basado en análisis real',
            description: 'Refleja la personalidad promedio analizada de todos los mensajes.',
            traits: {
                attachment: profile.attachmentStyle || 'Mixto',
                tone: profile.emotionalTone || 'Variable',
                communication: profile.communicationStyle || 'Directa'
            },
            examples: profile.commonPhrases?.slice(0, 3) || [
                'ok',
                'si',
                'ya'
            ],
            icon: Calendar,
            gradient: ['#6366f1', '#8b5cf6']
        },
        {
            id: 'breakup',
            name: '💔 Post-Ruptura (Evitativa)',
            period: 'Después de terminar',
            description: 'Respuestas cortas, evita temas profundos, mantiene distancia emocional.',
            traits: {
                attachment: 'Evitativo',
                tone: 'Frío y distante',
                communication: 'Corta y directa'
            },
            examples: [
                'ok',
                'ya Johan',
                'déjame en paz',
                'no quiero hablar de eso'
            ],
            icon: Frown,
            gradient: ['#ef4444', '#991b1b']
        }
    ];

    return phases;
}
