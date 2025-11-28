import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Heart, MessageCircle, Wrench, TrendingUp, BookOpen, Settings, Plus, Moon, Sun, Crown, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SidebarProps {
    onNewChat?: () => void;
    darkMode?: boolean;
    onToggleDarkMode?: () => void;
    isPremium?: boolean;
    visible?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ onNewChat, darkMode = true, onToggleDarkMode, isPremium = false, visible = true, onClose }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();

    const menuItems = [
        { icon: MessageCircle, label: 'Chat Principal', route: '/(tabs)', color: '#3b82f6' },
        { icon: Wrench, label: 'Herramientas', route: '/(tabs)/tools', color: '#8b5cf6' },
        { icon: TrendingUp, label: 'Mi Progreso', route: '/(tabs)/progress', color: '#22c55e' },
        { icon: BookOpen, label: 'Diario', route: '/tools/journal', color: '#f59e0b' },
        { icon: Settings, label: 'Configuración', route: '/(tabs)/profile', color: '#6b7280' },
    ];

    const isActive = (route: string) => {
        if (route === '/(tabs)') return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
        return pathname?.startsWith(route);
    };

    const handleNavigation = (route: string) => {
        router.push(route as any);
        if (onClose) onClose();
    };

    const SidebarContent = () => (
        <View className="h-full bg-[#0f0f1e] border-r border-white/10">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Logo/Branding */}
                <View className="p-6 border-b border-white/10">
                    <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl items-center justify-center mr-3">
                                <Heart size={20} color="white" fill="white" />
                            </View>
                            <View>
                                <Text className="text-white text-lg font-bold">My Ex Coach</Text>
                                <Text className="text-gray-400 text-xs">Tu guía de sanación</Text>
                            </View>
                        </View>
                        {/* Close button for mobile */}
                        {onClose && (
                            <TouchableOpacity onPress={onClose} className="md:hidden">
                                <X size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Menu Items */}
                <View className="px-3 py-2">
                    <Text className="text-gray-500 text-xs font-semibold uppercase mb-3 px-3">Menú</Text>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.route);

                        return (
                            <TouchableOpacity
                                key={item.route}
                                onPress={() => handleNavigation(item.route)}
                                className={`flex-row items-center px-3 py-3 rounded-xl mb-1 ${active ? 'bg-white/10' : 'hover:bg-white/5'
                                    }`}
                            >
                                <Icon
                                    size={20}
                                    color={active ? item.color : '#9ca3af'}
                                    strokeWidth={active ? 2.5 : 2}
                                />
                                <Text className={`ml-3 ${active ? 'text-white font-semibold' : 'text-gray-400'}`}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Subscription Status */}
                <View className="px-4 py-4 mt-auto border-t border-white/10">
                    {isPremium ? (
                        <View className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-3">
                            <View className="flex-row items-center mb-1">
                                <Crown size={16} color="#f59e0b" />
                                <Text className="text-yellow-500 font-bold ml-2">Premium</Text>
                            </View>
                            <Text className="text-gray-400 text-xs">Acceso ilimitado</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={() => {
                                router.push('/paywall');
                                if (onClose) onClose();
                            }}
                            className="bg-white/5 border border-white/10 rounded-xl p-3"
                        >
                            <Text className="text-white font-semibold mb-1">Plan Gratuito</Text>
                            <Text className="text-gray-400 text-xs mb-2">10 mensajes/día</Text>
                            <Text className="text-blue-400 text-xs font-semibold">Actualizar a Premium →</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Dark Mode Toggle */}
                {onToggleDarkMode && (
                    <View className="px-4 pb-4">
                        <TouchableOpacity
                            onPress={onToggleDarkMode}
                            className="flex-row items-center justify-between bg-white/5 rounded-xl p-3"
                        >
                            <View className="flex-row items-center">
                                {darkMode ? <Moon size={18} color="#9ca3af" /> : <Sun size={18} color="#f59e0b" />}
                                <Text className="text-gray-400 ml-2">Tema</Text>
                            </View>
                            <Text className="text-white text-sm">{darkMode ? 'Oscuro' : 'Claro'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );

    // Desktop: Always visible
    // Mobile: Show as modal when visible prop is true
    return (
        <>
            {/* Desktop Sidebar - Always visible */}
            <View className="hidden md:flex w-64">
                <SidebarContent />
            </View>

            {/* Mobile Sidebar - Modal */}
            <Modal
                visible={visible && onClose !== undefined}
                animationType="slide"
                transparent={true}
                onRequestClose={onClose}
            >
                <View className="flex-1 flex-row md:hidden">
                    {/* Overlay */}
                    <TouchableOpacity
                        className="flex-1 bg-black/50"
                        activeOpacity={1}
                        onPress={onClose}
                    />
                    {/* Sidebar */}
                    <View className="w-64">
                        <SidebarContent />
                    </View>
                </View>
            </Modal>
        </>
    );
}
