import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Fingerprint } from 'lucide-react-native';
import { authenticateWithBiometric, verifyPIN, markAppUnlocked, getSecurityMethod } from '../lib/security';

interface AppLockScreenProps {
    onUnlock: () => void;
}

export default function AppLockScreen({ onUnlock }: AppLockScreenProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [showPinInput, setShowPinInput] = useState(false);
    const [securityMethod, setSecurityMethod] = useState<'biometric' | 'pin' | 'both' | 'none'>('none');
    const shakeAnimation = useState(new Animated.Value(0))[0];

    useEffect(() => {
        initSecurity();
    }, []);

    const initSecurity = async () => {
        const method = await getSecurityMethod();
        setSecurityMethod(method);

        if (method === 'biometric' || method === 'both') {
            tryBiometric();
        } else {
            setShowPinInput(true);
        }
    };

    const tryBiometric = async () => {
        const success = await authenticateWithBiometric();
        if (success) {
            await markAppUnlocked();
            onUnlock();
        } else {
            setShowPinInput(true);
        }
    };

    const handlePinSubmit = async () => {
        if (pin.length !== 4) {
            setError('PIN must be 4 digits');
            shake();
            return;
        }

        const isValid = await verifyPIN(pin);
        if (isValid) {
            await markAppUnlocked();
            onUnlock();
        } else {
            setError('Incorrect PIN');
            setPin('');
            shake();
        }
    };

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const handleNumberPress = (num: string) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            setError('');

            if (newPin.length === 4) {
                setTimeout(async () => {
                    const isValid = await verifyPIN(newPin);
                    if (isValid) {
                        await markAppUnlocked();
                        onUnlock();
                    } else {
                        setError('Incorrect PIN');
                        setPin('');
                        shake();
                    }
                }, 100);
            }
        }
    };

    const handleBackspace = () => {
        setPin(pin.slice(0, -1));
        setError('');
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0a0a0a', '#1a1a2e', '#16213e', '#0a0a0a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.content}>
                {/* Lock Icon */}
                <View style={styles.iconContainer}>
                    <LinearGradient
                        colors={['#a855f7', '#3b82f6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconGradient}
                    >
                        <Lock size={48} color="white" />
                    </LinearGradient>
                </View>

                <Text style={styles.title}>My Ex Coach</Text>
                <Text style={styles.subtitle}>
                    {showPinInput ? 'Enter your PIN to unlock' : 'Authenticating...'}
                </Text>

                {showPinInput && (
                    <>
                        {/* PIN Dots */}
                        <Animated.View
                            style={[styles.pinDots, { transform: [{ translateX: shakeAnimation }] }]}
                        >
                            {[0, 1, 2, 3].map((i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.pinDot,
                                        i < pin.length ? styles.pinDotFilled : styles.pinDotEmpty
                                    ]}
                                />
                            ))}
                        </Animated.View>

                        {error ? (
                            <Text style={styles.errorText}>{error}</Text>
                        ) : (
                            <View style={styles.errorPlaceholder} />
                        )}

                        {/* Number Pad */}
                        <View style={styles.numpad}>
                            {[
                                ['1', '2', '3'],
                                ['4', '5', '6'],
                                ['7', '8', '9'],
                                ['', '0', '⌫'],
                            ].map((row, rowIndex) => (
                                <View key={rowIndex} style={styles.numpadRow}>
                                    {row.map((num, colIndex) => (
                                        <TouchableOpacity
                                            key={colIndex}
                                            onPress={() => {
                                                if (num === '⌫') {
                                                    handleBackspace();
                                                } else if (num) {
                                                    handleNumberPress(num);
                                                }
                                            }}
                                            disabled={!num}
                                            style={[styles.numpadButton, !num && styles.numpadButtonEmpty]}
                                        >
                                            <Text style={styles.numpadText}>{num}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ))}
                        </View>

                        {/* Biometric Option */}
                        {(securityMethod === 'biometric' || securityMethod === 'both') && (
                            <TouchableOpacity onPress={tryBiometric} style={styles.biometricButton}>
                                <Fingerprint size={20} color="#a855f7" />
                                <Text style={styles.biometricText}>Use Biometric</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    iconContainer: {
        marginBottom: 32,
    },
    iconGradient: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 32,
    },
    pinDots: {
        flexDirection: 'row',
        marginBottom: 32,
    },
    pinDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginHorizontal: 8,
    },
    pinDotFilled: {
        backgroundColor: '#a855f7',
    },
    pinDotEmpty: {
        backgroundColor: '#374151',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        marginBottom: 16,
    },
    errorPlaceholder: {
        height: 24,
        marginBottom: 16,
    },
    numpad: {
        width: '100%',
        maxWidth: 300,
    },
    numpadRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    numpadButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    numpadButtonEmpty: {
        backgroundColor: 'transparent',
    },
    numpadText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '600',
    },
    biometricButton: {
        marginTop: 24,
        flexDirection: 'row',
        alignItems: 'center',
    },
    biometricText: {
        color: '#a855f7',
        marginLeft: 8,
    },
});
