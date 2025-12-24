import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Wrench, TrendingUp, User, X, Brain, Globe } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '../lib/i18n';

interface HamburgerMenuProps {
    visible: boolean;
    onClose: () => void;
}

export default function HamburgerMenu({ visible, onClose }: HamburgerMenuProps) {
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(300)).current;
    const { t, language, setLanguage } = useLanguage();

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 300,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleNavigate = (route: string) => {
        onClose();
        setTimeout(() => {
            router.push(route as any);
        }, 300);
    };

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'es' : 'en');
    };

    const menuItems = [
        { icon: Home, label: t('menu_chat'), route: '/' },
        { icon: Wrench, label: t('menu_tools'), route: '/tools' },
        { icon: TrendingUp, label: t('menu_progress'), route: '/progress' },
        { icon: Brain, label: t('menu_memories'), route: '/memories' },
        { icon: User, label: t('menu_profile'), route: '/profile' },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                className="flex-1" // Removed bg-black/60 to keep app visible
                style={{ alignItems: 'flex-end' }} // Force alignment to right
            >
                {/* Floating Menu Container */}
                <Animated.View
                    style={{
                        transform: [{ translateX: slideAnim }],
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.3,
                        shadowRadius: 20,
                        elevation: 10,
                        width: 280, // Fixed width for web safety
                        maxWidth: '80%',
                    }}
                    className="mt-16 mr-4 rounded-3xl overflow-hidden border border-white/10"
                >
                    <LinearGradient
                        colors={['#1a1a2e', '#16213e']}
                        className="p-4"
                    >
                        <View className="flex-row items-center justify-between mb-4 px-2">
                            <Text className="text-white text-lg font-bold">Menu</Text>
                            <TouchableOpacity
                                onPress={onClose}
                                className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
                            >
                                <X size={16} color="white" />
                            </TouchableOpacity>
                        </View>

                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => handleNavigate(item.route)}
                                className="flex-row items-center bg-white/5 active:bg-white/10 border border-white/10 rounded-xl p-3 mb-2"
                            >
                                <View className="w-8 h-8 rounded-full bg-purple-500/20 items-center justify-center mr-3">
                                    <item.icon size={16} color="#a855f7" />
                                </View>
                                <Text className="text-white text-base font-medium">{item.label}</Text>
                            </TouchableOpacity>
                        ))}

                        {/* Language Toggle */}
                        <TouchableOpacity
                            onPress={toggleLanguage}
                            className="flex-row items-center bg-blue-500/10 active:bg-blue-500/20 border border-blue-500/20 rounded-xl p-3 mt-2"
                        >
                            <View className="w-8 h-8 rounded-full bg-blue-500/20 items-center justify-center mr-3">
                                <Globe size={16} color="#3b82f6" />
                            </View>
                            <View>
                                <Text className="text-white text-base font-medium">{t('menu_language')}</Text>
                                <Text className="text-blue-400 text-xs">{language === 'en' ? 'English' : 'Español'}</Text>
                            </View>
                        </TouchableOpacity>

                    </LinearGradient>
                </Animated.View>
            </TouchableOpacity>
        </Modal>
    );
}
