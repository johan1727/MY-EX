import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    Animated,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Brain, MessageCircle, Shield, Sparkles, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: 1,
        title: 'Hola, soy REMI',
        subtitle: 'Tu compañero de sanación emocional',
        description: 'Estoy aquí para ayudarte a procesar tus emociones, entender tus sentimientos y avanzar hacia una versión más fuerte de ti.',
        icon: Brain,
        gradient: ['#8b5cf6', '#6366f1'],
    },
    {
        id: 2,
        title: 'Tu espacio seguro',
        subtitle: 'Sin juicios, solo apoyo',
        description: 'Habla conmigo sobre lo que sientes. Puedo ayudarte a analizar conversaciones, manejar momentos difíciles y celebrar tu progreso.',
        icon: Shield,
        gradient: ['#3b82f6', '#06b6d4'],
    },
    {
        id: 3,
        title: 'Comienza ahora',
        subtitle: 'Tu transformación empieza aquí',
        description: 'No necesitas crear una cuenta para empezar. Solo presiona el botón y comienza a sanar.',
        icon: Sparkles,
        gradient: ['#10b981', '#34d399'],
    },
];

export default function WelcomeScreen() {
    const router = useRouter();
    const [currentSlide, setCurrentSlide] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const handleNext = () => {
        if (currentSlide < SLIDES.length - 1) {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start(() => {
                setCurrentSlide(currentSlide + 1);
                scrollViewRef.current?.scrollTo({ x: width * (currentSlide + 1), animated: true });
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            });
        } else {
            handleStart();
        }
    };

    const handleStart = async () => {
        try {
            await AsyncStorage.setItem('hasSeenWelcome', 'true');
        } catch (e) {
            // Continue anyway
        }
        router.replace('/(tabs)');
    };

    const handleScroll = (event: any) => {
        const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
        if (slideIndex !== currentSlide) {
            setCurrentSlide(slideIndex);
        }
    };

    const slide = SLIDES[currentSlide];
    const IconComponent = slide.icon;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Skip button */}
            <TouchableOpacity style={styles.skipButton} onPress={handleStart}>
                <Text style={styles.skipText}>Saltar</Text>
            </TouchableOpacity>

            {/* Content */}
            <View style={styles.content}>
                {/* Icon with gradient background */}
                <Animated.View style={[styles.iconContainer, { opacity: fadeAnim }]}>
                    <LinearGradient
                        colors={slide.gradient}
                        style={styles.iconGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <IconComponent size={48} color="#fff" />
                    </LinearGradient>
                </Animated.View>

                {/* Text content */}
                <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
                    <Text style={styles.title}>{slide.title}</Text>
                    <Text style={styles.subtitle}>{slide.subtitle}</Text>
                    <Text style={styles.description}>{slide.description}</Text>
                </Animated.View>
            </View>

            {/* Pagination dots */}
            <View style={styles.pagination}>
                {SLIDES.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            index === currentSlide && styles.dotActive,
                        ]}
                    />
                ))}
            </View>

            {/* Action button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.button} onPress={handleNext}>
                    <LinearGradient
                        colors={['#8b5cf6', '#6366f1']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.buttonText}>
                            {currentSlide === SLIDES.length - 1 ? 'Comenzar' : 'Siguiente'}
                        </Text>
                        <ArrowRight size={20} color="#fff" style={styles.buttonIcon} />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Login option */}
                <TouchableOpacity
                    style={styles.loginButton}
                    onPress={() => router.push('/auth')}
                >
                    <Text style={styles.loginText}>
                        ¿Ya tienes cuenta? <Text style={styles.loginLink}>Iniciar sesión</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    skipButton: {
        position: 'absolute',
        top: 60,
        right: 24,
        zIndex: 10,
        padding: 8,
    },
    skipText: {
        color: '#6b7280',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconContainer: {
        marginBottom: 40,
    },
    iconGradient: {
        width: 100,
        height: 100,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 36,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -1,
    },
    subtitle: {
        color: '#a855f7',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        color: '#9ca3af',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 320,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#333',
        marginHorizontal: 4,
    },
    dotActive: {
        width: 24,
        backgroundColor: '#8b5cf6',
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 48,
    },
    button: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    buttonIcon: {
        marginLeft: 8,
    },
    loginButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    loginText: {
        color: '#6b7280',
        fontSize: 14,
    },
    loginLink: {
        color: '#8b5cf6',
        fontWeight: '600',
    },
});
