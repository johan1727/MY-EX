import React from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions, Platform, DimensionValue } from 'react-native';
import { X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface ToolModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    height?: DimensionValue;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ToolModal({ visible, onClose, title, children, height = '80%' }: ToolModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end">
                {/* Backdrop */}
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={onClose}
                    className="absolute inset-0 bg-black/60"
                />

                {/* Modal Content */}
                <View
                    style={{ height }}
                    className="w-full rounded-t-3xl overflow-hidden bg-[#1a1a2e] border-t border-white/10"
                >
                    <LinearGradient
                        colors={['#1a1a2e', '#0f0f1a']}
                        className="flex-1"
                    >
                        {/* Header */}
                        <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/5">
                            <View className="w-8" /> {/* Spacer */}
                            <Text className="text-white text-lg font-bold">
                                {title}
                            </Text>
                            <TouchableOpacity
                                onPress={onClose}
                                className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
                            >
                                <X size={16} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <View className="flex-1">
                            {children}
                        </View>
                    </LinearGradient>
                </View>
            </View>
        </Modal>
    );
}
