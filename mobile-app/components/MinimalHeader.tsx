import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Menu, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface MinimalHeaderProps {
    title: string;
    onMenuPress: () => void;
    onToolSelect: (tool: string) => void;
}

export default function MinimalHeader({ title, onMenuPress }: MinimalHeaderProps) {
    const router = useRouter();

    return (
        <View className="bg-gray-900 border-b border-gray-800">
            <View className="flex-row items-center justify-between px-4 py-3">
                {/* Hamburger Menu */}
                <TouchableOpacity
                    onPress={onMenuPress}
                    className="p-2 -ml-2"
                >
                    <Menu size={24} color="#fff" />
                </TouchableOpacity>

                {/* Title */}
                <Text className="text-white text-lg font-semibold flex-1 text-center">
                    {title}
                </Text>

                {/* User Profile */}
                <TouchableOpacity
                    onPress={() => router.push('/profile')}
                    className="p-2 -mr-2"
                >
                    <User size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
