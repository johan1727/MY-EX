import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { Milestone } from '../lib/gamification';

const { width, height } = Dimensions.get('window');

interface MilestoneCelebrationProps {
    visible: boolean;
    milestone: Milestone | null;
    onClose: () => void;
    language: 'en' | 'es';
}

export default function MilestoneCelebration({
    visible,
    milestone,
    onClose,
    language
}: MilestoneCelebrationProps) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const confettiAnims = useRef(
        Array.from({ length: 20 }, () => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            opacity: new Animated.Value(1)
        }))
    ).current;

    useEffect(() => {
        if (visible && milestone) {
            // Badge animation
            Animated.sequence([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                })
            ]).start();

            // Confetti animation
            confettiAnims.forEach((anim, index) => {
                const delay = index * 50;
                const randomX = (Math.random() - 0.5) * width;
                const randomRotation = Math.random() * 360;

                Animated.parallel([
                    Animated.timing(anim.x, {
                        toValue: randomX,
                        duration: 2000,
                        delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.y, {
                        toValue: height,
                        duration: 2000,
                        delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.opacity, {
                        toValue: 0,
                        duration: 2000,
                        delay,
                        useNativeDriver: true,
                    })
                ]).start();
            });
        } else {
            scaleAnim.setValue(0);
            rotateAnim.setValue(0);
            confettiAnims.forEach(anim => {
                anim.x.setValue(0);
                anim.y.setValue(0);
                anim.opacity.setValue(1);
            });
        }
    }, [visible, milestone]);

    if (!milestone) return null;

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const title = language === 'es' ? milestone.title_es : milestone.title_en;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/80 items-center justify-center">
                {/* Confetti */}
                {confettiAnims.map((anim, index) => (
                    <Animated.View
                        key={index}
                        className="absolute w-3 h-3 rounded-full"
                        style={{
                            backgroundColor: ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444'][index % 5],
                            transform: [
                                { translateX: anim.x },
                                { translateY: anim.y }
                            ],
                            opacity: anim.opacity,
                            top: height * 0.3,
                            left: width / 2
                        }}
                    />
                ))}

                {/* Card */}
                <View className="w-11/12 max-w-md">
                    <LinearGradient
                        colors={[milestone.color + '40', milestone.color + '20']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="rounded-3xl p-8 border-2"
                        style={{ borderColor: milestone.color }}
                    >
                        {/* Close Button */}
                        <TouchableOpacity
                            onPress={onClose}
                            className="absolute top-4 right-4 z-10"
                        >
                            <X size={24} color="white" />
                        </TouchableOpacity>

                        {/* Badge */}
                        <Animated.View
                            className="items-center mb-6"
                            style={{
                                transform: [
                                    { scale: scaleAnim },
                                    { rotate }
                                ]
                            }}
                        >
                            <Text className="text-8xl mb-4">
                                {milestone.badge}
                            </Text>
                        </Animated.View>

                        {/* Title */}
                        <Text className="text-white text-3xl font-black text-center mb-2">
                            {language === 'es' ? '¡Logro Desbloqueado!' : 'Achievement Unlocked!'}
                        </Text>

                        <Text
                            className="text-2xl font-bold text-center mb-4"
                            style={{ color: milestone.color }}
                        >
                            {title}
                        </Text>

                        {/* Days */}
                        <View className="bg-white/10 rounded-2xl p-4 mb-6">
                            <Text className="text-white text-center text-lg">
                                <Text className="font-black text-3xl" style={{ color: milestone.color }}>
                                    {milestone.days}
                                </Text>
                                {' '}
                                {language === 'es'
                                    ? milestone.days === 1 ? 'día sin contacto' : 'días sin contacto'
                                    : milestone.days === 1 ? 'day no contact' : 'days no contact'
                                }
                            </Text>
                        </View>

                        {/* Message */}
                        <Text className="text-gray-300 text-center text-base leading-6 mb-6">
                            {language === 'es'
                                ? '¡Estás haciendo un trabajo increíble! Cada día que pasa eres más fuerte. Sigue así, campeón/a.'
                                : 'You\'re doing an amazing job! Every day that passes, you get stronger. Keep it up, champion.'
                            }
                        </Text>

                        {/* Button */}
                        <TouchableOpacity
                            onPress={onClose}
                            className="rounded-2xl p-4"
                            style={{ backgroundColor: milestone.color }}
                        >
                            <Text className="text-white text-center font-bold text-lg">
                                {language === 'es' ? '¡Gracias!' : 'Thank You!'}
                            </Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </View>
        </Modal>
    );
}
