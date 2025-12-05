import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Heart, Wrench, TrendingUp, BookOpen, Settings, Crown, X, MessageSquare } from 'lucide-react-native';
import ConversationList, { Conversation } from './ConversationList';
import GamificationHub from './GamificationHub';

interface SidebarProps {
    onNewChat?: () => void;
    isPremium?: boolean;
    visible?: boolean;
    onClose?: () => void;
    conversations?: Conversation[];
    activeConversationId?: string | null;
    onSelectConversation?: (id: string) => void;
    onRenameConversation?: (id: string, newTitle: string) => void;
    onDeleteConversation?: (id: string) => void;
    userId?: string;
}

export default function Sidebar({
    onNewChat,
    isPremium = false,
    visible = true,
    onClose,
    conversations = [],
    activeConversationId = null,
    onSelectConversation = () => { },
    onRenameConversation = () => { },
    onDeleteConversation = () => { },
    userId
}: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();

    const menuItems = [
        { icon: Heart, label: 'Chat', route: '/(tabs)', color: '#ec4899' },
        { icon: MessageSquare, label: 'Ex Simulator', route: '/tools/ex-simulator', color: '#a855f7' },
        { icon: Wrench, label: 'Herramientas', route: '/(tabs)/tools', color: '#8b5cf6' },
        { icon: TrendingUp, label: 'Mi Progreso', route: '/(tabs)/progress', color: '#22c55e' },
        { icon: BookOpen, label: 'Diario', route: '/tools/journal', color: '#f59e0b' },
        { icon: Settings, label: 'Configuración', route: '/(tabs)/profile', color: '#6b7280' },
    ];

    const isActive = (route: string) => {
        return pathname?.startsWith(route);
    };

    const handleNavigation = (route: string) => {
        if (pathname !== route) {
            router.push(route as any);
        }
        if (onClose) onClose();
    };

    const SidebarContent = () => (
        <View className="h-full bg-[#0f0f1e] border-r border-white/10 flex-1">
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

            {/* Conversation List - Takes up available space */}
            <View className="flex-1">
                <ConversationList
                    conversations={conversations}
                    activeId={activeConversationId}
                    onSelect={(id) => {
                        onSelectConversation(id);
                        if (onClose) onClose();
                    }}
                    onRename={onRenameConversation}
                    onDelete={onDeleteConversation}
                    onNew={() => {
                        if (onNewChat) onNewChat();
                        if (onClose) onClose();
                    }}
                />
            </View>

            {/* Other Menu Items */}
            <View className="px-3 py-2 border-t border-white/10">
                <Text className="text-gray-500 text-xs font-semibold uppercase mb-2 px-3">Menú</Text>
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
                            <Text className="text-yellow-500 font-bold ml-2">Warrior</Text>
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
        </View>
    );

    // Desktop: Always visible
    // Mobile: Show as modal when visible prop is true
    return (
        <>
            {/* Desktop Sidebar - Always visible */}
            <View className="hidden md:flex w-80 h-full">
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
                    <View className="w-80 h-full">
                        <SidebarContent />
                    </View>
                </View>
            </Modal>
        </>
    );
}
