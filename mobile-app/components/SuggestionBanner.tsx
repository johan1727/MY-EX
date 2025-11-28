import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SuggestionBannerProps {
    message: string;
    icon: string;
    onAccept: () => void;
    onDismiss: () => void;
    visible: boolean;
}

export default function SuggestionBanner({
    message,
    icon,
    onAccept,
    onDismiss,
    visible
}: SuggestionBannerProps) {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(-50)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: -50,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            }}
            className="mx-4 mb-3"
        >
            <LinearGradient
                colors={['#8b5cf6', '#ec4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl p-0.5"
            >
                <View className="bg-[#1a1a2e] rounded-2xl p-4">
                    <View className="flex-row items-start">
                        {/* Icon */}
                        <View className="bg-purple-500/20 rounded-full p-2 mr-3">
                            <Sparkles size={20} color="#a855f7" />
                        </View>

                        {/* Content */}
                        <View className="flex-1">
                            <View className="flex-row items-center mb-1">
                                <Text className="text-purple-400 font-bold text-sm">
                                    Sugerencia
                                </Text>
                            </View>
                            <Text className="text-white text-sm leading-5 mb-3">
                                {message}
                            </Text>

                            {/* Actions */}
                            <View className="flex-row gap-2">
                                <TouchableOpacity
                                    onPress={onAccept}
                                    className="flex-1"
                                >
                                    <LinearGradient
                                        colors={['#8b5cf6', '#ec4899']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        className="rounded-xl py-2 px-4"
                                    >
                                        <Text className="text-white font-semibold text-center text-sm">
                                            {icon} Abrir
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={onDismiss}
                                    className="bg-white/10 rounded-xl py-2 px-4"
                                >
                                    <Text className="text-gray-400 font-semibold text-sm">
                                        Ahora no
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Close button */}
                        <TouchableOpacity
                            onPress={onDismiss}
                            className="ml-2 p-1"
                        >
                            <X size={16} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>
        </Animated.View>
    );
}
