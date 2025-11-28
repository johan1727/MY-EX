import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Platform } from 'react-native';
import { X } from 'lucide-react-native';

interface DateInputModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (date: string) => void;
    title: string;
    placeholder?: string;
}

export default function DateInputModal({
    visible,
    onClose,
    onSubmit,
    title,
    placeholder = 'YYYY-MM-DD'
}: DateInputModalProps) {
    const [dateText, setDateText] = useState('');

    const handleSubmit = () => {
        if (dateText.trim()) {
            onSubmit(dateText.trim());
            setDateText('');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/70 items-center justify-center px-6">
                <View className="bg-gray-900 rounded-3xl p-6 w-full max-w-md border border-white/10">
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-white text-xl font-bold flex-1">
                            {title}
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
                        >
                            <X size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Input */}
                    <TextInput
                        value={dateText}
                        onChangeText={setDateText}
                        placeholder={placeholder}
                        placeholderTextColor="#666"
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-4"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    {/* Helper Text */}
                    <Text className="text-gray-400 text-sm mb-4">
                        Format: YYYY-MM-DD (e.g., 2024-01-15)
                    </Text>

                    {/* Buttons */}
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            onPress={onClose}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3"
                        >
                            <Text className="text-gray-400 text-center font-semibold">
                                Cancel
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            className="flex-1 bg-blue-600 rounded-xl py-3"
                        >
                            <Text className="text-white text-center font-semibold">
                                Save
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
