import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Lock, Fingerprint, Shield, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
    setupAppLock,
    savePIN,
    enableSecurity,
    hasBiometricHardware,
    isBiometricEnrolled,
    SecurityMethod
} from '../lib/security';

export default function SecuritySetupScreen() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [selectedMethod, setSelectedMethod] = useState<SecurityMethod>('pin');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);

    React.useEffect(() => {
        checkBiometric();
    }, []);

    const checkBiometric = async () => {
        const hasHardware = await hasBiometricHardware();
        const isEnrolled = await isBiometricEnrolled();
        setBiometricAvailable(hasHardware && isEnrolled);
    };

    const handleComplete = async () => {
        if (selectedMethod === 'pin' || selectedMethod === 'both') {
            if (pin.length !== 4) {
                Alert.alert('Invalid PIN', 'PIN must be 4 digits');
                return;
            }

            if (pin !== confirmPin) {
                Alert.alert('PIN Mismatch', 'PINs do not match');
                return;
            }
        }

        setLoading(true);
        try {
            if (selectedMethod === 'pin' || selectedMethod === 'both') {
                await savePIN(pin);
            }

            await enableSecurity(selectedMethod);
            Alert.alert('Success', 'Security enabled successfully');
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-black">
            <StatusBar style="light" />

            <LinearGradient
                colors={['#0a0a0a', '#1a1a2e', '#16213e', '#0a0a0a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            <SafeAreaView className="flex-1">
                <ScrollView className="flex-1 px-6 py-8" showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View className="items-center mb-8">
                        <View className="w-20 h-20 rounded-full items-center justify-center mb-4">
                            <LinearGradient
                                colors={['#a855f7', '#3b82f6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="w-full h-full rounded-full items-center justify-center"
                            >
                                <Shield size={40} color="white" />
                            </LinearGradient>
                        </View>
                        <Text className="text-white text-3xl font-bold mb-2">App Security</Text>
                        <Text className="text-gray-400 text-center">
                            Protect your privacy with a PIN or biometric lock
                        </Text>
                    </View>

                    {/* Progress Indicator */}
                    <View className="flex-row justify-center mb-8">
                        {[1, 2].map((s) => (
                            <View
                                key={s}
                                className={`h-2 w-16 rounded-full mx-1 ${s <= step ? 'bg-purple-500' : 'bg-gray-700'
                                    }`}
                            />
                        ))}
                    </View>

                    {/* Step 1: Choose Method */}
                    {step === 1 && (
                        <View>
                            <Text className="text-white text-2xl font-bold mb-2">Choose Security Method</Text>
                            <Text className="text-gray-400 mb-6">How would you like to lock your app?</Text>

                            {/* Biometric Option */}
                            {biometricAvailable && (
                                <TouchableOpacity
                                    onPress={() => setSelectedMethod('biometric')}
                                    className={`mb-4 p-5 rounded-2xl border-2 ${selectedMethod === 'biometric'
                                            ? 'bg-purple-500/20 border-purple-500'
                                            : 'bg-white/5 border-white/10'
                                        }`}
                                >
                                    <View className="flex-row items-center mb-2">
                                        <Fingerprint size={32} color="#a855f7" />
                                        <Text className="text-white text-lg font-bold ml-3">Biometric Only</Text>
                                    </View>
                                    <Text className="text-gray-400 text-sm">
                                        Use FaceID, TouchID, or Fingerprint to unlock
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* PIN Option */}
                            <TouchableOpacity
                                onPress={() => setSelectedMethod('pin')}
                                className={`mb-4 p-5 rounded-2xl border-2 ${selectedMethod === 'pin'
                                        ? 'bg-purple-500/20 border-purple-500'
                                        : 'bg-white/5 border-white/10'
                                    }`}
                            >
                                <View className="flex-row items-center mb-2">
                                    <Lock size={32} color="#3b82f6" />
                                    <Text className="text-white text-lg font-bold ml-3">PIN Only</Text>
                                </View>
                                <Text className="text-gray-400 text-sm">Use a 4-digit PIN to unlock</Text>
                            </TouchableOpacity>

                            {/* Both Option */}
                            {biometricAvailable && (
                                <TouchableOpacity
                                    onPress={() => setSelectedMethod('both')}
                                    className={`mb-4 p-5 rounded-2xl border-2 ${selectedMethod === 'both'
                                            ? 'bg-purple-500/20 border-purple-500'
                                            : 'bg-white/5 border-white/10'
                                        }`}
                                >
                                    <View className="flex-row items-center mb-2">
                                        <Shield size={32} color="#10b981" />
                                        <Text className="text-white text-lg font-bold ml-3">Both (Recommended)</Text>
                                    </View>
                                    <Text className="text-gray-400 text-sm">
                                        Biometric with PIN fallback for extra security
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {!biometricAvailable && (
                                <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
                                    <Text className="text-yellow-400 text-sm">
                                        ⚠️ Biometric authentication is not available on this device. You can use PIN
                                        instead.
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Step 2: Set PIN */}
                    {step === 2 && (selectedMethod === 'pin' || selectedMethod === 'both') && (
                        <View>
                            <Text className="text-white text-2xl font-bold mb-2">Create Your PIN</Text>
                            <Text className="text-gray-400 mb-6">Choose a 4-digit PIN you'll remember</Text>

                            <View className="mb-6">
                                <Text className="text-gray-400 mb-2">Enter PIN</Text>
                                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                                    <Lock size={20} color="#a855f7" />
                                    <TextInput
                                        className="flex-1 ml-3 text-white text-base"
                                        placeholder="4-digit PIN"
                                        placeholderTextColor="#6b7280"
                                        value={pin}
                                        onChangeText={setPin}
                                        keyboardType="number-pad"
                                        maxLength={4}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-400 mb-2">Confirm PIN</Text>
                                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                                    <Lock size={20} color="#3b82f6" />
                                    <TextInput
                                        className="flex-1 ml-3 text-white text-base"
                                        placeholder="Re-enter PIN"
                                        placeholderTextColor="#6b7280"
                                        value={confirmPin}
                                        onChangeText={setConfirmPin}
                                        keyboardType="number-pad"
                                        maxLength={4}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            {pin && confirmPin && pin !== confirmPin && (
                                <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4">
                                    <Text className="text-red-400 text-sm">❌ PINs do not match</Text>
                                </View>
                            )}

                            {pin && confirmPin && pin === confirmPin && (
                                <View className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-4">
                                    <Text className="text-green-400 text-sm">✅ PINs match!</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Step 2: Biometric Only Confirmation */}
                    {step === 2 && selectedMethod === 'biometric' && (
                        <View>
                            <Text className="text-white text-2xl font-bold mb-2">All Set!</Text>
                            <Text className="text-gray-400 mb-6">
                                Your app will be locked with biometric authentication
                            </Text>

                            <View className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                                <Text className="text-blue-400 text-sm">
                                    💡 You'll need to authenticate with your fingerprint, face, or device PIN each
                                    time you open the app.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Navigation Buttons */}
                    <View className="mt-8">
                        {step < 2 ? (
                            <TouchableOpacity
                                onPress={() => setStep(2)}
                                className="rounded-2xl overflow-hidden"
                            >
                                <LinearGradient
                                    colors={['#a855f7', '#3b82f6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    className="flex-row items-center justify-center p-4"
                                >
                                    <Text className="text-white font-bold text-lg mr-2">Continue</Text>
                                    <ArrowRight size={20} color="white" />
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={handleComplete}
                                disabled={loading || (selectedMethod !== 'biometric' && pin !== confirmPin)}
                                className="rounded-2xl overflow-hidden"
                            >
                                <LinearGradient
                                    colors={
                                        loading || (selectedMethod !== 'biometric' && pin !== confirmPin)
                                            ? ['#374151', '#374151']
                                            : ['#a855f7', '#3b82f6']
                                    }
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    className="flex-row items-center justify-center p-4"
                                >
                                    <Text className="text-white font-bold text-lg">
                                        {loading ? 'Enabling...' : 'Enable Security'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {step > 1 && (
                            <TouchableOpacity onPress={() => setStep(1)} className="mt-4 p-4">
                                <Text className="text-gray-400 text-center">Back</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
