import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Animated } from 'react-native';
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
                // Auto-submit when 4 digits entered
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
        <View className="flex-1 bg-black">
            <LinearGradient
                colors={['#0a0a0a', '#1a1a2e', '#16213e', '#0a0a0a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            <View className="flex-1 justify-center items-center px-6">
                {/* Lock Icon */}
                <View className="mb-8">
                    <LinearGradient
                        colors={['#a855f7', '#3b82f6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="w-24 h-24 rounded-full items-center justify-center"
                    >
                        <Lock size={48} color="white" />
                    </LinearGradient>
                </View>

                <Text className="text-white text-2xl font-bold mb-2">My Ex Coach</Text>
                <Text className="text-gray-400 text-center mb-8">
                    {showPinInput ? 'Enter your PIN to unlock' : 'Authenticating...'}
                </Text>

                {showPinInput && (
                    <>
                        {/* PIN Dots */}
                        <Animated.View
                            className="flex-row mb-8"
                            style={{ transform: [{ translateX: shakeAnimation }] }}
                        >
                            {[0, 1, 2, 3].map((i) => (
                                <View
                                    key={i}
                                    className={`w-4 h-4 rounded-full mx-2 ${i < pin.length ? 'bg-purple-500' : 'bg-gray-700'
                                        }`}
                                />
                            ))}
                        </Animated.View>

                        {error ? (
                            <Text className="text-red-500 text-sm mb-4">{error}</Text>
                        ) : (
                            <View className="h-6 mb-4" />
                        )}

                        {/* Number Pad */}
                        <View className="w-full max-w-xs">
                            {[
                                ['1', '2', '3'],
                                ['4', '5', '6'],
                                ['7', '8', '9'],
                                ['', '0', '⌫'],
                            ].map((row, rowIndex) => (
                                <View key={rowIndex} className="flex-row justify-center mb-4">
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
                                            className={`w-20 h-20 rounded-full items-center justify-center mx-2 ${num ? 'bg-white/10' : ''
                                                }`}
                                        >
                                            <Text className="text-white text-2xl font-semibold">{num}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ))}
                        </View>

                        {/* Biometric Option */}
                        {(securityMethod === 'biometric' || securityMethod === 'both') && (
                            <TouchableOpacity
                                onPress={tryBiometric}
                                className="mt-6 flex-row items-center"
                            >
                                <Fingerprint size={20} color="#a855f7" />
                                <Text className="text-purple-500 ml-2">Use Biometric</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>
        </View>
    );
}
