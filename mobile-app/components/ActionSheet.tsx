import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Image as ImageIcon, MessageSquare, Search, BarChart2, Smartphone, Eye, BookOpen, AlertCircle, X } from 'lucide-react-native';

interface ActionSheetProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (action: string) => void;
}

export default function ActionSheet({ visible, onClose, onSelect }: ActionSheetProps) {
    const actions = [
        { id: 'ex-simulator', icon: MessageSquare, label: 'Simulador', color: '#ec4899' },
        { id: 'decoder', icon: Search, label: 'Decodificador', color: '#8b5cf6' },
        { id: 'journal', icon: BookOpen, label: 'Diario', color: '#f97316' },
        { id: 'panic', icon: AlertCircle, label: 'Pánico', color: '#ef4444' },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable className="flex-1 bg-black/60" onPress={onClose}>
                <View className="absolute bottom-24 left-4 bg-[#1a1a2e] border border-white/10 rounded-2xl p-2 w-64 shadow-xl">
                    {actions.map((action) => (
                        <TouchableOpacity
                            key={action.id}
                            onPress={() => {
                                onSelect(action.id);
                                onClose();
                            }}
                            className="flex-row items-center p-3 hover:bg-white/5 rounded-xl active:bg-white/10"
                        >
                            <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${action.color}20` }}>
                                <action.icon size={18} color={action.color} />
                            </View>
                            <Text className="text-white font-medium text-[15px]">{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Pressable>
        </Modal>
    );
}
