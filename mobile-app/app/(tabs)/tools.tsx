import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MessageSquare, AlertCircle, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Sidebar from '../../components/Sidebar';
import { useLanguage } from '../../lib/i18n';

export default function ToolsScreen() {
    const router = useRouter();
    const [darkMode, setDarkMode] = useState(true);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const { t } = useLanguage();

    const tools = [
        {
            id: 'decoder',
            title: t('tool_decoder_title'),
            description: t('tool_decoder_desc'),
            icon: MessageSquare,
            color: ['#3b82f6', '#2563eb'],
            route: '/tools/decoder',
        },
        {
            id: 'panic',
            title: t('tool_panic_title'),
            description: t('tool_panic_desc'),
            icon: AlertCircle,
            color: ['#ef4444', '#dc2626'],
            route: '/tools/panic',
        },
    ];

    return (
        <View className="flex-1 flex-row bg-black">
            <StatusBar style="light" backgroundColor="#000000" />

            <LinearGradient
                colors={['#0a0a0a', '#1a1a2e', '#16213e', '#0a0a0a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            {/* Sidebar */}
            <Sidebar
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode(!darkMode)}
                isPremium={false}
                visible={sidebarVisible}
                onClose={() => setSidebarVisible(false)}
            />

            {/* Main Content */}
            <View className="flex-1">
                <SafeAreaView className="flex-1">
                    {/* Header with Hamburger Menu */}
                    <View className="px-6 py-4 border-b border-white/10 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            {/* Hamburger button - visible only on mobile */}
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
                                <Text className="text-white text-2xl font-bold">{t('tools_title')}</Text>
                                <Text className="text-gray-400 text-sm">{t('tools_subtitle')}</Text>
                            </View>
                        </View>
                    </View>

                    <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
                        {/* Tools Grid */}
                        {tools.map((tool, index) => (
                            <TouchableOpacity
                                key={tool.id}
                                onPress={() => router.push(tool.route as any)}
                                className={index === tools.length - 1 ? "mb-0" : "mb-5"}
                            >
                                <View className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden hover:bg-white/10">
                                    <View className="flex-row items-center justify-between mb-4">
                                        <View className="w-14 h-14 rounded-2xl overflow-hidden">
                                            <LinearGradient
                                                colors={tool.color}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                className="w-full h-full items-center justify-center"
                                            >
                                                <tool.icon size={28} color="white" />
                                            </LinearGradient>
                                        </View>
                                        <ArrowRight size={20} color="#6b7280" />
                                    </View>

                                    <Text className="text-white text-xl font-bold mb-2">{tool.title}</Text>
                                    <Text className="text-gray-400 text-sm">{tool.description}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}

                        {/* Info Card */}
                        <View className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5 mt-4 mb-8">
                            <Text className="text-purple-400 text-sm leading-6">
                                💡 Estas herramientas están diseñadas para ayudarte a procesar tus emociones, tomar mejores decisiones y seguir tu progreso. Úsalas cuando necesites apoyo.
                            </Text>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </View>
    );
}
