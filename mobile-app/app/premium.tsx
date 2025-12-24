import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Crown, Check, Sparkles, Brain, MessageCircle, Infinity } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function PremiumScreen() {
    const router = useRouter();

    const features = [
        { icon: Brain, label: 'Análisis ilimitados', desc: 'Sin límite de perfiles de ex' },
        { icon: MessageCircle, label: 'Chat sin límites', desc: 'Conversaciones infinitas' },
        { icon: Sparkles, label: 'Memoria a largo plazo', desc: 'La IA recuerda todo' },
        { icon: Infinity, label: 'Updates premium', desc: 'Acceso anticipado a features' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Premium</Text>
                    <View style={styles.headerSpacer} />
                </View>
            </SafeAreaView>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Hero */}
                <LinearGradient
                    colors={['#f59e0b', '#d97706']}
                    style={styles.hero}
                >
                    <Crown size={48} color="#fff" />
                    <Text style={styles.heroTitle}>REMI Premium</Text>
                    <Text style={styles.heroSubtitle}>Desbloquea todo el poder de la IA</Text>
                </LinearGradient>

                {/* Features */}
                <View style={styles.featuresContainer}>
                    {features.map((feature, i) => (
                        <View key={i} style={styles.featureItem}>
                            <View style={styles.featureIcon}>
                                <feature.icon size={24} color="#f59e0b" />
                            </View>
                            <View style={styles.featureContent}>
                                <Text style={styles.featureLabel}>{feature.label}</Text>
                                <Text style={styles.featureDesc}>{feature.desc}</Text>
                            </View>
                            <Check size={20} color="#22c55e" />
                        </View>
                    ))}
                </View>

                {/* Pricing */}
                <View style={styles.pricingContainer}>
                    <TouchableOpacity style={[styles.planCard, styles.planCardPopular]}>
                        <View style={styles.popularBadge}>
                            <Text style={styles.popularBadgeText}>MÁS POPULAR</Text>
                        </View>
                        <Text style={styles.planName}>Anual</Text>
                        <Text style={styles.planPrice}>$99.99/año</Text>
                        <Text style={styles.planSaving}>Ahorra 50%</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.planCard}>
                        <Text style={styles.planName}>Mensual</Text>
                        <Text style={styles.planPrice}>$9.99/mes</Text>
                    </TouchableOpacity>
                </View>

                {/* CTA */}
                <TouchableOpacity style={styles.ctaButton}>
                    <Text style={styles.ctaButtonText}>Comenzar Prueba Gratis</Text>
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                    Se renovará automáticamente. Cancela cuando quieras.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    headerSafe: {
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    headerSpacer: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    hero: {
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 24,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginTop: 16,
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 8,
    },
    featuresContainer: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    featureIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureContent: {
        flex: 1,
        marginLeft: 12,
    },
    featureLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    featureDesc: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    pricingContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    planCard: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    planCardPopular: {
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
    popularBadge: {
        backgroundColor: '#f59e0b',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 12,
    },
    popularBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#000',
    },
    planName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    planPrice: {
        fontSize: 20,
        fontWeight: '700',
        color: '#f59e0b',
    },
    planSaving: {
        fontSize: 12,
        color: '#22c55e',
        marginTop: 4,
    },
    ctaButton: {
        backgroundColor: '#f59e0b',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginBottom: 16,
    },
    ctaButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    disclaimer: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
    },
});
