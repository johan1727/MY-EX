import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, X, Lock, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface InsightTeaserModalProps {
    visible: boolean;
    onDismiss: () => void;
    featureName?: string;
}

const { width } = Dimensions.get('window');

export default function InsightTeaserModal({
    visible,
    onDismiss,
    featureName = "Análisis de Patrones"
}: InsightTeaserModalProps) {
    const router = useRouter();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onDismiss} activeOpacity={1} />

                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={['#1e1b4b', '#312e81']} // Indigo theme
                        style={styles.card}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {/* Header Image / Icon */}
                        <View style={styles.iconContainer}>
                            <View style={styles.iconCircle}>
                                <Sparkles size={32} color="#a5b4fc" />
                            </View>
                            <View style={styles.lockBadge}>
                                <Lock size={12} color="#fff" />
                            </View>
                        </View>

                        <Text style={styles.title}>Descubrimiento VIP</Text>

                        <Text style={styles.description}>
                            REMI ha detectado un patrón oculto en tu conversación.
                            <Text style={styles.highlight}> "{featureName}"</Text> está disponible para miembros Premium.
                        </Text>

                        {/* Feature Preview List */}
                        <View style={styles.featuresList}>
                            <View style={styles.featureItem}>
                                <View style={styles.bullet} />
                                <Text style={styles.featureText}>Decodificación de intenciones reales</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <View style={styles.bullet} />
                                <Text style={styles.featureText}>Predicción de próxima respuesta</Text>
                            </View>
                        </View>

                        {/* Actions */}
                        <TouchableOpacity
                            style={styles.upgradeButton}
                            onPress={() => {
                                onDismiss();
                                router.push('/paywall');
                            }}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#6366f1', '#8b5cf6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientButton}
                            >
                                <Text style={styles.upgradeText}>Desbloquear Insight</Text>
                                <ChevronRight size={16} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dismissButton}
                            onPress={onDismiss}
                        >
                            <Text style={styles.dismissText}>Ahora no</Text>
                        </TouchableOpacity>

                        {/* Close X */}
                        <TouchableOpacity style={styles.closeIcon} onPress={onDismiss}>
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        zIndex: 1000
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)'
    },
    modalContainer: {
        width: '100%',
        padding: 16,
        paddingBottom: 34
    },
    card: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 20
    },
    iconContainer: {
        marginBottom: 16,
        position: 'relative'
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)'
    },
    lockBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#fbbf24',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1e1b4b'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center'
    },
    description: {
        fontSize: 14,
        color: '#cbd5e1',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24
    },
    highlight: {
        color: '#a5b4fc',
        fontWeight: '700'
    },
    featuresList: {
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        gap: 12
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#818cf8'
    },
    featureText: {
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: '500'
    },
    upgradeButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    gradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8
    },
    upgradeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    dismissButton: {
        paddingVertical: 8,
        paddingHorizontal: 16
    },
    dismissText: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '500'
    },
    closeIcon: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4
    }
});
