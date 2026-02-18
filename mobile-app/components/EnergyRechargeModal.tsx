import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, Clock, X } from 'lucide-react-native';

interface EnergyRechargeModalProps {
    visible: boolean;
    waitTimeMinutes: number;
    onDismiss: () => void;
    onUpgrade: () => void;
}

const { width } = Dimensions.get('window');

export default function EnergyRechargeModal({
    visible,
    waitTimeMinutes,
    onDismiss,
    onUpgrade
}: EnergyRechargeModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                {/* Background Blur Effect */}
                <BlurView intensity={20} style={styles.absolute} tint="dark" />

                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={['rgba(20, 20, 30, 0.95)', 'rgba(30, 30, 45, 0.98)']}
                        style={styles.card}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {/* Glow Effect */}
                        <View style={styles.glowContainer}>
                            <LinearGradient
                                colors={['rgba(139, 92, 246, 0.3)', 'transparent']}
                                style={styles.glow}
                            />
                        </View>

                        {/* Icon Header */}
                        <View style={styles.iconWrapper}>
                            <View style={styles.iconCircle}>
                                <Zap size={32} color="#fbbf24" fill="#fbbf24" style={{ opacity: 0.9 }} />
                            </View>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>Recargando</Text>
                            </View>
                        </View>

                        <Text style={styles.title}>¿Quieres seguir hablando?</Text>

                        <Text style={styles.description}>
                            Usaste tus <Text style={styles.highlight}>5 mensajes</Text> de esta sesión.
                            Con Premium tienes mensajes <Text style={styles.highlight}>ilimitados</Text> y acceso completo a REMI.
                        </Text>

                        {/* Timer Card */}
                        <View style={styles.timerCard}>
                            <Clock size={20} color="#94a3b8" />
                            <Text style={styles.timerText}>
                                Disponible en <Text style={styles.timeHighlight}>{waitTimeMinutes} minutos</Text>
                            </Text>
                        </View>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.upgradeButton}
                                onPress={onUpgrade}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#8b5cf6', '#ec4899']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradientButton}
                                >
                                    <Text style={styles.upgradeText}>✨ Desbloquear Premium — Sin límites</Text>
                                    <Zap size={16} color="white" fill="white" />
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.dismissButton}
                                onPress={onDismiss}
                            >
                                <Text style={styles.dismissText}>Prefiero esperar {waitTimeMinutes} min</Text>
                            </TouchableOpacity>
                        </View>

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
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    absolute: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
    },
    modalContainer: {
        width: '100%',
        maxWidth: 360,
        alignItems: 'center'
    },
    card: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
        position: 'relative'
    },
    glowContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
        alignItems: 'center',
    },
    glow: {
        width: 200,
        height: 100,
        opacity: 0.5
    },
    iconWrapper: {
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.2)',
        marginBottom: -12,
        zIndex: 10
    },
    badge: {
        backgroundColor: '#1e1b4b',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#4338ca',
        transform: [{ translateY: 0 }]
    },
    badgeText: {
        color: '#a5b4fc',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
        marginTop: 16,
        textAlign: 'center'
    },
    description: {
        fontSize: 15,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24
    },
    highlight: {
        color: '#fbbf24',
        fontWeight: '600'
    },
    timerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        marginBottom: 24,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    timerText: {
        color: '#cbd5e1',
        fontSize: 14,
        fontWeight: '500'
    },
    timeHighlight: {
        color: '#fff',
        fontWeight: 'bold'
    },
    actions: {
        width: '100%',
        gap: 12
    },
    upgradeButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
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
        paddingVertical: 12,
        alignItems: 'center'
    },
    dismissText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '600'
    },
    closeIcon: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4
    }
});
