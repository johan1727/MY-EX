import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    interpolate,
    Extrapolate,
    runOnJS
} from 'react-native-reanimated';
import { Sparkles, Mic2, BrainCircuit, Clock, Check, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface FeatureItemProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    index: number;
}

const FeatureItem = ({ icon, title, description, index }: FeatureItemProps) => {
    const opacity = useSharedValue(0);
    const translateX = useSharedValue(50);

    useEffect(() => {
        opacity.value = withDelay(index * 100 + 400, withTiming(1, { duration: 500 }));
        translateX.value = withDelay(index * 100 + 400, withSpring(0, { damping: 12 }));
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateX: translateX.value }]
    }));

    return (
        <Animated.View style={[styles.featureRow, style]}>
            <View style={styles.iconContainer}>
                {icon}
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDesc}>{description}</Text>
            </View>
        </Animated.View>
    );
};

interface PlanFeaturesModalProps {
    visible: boolean;
    onClose: () => void;
    planName: string;
}

export default function PlanFeaturesModal({ visible, onClose, planName }: PlanFeaturesModalProps) {
    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            scale.value = withSpring(1, { damping: 15 });
            opacity.value = withTiming(1, { duration: 300 });
        } else {
            scale.value = withTiming(0.8);
            opacity.value = withTiming(0);
        }
    }, [visible]);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

                <Animated.View style={[styles.backdrop, containerStyle]}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />

                    <Animated.View style={[styles.card, cardStyle]}>
                        <LinearGradient
                            colors={['#ffffff', '#f8fafc']}
                            style={styles.cardGradient}
                        >
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={styles.welcomeText}>Bienvenido al nivel</Text>
                                <Text style={styles.planName}>{planName}</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <X size={20} color="#64748b" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.subHeader}>Esto es lo que incluye tu plan:</Text>

                            {/* Features List */}
                            <View style={styles.listContainer}>
                                <FeatureItem
                                    index={0}
                                    icon={<Mic2 size={20} color="#4f46e5" />}
                                    title="Clonación de Voz Instantánea"
                                    description="Crea clones digitales de tu ex en segundos con calidad neural."
                                />
                                <FeatureItem
                                    index={1}
                                    icon={<BrainCircuit size={20} color="#ec4899" />}
                                    title="Memoria Emocional Activa"
                                    description="Remi recuerda conversaciones pasadas y contexto profundo."
                                />
                                <FeatureItem
                                    index={2}
                                    icon={<Sparkles size={20} color="#f59e0b" />}
                                    title="Modo Voz Full Duplex"
                                    description="Habla fluidamente sin turnos rígidos, como una llamada real."
                                />
                                <FeatureItem
                                    index={3}
                                    icon={<Clock size={20} color="#10b981" />}
                                    title="Créditos Premium"
                                    description="~120 minutos de generación de voz de ultra alta calidad."
                                />
                            </View>

                            {/* CTA Button */}
                            <TouchableOpacity style={styles.ctaButton} onPress={onClose}>
                                <Text style={styles.ctaText}>Comenzar Ahora</Text>
                                <Check size={18} color="white" style={{ marginLeft: 8 }} />
                            </TouchableOpacity>

                        </LinearGradient>
                    </Animated.View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)'
    },
    backdrop: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: width * 0.9,
        maxWidth: 400,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 20,
        },
        shadowOpacity: 0.25,
        shadowRadius: 30,
        elevation: 10,
    },
    cardGradient: {
        padding: 24,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 8,
        width: '100%'
    },
    closeButton: {
        position: 'absolute',
        right: 0,
        top: 0,
        padding: 4,
    },
    welcomeText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    planName: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0f172a',
        marginVertical: 4
    },
    subHeader: {
        fontSize: 16,
        color: '#475569',
        marginBottom: 24,
    },
    listContainer: {
        width: '100%',
        gap: 20,
        marginBottom: 32
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center'
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 2
    },
    featureDesc: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18
    },
    ctaButton: {
        backgroundColor: '#0f172a',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        width: '100%',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }
    },
    ctaText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700'
    }
});
