import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, Sparkles } from 'lucide-react-native';

interface AppHeaderProps {
    title: string;
    subtitle?: string;
    onMenuPress: () => void;
    showIcon?: boolean;
}

export default function AppHeader({ title, subtitle, onMenuPress, showIcon = false }: AppHeaderProps) {
    return (
        <View className="px-6 py-4 flex-row items-center justify-between z-10">
            <View className="flex-row items-center flex-1">
                {showIcon && (
                    <View className="w-11 h-11 rounded-full items-center justify-center mr-3">
                        <LinearGradient
                            colors={['#a855f7', '#3b82f6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="w-full h-full rounded-full items-center justify-center"
                            style={{
                                shadowColor: '#a855f7',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.4,
                                shadowRadius: 8,
                            }}
                        >
                            <Sparkles size={22} color="white" />
                        </LinearGradient>
                    </View>
                )}
                <View>
                    <Text className="text-white text-xl font-bold tracking-tight">{title}</Text>
                    {subtitle && (
                        <Text className="text-gray-400 text-xs mt-0.5">{subtitle}</Text>
                    )}
                </View>
            </View>

            <TouchableOpacity
                onPress={onMenuPress}
                className="w-11 h-11 rounded-full items-center justify-center bg-white/5 border border-white/10"
                style={{
                    shadowColor: '#3b82f6',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                }}
            >
                <Menu size={20} color="white" />
            </TouchableOpacity>
        </View>
    );
}
