import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Shield, Cloud, X, Sparkles } from 'lucide-react-native';

interface LoginPromptModalProps {
    visible: boolean;
    onClose: () => void;
    onLogin: () => void;
    onSignUp: () => void;
    onContinueGuest: () => void;
}

export default function LoginPromptModal({
    visible,
    onClose,
    onLogin,
    onSignUp,
    onContinueGuest,
}: LoginPromptModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Close Button */}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <X size={20} color="#6b7280" />
                    </TouchableOpacity>

                    {/* Icon */}
                    <LinearGradient
                        colors={['#8b5cf6', '#6366f1']}
                        style={styles.iconContainer}
                    >
                        <Sparkles size={32} color="#fff" />
                    </LinearGradient>

                    {/* Title */}
                    <Text style={styles.title}>¡Tu simulación está lista!</Text>
                    <Text style={styles.subtitle}>
                        Crea una cuenta para guardar tu progreso y acceder desde cualquier dispositivo
                    </Text>

                    {/* Benefits */}
                    <View style={styles.benefitsContainer}>
                        <View style={styles.benefitRow}>
                            <Cloud size={18} color="#3b82f6" />
                            <Text style={styles.benefitText}>Sincroniza en todos tus dispositivos</Text>
                        </View>
                        <View style={styles.benefitRow}>
                            <Shield size={18} color="#10b981" />
                            <Text style={styles.benefitText}>Tus datos seguros y privados</Text>
                        </View>
                        <View style={styles.benefitRow}>
                            <User size={18} color="#f59e0b" />
                            <Text style={styles.benefitText}>Historial de conversaciones ilimitado</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <TouchableOpacity onPress={onSignUp} style={styles.primaryButton}>
                        <LinearGradient
                            colors={['#8b5cf6', '#6366f1']}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.primaryButtonText}>Crear Cuenta Gratis</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onLogin} style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onContinueGuest} style={styles.skipButton}>
                        <Text style={styles.skipButtonText}>Continuar sin cuenta</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        backgroundColor: '#1a1a2e',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    benefitsContainer: {
        width: '100%',
        marginBottom: 24,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
    },
    benefitText: {
        marginLeft: 12,
        color: '#d1d5db',
        fontSize: 14,
    },
    primaryButton: {
        width: '100%',
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 16,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryButton: {
        width: '100%',
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 8,
    },
    secondaryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    skipButton: {
        paddingVertical: 12,
    },
    skipButtonText: {
        color: '#6b7280',
        fontSize: 13,
    },
});
