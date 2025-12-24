import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, CheckCircle } from 'lucide-react-native';

export default function SimulatorDisclaimer() {
    const router = useRouter();
    const [agreed, setAgreed] = useState(false);

    return (
        <SafeAreaView className="flex-1 bg-black">
            <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-white/10 rounded-full items-center justify-center mb-6"
                >
                    <ArrowLeft size={20} color="white" />
                </TouchableOpacity>

                <View className="w-16 h-16 rounded-full bg-red-500/20 items-center justify-center mb-6 border-2 border-red-500">
                    <AlertTriangle size={32} color="#ef4444" />
                </View>

                <Text className="text-white text-4xl font-black mb-4 tracking-tight">
                    ⚠️ LEER ANTES DE CONTINUAR
                </Text>

                <Text className="text-gray-400 text-base mb-8">
                    Por tu seguridad y cumplimiento legal, debes leer y aceptar estas advertencias antes de usar el Simulador.
                </Text>

                {/* Warnings Section */}
                <View className="bg-red-500/10 p-5 rounded-2xl border-2 border-red-500/50 mb-6">
                    <Text className="text-red-400 font-black text-lg mb-4 uppercase tracking-wide">
                        Advertencias Legales Importantes:
                    </Text>

                    <View className="space-y-4">
                        <WarningItem number="1" text="Esta IA NO ES LA PERSONA REAL. Es una simulación ficticia basada en patrones de texto." />
                        <WarningItem number="2" text="La IA puede 'alucinar' (inventar información falsa o inexacta)." />
                        <WarningItem number="3" text="El contenido generado NO representa las opiniones reales de la persona." />
                        <WarningItem number="4" text="PROHIBIDO generar contenido sexual, amenazas, acoso o deepfakes." />
                        <WarningItem number="5" text="TÚ eres legalmente responsable del contenido que subes y generas." />
                        <WarningItem number="6" text="Esta función es SOLO para duelo emocional y terapia PRIVADA." />
                    </View>
                </View>

                {/* Data Consent Section */}
                <View className="bg-purple-500/10 p-5 rounded-2xl border border-purple-500/30 mb-6">
                    <Text className="text-purple-400 font-bold text-base mb-3">
                        📋 Consentimiento de Datos (Ley Mexicana LFPDPPP):
                    </Text>
                    <Text className="text-gray-300 text-sm leading-6">
                        Al continuar, declaras que:{'\n\n'}
                        <Text className="text-white">• Has obtenido el consentimiento</Text> de la otra persona para usar sus mensajes{'\n'}
                        <Text className="text-amber-400">O</Text>{'\n'}
                        <Text className="text-white">• Los datos están anonimizados</Text> (sin nombres, fotos, info sensible){'\n'}
                        <Text className="text-amber-400">O</Text>{'\n'}
                        <Text className="text-white">• No contienen información privada sensible</Text>{'\n\n'}
                        El uso no autorizado de datos personales puede constituir un <Text className="text-red-400 font-bold">delito penal en México</Text>.
                    </Text>
                </View>

                {/* Agreement Checkbox */}
                <TouchableOpacity
                    onPress={() => setAgreed(!agreed)}
                    className="flex-row items-start mb-8"
                >
                    <View className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 mt-1 ${agreed ? 'bg-purple-600 border-purple-600' : 'border-white/30'}`}>
                        {agreed && <CheckCircle size={16} color="white" />}
                    </View>
                    <Text className="flex-1 text-gray-300 text-sm leading-6">
                        He leído y <Text className="text-white font-bold">acepto estas condiciones</Text>. Entiendo los riesgos legales y las limitaciones de la IA. Confirmo que tengo el derecho legal de usar los datos que subiré.
                    </Text>
                </TouchableOpacity>

                {/* Continue Button - MORE VISIBLE */}
                <TouchableOpacity
                    disabled={!agreed}
                    onPress={() => router.push('/tools/ex-simulator/import' as any)}
                    className={`w-full py-5 rounded-2xl items-center shadow-2xl ${agreed ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gray-700'}`}
                    style={{
                        shadowColor: agreed ? '#a855f7' : '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: agreed ? 0.6 : 0.3,
                        shadowRadius: agreed ? 16 : 8,
                        elevation: agreed ? 12 : 4,
                    }}
                >
                    <Text className={`font-black uppercase tracking-widest text-base ${agreed ? 'text-white' : 'text-gray-500'}`}>
                        {agreed ? '✅ ENTENDIDO, EMPEZAR' : '❌ ACEPTA PARA CONTINUAR'}
                    </Text>
                </TouchableOpacity>

                {/* Footer */}
                <Text className="text-gray-600 text-xs text-center mt-6">
                    Esta advertencia cumple con las políticas de Google Play para apps con IA generativa y la Ley Federal de Protección de Datos Personales de México (LFPDPPP).
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const WarningItem = ({ number, text }: { number: string; text: string }) => (
    <View className="flex-row items-start">
        <View className="w-6 h-6 rounded-full bg-red-500 items-center justify-center mr-3 mt-0.5">
            <Text className="text-white text-xs font-black">{number}</Text>
        </View>
        <Text className="flex-1 text-red-100 text-sm leading-6">{text}</Text>
    </View>
);
