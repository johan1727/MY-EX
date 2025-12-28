import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FileText, X } from 'lucide-react-native';

interface ShareIntentModalProps {
    visible: boolean;
    onAnalyze: () => void;
    onCancel: () => void;
    type: 'file' | 'text';
}

export default function ShareIntentModal({ visible, onAnalyze, onCancel, type }: ShareIntentModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header Icon */}
                    <LinearGradient
                        colors={['#a855f7', '#7c3aed']}
                        style={styles.iconContainer}
                    >
                        <FileText size={32} color="white" />
                    </LinearGradient>

                    {/* Title */}
                    <Text style={styles.title}>
                        {type === 'file' ? '¡Archivo recibido!' : '¡Chat recibido!'}
                    </Text>

                    {/* Description */}
                    <Text style={styles.description}>
                        Se detectó un {type === 'file' ? 'archivo de chat' : 'chat de WhatsApp'}.
                        {'\n'}¿Deseas analizarlo con REMI?
                    </Text>

                    {/* Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onAnalyze}>
                            <LinearGradient
                                colors={['#a855f7', '#7c3aed']}
                                style={styles.analyzeButton}
                            >
                                <Text style={styles.analyzeButtonText}>Analizar</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.3)',
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#aaa',
        fontSize: 16,
        fontWeight: '600',
    },
    analyzeButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
    },
    analyzeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
