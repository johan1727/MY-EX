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
import { Brain, MessageCircle, Shield, Sparkles, ArrowRight, FileText, UserCheck } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/ThemeContext';
import { useLanguage } from '../lib/i18n';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: 'import',
        title: { es: 'Tu Chat es la Llave', en: 'Your Chat is the Key' },
        subtitle: { es: 'Importa tu historial', en: 'Import your history' },
        description: {
            es: 'Sube tu chat exportado de WhatsApp. Es la materia prima para que la IA entienda tu historia real.',
            en: 'Upload your exported WhatsApp chat. It is the raw material for AI to understand your real story.'
        },
        icon: FileText,
        gradient: ['#10b981', '#059669'], // Green/Emerald
    },
    {
        id: 'analyze',
        title: { es: 'Análisis Profundo', en: 'Deep Analysis' },
        subtitle: { es: 'Descubre la verdad', en: 'Discover the truth' },
        description: {
            es: 'La IA detecta patrones ocultos, señales de toxicidad y lo que no se dijo entre líneas.',
            en: 'AI detects hidden patterns, signs of toxicity, and what was left unsaid between the lines.'
        },
        icon: Brain,
        gradient: ['#8b5cf6', '#6366f1'], // Violet/Indigo
    },
    {
        id: 'simulate',
        title: { es: 'Simulación Realista', en: 'Realistic Simulation' },
        subtitle: { es: 'Practica el cierre', en: 'Practice closure' },
        description: {
            es: 'Habla con una versión digital de tu ex (o quien necesites) basada 100% en sus mensajes reales.',
            en: 'Talk to a digital version of your ex (or whoever you need) based 100% on their real messages.'
        },
        icon: MessageCircle,
        gradient: ['#f43f5e', '#e11d48'], // Rose
    }
];

export default function WelcomeScreen() {
    const router = useRouter();
    const [currentSlide, setCurrentSlide] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    // Theme & Language
    const { isDark } = useTheme();
    const { language } = useLanguage(); // Hooks from i18n

    // Defaults
    const bgColor = isDark ? '#000000' : '#ffffff';
    const textColor = isDark ? '#fff' : '#111827';
    const subTextColor = isDark ? '#9ca3af' : '#4b5563';
    const dotColor = isDark ? '#333' : '#e5e7eb';
    const activeDotColor = isDark ? '#fff' : '#111';

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

            // FIX: Update database state so it persists across installs/devices
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ onboarding_completed: true })
                    .eq('id', user.id);

                if (error) console.error('[Welcome] Error updating onboarding status:', error);
                else console.log('[Welcome] Onboarding marked as completed in DB');
            }
        } catch (e) {
            // Continue anyway
            console.error('[Welcome] Error in handleStart:', e);
        }
        router.replace('/(tabs)');
    };

    const handleScroll = (event: any) => {
        const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
        if (slideIndex !== currentSlide) {
            setCurrentSlide(slideIndex);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={{ flex: 1 }}
                contentContainerStyle={{ width: width * SLIDES.length }}
            >
                {SLIDES.map((slide, index) => {
                    const IconComponent = slide.icon;
                    return (
                        <View key={slide.id} style={[styles.slide, { width }]}>
                            <View style={styles.content}>
                                {/* Icon with gradient background */}
                                <Animated.View style={[styles.iconContainer, { opacity: fadeAnim }]}>
                                    <LinearGradient
                                        colors={slide.gradient as [string, string]}
                                        style={styles.iconGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <IconComponent size={48} color="#fff" />
                                    </LinearGradient>
                                </Animated.View>

                                {/* Text content */}
                                <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
                                    <Text style={[styles.title, { color: textColor }]}>
                                        {slide.title[language as 'es' | 'en']}
                                    </Text>
                                    <Text style={[styles.subtitle, { color: slide.gradient[0] }]}>
                                        {slide.subtitle[language as 'es' | 'en']}
                                    </Text>
                                    <Text style={[styles.description, { color: subTextColor }]}>
                                        {slide.description[language as 'es' | 'en']}
                                    </Text>
                                </Animated.View>
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
                            { backgroundColor: index === currentSlide ? activeDotColor : dotColor },
                            index === currentSlide && styles.dotActive
                        ]}
                    />
                ))}
            </View>

            {/* Footer Action */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.button} onPress={handleNext}>
                    <LinearGradient
                        colors={['#8b5cf6', '#6366f1'] as [string, string]}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.buttonText}>
                            {currentSlide === SLIDES.length - 1
                                ? (language === 'es' ? 'Crear mi Análisis' : 'Create my Analysis')
                                : (language === 'es' ? 'Siguiente' : 'Next')}
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
                        {language === 'es' ? '¿Ya tienes cuenta?' : 'Already have an account?'}{' '}
                        <Text style={styles.loginLink}>
                            {language === 'es' ? 'Iniciar sesión' : 'Sign in'}
                        </Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    slide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        fontSize: 32,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
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
        maxWidth: 300,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
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
