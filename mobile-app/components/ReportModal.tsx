import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { X, Flag, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ReportModalProps {
    visible: boolean;
    onClose: () => void;
    messageContent?: string;
}

export default function ReportModal({ visible, onClose, messageContent }: ReportModalProps) {
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const reasons = [
        { id: 'offensive', label: 'Contenido ofensivo o inapropiado' },
        { id: 'threatening', label: 'Amenazas o contenido violento' },
        { id: 'sexual', label: 'Contenido sexual no solicitado' },
        { id: 'harassment', label: 'Acoso o intimidación' },
        { id: 'misinformation', label: 'Información falsa o dañina' },
        { id: 'impersonation', label: 'Suplantación inapropiada' },
        { id: 'other', label: 'Otro problema' },
    ];

    const handleSubmit = () => {
        if (!selectedReason) {
            Alert.alert('Selecciona una razón', 'Por favor indica el motivo del reporte.');
            return;
        }

        // In production, this would send to a reporting endpoint
        console.log('[Report] Submitted:', { reason: selectedReason, info: additionalInfo });
        setSubmitted(true);

        setTimeout(() => {
            setSubmitted(false);
            setSelectedReason(null);
            setAdditionalInfo('');
            onClose();
        }, 2000);
    };

    const handleClose = () => {
        setSelectedReason(null);
        setAdditionalInfo('');
        setSubmitted(false);
        onClose();
    };

    if (submitted) {
        return (
            <Modal visible={visible} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.successContainer}>
                            <CheckCircle size={48} color="#22c55e" />
                            <Text style={styles.successTitle}>Reporte Enviado</Text>
                            <Text style={styles.successText}>
                                Gracias por ayudarnos a mantener la app segura.
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Flag size={20} color="#ef4444" />
                            <Text style={styles.headerTitle}>Reportar Contenido</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <X size={24} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    {/* Warning */}
                    <View style={styles.warningBox}>
                        <AlertTriangle size={16} color="#f59e0b" />
                        <Text style={styles.warningText}>
                            Todo el contenido es generado por IA y NO representa a la persona real.
                        </Text>
                    </View>

                    {/* Reasons */}
                    <Text style={styles.sectionTitle}>¿Cuál es el problema?</Text>
                    <View style={styles.reasonsContainer}>
                        {reasons.map((reason) => (
                            <TouchableOpacity
                                key={reason.id}
                                style={[
                                    styles.reasonButton,
                                    selectedReason === reason.id && styles.reasonButtonSelected,
                                ]}
                                onPress={() => setSelectedReason(reason.id)}
                            >
                                <Text style={[
                                    styles.reasonText,
                                    selectedReason === reason.id && styles.reasonTextSelected,
                                ]}>
                                    {reason.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Additional Info */}
                    <Text style={styles.sectionTitle}>Información adicional (opcional)</Text>
                    <TextInput
                        style={styles.textInput}
                        value={additionalInfo}
                        onChangeText={setAdditionalInfo}
                        placeholder="Describe el problema..."
                        placeholderTextColor="#6b7280"
                        multiline
                        maxLength={500}
                    />

                    {/* Submit */}
                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                        <Text style={styles.submitButtonText}>Enviar Reporte</Text>
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
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    closeButton: {
        padding: 4,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        gap: 8,
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#f59e0b',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9ca3af',
        marginBottom: 12,
    },
    reasonsContainer: {
        gap: 8,
        marginBottom: 20,
    },
    reasonButton: {
        backgroundColor: '#2a2a2a',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    reasonButtonSelected: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: '#ef4444',
    },
    reasonText: {
        fontSize: 15,
        color: '#e5e7eb',
    },
    reasonTextSelected: {
        color: '#ef4444',
        fontWeight: '500',
    },
    textInput: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: '#fff',
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    submitButton: {
        backgroundColor: '#ef4444',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    successContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginTop: 16,
    },
    successText: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
        textAlign: 'center',
    },
});
