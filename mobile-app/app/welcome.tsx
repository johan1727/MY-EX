import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    Animated,
    StyleSheet,
    ScrollView,
    Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Brain, MessageCircle, Shield, Sparkles, ArrowRight, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/ThemeContext';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: 1,
        title: 'Hola, soy REMI',
        subtitle: 'Tu coach de sanación inteligente',
        description: 'Estoy aquí para escucharte y ayudarte a superar a tu ex mediante análisis profundo y apoyo constante.',
        icon: Sparkles,
        gradient: ['#8b5cf6', '#6366f1'],
    },
    {
        id: 2,
        title: 'Analiza tu Chat',
        subtitle: 'Descubre la verdad',
        description: 'Importa tu chat de WhatsApp y descubre patrones ocultos, banderas rojas y la dinámica real de tu relación.',
        icon: MessageCircle,
        gradient: ['#10b981', '#059669'],
    },
    {
        id: 3,
        title: 'Simula Conversaciones',
        subtitle: 'Cierra ciclos sin hablarle',
        description: 'Practica lo que quisieras decirle en un entorno seguro. REMI simulará ser tu ex basándose en su personalidad real.',
        icon: Brain,
        gradient: ['#f59e0b', '#d97706'],
    }
];

export default function WelcomeScreen() {
    const router = useRouter();
    const [currentSlide, setCurrentSlide] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const handleNext = () => {
        if (currentSlide < SLIDES.length - 1) {
            scrollToSlide(currentSlide + 1);
        } else {
            handleStart();
        }
    };

    const scrollToSlide = (index: number) => {
        scrollViewRef.current?.scrollTo({ x: width * index, animated: true });
        setCurrentSlide(index);
    };

    const handleStart = async () => {
        try {
            await AsyncStorage.setItem('hasSeenWelcome', 'true');
        } catch (e) {
            // Continue anyway
        }
        router.replace('/(tabs)');
    };

    const handleImportNow = async () => {
        try {
            await AsyncStorage.setItem('hasSeenWelcome', 'true');
        } catch (e) { }
        // Navigate directly to import tab or logic
        router.replace('/tools/ex-simulator/import');
    };

    const onScroll = (event: any) => {
        const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
        if (slideIndex !== currentSlide) {
            setCurrentSlide(slideIndex);
        }
    };

    const slide = SLIDES[currentSlide];

    // Theme Support
    const { isDark } = useTheme();
    const bgColor = isDark ? '#000000' : '#ffffff';
    const textColor = isDark ? '#fff' : '#111827';
    const subTextColor = isDark ? '#9ca3af' : '#4b5563';

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <TouchableOpacity style={styles.skipButton} onPress={handleStart}>
                <Text style={styles.skipText}>Saltar</Text>
            </TouchableOpacity>

            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                style={styles.scrollView}
            >
                {SLIDES.map((item, index) => {
                    const IconComponent = item.icon;
                    return (
                        <View key={item.id} style={[styles.slide, { width }]}>
                            <Animated.View style={[styles.iconContainer, { opacity: fadeAnim }]}>
                                <LinearGradient
                                    colors={item.gradient as [string, string]}
                                    style={styles.iconGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <IconComponent size={64} color="#fff" />
                                </LinearGradient>
                            </Animated.View>

                            <View style={styles.textContainer}>
                                <Text style={[styles.title, { color: textColor }]}>{item.title}</Text>
                                <Text style={[styles.subtitle, { color: item.gradient[0] }]}>{item.subtitle}</Text>
                                <Text style={[styles.description, { color: subTextColor }]}>{item.description}</Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Pagination Dots */}
            <View style={styles.pagination}>
                {SLIDES.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            currentSlide === index ? [styles.dotActive, { backgroundColor: SLIDES[currentSlide].gradient[0] }] : { backgroundColor: '#333' }
                        ]}
                    />
                ))}
            </View>

            {/* Actions */}
            <View style={styles.footer}>
                {currentSlide === SLIDES.length - 1 ? (
                    <View style={{ width: '100%', gap: 12 }}>
                        <TouchableOpacity style={styles.button} onPress={handleImportNow}>
                            <LinearGradient
                                colors={['#25D366', '#128C7E'] as [string, string]} // WhatsApp colors
                                style={styles.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <MessageCircle size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.buttonText}>Importar Chat de WhatsApp</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleStart}>
                            <Text style={styles.secondaryButtonText}>Explorar la App</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.button} onPress={handleNext}>
                        <LinearGradient
                            colors={['#8b5cf6', '#6366f1'] as [string, string]}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.buttonText}>Siguiente</Text>
                            <ArrowRight size={20} color="#fff" style={styles.buttonIcon} />
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    slide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 60,
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
    iconContainer: {
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    iconGradient: {
        width: 120,
        height: 120,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 16,
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
        marginHorizontal: 4,
    },
    dotActive: {
        width: 24,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 48,
        width: '100%',
    },
    button: {
        borderRadius: 16,
        overflow: 'hidden',
        width: '100%',
    },
    secondaryButton: {
        backgroundColor: '#333',
        paddingVertical: 18,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
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
});
