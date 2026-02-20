import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Brain, Sparkles, Heart, MessageCircle } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Emotional, specific messages that feel personal and compelling
const ENGAGING_MESSAGES = [
    "💭 Leyendo entre líneas de cada mensaje...",
    "🌙 Analizando sus palabras de medianoche...",
    "💔 Encontrando el punto exacto donde todo cambió...",
    "🔍 Detectando lo que nunca te dijo en voz alta...",
    "✨ Reconstruyendo cómo te veía de verdad...",
    "🧠 Mapeando sus patrones emocionales ocultos...",
    "💬 Comparando lo que escribía con lo que sentía...",
    "🎭 Identificando sus máscaras y sus verdades...",
    "💝 Descubriendo cómo expresaba (o no) el amor...",
    "⚡ Analizando sus respuestas en momentos difíciles...",
    "📊 Midiendo la evolución de su apego contigo...",
    "🌊 Siguiendo el hilo emocional de la relación...",
    "🧩 Conectando patrones que tú quizás no notaste...",
    "🔮 Construyendo una imagen real de quién es...",
    "💫 Casi listo — los insights más profundos vienen...",
];

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    opacity: number;
}

interface AnalysisLoadingPremiumProps {
    progress: number; // 0-100
    currentStage: string;
    onComplete?: () => void;
}

export default function AnalysisLoadingPremium({
    progress = 0,
    currentStage = 'Iniciando análisis...',
    onComplete,
}: AnalysisLoadingPremiumProps) {
    const { isDark } = useTheme();
    const [particles, setParticles] = useState<Particle[]>([]);
    const [displayMessage, setDisplayMessage] = useState(ENGAGING_MESSAGES[0]);
    const progressWidth = useSharedValue(0);
    const glowOpacity = useSharedValue(0);
    const brainScale = useSharedValue(1);

    // Determine if mobile
    const isMobile = screenWidth < 768;

    // Initialize particles (fewer on mobile)
    useEffect(() => {
        const particleCount = isMobile ? 20 : 40;
        const newParticles: Particle[] = [];
        for (let i = 0; i < particleCount; i++) {
            newParticles.push({
                id: i,
                x: Math.random() * screenWidth,
                y: Math.random() * screenHeight,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.4 + 0.1,
            });
        }
        setParticles(newParticles);
    }, []);

    // Rotate through engaging messages
    useEffect(() => {
        const interval = setInterval(() => {
            const randomMessage = ENGAGING_MESSAGES[Math.floor(Math.random() * ENGAGING_MESSAGES.length)];
            setDisplayMessage(randomMessage);
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    // Animate progress bar
    useEffect(() => {
        progressWidth.value = withTiming(progress, {
            duration: 800,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });

        // Trigger completion animation
        if (progress >= 100 && onComplete) {
            setTimeout(() => {
                onComplete();
            }, 1500);
        }
    }, [progress]);

    // Pulsing glow effect
    useEffect(() => {
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.8, { duration: 1500 }),
                withTiming(0.2, { duration: 1500 })
            ),
            -1,
            false
        );
    }, []);

    // Brain breathing animation
    useEffect(() => {
        brainScale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );
    }, []);

    const progressBarStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    const brainStyle = useAnimatedStyle(() => ({
        transform: [{ scale: brainScale.value }],
    }));

    // Theme-aware colors
    const colors = {
        bg: isDark ? ['#0a0a0c', '#1a0f2e', '#0f0f11'] : ['#fafafa', '#f0f4ff', '#ffffff'],
        particle: isDark ? '#a855f7' : '#8b5cf6',
        title: isDark ? '#ffffff' : '#000000',
        subtitle: isDark ? '#888888' : '#666666',
        cardBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        cardBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        progressBg: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        text: isDark ? '#ffffff' : '#000000',
        mutedText: isDark ? '#666666' : '#999999',
        accent: isDark ? '#4fd1c5' : '#10b981',
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={colors.bg as unknown as readonly [string, string, ...string[]]}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Particles Background */}
            {particles.map((particle) => (
                <View
                    key={particle.id}
                    style={[
                        styles.particle,
                        {
                            left: particle.x,
                            top: particle.y,
                            width: particle.size,
                            height: particle.size,
                            opacity: particle.opacity,
                            backgroundColor: colors.particle,
                        },
                    ]}
                />
            ))}

            {/* Main Content - Scrollable on mobile */}
            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    isMobile && styles.contentMobile,
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Brain Icon with Breathing Animation */}
                <Animated.View style={[styles.iconContainer, brainStyle, {
                    backgroundColor: isDark ? 'rgba(168, 85, 247, 0.1)' : 'rgba(139, 92, 246, 0.08)',
                    borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(139, 92, 246, 0.2)',
                    marginBottom: isMobile ? 16 : 24,
                    padding: isMobile ? 12 : 20,
                }]}>
                    <Brain color={colors.particle} size={isMobile ? 60 : 80} strokeWidth={1.5} />
                </Animated.View>

                {/* Glow Effect */}
                <Animated.View style={[styles.glow, glowStyle, {
                    backgroundColor: colors.particle,
                }]} />

                {/* Title */}
                <Text style={[styles.title, {
                    color: colors.title,
                    fontSize: isMobile ? 22 : 28,
                    marginBottom: isMobile ? 4 : 8,
                }]}>
                    Analizando tu Conversación
                </Text>
                <Text style={[styles.subtitle, {
                    color: colors.subtitle,
                    fontSize: isMobile ? 12 : 14,
                    marginBottom: isMobile ? 20 : 32,
                }]}>
                    IA entrenada con psicología de relaciones
                </Text>

                {/* Stage Info - Rotating Messages */}
                <View style={[styles.stageContainer, {
                    backgroundColor: isDark ? 'rgba(79, 209, 197, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                    borderColor: isDark ? 'rgba(79, 209, 197, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                    marginBottom: isMobile ? 16 : 24,
                    paddingHorizontal: isMobile ? 12 : 20,
                    paddingVertical: isMobile ? 6 : 10,
                    maxWidth: isMobile ? screenWidth - 40 : 500,
                }]}>
                    <Sparkles color={colors.accent} size={isMobile ? 16 : 20} />
                    <Text style={[styles.stageText, {
                        color: colors.accent,
                        fontSize: isMobile ? 12 : 14,
                        flexShrink: 1,
                    }]} numberOfLines={2}>
                        {displayMessage}
                    </Text>
                </View>

                {/* Progress Bar */}
                <View style={[styles.progressContainer, {
                    width: isMobile ? screenWidth - 60 : Math.min(screenWidth - 160, 500),
                    marginBottom: isMobile ? 16 : 24,
                }]}>
                    <View style={[styles.progressBackground, {
                        backgroundColor: colors.progressBg,
                        height: isMobile ? 10 : 12,
                    }]}>
                        <Animated.View style={[styles.progressBar, progressBarStyle]}>
                            <LinearGradient
                                colors={isDark ? ['#a855f7', '#4fd1c5', '#a855f7'] : ['#8b5cf6', '#10b981', '#8b5cf6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFillObject}
                            />
                        </Animated.View>
                    </View>
                    <Text style={[styles.progressText, {
                        color: colors.text,
                        fontSize: isMobile ? 14 : 16,
                    }]}>
                        {Math.round(progress)}%
                    </Text>
                </View>

                {/* Time Estimate */}
                <View style={[styles.timeContainer, { marginBottom: isMobile ? 16 : 24 }]}>
                    <View style={[styles.timeBox, {
                        backgroundColor: colors.cardBg,
                        paddingHorizontal: isMobile ? 12 : 16,
                        paddingVertical: isMobile ? 6 : 8,
                    }]}>
                        <Text style={styles.timeIcon}>⏱️</Text>
                        <Text style={[styles.timeText, {
                            color: colors.text,
                            fontSize: isMobile ? 12 : 14,
                        }]}>
                            Puede tardar hasta 5 minutos
                        </Text>
                    </View>
                    <Text style={[styles.timeSubtext, {
                        color: colors.mutedText,
                        fontSize: isMobile ? 10 : 12,
                    }]}>
                        Procesando miles de mensajes con IA avanzada
                    </Text>
                </View>

                {/* Feature Pills */}
                <View style={[styles.featuresRow, { marginBottom: isMobile ? 16 : 24, gap: isMobile ? 8 : 12 }]}>
                    <View style={[styles.featurePill, {
                        backgroundColor: colors.cardBg,
                        borderColor: colors.cardBorder,
                        paddingHorizontal: isMobile ? 8 : 12,
                        paddingVertical: isMobile ? 6 : 8,
                    }]}>
                        <Heart color={isDark ? "#ff6b9d" : "#ec4899"} size={isMobile ? 14 : 16} />
                        <Text style={[styles.featureText, {
                            color: colors.subtitle,
                            fontSize: isMobile ? 10 : 12,
                        }]}>
                            Análisis Emocional
                        </Text>
                    </View>
                    <View style={[styles.featurePill, {
                        backgroundColor: colors.cardBg,
                        borderColor: colors.cardBorder,
                        paddingHorizontal: isMobile ? 8 : 12,
                        paddingVertical: isMobile ? 6 : 8,
                    }]}>
                        <MessageCircle color={colors.accent} size={isMobile ? 14 : 16} />
                        <Text style={[styles.featureText, {
                            color: colors.subtitle,
                            fontSize: isMobile ? 10 : 12,
                        }]}>
                            Patrones de Chat
                        </Text>
                    </View>
                </View>

                {/* Bottom Disclaimer */}
                <Text style={[styles.disclaimer, {
                    color: colors.mutedText,
                    fontSize: isMobile ? 10 : 12,
                }]}>
                    🔒 Tu información está segura y encriptada
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    particle: {
        position: 'absolute',
        borderRadius: 999,
        shadowColor: '#a855f7',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 3,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
        zIndex: 10,
        minHeight: screenHeight,
        justifyContent: 'center',
    },
    contentMobile: {
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    iconContainer: {
        borderRadius: 999,
        borderWidth: 2,
    },
    glow: {
        position: 'absolute',
        top: 20,
        width: 200,
        height: 200,
        borderRadius: 999,
        opacity: 0.2,
        // Note: blur doesn't work on RN, but works on web
    },
    title: {
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        textAlign: 'center',
    },
    stageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 999,
        borderWidth: 1,
    },
    stageText: {
        fontWeight: '600',
    },
    progressContainer: {
        alignItems: 'center',
    },
    progressBackground: {
        width: '100%',
        borderRadius: 999,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        borderRadius: 999,
    },
    progressText: {
        fontWeight: '700',
    },
    timeContainer: {
        alignItems: 'center',
    },
    timeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        marginBottom: 8,
    },
    timeIcon: {
        fontSize: 16,
    },
    timeText: {
        fontWeight: '600',
    },
    timeSubtext: {
        textAlign: 'center',
    },
    featuresRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    featurePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    featureText: {
        fontWeight: '600',
    },
    disclaimer: {
        textAlign: 'center',
        marginTop: 8,
    },
});
