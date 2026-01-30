import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface LowCreditsModalProps {
    visible: boolean;
    currentCredits: number;
    onBuyCredits: () => void;
    onDismiss: () => void;
}

export default function LowCreditsModal({ visible, currentCredits, onBuyCredits, onDismiss }: LowCreditsModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <BlurView intensity={80} style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={['#1A1A1A', '#0A0A0A']}
                        style={styles.modalContent}
                    >
                        {/* Warning Icon */}
                        <View style={styles.iconContainer}>
                            <LinearGradient
                                colors={['#F59E0B', '#EF4444']}
                                style={styles.iconCircle}
                            >
                                <Ionicons name="warning" size={40} color="#fff" />
                            </LinearGradient>
                        </View>

                        {/* Title */}
                        <Text style={styles.title}>Créditos Bajos</Text>

                        {/* Message */}
                        <Text style={styles.message}>
                            Te quedan solo <Text style={styles.highlightText}>{currentCredits.toFixed(1)} minutos</Text> de créditos.
                        </Text>
                        <Text style={styles.submessage}>
                            Cuando agotes tus minutos mensuales y tus créditos, las llamadas se detendrán automáticamente.
                        </Text>

                        {/* Actions */}
                        <TouchableOpacity
                            style={styles.buyButton}
                            onPress={onBuyCredits}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#9333EA', '#7E22CE']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.buyButtonGradient}
                            >
                                <Ionicons name="gift" size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.buyButtonText}>Comprar Créditos</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dismissButton}
                            onPress={onDismiss}
                        >
                            <Text style={styles.dismissButtonText}>Continuar sin comprar</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContainer: {
        width: '85%',
        maxWidth: 400,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 10,
    },
    modalContent: {
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2A2A2A',
    },
    iconContainer: {
        marginBottom: 20,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        color: '#D1D5DB',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 22,
    },
    highlightText: {
        color: '#F59E0B',
        fontWeight: 'bold',
    },
    submessage: {
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 18,
    },
    buyButton: {
        width: '100%',
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
    },
    buyButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    buyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dismissButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    dismissButtonText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '600',
    },
});
