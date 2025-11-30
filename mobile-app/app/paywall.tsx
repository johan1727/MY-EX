import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { X, Check, Star, Shield, Zap } from 'lucide-react-native';
import { useSubscription } from '../lib/SubscriptionContext';
import { PurchasesPackage } from 'react-native-purchases';

export default function PaywallScreen() {
    const router = useRouter();
    const { packages, purchasePackage, isLoading, tier } = useSubscription();
    const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);

    // Seleccionar el paquete anual por defecto si existe
    useEffect(() => {
        if (packages.length > 0 && !selectedPackage) {
            const annual = packages.find(p => p.packageType === 'ANNUAL');
            setSelectedPackage(annual || packages[0]);
        }
    }, [packages]);

    const handlePurchase = async () => {
        if (!selectedPackage) return;

        setIsPurchasing(true);
        try {
            await purchasePackage(selectedPackage);
            Alert.alert('¡Éxito!', 'Bienvenido al plan Premium.');
            router.back();
        } catch (error) {
            // Error manejado en el contexto
        } finally {
            setIsPurchasing(false);
        }
    };

    const features = [
        { text: 'Mensajes ilimitados con tu Coach', icon: <Zap size={20} color="#fbbf24" /> },
        { text: 'Análisis de conversaciones ilimitado', icon: <Star size={20} color="#fbbf24" /> },
        { text: 'Bóveda secreta para fotos/notas', icon: <Shield size={20} color="#fbbf24" /> },
        { text: 'Diario de estado de ánimo', icon: <Check size={20} color="#fbbf24" /> },
        { text: 'Botón de pánico avanzado', icon: <Check size={20} color="#fbbf24" /> },
    ];

    if (isLoading) {
        return (
            <View className="flex-1 bg-black justify-center items-center">
                <ActivityIndicator size="large" color="#a855f7" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-black">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Header con Imagen/Gradiente */}
                <View className="h-64 relative">
                    <LinearGradient
                        colors={['#4c1d95', '#000000']}
                        className="absolute inset-0"
                    />
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="absolute top-12 right-6 z-10 bg-black/30 p-2 rounded-full"
                    >
                        <X size={24} color="white" />
                    </TouchableOpacity>

                    <View className="absolute bottom-6 left-6 right-6">
                        <Text className="text-purple-400 font-bold tracking-widest mb-2">PREMIUM</Text>
                        <Text className="text-white text-4xl font-bold">
                            Acelera tu proceso de sanación
                        </Text>
                    </View>
                </View>

                {/* Features List */}
                <View className="px-6 py-8">
                    {features.map((feature, index) => (
                        <View key={index} className="flex-row items-center mb-4">
                            <View className="bg-white/10 p-2 rounded-full mr-4">
                                {feature.icon}
                            </View>
                            <Text className="text-white text-lg flex-1">{feature.text}</Text>
                        </View>
                    ))}
                </View>

                {/* Packages Selection */}
                <View className="px-6 mb-8">
                    <Text className="text-gray-400 mb-4 font-semibold">ELIGE TU PLAN</Text>

                    {packages.map((pkg) => {
                        const isSelected = selectedPackage?.identifier === pkg.identifier;
                        return (
                            <TouchableOpacity
                                key={pkg.identifier}
                                onPress={() => setSelectedPackage(pkg)}
                                className={`mb-4 p-4 rounded-2xl border-2 flex-row justify-between items-center ${isSelected
                                        ? 'border-purple-500 bg-purple-500/10'
                                        : 'border-white/10 bg-white/5'
                                    }`}
                            >
                                <View>
                                    <Text className="text-white font-bold text-lg">
                                        {pkg.product.title}
                                    </Text>
                                    <Text className="text-gray-400">
                                        {pkg.packageType === 'ANNUAL' ? 'Mejor valor' : 'Flexible'}
                                    </Text>
                                </View>
                                <View className="items-end">
                                    <Text className="text-white font-bold text-xl">
                                        {pkg.product.priceString}
                                    </Text>
                                    {pkg.packageType === 'ANNUAL' && (
                                        <Text className="text-green-400 text-xs">Ahorra 20%</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    {packages.length === 0 && (
                        <View className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                            <Text className="text-yellow-200 text-center">
                                Modo de prueba: No hay paquetes configurados en Google Play aún.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Footer Button */}
            <View className="p-6 bg-black border-t border-white/10">
                <TouchableOpacity
                    onPress={handlePurchase}
                    disabled={isPurchasing || packages.length === 0}
                    className={`w-full py-4 rounded-xl items-center ${isPurchasing || packages.length === 0 ? 'bg-gray-700' : 'bg-purple-600'
                        }`}
                >
                    {isPurchasing ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">
                            Comenzar Ahora
                        </Text>
                    )}
                </TouchableOpacity>
                <Text className="text-gray-500 text-xs text-center mt-4">
                    La suscripción se renueva automáticamente. Cancela cuando quieras.
                </Text>
            </View>
        </View>
    );
}
