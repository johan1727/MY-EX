import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashProps {
    onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
    // Animation values
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.3)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Circle animations
    const circle1Scale = useRef(new Animated.Value(0)).current;
    const circle2Scale = useRef(new Animated.Value(0)).current;
    const circle3Scale = useRef(new Animated.Value(0)).current;
    const circle1Opacity = useRef(new Animated.Value(0.3)).current;
    const circle2Opacity = useRef(new Animated.Value(0.2)).current;
    const circle3Opacity = useRef(new Animated.Value(0.1)).current;

    useEffect(() => {
        // Expanding circles animation
        const circleAnimation = Animated.loop(
            Animated.parallel([
                // Circle 1
                Animated.sequence([
                    Animated.parallel([
                        Animated.timing(circle1Scale, {
                            toValue: 3,
                            duration: 2000,
                            useNativeDriver: true
                        }),
                        Animated.timing(circle1Opacity, {
                            toValue: 0,
                            duration: 2000,
                            useNativeDriver: true
                        })
                    ]),
                    Animated.parallel([
                        Animated.timing(circle1Scale, { toValue: 0, duration: 0, useNativeDriver: true }),
                        Animated.timing(circle1Opacity, { toValue: 0.3, duration: 0, useNativeDriver: true })
                    ])
                ]),
                // Circle 2 (delayed)
                Animated.sequence([
                    Animated.delay(400),
                    Animated.parallel([
                        Animated.timing(circle2Scale, {
                            toValue: 3,
                            duration: 2000,
                            useNativeDriver: true
                        }),
                        Animated.timing(circle2Opacity, {
                            toValue: 0,
                            duration: 2000,
                            useNativeDriver: true
                        })
                    ]),
                    Animated.parallel([
                        Animated.timing(circle2Scale, { toValue: 0, duration: 0, useNativeDriver: true }),
                        Animated.timing(circle2Opacity, { toValue: 0.2, duration: 0, useNativeDriver: true })
                    ])
                ]),
                // Circle 3 (more delayed)
                Animated.sequence([
                    Animated.delay(800),
                    Animated.parallel([
                        Animated.timing(circle3Scale, {
                            toValue: 3,
                            duration: 2000,
                            useNativeDriver: true
                        }),
                        Animated.timing(circle3Opacity, {
                            toValue: 0,
                            duration: 2000,
                            useNativeDriver: true
                        })
                    ]),
                    Animated.parallel([
                        Animated.timing(circle3Scale, { toValue: 0, duration: 0, useNativeDriver: true }),
                        Animated.timing(circle3Opacity, { toValue: 0.1, duration: 0, useNativeDriver: true })
                    ])
                ])
            ])
        );
        circleAnimation.start();

        // Main logo animation sequence
        Animated.sequence([
            // Wait a moment
            Animated.delay(200),

            // Logo fade in + scale up
            Animated.parallel([
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true
                }),
                Animated.spring(logoScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true
                })
            ]),

            // Subtitle fade in
            Animated.timing(subtitleOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true
            }),

            // Brief pause
            Animated.delay(1200),

            // Pulse before exit
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 200,
                    useNativeDriver: true
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true
                })
            ])
        ]).start(() => {
            // Finish and transition to app
            circleAnimation.stop();
            onFinish();
        });

        return () => {
            circleAnimation.stop();
        };
    }, []);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f0517', '#0a0a0a', '#050505']}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Animated circles */}
            <View style={styles.circlesContainer}>
                <Animated.View style={[
                    styles.circle,
                    {
                        transform: [{ scale: circle1Scale }],
                        opacity: circle1Opacity
                    }
                ]} />
                <Animated.View style={[
                    styles.circle,
                    styles.circle2,
                    {
                        transform: [{ scale: circle2Scale }],
                        opacity: circle2Opacity
                    }
                ]} />
                <Animated.View style={[
                    styles.circle,
                    styles.circle3,
                    {
                        transform: [{ scale: circle3Scale }],
                        opacity: circle3Opacity
                    }
                ]} />
            </View>

            {/* Logo */}
            <Animated.View style={[
                styles.logoContainer,
                {
                    opacity: logoOpacity,
                    transform: [
                        { scale: Animated.multiply(logoScale, pulseAnim) }
                    ]
                }
            ]}>
                <Text style={styles.logo}>REMI</Text>
            </Animated.View>

            {/* Subtitle */}
            <Animated.View style={[styles.subtitleContainer, { opacity: subtitleOpacity }]}>
                <Text style={styles.subtitle}>Tu compañero de sanación</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#050505'
    },
    circlesContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center'
    },
    circle: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#a855f7'
    },
    circle2: {
        borderColor: '#8b5cf6'
    },
    circle3: {
        borderColor: '#7c3aed'
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    logo: {
        fontSize: 72,
        fontWeight: '900',
        color: '#ffffff',
        letterSpacing: 8,
        textShadowColor: 'rgba(168, 85, 247, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 30
    },
    subtitleContainer: {
        marginTop: 16
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '500',
        letterSpacing: 2
    }
});
