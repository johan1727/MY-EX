import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Flame, Star, TrendingUp } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

type UserStats = {
    xp: number;
    level: number;
    current_streak: number;
    longest_streak: number;
};

export default function GamificationHub({ userId }: { userId: string }) {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [userId]);

    const fetchStats = async () => {
        try {
            const { data, error } = await supabase
                .from('user_stats')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching stats:', error);
            }

            if (data) {
                setStats(data);
            } else {
                // Default stats if none exist yet
                setStats({
                    xp: 0,
                    level: 1,
                    current_streak: 0,
                    longest_streak: 0
                });
            }
        } catch (error) {
            console.error('Error in fetchStats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="p-4 items-center justify-center">
                <ActivityIndicator size="small" color="#a855f7" />
            </View>
        );
    }

    if (!stats) return null;

    // Calculate progress to next level (assuming 100 XP per level for now)
    const xpForNextLevel = stats.level * 100;
    const progress = Math.min((stats.xp / xpForNextLevel) * 100, 100);

    return (
        <View className="mx-4 mb-6">
            <LinearGradient
                colors={['rgba(168, 85, 247, 0.1)', 'rgba(59, 130, 246, 0.1)']}
                className="rounded-2xl p-4 border border-white/10"
            >
                {/* Header: Level & Streak */}
                <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-row items-center">
                        <View className="bg-yellow-500/20 p-2 rounded-full mr-3">
                            <Trophy size={20} color="#eab308" />
                        </View>
                        <View>
                            <Text className="text-white font-bold text-lg">Nivel {stats.level}</Text>
                            <Text className="text-gray-400 text-xs">Guerrero en Recuperación</Text>
                        </View>
                    </View>

                    <View className="items-end">
                        <View className="flex-row items-center bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30">
                            <Flame size={14} color="#f97316" className="mr-1" />
                            <Text className="text-orange-400 font-bold">{stats.current_streak} días</Text>
                        </View>
                    </View>
                </View>

                {/* XP Progress Bar */}
                <View className="mb-2">
                    <View className="flex-row justify-between mb-1">
                        <Text className="text-gray-400 text-xs">XP: {stats.xp} / {xpForNextLevel}</Text>
                        <Text className="text-purple-400 text-xs font-bold">{Math.round(progress)}%</Text>
                    </View>
                    <View className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <LinearGradient
                            colors={['#a855f7', '#3b82f6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ width: `${progress}%`, height: '100%' }}
                        />
                    </View>
                </View>

                {/* Stats Grid */}
                <View className="flex-row mt-2 pt-3 border-t border-white/5">
                    <View className="flex-1 items-center border-r border-white/10">
                        <Text className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Racha Máx</Text>
                        <View className="flex-row items-center">
                            <TrendingUp size={12} color="#10b981" className="mr-1" />
                            <Text className="text-white font-bold">{stats.longest_streak}</Text>
                        </View>
                    </View>
                    <View className="flex-1 items-center">
                        <Text className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Logros</Text>
                        <View className="flex-row items-center">
                            <Star size={12} color="#f59e0b" className="mr-1" />
                            <Text className="text-white font-bold">0</Text>
                            {/* TODO: Fetch achievements count */}
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}
