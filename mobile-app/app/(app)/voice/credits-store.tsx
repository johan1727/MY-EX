import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

interface CreditPackage {
    id: string;
    minutes: number;
    price: string;
    package?: PurchasesPackage;
}

export default function CreditsStoreScreen() {
    const router = useRouter();
    const [currentCredits, setCurrentCredits] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [packages, setPackages] = useState<CreditPackage[]>([]);

    useEffect(() => {
        loadCreditsAndPackages();
    }, []);

    const loadCreditsAndPackages = async () => {
        try {
            // Fetch current credits balance
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('call_credits')
                .eq('id', user.id)
                .single();

            setCurrentCredits(profile?.call_credits || 0);

            // Fetch RevenueCat offerings
            const offerings = await Purchases.getOfferings();
            const creditsOffering = offerings.all['credits'];

            if (creditsOffering && creditsOffering.availablePackages.length > 0) {
                const pkgs: CreditPackage[] = creditsOffering.availablePackages.map(pkg => {
                    // Extract minutes from product ID (e.g., call_credits_30min -> 30)
                    const productId = pkg.product.identifier;
                    const minutesPart = productId.split('_').pop()?.replace('min', '') || '0';
                    const minutes = parseInt(minutesPart, 10);

                    return {
                        id: pkg.identifier,
                        minutes,
                        price: pkg.product.priceString,
                        package: pkg
                    };
                });
                setPackages(pkgs);
            }
        } catch (error) {
            console.error('Error loading credits:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = async (pkg: CreditPackage) => {
        if (!pkg.package) return;

        setIsPurchasing(true);
        try {
            const { customerInfo } = await Purchases.purchasePackage(pkg.package);

            // CRITICAL: Manually increment credits in Supabase (Client-side provisional)
            // In production, this should ideally be handled by a Webhook -> Edge Function for security.
            const { error: rpcError } = await supabase.rpc('increment_credits', {
                amount: pkg.minutes
            });

            if (rpcError) {
                console.error('Error adding credits:', rpcError);
                Alert.alert('Atención', 'Compra procesada pero hubo un error actualizando el saldo. Contacta soporte.');
                return;
            }

            // Refresh credits after purchase
            await loadCreditsAndPackages();

            Alert.alert(
                '¡Compra exitosa! 🎉',
                `Se añadieron ${pkg.minutes} minutos a tu saldo.`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error: any) {
            if (!error.userCancelled) {
                console.error('Purchase error:', error);
                Alert.alert('Error', 'No se pudo completar la compra. Intenta de nuevo.');
            }
        } finally {
            setIsPurchasing(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9333EA" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Comprar Créditos',
                    headerStyle: { backgroundColor: '#0A0A0A' },
                    headerTintColor: '#fff',
                }}
            />

            {/* Current Balance Card */}
            <LinearGradient
                colors={['#9333EA', '#7E22CE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.balanceCard}
            >
                <Ionicons name="time-outline" size={32} color="#fff" />
                <Text style={styles.balanceLabel}>Créditos Disponibles</Text>
                <Text style={styles.balanceAmount}>{currentCredits.toFixed(1)} mins</Text>
                <Text style={styles.balanceSubtext}>
                    Estos minutos se usan cuando superas tu límite mensual
                </Text>
            </LinearGradient>

            {/* Info Section */}
            <View style={styles.infoSection}>
                <Ionicons name="information-circle-outline" size={24} color="#9333EA" />
                <Text style={styles.infoText}>
                    Los créditos se acumulan y nunca expiran. Úsalos cuando quieras.
                </Text>
            </View>

            {/* Packages */}
            <View style={styles.packagesContainer}>
                <Text style={styles.sectionTitle}>Paquetes Disponibles</Text>
                {packages.length === 0 ? (
                    <Text style={styles.noPackagesText}>No hay paquetes disponibles en este momento.</Text>
                ) : (
                    packages.map((pkg) => (
                        <TouchableOpacity
                            key={pkg.id}
                            style={styles.packageCard}
                            onPress={() => handlePurchase(pkg)}
                            disabled={isPurchasing}
                        >
                            <View style={styles.packageContent}>
                                <View style={styles.packageIcon}>
                                    <Ionicons name="gift-outline" size={28} color="#9333EA" />
                                </View>
                                <View style={styles.packageInfo}>
                                    <Text style={styles.packageTitle}>{pkg.minutes} Minutos Extra</Text>
                                    <Text style={styles.packageSubtitle}>
                                        Añade {pkg.minutes} minutos a tu saldo
                                    </Text>
                                </View>
                                <View style={styles.packagePriceContainer}>
                                    <Text style={styles.packagePrice}>{pkg.price}</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#9333EA" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>

            {isPurchasing && (
                <View style={styles.purchasingOverlay}>
                    <View style={styles.purchasingCard}>
                        <ActivityIndicator size="large" color="#9333EA" />
                        <Text style={styles.purchasingText}>Procesando compra...</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    balanceCard: {
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#9333EA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    balanceLabel: {
        color: '#E9D5FF',
        fontSize: 14,
        marginTop: 12,
        fontWeight: '600',
    },
    balanceAmount: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
        marginTop: 8,
    },
    balanceSubtext: {
        color: '#E9D5FF',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
        opacity: 0.9,
    },
    infoSection: {
        flexDirection: 'row',
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#9333EA33',
    },
    infoText: {
        flex: 1,
        color: '#D1D5DB',
        fontSize: 13,
        marginLeft: 12,
        lineHeight: 18,
    },
    packagesContainer: {
        flex: 1,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    noPackagesText: {
        color: '#9CA3AF',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 20,
    },
    packageCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2A2A2A',
    },
    packageContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    packageIcon: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#9333EA22',
        justifyContent: 'center',
        alignItems: 'center',
    },
    packageInfo: {
        flex: 1,
        marginLeft: 16,
    },
    packageTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    packageSubtitle: {
        color: '#9CA3AF',
        fontSize: 13,
    },
    packagePriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    packagePrice: {
        color: '#9333EA',
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 4,
    },
    purchasingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    purchasingCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#9333EA',
    },
    purchasingText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 16,
        fontWeight: '600',
    },
});
