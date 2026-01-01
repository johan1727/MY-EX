import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    SafeAreaView,
} from 'react-native';
import { AlertTriangle, Shield, Check, Brain } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { storage } from '@/lib/storage';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        {/* Header - Fixed at top */}
                        <View style={styles.header}>
                            <LinearGradient
                                colors={['#f59e0b', '#ef4444']}
                                style={styles.iconContainer}
                            >
                                <AlertTriangle size={18} color="#fff" />
                            </LinearGradient>
                            <Text style={styles.title}>Aviso Importante</Text>
                        </View>

                        {/* Scrollable Content - FLEX to take remaining space */}
                        <ScrollView
                            style={styles.scrollView}
                            showsVerticalScrollIndicator={true}
                            contentContainerStyle={styles.scrollContent}
                            bounces={false}
                        >
                            <DisclaimerItem
                                icon={<Brain size={14} color="#a855f7" />}
                                title="Contenido IA"
                                text="Respuestas simuladas, pueden contener errores."
                            />
                            <DisclaimerItem
                                icon={<Shield size={14} color="#3b82f6" />}
                                title="No es real"
                                text="La IA NO suplanta a personas reales."
                            />
                            <DisclaimerItem
                                icon={<AlertTriangle size={14} color="#f59e0b" />}
                                title="Uso responsable"
                                text="No para acosar ni contenido inapropiado."
                            />
                            <DisclaimerItem
                                icon={<Shield size={14} color="#22c55e" />}
                                title="Privacidad"
                                text="No guardamos tus conversaciones."
                            />
                        </ScrollView>

                        {/* Footer - ALWAYS visible at bottom */}
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.acceptButton}
                                onPress={handleAccept}
                                activeOpacity={0.8}
                            >
                                <Check size={16} color="#fff" />
                                <Text style={styles.acceptButtonText}>Entiendo y Acepto</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

// Compact disclaimer item component
function DisclaimerItem({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
    return (
        <View style={styles.disclaimer}>
            {icon}
            <View style={styles.disclaimerContent}>
                <Text style={styles.disclaimerTitle}>{title}</Text>
                <Text style={styles.disclaimerText}>{text}</Text>
            </View>
        </View>
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
    safeArea: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: SCREEN_HEIGHT * 0.40, // Reduced to ensure button is always visible
        minHeight: 250,
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        gap: 10,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    scrollView: {
        flexGrow: 0,
        flexShrink: 1,
    },
    scrollContent: {
        padding: 12,
        gap: 6,
    },
    disclaimer: {
        flexDirection: 'row',
        backgroundColor: '#252525',
        borderRadius: 8,
        padding: 8,
        gap: 8,
        alignItems: 'center',
    },
    disclaimerContent: {
        flex: 1,
    },
    disclaimerTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    disclaimerText: {
        fontSize: 10,
        color: '#9ca3af',
    },
    healthWarning: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderRadius: 8,
        padding: 10,
        marginTop: 4,
    },
    healthText: {
        fontSize: 11,
        color: '#fca5a5',
        textAlign: 'center',
        fontWeight: '500',
    },
    footer: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#333',
        backgroundColor: '#1a1a1a',
    },
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#22c55e',
        borderRadius: 10,
        paddingVertical: 12,
        gap: 6,
    },
    acceptButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
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
