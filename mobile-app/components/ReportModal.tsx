import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Modal,
    TouchableOpacity,
} from 'react-native';
import { X, Flag, AlertTriangle, CheckCircle, HelpCircle, Sparkles, LogOut } from 'lucide-react-native';
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

    // Custom Alert State
    interface AlertConfig {
        visible: boolean;
        title: string;
        message: string;
        buttons?: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' | 'confirm' }[];
        type?: 'success' | 'error' | 'info' | 'warning';
    }
    const [customAlert, setCustomAlert] = useState<AlertConfig>({ visible: false, title: '', message: '' });

    const showAlert = (title: string, message: string, buttons?: AlertConfig['buttons'], type: AlertConfig['type'] = 'info') => {
        setCustomAlert({
            visible: true,
            title,
            message,
            buttons,
            type
        });
    };

    const closeAlert = () => {
        setCustomAlert(prev => ({ ...prev, visible: false }));
    };

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
            showAlert('Selecciona una razón', 'Por favor indica el motivo del reporte.', [{ text: 'OK' }], 'warning');
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


            {/* Custom Alert Modal */}
            <Modal
                transparent
                visible={customAlert.visible}
                animationType="fade"
                onRequestClose={closeAlert}
            >
                <View style={styles.alertOverlay}>
                    <View style={styles.alertBox}>
                        <View style={[
                            styles.alertIconContainer,
                            customAlert.type === 'error' ? { backgroundColor: 'rgba(239, 68, 68, 0.1)' } :
                                customAlert.type === 'warning' ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } :
                                    customAlert.type === 'success' ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' } :
                                        { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                        ]}>
                            {customAlert.type === 'error' && <X size={32} color="#ef4444" />}
                            {customAlert.type === 'warning' && <LogOut size={32} color="#f59e0b" />}
                            {customAlert.type === 'success' && <Sparkles size={32} color="#22c55e" />}
                            {customAlert.type === 'info' && <HelpCircle size={32} color="#3b82f6" />}
                        </View>
                        <Text style={styles.alertTitle}>{customAlert.title}</Text>
                        <Text style={styles.alertMessage}>
                            {customAlert.message}
                        </Text>
                        <View style={styles.alertButtons}>
                            {!customAlert.buttons || customAlert.buttons.length === 0 ? (
                                <TouchableOpacity
                                    style={[styles.alertButton, styles.alertButtonPrimary]}
                                    onPress={closeAlert}
                                >
                                    <Text style={styles.alertButtonText}>OK</Text>
                                </TouchableOpacity>
                            ) : (
                                customAlert.buttons.map((btn, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            styles.alertButton,
                                            btn.style === 'cancel' ? styles.alertButtonCancel :
                                                btn.style === 'destructive' ? styles.alertButtonDestructive :
                                                    styles.alertButtonPrimary
                                        ]}
                                        onPress={btn.onPress || closeAlert}
                                    >
                                        <Text style={[
                                            styles.alertButtonText,
                                            btn.style === 'destructive' && { color: '#ef4444' }
                                        ]}>{btn.text}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </Modal >
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
    // Custom Alert Styles
    alertOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    alertBox: {
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    alertIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    alertTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    alertMessage: {
        color: '#9ca3af',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    alertButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    alertButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#333',
        alignItems: 'center',
    },
    alertButtonPrimary: {
        backgroundColor: '#3b82f6',
    },
    alertButtonCancel: {
        backgroundColor: '#333',
    },
    alertButtonDestructive: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    alertButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
});
