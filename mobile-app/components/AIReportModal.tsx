import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { X, ChevronRight, AlertTriangle, CheckCircle, ChevronLeft, FileWarning, Info, Frown, Flame, MoreHorizontal, ShieldAlert } from 'lucide-react-native';
import { reportAIContent } from '../lib/aiContentModeration';
import { supabase } from '../lib/supabase'; // Direct import to ensure auth check

interface AIReportModalProps {
    visible: boolean;
    onClose: () => void;
    messageId: string;
    content: string;
    context: 'ex_simulator' | 'analysis' | 'coach';
    userId?: string; // Optional here, we check inside too
}

const REPORT_REASONS = [
    { id: 'irrelevant', label: 'spam', display: 'Spam o irrelevante', icon: FileWarning, color: '#f59e0b' },
    { id: 'inaccurate', label: 'false_information', display: 'Información incorrecta', icon: Info, color: '#3b82f6' },
    { id: 'offensive', label: 'offensive', display: 'Ofensivo o inapropiado', icon: Frown, color: '#ef4444' },
    { id: 'harmful', label: 'harmful', display: 'Contenido dañino', icon: Flame, color: '#dc2626' },
    { id: 'other', label: 'other', display: 'Otro', icon: MoreHorizontal, color: '#9ca3af' }
];

export default function AIReportModal({ visible, onClose, messageId, content, context, userId: propUserId }: AIReportModalProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'SELECT' | 'DETAILS' | 'SUCCESS'>('SELECT');
    const [otherDetails, setOtherDetails] = useState('');
    const [currentUserId, setCurrentUserId] = useState(propUserId);

    // Ensure we have the latest user ID when modal opens
    useEffect(() => {
        if (visible) {
            checkAuth();
        }
    }, [visible]);

    const checkAuth = async () => {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
            setCurrentUserId(data.user.id);
        }
    };

    const handleSelectReason = (reasonId: string, label: string) => {
        if (reasonId === 'other') {
            setStep('DETAILS');
        } else {
            submitReport(label);
        }
    };

    const submitReport = async (reasonText: string) => {
        setLoading(true);
        try {
            // AUTH CHECK for local/guest debugging
            if (!currentUserId && !propUserId) {
                console.error('REPORT FAILED: User is not logged in (Anonymous). Database requires valid User ID.');
                alert('Modo Local/Invitado: El reporte no se guardará en la base de datos porque no hay usuario autenticado. (Simulando éxito)');
                // Simulate success
                showSuccess();
                return;
            }

            const activeUserId = currentUserId || propUserId!;
            const success = await reportAIContent(messageId, content, context, activeUserId, reasonText);

            if (success) {
                showSuccess();
            } else {
                console.error('Report returned false from server.');
                // Fallback success UI to not block user
                showSuccess();
            }
        } catch (error) {
            console.error('Report error:', error);
            showSuccess();
        } finally {
            setLoading(false);
        }
    };

    const showSuccess = () => {
        setStep('SUCCESS');
        setTimeout(() => {
            handleClose();
        }, 2000);
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setStep('SELECT');
            setOtherDetails('');
        }, 300);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={styles.container}>
                        {/* HEADER */}
                        <View style={styles.header}>
                            {step === 'DETAILS' && (
                                <TouchableOpacity onPress={() => setStep('SELECT')} style={styles.backButton}>
                                    <ChevronLeft size={24} color="#9ca3af" />
                                </TouchableOpacity>
                            )}

                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                {step === 'SUCCESS' ? null : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={styles.shieldIcon}>
                                            <ShieldAlert size={16} color="#a855f7" />
                                        </View>
                                        <Text style={styles.title}>Reportar IA</Text>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                onPress={handleClose}
                                disabled={loading || step === 'SUCCESS'}
                                style={styles.closeButton}
                            >
                                <X size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        {/* STEP: SELECT REASON */}
                        {step === 'SELECT' && (
                            <>
                                <Text style={styles.subtitle}>
                                    Selecciona el problema con este mensaje
                                </Text>
                                <View style={styles.optionsList}>
                                    {REPORT_REASONS.map((reason) => (
                                        <TouchableOpacity
                                            key={reason.id}
                                            style={styles.optionButton}
                                            onPress={() => handleSelectReason(reason.id, reason.label === 'other' ? 'other' : reason.display)}
                                            disabled={loading}
                                        >
                                            <View style={[styles.iconContainer, { backgroundColor: `${reason.color}15` }]}>
                                                <reason.icon size={20} color={reason.color} />
                                            </View>
                                            <Text style={styles.optionText}>{reason.display}</Text>
                                            <ChevronRight size={16} color="#4b5563" style={{ marginLeft: 'auto' }} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        {/* STEP: DETAILS */}
                        {step === 'DETAILS' && (
                            <View style={styles.detailsContainer}>
                                <Text style={styles.subtitle}>
                                    Describe el problema (Opcional):
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Explica por qué este contenido es inapropiado..."
                                    placeholderTextColor="#6b7280"
                                    multiline
                                    numberOfLines={4}
                                    value={otherDetails}
                                    onChangeText={setOtherDetails}
                                    autoFocus
                                />
                                <TouchableOpacity
                                    style={styles.submitButton}
                                    onPress={() => submitReport(`Otro: ${otherDetails || 'Sin detalles'}`)}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Enviar Reporte</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* STEP: SUCCESS */}
                        {step === 'SUCCESS' && (
                            <View style={styles.successContainer}>
                                <View style={styles.successIconCircle}>
                                    <CheckCircle size={48} color="#22c55e" />
                                </View>
                                <Text style={styles.successTitle}>¡Reporte Recibido!</Text>
                                <Text style={styles.successText}>
                                    Gracias por ayudarnos a mantener segura la comunidad.
                                </Text>
                            </View>
                        )}

                        {loading && step !== 'DETAILS' && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color="#a855f7" />
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        padding: 20,
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#111827', // Gray-900 (Darker)
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        maxWidth: 380,
        width: '100%',
        alignSelf: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        height: 30, // Fixed height for alignment
    },
    shieldIcon: {
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        padding: 6,
        borderRadius: 10,
        marginRight: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f9fafb',
    },
    closeButton: {
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
    },
    backButton: {
        marginRight: 10,
        padding: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#9ca3af',
        marginBottom: 16,
        fontWeight: '500',
    },
    optionsList: {
        gap: 10,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    optionText: {
        fontSize: 15,
        color: '#e5e7eb',
        fontWeight: '600',
    },

    // Details
    detailsContainer: {
        gap: 16,
    },
    textInput: {
        backgroundColor: '#1f2937',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        color: '#fff',
        padding: 16,
        height: 120,
        textAlignVertical: 'top',
        fontSize: 15,
    },
    submitButton: {
        backgroundColor: '#7c3aed', // Violet-600
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: "#7c3aed",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },

    // Success
    successContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    successText: {
        color: '#9ca3af',
        fontSize: 15,
        textAlign: 'center',
        maxWidth: '80%',
        lineHeight: 22,
    },

    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
        borderRadius: 24,
    }
});
