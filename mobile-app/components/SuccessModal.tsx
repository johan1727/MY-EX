import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle } from 'lucide-react-native';

interface SuccessModalProps {
    visible: boolean;
    messageCount: number;
    onContinue: () => void;
}

export default function SuccessModal({ visible, messageCount, onContinue }: SuccessModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
        >
            <View className="flex-1 bg-black/80 items-center justify-center px-6">
                <View className="bg-[#1a1a1a] rounded-3xl p-8 w-full max-w-md border border-purple-500/30">
                    {/* Success Icon */}
                    <View className="items-center mb-6">
                        <View className="bg-green-500/20 p-4 rounded-full mb-4">
                            <CheckCircle size={48} color="#22c55e" />
                        </View>
                        <Text className="text-white text-2xl font-bold text-center">
                            ✅ ¡Listo!
                        </Text>
                    </View>

                    {/* Message */}
                    <Text className="text-gray-300 text-center text-lg mb-8">
                        {messageCount.toLocaleString()} mensajes procesados.
                        {'\n\n'}
                        Ahora ingresa el nombre de tu ex y presiona Analizar.
                    </Text>

                    {/* Continue Button */}
                    <TouchableOpacity
                        onPress={onContinue}
                        className="w-full rounded-xl overflow-hidden"
                    >
                        <LinearGradient
                            colors={['#8b5cf6', '#7c3aed']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="py-4 items-center"
                        >
                            <Text className="text-white font-bold text-lg">
                                Continuar
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
