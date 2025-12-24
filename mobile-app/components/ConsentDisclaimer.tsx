import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { AlertTriangle, Shield, Check, Brain } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { storage } from '@/lib/storage';

interface ConsentDisclaimerProps {
    visible: boolean;
    onAccept: () => void;
}

export default function ConsentDisclaimer({ visible, onAccept }: ConsentDisclaimerProps) {
    const handleAccept = async () => {
        await storage.setItem('exSimulator_consentAccepted', 'true');
        onAccept();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View style={styles.header}>
                            <LinearGradient
                                colors={['#f59e0b', '#ef4444']}
                                style={styles.iconContainer}
                            >
                                <AlertTriangle size={32} color="#fff" />
                            </LinearGradient>
                            <Text style={styles.title}>Aviso Importante</Text>
                            <Text style={styles.subtitle}>Lee antes de continuar</Text>
                        </View>

                        {/* Disclaimers */}
                        <View style={styles.section}>
                            <View style={styles.disclaimer}>
                                <Brain size={20} color="#a855f7" />
                                <View style={styles.disclaimerContent}>
                                    <Text style={styles.disclaimerTitle}>Contenido Generado por IA</Text>
                                    <Text style={styles.disclaimerText}>
                                        Todo el contenido de esta app es generado por inteligencia artificial.
                                        Las respuestas son simulaciones y pueden contener errores o "alucinaciones".
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.disclaimer}>
                                <Shield size={20} color="#3b82f6" />
                                <View style={styles.disclaimerContent}>
                                    <Text style={styles.disclaimerTitle}>No Representa a Personas Reales</Text>
                                    <Text style={styles.disclaimerText}>
                                        La IA NO representa ni suplanta a la persona real. Es una simulación
                                        basada en patrones de texto con fines terapéuticos o de entretenimiento.
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.disclaimer}>
                                <AlertTriangle size={20} color="#f59e0b" />
                                <View style={styles.disclaimerContent}>
                                    <Text style={styles.disclaimerTitle}>Responsabilidad del Usuario</Text>
                                    <Text style={styles.disclaimerText}>
                                        Tú eres responsable del contenido que subes. No uses esta app para
                                        acosar, amenazar o generar contenido inapropiado.
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.disclaimer}>
                                <Shield size={20} color="#22c55e" />
                                <View style={styles.disclaimerContent}>
                                    <Text style={styles.disclaimerTitle}>Privacidad de Datos</Text>
                                    <Text style={styles.disclaimerText}>
                                        Los chats que importas se procesan localmente y se envían a la API de
                                        Google Gemini para análisis. No almacenamos tus conversaciones en
                                        nuestros servidores.
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Health Warning */}
                        <View style={styles.healthWarning}>
                            <Text style={styles.healthTitle}>⚠️ Aviso de Salud Mental</Text>
                            <Text style={styles.healthText}>
                                Esta app es una herramienta de práctica y autoconocimiento.
                                NO reemplaza la terapia profesional. Si experimentas pensamientos
                                de autolesión o angustia severa, por favor busca ayuda profesional.
                            </Text>
                        </View>

                        {/* Accept Button */}
                        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
                            <Check size={20} color="#fff" />
                            <Text style={styles.acceptButtonText}>Entiendo y Acepto</Text>
                        </TouchableOpacity>

                        <Text style={styles.footerText}>
                            Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.
                        </Text>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// Small label component to mark AI-generated content
export function AIGeneratedLabel() {
    return (
        <View style={styles.aiLabel}>
            <Brain size={10} color="#9ca3af" />
            <Text style={styles.aiLabelText}>IA</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 24,
        padding: 24,
        maxHeight: '90%',
        width: '100%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
    },
    subtitle: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 4,
    },
    section: {
        gap: 16,
        marginBottom: 20,
    },
    disclaimer: {
        flexDirection: 'row',
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 14,
        gap: 12,
    },
    disclaimerContent: {
        flex: 1,
    },
    disclaimerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    disclaimerText: {
        fontSize: 13,
        color: '#9ca3af',
        lineHeight: 19,
    },
    healthWarning: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    healthTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ef4444',
        marginBottom: 8,
    },
    healthText: {
        fontSize: 13,
        color: '#d1d5db',
        lineHeight: 19,
    },
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#22c55e',
        borderRadius: 14,
        paddingVertical: 16,
        gap: 8,
        marginBottom: 16,
    },
    acceptButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    footerText: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
    },
    aiLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(156, 163, 175, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    aiLabelText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#9ca3af',
    },
});
