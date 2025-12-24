import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Sparkles, MessageSquare, Zap, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface StarterPromptsProps {
    onSelect: (prompt: string) => void;
}

const PROMPTS = [
    {
        icon: <MessageSquare size={18} color="#a855f7" />,
        label: "Analizar mensaje",
        prompt: "Quiero analizar un mensaje que me envió.",
        color: 'rgba(168, 85, 247, 0.1)'
    },
    {
        icon: <Heart size={18} color="#f43f5e" />,
        label: "Lo extraño",
        prompt: "Hoy lo extraño mucho y quiero escribirle. ¿Qué hago?",
        color: 'rgba(244, 63, 94, 0.1)'
    },
    {
        icon: <Zap size={18} color="#eab308" />,
        label: "Respuesta rápida",
        prompt: "Necesito una respuesta rápida e inteligente para este mensaje...",
        color: 'rgba(234, 179, 8, 0.1)'
    },
    {
        icon: <Sparkles size={18} color="#3b82f6" />,
        label: "Consejo del Coach",
        prompt: "Dame un consejo general para mi situación actual.",
        color: 'rgba(59, 130, 246, 0.1)'
    }
];

export default function StarterPrompts({ onSelect }: StarterPromptsProps) {
    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                {PROMPTS.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.card, { backgroundColor: item.color }]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            onSelect(item.prompt);
                        }}
                    >
                        <View style={styles.iconContainer}>
                            {item.icon}
                        </View>
                        <Text style={styles.label}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: 20,
        marginTop: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    card: {
        width: '48%', // 2 columns
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    iconContainer: {
        marginBottom: 8,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
    },
    label: {
        color: '#ECECEC',
        fontSize: 13,
        fontWeight: '600',
    },
});
