import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    withSequence,
    Easing,
    interpolateColor
} from 'react-native-reanimated';

interface OrganicOrbProps {
    state: 'idle' | 'listening' | 'thinking' | 'speaking';
    volume: number; // 0 to 1 (normalized) or dB
}

const BlobLayer = ({
    index,
    state,
    volume,
    baseScale,
    color
}: {
    index: number,
    state: string,
    volume: number,
    baseScale: number,
    color: string
}) => {
    const scale = useSharedValue(1);
    const rotate = useSharedValue(0);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    // Continuous "Organic" Movement
    useEffect(() => {
        const duration = 3000 + (index * 1000);

        rotate.value = withRepeat(
            withTiming(360, { duration: duration * 2, easing: Easing.linear }),
            -1
        );

        // Random floating movement
        translateX.value = withRepeat(
            withSequence(
                withTiming(15 * (index % 2 === 0 ? 1 : -1), { duration: duration, easing: Easing.inOut(Easing.quad) }),
                withTiming(-15 * (index % 2 === 0 ? 1 : -1), { duration: duration, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            true
        );

        translateY.value = withRepeat(
            withSequence(
                withTiming(15, { duration: duration * 1.2, easing: Easing.inOut(Easing.quad) }),
                withTiming(-15, { duration: duration * 1.2, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            true
        );
    }, []);

    // Reactive Pulse to Volume
    useEffect(() => {
        let targetScale = baseScale;

        if (state === 'speaking') {
            // AI Speaking: Pulse rhythmic
            targetScale = baseScale + 0.2;
        } else if (state === 'listening') {
            // User Speaking: React to volume
            // Normalize dB: -160 to 0. 
            // Simple normalization for visualizer: map -60...0 to 0...1
            const normalizedVol = Math.max(0, (volume + 60) / 60);
            targetScale = baseScale + (normalizedVol * 0.8);
        } else if (state === 'thinking') {
            // Thinking: Fast throb
            targetScale = baseScale * 0.8;
        }

        scale.value = withTiming(targetScale, { duration: 200 });
    }, [state, volume]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotate: `${rotate.value}deg` },
                { scale: scale.value }
            ],
            backgroundColor: color, // In a real app, interpolate color based on state
            opacity: 0.6 - (index * 0.1)
        };
    });

    return (
        <Animated.View style={[styles.blob, animatedStyle, {
            width: 150 + (index * 20),
            height: 150 + (index * 20),
            zIndex: 10 - index
        }]} />
    );
};

export default function OrganicOrb({ state, volume }: OrganicOrbProps) {
    // Colors based on state
    // Listening (waiting for user): Cyan/Blue
    // Speaking (AI active): Purple/Pink
    // Thinking: White/Gray pulsating
    // Error: Red

    const primaryColor = state === 'speaking' ? '#a855f7' : '#06b6d4'; // Purple vs Cyan
    const secondaryColor = state === 'speaking' ? '#ec4899' : '#3b82f6'; // Pink vs Blue

    return (
        <View style={styles.container}>
            {/* Layer 1: Core */}
            <BlobLayer index={0} state={state} volume={volume} baseScale={1} color={primaryColor} />

            {/* Layer 2: Mid */}
            <BlobLayer index={1} state={state} volume={volume} baseScale={1.2} color={secondaryColor} />

            {/* Layer 3: Outer Aura */}
            <BlobLayer index={2} state={state} volume={volume} baseScale={1.4} color={primaryColor} />

            {/* Web-only blur effect for extra "gooey" look if supported */}
            {Platform.OS === 'web' && (
                <View style={styles.webBlurOverlay} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 300,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        // On Web, we can add a filter to the container to blend blobs
        // @ts-ignore
        ...(Platform.OS === 'web' ? { filter: 'blur(30px) contrast(20)' } : {})
        // Note: contrast(20) + blur creates the "Metaball/Gooey" effect
        // But requires white background usually, or careful color management.
        // For dark mode, simple blur is safer.
        // Let's stick to Blur for smoothness.
    },
    blob: {
        position: 'absolute',
        borderRadius: 999,
    },
    webBlurOverlay: {
        ...StyleSheet.absoluteFillObject,
        // backdropFilter: 'blur(10px)', // Optional
    }
});
