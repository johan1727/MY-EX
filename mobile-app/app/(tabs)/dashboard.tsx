import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Flame, MessageSquare, Sparkles, BookOpen, Crown, ChevronRight, Activity, Zap, TrendingUp, Heart } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useSubscription } from '../../lib/SubscriptionContext';

const StatCard = ({ label, value, icon: Icon, color = "white", fullWidth = false }: any) => (
    <View className={`bg-[#1c1c1e] rounded-[32px] p-6 mb-3 border border-white/5 ${fullWidth ? 'w-full' : 'flex-1 mr-2 last:mr-0'}`}>
        <View className="flex-row justify-between items-start mb-4">
            <View className={`p-2 rounded-full bg-white/5`}>
                <Icon size={20} color={color} />
            </View>
            {fullWidth && <ChevronRight size={20} color="#666" />}
        </View>
        <Text className="text-white text-3xl font-black tracking-tighter mb-1">
            {value}
        </Text>
        <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">
            {label}
        </Text>
    </View>
);

const ActionCard = ({ title, subtitle, icon: Icon, onPress, color = "white", locked = false }: any) => (
    <TouchableOpacity
        onPress={onPress}
        className="bg-[#1c1c1e] rounded-[24px] p-5 mb-3 border border-white/5 flex-row items-center active:bg-white/5"
    >
        <View className={`w-12 h-12 rounded-full items-center justify-center mr-4`} style={{ backgroundColor: color + '20' }}>
            <Icon size={24} color={color} />
        </View>
        <View className="flex-1">
            <View className="flex-row items-center">
                <Text className="text-white font-bold text-base mr-2">{title}</Text>
                {locked && <Crown size={12} color="#f59e0b" />}
            </View>
            <Text className="text-gray-500 text-xs mt-0.5">{subtitle}</Text>
        </View>
        <View className="w-8 h-8 rounded-full bg-white/5 items-center justify-center">
            <ChevronRight size={16} color="#666" />
        </View>
    </TouchableOpacity>
);

export default function DashboardScreen() {
    const router = useRouter();
    const { tier } = useSubscription();
    const isPremium = tier === 'warrior' || tier === 'phoenix';

    const [userName, setUserName] = useState('Usuario');
    const [streak, setStreak] = useState(0);
    const [stats, setStats] = useState({
        messagesThisWeek: 0,
        minutesThisWeek: 0,
        insightsThisWeek: 0,
    });
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                setUserName(user.email?.split('@')[0] || 'Usuario');

                // Streak
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('breakup_date, no_contact_since')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    const startDateStr = profile.no_contact_since || profile.breakup_date;
                    if (startDateStr) {
                        const startDate = new Date(startDateStr);
                        const today = new Date();
                        startDate.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);
                        const diffTime = today.getTime() - startDate.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        setStreak(Math.max(0, diffDays));
                    }
                }

                // Stats (Mocked for visual parity with simulator style for now, real logic can be complex)
                setStats({
                    messagesThisWeek: 124,
                    minutesThisWeek: 45,
                    insightsThisWeek: 12,
                });
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadDashboardData();
        setRefreshing(false);
    };

    return (
        <View className="flex-1 bg-black">
            <StatusBar style="light" backgroundColor="#000000" />

            <SafeAreaView className="flex-1">
                <ScrollView
                    className="flex-1 px-6 pt-6"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
                    }
                >
                    {/* Header */}
                    <View className="mb-8">
                        <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                            PANEL DE CONTROL
                        </Text>
                        <Text className="text-white text-4xl font-black tracking-tighter">
                            Hola, {userName}
                        </Text>
                    </View>

                    {/* Main Stats Row */}
                    <View className="flex-row mb-2">
                        <StatCard
                            label="Racha Actual"
                            value={`${streak} días`}
                            icon={Flame}
                            color="#ef4444"
                        />
                        <StatCard
                            label="Sanación"
                            value="32%"
                            icon={Activity}
                            color="#10b981"
                        />
                    </View>

                    {/* Progress Card */}
                    <View className="bg-[#1c1c1e] rounded-[32px] p-6 mb-8 border border-white/5">
                        <View className="flex-row justify-between items-center mb-6">
                            <View className="flex-row items-center">
                                <View className="p-2 rounded-full bg-purple-500/10 mr-3">
                                    <Zap size={20} color="#a855f7" />
                                </View>
                                <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                                    ACTIVIDAD SEMANAL
                                </Text>
                            </View>
                            <Text className="text-white font-bold text-xs">{stats.messagesThisWeek} msgs</Text>
                        </View>

                        <View className="flex-row items-end justify-between h-24 mb-2">
                            {[40, 65, 30, 80, 55, 90, 45].map((h, i) => (
                                <View key={i} className="w-[10%] bg-white/10 rounded-t-lg" style={{ height: `${h}%` }}>
                                    {i === 5 && <View className="absolute top-0 w-full h-full bg-white rounded-t-lg opacity-20" />}
                                </View>
                            ))}
                        </View>
                        <View className="flex-row justify-between mt-2">
                            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                                <Text key={i} className={`text-[10px] font-bold ${i === 5 ? 'text-white' : 'text-gray-600'}`}>{d}</Text>
                            ))}
                        </View>
                    </View>

                    {/* Actions Grid */}
                    <Text className="text-white text-xl font-bold mb-4 tracking-tight">Explorar</Text>

                    <ActionCard
                        title="Coach Chat"
                        subtitle="Consejos personalizados 24/7"
                        icon={MessageSquare}
                        color="#3b82f6"
                        onPress={() => router.push('/(tabs)/chat')}
                    />

                    <ActionCard
                        title="Diario Inteligente"
                        subtitle="Registra y analiza tus emociones"
                        icon={BookOpen}
                        color="#f59e0b"
                        onPress={() => router.push('/tools/journal')}
                    />

                    <ActionCard
                        title="Simulador de Ex"
                        subtitle="Practica situaciones difíciles"
                        icon={Sparkles}
                        color="#10b981"
                        onPress={() => router.push('/(tabs)/index')}
                    />

                    {!isPremium && (
                        <TouchableOpacity
                            onPress={() => router.push('/paywall')}
                            className="bg-purple-600 rounded-[24px] p-6 mt-4 mb-10 flex-row items-center justify-between"
                        >
                            <View>
                                <View className="flex-row items-center mb-1">
                                    <Crown size={20} color="white" fill="white" className="mr-2" />
                                    <Text className="text-white font-black text-lg tracking-tight">SOYREMI PRO</Text>
                                </View>
                                <Text className="text-purple-200 text-xs max-w-[200px]">Desbloquea todo el potencial de tu recuperación.</Text>
                            </View>
                            <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
                                <ChevronRight size={20} color="white" />
                            </View>
                        </TouchableOpacity>
                    )}
                    <View className="h-10" />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
