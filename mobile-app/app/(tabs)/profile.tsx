import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, Animated } from 'react-native';
import { supabase } from '../../lib/supabase';
import { User, LogOut, Mail, Calendar, Award, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import HamburgerMenu from '../../components/HamburgerMenu';
import { useLanguage } from '../../lib/i18n';

export default function ProfileScreen() {
    const router = useRouter();
    const [streak, setStreak] = useState(0);
    const [email, setEmail] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [createdAt, setCreatedAt] = useState('');
    const [menuVisible, setMenuVisible] = useState(false);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const { t } = useLanguage();

    useEffect(() => {
        loadProfile();
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const loadProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setEmail(user.email || 'Guest User');
                setIsAnonymous(user.is_anonymous || false);

                if (user.created_at) {
                    try {
                        setCreatedAt(new Date(user.created_at).toLocaleDateString());
                    } catch (e) {
                        setCreatedAt('N/A');
                    }
                } else {
                    setCreatedAt('N/A');
                }

                const { data } = await supabase
                    .from('profiles')
                    .select('breakup_date, no_contact_since')
                    .eq('user_id', user.id)
                    .single();

                if (data) {
                    // Calculate streak based on no_contact_since, falling back to breakup_date
                    const startDateStr = data.no_contact_since || data.breakup_date;

                    if (startDateStr) {
                        const startDate = new Date(startDateStr);
                        const today = new Date();

                        // Reset time parts to ensure accurate day calculation
                        startDate.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);

                        const diffTime = today.getTime() - startDate.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                        // Ensure streak is not negative
                        setStreak(Math.max(0, diffDays));
                    }
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    };

    const handleSignOut = async () => {
        Alert.alert(
            t('profile_sign_out'),
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: t('profile_sign_out'),
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace('/auth');
                    }
                }
            ]
        );
    };

    return (
        <View className="flex-1 bg-black">
            <StatusBar style="light" backgroundColor="#000000" />

            <LinearGradient
                colors={['#0a0a0a', '#1a1a2e', '#16213e', '#0a0a0a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            <SafeAreaView className="flex-1">
                <AppHeader
                    title={t('profile_title')}
                    onMenuPress={() => setMenuVisible(true)}
                />

                <HamburgerMenu
                    visible={menuVisible}
                    onClose={() => setMenuVisible(false)}
                />

                <Animated.ScrollView
                    style={{ opacity: fadeAnim }}
                    className="flex-1 px-6"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Profile Card */}
                    <View className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6">
                        <View className="items-center mb-6">
                            <View className="w-24 h-24 rounded-full items-center justify-center mb-4">
                                <LinearGradient
                                    colors={['#a855f7', '#3b82f6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    className="w-full h-full rounded-full items-center justify-center"
                                    style={{
                                        shadowColor: '#a855f7',
                                        shadowOffset: { width: 0, height: 8 },
                                        shadowOpacity: 0.4,
                                        shadowRadius: 16,
                                    }}
                                >
                                    <User size={48} color="white" />
                                </LinearGradient>
                            </View>
                            <Text className="text-white text-xl font-bold mb-1">
                                {isAnonymous ? t('profile_guest') : email}
                            </Text>
                            {isAnonymous && (
                                <View className="bg-yellow-500/20 border border-yellow-500/30 px-3 py-1 rounded-full">
                                    <Text className="text-yellow-400 text-xs font-medium">{t('profile_guest')}</Text>
                                </View>
                            )}
                        </View>

                        {/* Stats */}
                        <View className="flex-row justify-around border-t border-white/10 pt-4">
                            <View className="items-center">
                                <View className="w-12 h-12 bg-green-500/20 rounded-full items-center justify-center mb-2">
                                    <Award size={24} color="#22c55e" />
                                </View>
                                <Text className="text-2xl font-bold text-white">{streak}</Text>
                                <Text className="text-gray-400 text-xs">{t('profile_days_strong')}</Text>
                            </View>
                            <View className="items-center">
                                <View className="w-12 h-12 bg-blue-500/20 rounded-full items-center justify-center mb-2">
                                    <Calendar size={24} color="#3b82f6" />
                                </View>
                                <Text className="text-2xl font-bold text-white">
                                    {createdAt && createdAt !== 'N/A' ? createdAt.split('/')[0] : '-'}
                                </Text>
                                <Text className="text-gray-400 text-xs">{t('profile_member_since')}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Account Info */}
                    <View className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6">
                        <Text className="text-white text-lg font-bold mb-4">{t('profile_account_info')}</Text>

                        <View className="flex-row items-center py-3 border-b border-white/10">
                            <View className="w-10 h-10 bg-purple-500/20 rounded-full items-center justify-center mr-3">
                                <Mail size={20} color="#a855f7" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-xs">{t('profile_email')}</Text>
                                <Text className="text-white text-sm">{email}</Text>
                            </View>
                        </View>

                        <View className="flex-row items-center py-3 border-b border-white/10">
                            <View className="w-10 h-10 bg-blue-500/20 rounded-full items-center justify-center mr-3">
                                <Calendar size={20} color="#3b82f6" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-xs">{t('profile_joined')}</Text>
                                <Text className="text-white text-sm">{createdAt}</Text>
                            </View>
                        </View>

                        <View className="flex-row items-center py-3">
                            <View className="w-10 h-10 bg-green-500/20 rounded-full items-center justify-center mr-3">
                                <Shield size={20} color="#22c55e" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-xs">{t('profile_account_type')}</Text>
                                <Text className="text-white text-sm">{isAnonymous ? t('profile_guest') : t('profile_registered')}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Actions */}
                    <TouchableOpacity
                        onPress={handleSignOut}
                        className="flex-row items-center justify-center bg-red-600/20 border border-red-500/30 rounded-2xl p-4 mb-6"
                    >
                        <LogOut size={20} color="#ef4444" />
                        <Text className="text-red-400 font-semibold ml-3">{t('profile_sign_out')}</Text>
                    </TouchableOpacity>

                    {/* Footer */}
                    <Text className="text-center text-gray-500 text-xs mb-4">
                        My Ex Coach v1.0.0
                    </Text>
                    <Text className="text-center text-gray-600 text-xs mb-8">
                        Made with ❤️ for your healing journey
                    </Text>
                </Animated.ScrollView>
            </SafeAreaView>
        </View>
    );
}
