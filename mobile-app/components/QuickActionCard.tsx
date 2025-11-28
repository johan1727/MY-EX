import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface QuickActionCardProps {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    color: string;
    onPress: () => void;
}

export default function QuickActionCard({ icon: Icon, title, subtitle, color, onPress }: QuickActionCardProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 active:bg-white/10"
            style={{
                shadowColor: color,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            }}
        >
            <View className="w-12 h-12 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: color + '20' }}>
                <Icon size={24} color={color} strokeWidth={2} />
            </View>
            <Text className="text-white font-bold text-base mb-1">{title}</Text>
            <Text className="text-gray-400 text-sm leading-5">{subtitle}</Text>
        </TouchableOpacity>
    );
}
