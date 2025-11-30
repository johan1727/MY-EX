import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, Dimensions } from 'react-native';
import { Calendar, TrendingUp, MessageCircle, Trash2, Download, Flame, Target, Award } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Sidebar from '../../components/Sidebar';
import MilestoneCelebration from '../../components/MilestoneCelebration';
import DateInputModal from '../../components/DateInputModal';
import { useLanguage } from '../../lib/i18n';
import { getUserMilestones, checkAndUnlockMilestones, getNextMilestone, calculateProgress, Milestone } from '../../lib/gamification';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
    const [noContactDays, setNoContactDays] = useState(0);
    const [totalMessages, setTotalMessages] = useState(0);
    const [lastBreakupDate, setLastBreakupDate] = useState<Date | null>(null);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [dateModalVisible, setDateModalVisible] = useState(false);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [celebrationMilestone, setCelebrationMilestone] = useState<Milestone | null>(null);
    const [nextMilestone, setNextMilestone] = useState<Milestone | null>(null);
    const { t, language } = useLanguage();

    useEffect(() => {
        loadProgress();
    }, []);

    const loadProgress = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('breakup_date')
                .eq('id', user.id)
                .single();

            let days = 0;
            if (profile?.breakup_date) {
                const breakupDate = new Date(profile.breakup_date);
                setLastBreakupDate(breakupDate);
                days = Math.floor((Date.now() - breakupDate.getTime()) / (1000 * 60 * 60 * 24));
                setNoContactDays(days);
            }

            const { count } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            setTotalMessages(count || 0);

            const userMilestones = await getUserMilestones(user.id, language);
            setMilestones(userMilestones);

            const newlyUnlocked = await checkAndUnlockMilestones(user.id, days);
            if (newlyUnlocked.length > 0) {
                setCelebrationMilestone(newlyUnlocked[0]);
            }

            const next = await getNextMilestone(days, language);
            setNextMilestone(next);

        } catch (error) {
            console.error('Error loading progress:', error);
        }
    };

    const handleDateSubmit = async (dateText: string) => {
        try {
            const date = new Date(dateText);
            if (isNaN(date.getTime())) {
                Alert.alert('Invalid date format');
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
                .from('profiles')
                .upsert({ id: user.id, breakup_date: date.toISOString() });

            setDateModalVisible(false);
            loadProgress();
            Alert.alert('Success', 'Breakup date saved!');
        } catch (error) {
            Alert.alert('Error', 'Failed to save date');
        }
    };

    const clearChatHistory = async () => {
        Alert.alert(
            'Clear Chat History',
            'Are you sure? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return;

                            await supabase
                                .from('chat_messages')
                                .delete()
                                .eq('user_id', user.id);

                            Alert.alert('Success', 'Chat history cleared');
                            loadProgress();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to clear chat');
                        }
                    }
                }
            ]
        );
    };

    const exportChat = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: messages } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (!messages || messages.length === 0) {
                Alert.alert('No messages to export');
                return;
            }

            let text = '=== My Ex Coach - Chat Export ===\n\n';
            messages.forEach((msg: any) => {
                const time = new Date(msg.created_at).toLocaleString();
                text += `[${time}] ${msg.sender === 'user' ? 'You' : 'Coach'}: ${msg.content}\n\n`;
            });

            const fileUri = FileSystem.documentDirectory + 'chat_export.txt';
            await FileSystem.writeAsStringAsync(fileUri, text);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                Alert.alert('Success', `Exported to: ${fileUri}`);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to export chat');
        }
    };

    return (
        <View className="flex-1 flex-row bg-black">
            <StatusBar style="light" />

            <LinearGradient
                colors={['#0a0a0a', '#1a1a2e', '#0a0a0a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            <Sidebar
                isPremium={false}
                visible={sidebarVisible}
                onClose={() => setSidebarVisible(false)}
            />

            <View className="flex-1">
                <SafeAreaView className="flex-1">
                    {/* Header */}
                    <View className="px-6 py-4 border-b border-white/10 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                onPress={() => setSidebarVisible(true)}
                                className="mr-4 md:hidden"
                            >
                                <View className="w-6 h-6 justify-center">
                                    <View className="w-full h-0.5 bg-white mb-1.5" />
                                    <View className="w-full h-0.5 bg-white mb-1.5" />
                                    <View className="w-full h-0.5 bg-white" />
                                </View>
                            </TouchableOpacity>
                            <View>
                                <Text className="text-white text-2xl font-bold">{t('progress_title')}</Text>
                                <Text className="text-gray-400 text-sm">Tu camino de sanación</Text>
                            </View>
                        </View>
                    </View>

                    <ScrollView className="flex-1 px-6 py-6">
                        {/* Hero Streak Card */}
                        <LinearGradient
                            colors={['#8b5cf6', '#6366f1', '#3b82f6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="rounded-3xl p-8 mb-6 items-center"
                        >
                            <View className="items-center mb-4">
                                <Flame size={48} color="#fff" />
                                <Text className="text-white/80 text-sm font-semibold mt-2 uppercase tracking-wider">
                                    {t('progress_streak')}
                                </Text>
                            </View>
                            <Text className="text-white text-7xl font-black mb-2">
                                {noContactDays}
                            </Text>
                            <Text className="text-white/90 text-xl font-semibold">
                                {t('progress_days_strong')}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setDateModalVisible(true)}
                                className="mt-6 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full px-6 py-3"
                            >
                                <Text className="text-white font-bold">
                                    {lastBreakupDate ? t('progress_update_date') : t('progress_set_date')}
                                </Text>
                            </TouchableOpacity>
                        </LinearGradient>

                        {/* Next Milestone */}
                        {nextMilestone && (
                            <View className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6">
                                <View className="flex-row items-center mb-4">
                                    <Target size={24} color="#a855f7" />
                                    <Text className="text-white text-xl font-bold ml-3">
                                        {language === 'es' ? 'Próximo Logro' : 'Next Milestone'}
                                    </Text>
                                </View>

                                <View
                                    className="rounded-2xl p-5 mb-4"
                                    style={{ backgroundColor: nextMilestone.color + '20', borderColor: nextMilestone.color, borderWidth: 2 }}
                                >
                                    <View className="flex-row items-center justify-between mb-4">
                                        <View className="flex-row items-center flex-1">
                                            <Text className="text-5xl mr-4">{nextMilestone.badge}</Text>
                                            <View className="flex-1">
                                                <Text className="text-white font-bold text-lg">
                                                    {language === 'es' ? nextMilestone.title_es : nextMilestone.title_en}
                                                </Text>
                                                <Text className="text-gray-300 text-sm">
                                                    {nextMilestone.days} {language === 'es' ? 'días' : 'days'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="items-center">
                                            <Text className="text-white font-black text-3xl">
                                                {nextMilestone.days - noContactDays}
                                            </Text>
                                            <Text className="text-gray-400 text-xs">
                                                {language === 'es' ? 'días' : 'days'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="h-4 bg-white/10 rounded-full overflow-hidden">
                                        <LinearGradient
                                            colors={[nextMilestone.color, nextMilestone.color + 'aa']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            className="h-full rounded-full"
                                            style={{ width: `${calculateProgress(noContactDays, nextMilestone.days)}%` }}
                                        />
                                    </View>
                                    <Text className="text-gray-300 text-sm mt-2 text-center font-semibold">
                                        {Math.round(calculateProgress(noContactDays, nextMilestone.days))}% {language === 'es' ? 'completado' : 'complete'}
                                    </Text>
                                </View>

                                {/* Achievements Grid */}
                                <View className="flex-row items-center mb-3">
                                    <Award size={20} color="#22c55e" />
                                    <Text className="text-white text-lg font-semibold ml-2">
                                        {language === 'es' ? 'Logros Desbloqueados' : 'Unlocked Achievements'}
                                    </Text>
                                </View>
                                <View className="flex-row flex-wrap gap-3">
                                    {milestones.map((milestone) => (
                                        <View
                                            key={milestone.days}
                                            className="items-center justify-center rounded-2xl p-4 bg-white/5"
                                            style={{
                                                width: (width - 80) / 3 - 8,
                                                opacity: milestone.unlocked ? 1 : 0.3,
                                                borderWidth: milestone.unlocked ? 2 : 1,
                                                borderColor: milestone.unlocked ? milestone.color : '#ffffff20'
                                            }}
                                        >
                                            <Text className="text-4xl mb-2">{milestone.badge}</Text>
                                            <Text className="text-white text-xs font-bold text-center">
                                                {milestone.days}d
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Stats Cards */}
                        <View className="flex-row gap-3 mb-6">
                            <View className="flex-1 bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-5">
                                <MessageCircle size={28} color="#a855f7" />
                                <Text className="text-white text-3xl font-black mt-3">{totalMessages}</Text>
                                <Text className="text-gray-400 text-sm mt-1">{t('progress_total_msgs')}</Text>
                            </View>
                            <View className="flex-1 bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-5">
                                <TrendingUp size={28} color="#22c55e" />
                                <Text className="text-white text-3xl font-black mt-3">{Math.floor(totalMessages / 2)}</Text>
                                <Text className="text-gray-400 text-sm mt-1">{t('progress_ai_convos')}</Text>
                            </View>
                        </View>

                        {/* Actions */}
                        <View className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-8">
                            <View className="flex-row items-center mb-4">
                                <MessageCircle size={24} color="#f59e0b" />
                                <Text className="text-white text-xl font-bold ml-3">
                                    {t('progress_chat_actions')}
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={exportChat}
                                className="flex-row items-center justify-between bg-blue-600/20 border border-blue-500/30 rounded-xl p-4 mb-3"
                            >
                                <View className="flex-row items-center">
                                    <Download size={20} color="#3b82f6" />
                                    <Text className="text-blue-400 font-semibold ml-3">{t('progress_export')}</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={clearChatHistory}
                                className="flex-row items-center justify-between bg-red-600/20 border border-red-500/30 rounded-xl p-4"
                            >
                                <View className="flex-row items-center">
                                    <Trash2 size={20} color="#ef4444" />
                                    <Text className="text-red-400 font-semibold ml-3">{t('progress_clear')}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </SafeAreaView>

                <DateInputModal
                    visible={dateModalVisible}
                    onClose={() => setDateModalVisible(false)}
                    onSubmit={handleDateSubmit}
                    title={t('progress_set_date')}
                    placeholder="YYYY-MM-DD"
                />

                <MilestoneCelebration
                    visible={celebrationMilestone !== null}
                    milestone={celebrationMilestone}
                    onClose={() => setCelebrationMilestone(null)}
                    language={language}
                />
            </View>
        </View>
    );
}
