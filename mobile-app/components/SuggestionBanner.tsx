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
            className="mx-6 mb-4"
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onAccept}
                style={{
                    backgroundColor: 'rgba(20, 20, 30, 0.95)',
                    borderRadius: 20,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    shadowColor: '#8b5cf6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 5
                }}
            >
                <View className="flex-row items-center justify-between pl-1">
                    <View className="flex-row items-center flex-1 gap-3.5">
                        {/* Glowing Icon Container */}
                        <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: 'rgba(139, 92, 246, 0.2)'
                        }}>
                            <Sparkles size={20} color="#a78bfa" />
                        </View>

                        {/* Text Content */}
                        <View className="flex-1 mr-2">
                            <Text className="text-white font-bold text-[15px] leading-5">
                                Análisis Disponible
                            </Text>
                            <Text className="text-gray-400 text-xs font-medium" numberOfLines={1}>
                                REMI detectó algo importante
                            </Text>
                        </View>
                    </View>

                    {/* Action Arrow */}
                    <View className="flex-row items-center gap-4 pr-1">
                        <View style={{
                            backgroundColor: '#7c3aed',
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 14,
                            shadowColor: '#8b5cf6',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 3
                        }}>
                            <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Ver</Text>
                        </View>

                        <TouchableOpacity
                            onPress={onDismiss}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ opacity: 0.7 }}
                        >
                            <X size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}
