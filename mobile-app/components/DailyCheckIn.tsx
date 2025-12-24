import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import { haptics } from '@/lib/haptics';

interface DailyCheckInProps {
    visible: boolean;
    onClose: () => void;
    onSelectMood: (mood: string) => void;
}

const MOODS = [
    { label: 'Triste', value: 'sad', color: '#60a5fa' },
    { label: 'Enojado', value: 'angry', color: '#f87171' },
    { label: 'Normal', value: 'neutral', color: '#9ca3af' },
    { label: 'Bien', value: 'good', color: '#4ade80' },
    { label: 'Increíble', value: 'amazing', color: '#fbbf24' },
];

export default function DailyCheckIn({ visible, onClose, onSelectMood }: DailyCheckInProps) {
    const [selected, setSelected] = useState<string | null>(null);

    const handleSelect = (mood: typeof MOODS[0]) => {
        setSelected(mood.value);
        haptics.impact(haptics.ImpactFeedbackStyle.Medium);

        // Small delay to show selection before closing
        setTimeout(() => {
            onSelectMood(mood.value);
            onClose();
        }, 300);
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                {/* Blur Background */}
                <BlurView intensity={40} tint="dark" style={styles.blur} />

                <View style={styles.container}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <X size={20} color="#9ca3af" />
                    </TouchableOpacity>

                    <Text style={styles.title}>¿Cómo te sientes hoy?</Text>
                    <Text style={styles.subtitle}>Tu registro emocional nos ayuda a personalizar tu coach.</Text>

                    <View style={styles.grid}>
                        {MOODS.map((mood) => {
                            const isSelected = selected === mood.value;
                            return (
                                <TouchableOpacity
                                    key={mood.value}
                                    style={[
                                        styles.moodItem,
                                        isSelected && { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: mood.color }
                                    ]}
                                    onPress={() => handleSelect(mood)}
                                >
                                    <View style={[styles.colorDot, { backgroundColor: mood.color }]} />
                                    <Text style={[styles.label, { color: isSelected ? '#fff' : '#9ca3af' }]}>
                                        {mood.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    blur: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        width: '85%',
        backgroundColor: '#171717', // Matte dark
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
        zIndex: 10,
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
        marginBottom: 24,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    moodItem: {
        width: '28%',
        aspectRatio: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
    },
});
