import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { ChevronDown, ChevronRight, MessageSquare, Send, Camera } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ExportGuideProps {
    onClose?: () => void;
}

export default function ExportGuide({ onClose }: ExportGuideProps) {
    const [expandedSection, setExpandedSection] = useState<string | null>('whatsapp');

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <ScrollView className="flex-1 bg-[#0a0a0a]">
            <LinearGradient
                colors={['#1a1a2e', '#16213e', '#0a0a0a']}
                className="p-6"
            >
                <Text className="text-white text-2xl font-bold mb-2">
                    📚 Guía de Exportación
                </Text>
                <Text className="text-gray-400 mb-6">
                    Sigue estos pasos para exportar tu conversación con tu ex
                </Text>

                {/* WhatsApp Section */}
                <TouchableOpacity
                    onPress={() => toggleSection('whatsapp')}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3"
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <View className="bg-green-500/20 p-2 rounded-full mr-3">
                                <MessageSquare size={20} color="#22c55e" />
                            </View>
                            <Text className="text-white font-semibold text-lg">WhatsApp</Text>
                        </View>
                        {expandedSection === 'whatsapp' ? (
                            <ChevronDown size={20} color="#9ca3af" />
                        ) : (
                            <ChevronRight size={20} color="#9ca3af" />
                        )}
                    </View>
                </TouchableOpacity>

                {expandedSection === 'whatsapp' && (
                    <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                        <Text className="text-white font-semibold mb-3">Pasos para exportar:</Text>

                        <View className="mb-3">
                            <Text className="text-purple-400 font-bold mb-1">1. Abre el chat</Text>
                            <Text className="text-gray-300 leading-6">
                                Abre la conversación con tu ex en WhatsApp
                            </Text>
                        </View>

                        <View className="mb-3">
                            <Text className="text-purple-400 font-bold mb-1">2. Menú de opciones</Text>
                            <Text className="text-gray-300 leading-6">
                                Toca los 3 puntos (⋮) en la esquina superior derecha
                            </Text>
                        </View>

                        <View className="mb-3">
                            <Text className="text-purple-400 font-bold mb-1">3. Exportar chat</Text>
                            <Text className="text-gray-300 leading-6">
                                Selecciona "Más" → "Exportar chat"
                            </Text>
                        </View>

                        <View className="mb-3">
                            <Text className="text-purple-400 font-bold mb-1">4. Sin archivos multimedia</Text>
                            <Text className="text-gray-300 leading-6">
                                Elige "Sin archivos multimedia" (más rápido y ligero)
                            </Text>
                        </View>

                        <View className="mb-4">
                            <Text className="text-purple-400 font-bold mb-1">5. Guardar archivo</Text>
                            <Text className="text-gray-300 leading-6">
                                Guarda el archivo .txt y súbelo en la siguiente pantalla
                            </Text>
                        </View>

                        <View className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                            <Text className="text-blue-400 text-sm font-semibold mb-1">💡 Formato esperado:</Text>
                            <Text className="text-gray-400 text-xs font-mono">
                                01/15/2024, 10:30 AM - Tú: Hola{'\n'}
                                01/15/2024, 10:32 AM - Ex: Hola
                            </Text>
                        </View>
                    </View>
                )}

                {/* Telegram Section */}
                <TouchableOpacity
                    onPress={() => toggleSection('telegram')}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3"
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <View className="bg-blue-500/20 p-2 rounded-full mr-3">
                                <Send size={20} color="#3b82f6" />
                            </View>
                            <Text className="text-white font-semibold text-lg">Telegram</Text>
                        </View>
                        {expandedSection === 'telegram' ? (
                            <ChevronDown size={20} color="#9ca3af" />
                        ) : (
                            <ChevronRight size={20} color="#9ca3af" />
                        )}
                    </View>
                </TouchableOpacity>

                {expandedSection === 'telegram' && (
                    <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                        <Text className="text-white font-semibold mb-3">Pasos para exportar:</Text>

                        <View className="mb-3">
                            <Text className="text-purple-400 font-bold mb-1">1. Abre el chat</Text>
                            <Text className="text-gray-300 leading-6">
                                Abre la conversación con tu ex en Telegram
                            </Text>
                        </View>

                        <View className="mb-3">
                            <Text className="text-purple-400 font-bold mb-1">2. Menú de opciones</Text>
                            <Text className="text-gray-300 leading-6">
                                Toca los 3 puntos (⋮) en la esquina superior derecha
                            </Text>
                        </View>

                        <View className="mb-3">
                            <Text className="text-purple-400 font-bold mb-1">3. Exportar historial</Text>
                            <Text className="text-gray-300 leading-6">
                                Selecciona "Exportar historial de chat"
                            </Text>
                        </View>

                        <View className="mb-4">
                            <Text className="text-purple-400 font-bold mb-1">4. Formato JSON</Text>
                            <Text className="text-gray-300 leading-6">
                                Elige formato "JSON" y espera a que se genere el archivo
                            </Text>
                        </View>

                        <View className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                            <Text className="text-blue-400 text-sm font-semibold mb-1">⚠️ Nota:</Text>
                            <Text className="text-gray-400 text-xs">
                                El export de Telegram puede tardar varios minutos si la conversación es larga
                            </Text>
                        </View>
                    </View>
                )}

                {/* Screenshots Section */}
                <TouchableOpacity
                    onPress={() => toggleSection('screenshots')}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3"
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <View className="bg-purple-500/20 p-2 rounded-full mr-3">
                                <Camera size={20} color="#a855f7" />
                            </View>
                            <Text className="text-white font-semibold text-lg">Screenshots (OCR)</Text>
                        </View>
                        {expandedSection === 'screenshots' ? (
                            <ChevronDown size={20} color="#9ca3af" />
                        ) : (
                            <ChevronRight size={20} color="#9ca3af" />
                        )}
                    </View>
                </TouchableOpacity>

                {expandedSection === 'screenshots' && (
                    <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                        <Text className="text-white font-semibold mb-3">Pasos para capturar:</Text>

                        <View className="mb-3">
                            <Text className="text-purple-400 font-bold mb-1">1. Toma capturas</Text>
                            <Text className="text-gray-300 leading-6">
                                Toma capturas de pantalla de la conversación (máximo 20)
                            </Text>
                        </View>

                        <View className="mb-3">
                            <Text className="text-purple-400 font-bold mb-1">2. Asegura legibilidad</Text>
                            <Text className="text-gray-300 leading-6">
                                Verifica que el texto sea claro y legible
                            </Text>
                        </View>

                        <View className="mb-4">
                            <Text className="text-purple-400 font-bold mb-1">3. Sube las imágenes</Text>
                            <Text className="text-gray-300 leading-6">
                                La IA extraerá el texto automáticamente usando OCR
                            </Text>
                        </View>

                        <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                            <Text className="text-yellow-400 text-sm font-semibold mb-1">⚠️ Limitación:</Text>
                            <Text className="text-gray-400 text-xs">
                                El OCR puede no ser 100% preciso. Para mejores resultados, usa export de WhatsApp/Telegram
                            </Text>
                        </View>
                    </View>
                )}

                {/* Tips Section */}
                <View className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl p-4 mt-4">
                    <Text className="text-white font-bold mb-3">💡 Consejos para mejores resultados:</Text>

                    <View className="mb-2">
                        <Text className="text-gray-300">• Incluye al menos <Text className="text-purple-400 font-bold">100 mensajes</Text> de ambos lados</Text>
                    </View>
                    <View className="mb-2">
                        <Text className="text-gray-300">• Más mensajes = perfil más preciso</Text>
                    </View>
                    <View className="mb-2">
                        <Text className="text-gray-300">• Incluye conversaciones de diferentes momentos (felices, tristes, conflictos)</Text>
                    </View>
                    <View>
                        <Text className="text-gray-300">• No edites el archivo exportado</Text>
                    </View>
                </View>

                {onClose && (
                    <TouchableOpacity
                        onPress={onClose}
                        className="mt-6 bg-purple-600 rounded-2xl py-4"
                    >
                        <Text className="text-white text-center font-bold text-lg">
                            Entendido, continuar
                        </Text>
                    </TouchableOpacity>
                )}
            </LinearGradient>
        </ScrollView>
    );
}
