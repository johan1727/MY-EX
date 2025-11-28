import React from 'react';
import { View, Text } from 'react-native';
import { Flame, Award, Trophy, Star } from 'lucide-react-native';

interface StreakCounterProps {
    days: number;
}

export default function StreakCounter({ days }: StreakCounterProps) {
    const getStreakIcon = () => {
        if (days >= 30) return <Trophy size={32} color="#FFD700" />;
        if (days >= 7) return <Award size={32} color="#C0C0C0" />;
        if (days >= 3) return <Star size={32} color="#CD7F32" />;
        return <Flame size={32} color="#FF6B6B" />;
    };

    const getStreakMessage = () => {
        if (days === 0) return "Start your journey!";
        if (days === 1) return "Great start! 🎉";
        if (days === 3) return "3 days strong! 💪";
        if (days === 7) return "One week! You're amazing! 🌟";
        if (days === 30) return "One month! You're unstoppable! 🏆";
        return `${days} days strong!`;
    };

    const getStreakColor = () => {
        if (days >= 30) return 'bg-yellow-100 border-yellow-300';
        if (days >= 7) return 'bg-purple-100 border-purple-300';
        if (days >= 3) return 'bg-blue-100 border-blue-300';
        return 'bg-red-100 border-red-300';
    };

    return (
        <View className={`${getStreakColor()} border-2 rounded-2xl p-6 items-center`}>
            <View className="mb-3">{getStreakIcon()}</View>
            <Text className="text-4xl font-bold text-gray-800 mb-2">{days}</Text>
            <Text className="text-lg font-semibold text-gray-600">Days No Contact</Text>
            <Text className="text-sm text-gray-500 mt-2">{getStreakMessage()}</Text>

            {/* Progress to next milestone */}
            {days < 30 && (
                <View className="mt-4 w-full">
                    <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-gray-500">Next milestone:</Text>
                        <Text className="text-xs font-bold text-gray-700">
                            {days < 3 ? '3 days' : days < 7 ? '7 days' : '30 days'}
                        </Text>
                    </View>
                    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                            className="h-full bg-primary"
                            style={{
                                width: `${days < 3 ? (days / 3) * 100 : days < 7 ? ((days - 3) / 4) * 100 : ((days - 7) / 23) * 100}%`
                            }}
                        />
                    </View>
                </View>
            )}
        </View>
    );
}
