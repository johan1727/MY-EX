import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    Easing,
    withSequence,
    FadeIn,
    FadeOut
} from 'react-native-reanimated';
import { Brain } from 'lucide-react-native';
import { useTheme } from '../lib/ThemeContext';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 20;

const Particle = ({ delay, index, isDark }: { delay: number, index: number, isDark: boolean }) => {
    // Randomize initial position and movement
    const randomX = useSharedValue(Math.random() * width);
    const randomY = useSharedValue(height / 2 + Math.random() * 200);
    const size = useSharedValue(Math.random() * 10 + 4);
    const opacity = useSharedValue(0);

    useEffect(() => {
        // Random floating movement
        randomY.value = withDelay(delay, withRepeat(withTiming(randomY.value - 300 - Math.random() * 200, {
            duration: 4000 + Math.random() * 3000,
            easing: Easing.linear
        }), -1, false));

        opacity.value = withDelay(delay, withRepeat(withSequence(
            withTiming(0.6, { duration: 1000 }),
            withTiming(0, { duration: 3000 })
        ), -1, false));
    }, []);

    const style = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: randomX.value },
                { translateY: randomY.value },
            ] as any, // Cast to any to avoid strict TS definition mismatch for Reanimated transform
            width: size.value,
            height: size.value,
            borderRadius: size.value / 2,
            opacity: opacity.value,
            position: 'absolute',
            backgroundColor: isDark ? '#a855f7' : '#9333ea', // Purple particles
        };
    });

    return <Animated.View style={style} />;
};

export default function AnalysisLoading({ progress, status }: { progress: number, status: string }) {
    const { isDark } = useTheme();
    const pulse = useSharedValue(1);

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);

    const brainStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    return (
        <View style={[styles.container, !isDark && styles.containerLight]}>
            {/* Background Particles */}
            {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
                <Particle key={i} index={i} delay={Math.random() * 2000} isDark={isDark} />
            ))}

            <View style={styles.content}>
                {/* Central Brain Pulse */}
                <Animated.View style={[
                    styles.brainCircle,
                    !isDark && styles.brainCircleLight,
                    brainStyle
                ]}>
                    <Brain size={64} color={isDark ? "#d8b4fe" : "#7e22ce"} />
                </Animated.View>

                {/* Progress Text */}
                <Text style={[styles.title, !isDark && styles.textLight]}>Analizando Perfil...</Text>

                <View style={styles.progressContainer}>
                    <View style={[styles.progressBarBg, !isDark && styles.progressBarBgLight]}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${progress}%` }
                            ]}
                        />
                    </View>
                </View>

                <Text style={[styles.percent, !isDark && styles.textLight]}>{Math.round(progress)}%</Text>
                <Text style={[styles.status, !isDark && styles.statusLight]}>{status}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a', // Deep dark
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    containerLight: {
        backgroundColor: '#ffffff',
    },
    content: {
        alignItems: 'center',
        padding: 20,
        zIndex: 10,
    },
    brainCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(168, 85, 247, 0.2)', // Purple glow
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        shadowColor: "#a855f7",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    brainCircleLight: {
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        shadowColor: "#9333ea",
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
    },
    textLight: {
        color: '#1f2937',
    },
    progressContainer: {
        width: 250,
        height: 6,
        marginBottom: 10,
    },
    progressBarBg: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarBgLight: {
        backgroundColor: '#e5e7eb',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#a855f7',
        borderRadius: 3,
    },
    percent: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    status: {
        fontSize: 14,
        color: '#9ca3af',
    },
    statusLight: {
        color: '#6b7280',
    },
});
