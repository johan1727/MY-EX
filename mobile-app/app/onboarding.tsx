import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    FlatList,
    Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Brain, MessageCircle, Sparkles, ArrowRight, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
    id: string;
    icon: any;
    title: string;
    subtitle: string;
    description: string;
    gradient: [string, string];
}

const slides: OnboardingSlide[] = [
    {
        id: '1',
        icon: Heart,
        title: 'Bienvenido a REMI',
        subtitle: 'Tu coach de sanación emocional',
        description: 'REMI es tu compañera de IA diseñada para ayudarte a sanar después de una ruptura amorosa.',
        gradient: ['#ec4899', '#a855f7'],
    },
    {
        id: '2',
        icon: Brain,
        title: 'Simulador',
        subtitle: 'Entiende sus patrones',
        description: 'Importa un chat de WhatsApp y nuestra IA analizará la personalidad de tu ex para que puedas practicar conversaciones.',
        gradient: ['#a855f7', '#6366f1'],
    },
    {
        id: '3',
        icon: MessageCircle,
        title: 'Coach Personal',
        subtitle: 'Conversaciones que sanan',
        description: 'Habla con REMI sobre tus sentimientos. Te escucha, te entiende y te guía en tu proceso de sanación.',
        gradient: ['#6366f1', '#3b82f6'],
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleSkip = async () => {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
        router.replace('/auth');
    };

    const handleStart = async () => {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
        router.replace('/auth');
    };

    const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
        const IconComponent = item.icon;

        return (
            <View style={[styles.slide, { width }]}>
                <LinearGradient
                    colors={item.gradient}
                    style={styles.iconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <IconComponent size={64} color="#fff" />
                </LinearGradient>

                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        );
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView style={styles.safeArea}>
                {/* Skip button */}
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                    <Text style={styles.skipText}>Saltar</Text>
                </TouchableOpacity>

                {/* Slides */}
                <FlatList
                    ref={flatListRef}
                    data={slides}
                    renderItem={renderSlide}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: false }
                    )}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                    style={styles.flatList}
                />

                {/* Pagination */}
                <View style={styles.pagination}>
                    {slides.map((_, index) => {
                        const inputRange = [
                            (index - 1) * width,
                            index * width,
                            (index + 1) * width,
                        ];

                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 24, 8],
                            extrapolate: 'clamp',
                        });

                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.4, 1, 0.4],
                            extrapolate: 'clamp',
                        });

                        return (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.dot,
                                    { width: dotWidth, opacity },
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Buttons */}
                <View style={styles.footer}>
                    {currentIndex === slides.length - 1 ? (
                        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                            <LinearGradient
                                colors={['#a855f7', '#6366f1']}
                                style={styles.startButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.startButtonText}>Comenzar</Text>
                                <Sparkles size={20} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                            <Text style={styles.nextButtonText}>Siguiente</Text>
                            <ArrowRight size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    safeArea: {
        flex: 1,
    },
    skipButton: {
        position: 'absolute',
        top: 16,
        right: 20,
        zIndex: 10,
        padding: 8,
    },
    skipText: {
        color: '#6b7280',
        fontSize: 16,
    },
    flatList: {
        flex: 1,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        shadowColor: '#a855f7',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#a855f7',
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 24,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#a855f7',
        marginHorizontal: 4,
    },
    footer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    nextButton: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    startButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    startButtonGradient: {
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
