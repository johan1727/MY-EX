import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AIDisclaimerProps {
    visible: boolean;
    onClose: () => void;
}

export function AIDisclaimer({ visible, onClose }: AIDisclaimerProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Text style={styles.icon}>⚠️</Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Contenido Generado por IA</Text>

                    {/* Description */}
                    <Text style={styles.description}>
                        Esta es una simulación de inteligencia artificial.
                    </Text>

                    <Text style={styles.description}>
                        Las respuestas son generadas por IA y <Text style={styles.bold}>pueden no reflejar</Text> el comportamiento real de la persona.
                    </Text>

                    <Text style={styles.disclaimer}>
                        Esta herramienta es solo para propósitos de práctica y reflexión personal.
                    </Text>

                    {/* Button */}
                    <TouchableOpacity
                        style={styles.button}
                        onPress={onClose}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>Entendido</Text>
                    </TouchableOpacity>
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
    modal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 30,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#333',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    icon: {
        fontSize: 50,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 20,
    },
    description: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
        marginBottom: 15,
        lineHeight: 24,
    },
    bold: {
        fontWeight: 'bold',
        color: '#fff',
    },
    disclaimer: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 25,
        fontStyle: 'italic',
    },
    button: {
        backgroundColor: '#8B5CF6',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 32,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
