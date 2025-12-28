import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView, Modal, Switch } from 'react-native';
import { X, ChevronDown, ChevronRight, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface CookieCategory {
    id: string;
    title: string;
    description: string;
    required: boolean;
    enabled: boolean;
}

export default function CookieConsent() {
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [categories, setCategories] = useState<CookieCategory[]>([
        {
            id: 'necessary',
            title: 'Cookies estrictamente necesarias',
            description: 'Estas cookies son necesarias para el funcionamiento del sitio web y no se pueden desactivar. Incluyen cookies de sesión y autenticación.',
            required: true,
            enabled: true,
        },
        {
            id: 'analytics',
            title: 'Cookies de análisis',
            description: 'Estas cookies nos ayudan a entender cómo interactúan los visitantes con nuestro sitio. Nos ayudan a medir el tráfico y optimizar el rendimiento.',
            required: false,
            enabled: false,
        },
        {
            id: 'marketing',
            title: 'Cookies de marketing',
            description: 'Estas cookies nos ayudan a medir la efectividad de nuestras campañas de marketing y mostrar contenido relevante.',
            required: false,
            enabled: false,
        },
    ]);

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        checkConsent();
    }, []);

    const checkConsent = async () => {
        try {
            const consent = await AsyncStorage.getItem('cookie_consent_v2');
            if (!consent) {
                setVisible(true);
            }
        } catch (e) {
            setVisible(true);
        }
    };

    const handleAcceptAll = async () => {
        const updatedCategories = categories.map(c => ({ ...c, enabled: true }));
        setCategories(updatedCategories);
        await saveConsent(updatedCategories);
    };

    const handleAcceptSelected = async () => {
        await saveConsent(categories);
    };

    const saveConsent = async (cats: CookieCategory[]) => {
        try {
            const consent = {
                timestamp: new Date().toISOString(),
                categories: cats.reduce((acc, c) => ({ ...acc, [c.id]: c.enabled }), {}),
            };
            await AsyncStorage.setItem('cookie_consent_v2', JSON.stringify(consent));
            setVisible(false);
            setShowDetails(false);
        } catch (e) {
            setVisible(false);
        }
    };

    const toggleCategory = (id: string) => {
        setCategories(prev => prev.map(c =>
            c.id === id && !c.required ? { ...c, enabled: !c.enabled } : c
        ));
    };

    if (Platform.OS !== 'web' || !visible) return null;

    // Simple Banner
    if (!showDetails) {
        return (
            <View style={styles.container}>
                <View style={styles.simpleBanner}>
                    <Text style={styles.simpleTitle}>🍪 Centro de preferencias de cookies</Text>
                    <Text style={styles.simpleText}>
                        El uso de sitios web y aplicaciones implica almacenar y recuperar información de tu dispositivo, como cookies y otros identificadores.
                    </Text>
                    <View style={styles.simpleButtons}>
                        <TouchableOpacity style={styles.manageBtn} onPress={() => setShowDetails(true)}>
                            <Text style={styles.manageBtnText}>Administrar preferencias</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.acceptAllBtn} onPress={handleAcceptAll}>
                            <Text style={styles.acceptAllBtnText}>Aceptar todas</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // Detailed Modal
    return (
        <Modal
            visible={showDetails}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDetails(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Centro de preferencias de cookies</Text>
                        <TouchableOpacity onPress={() => setShowDetails(false)}>
                            <X size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalDescription}>
                            El uso de sitios web y aplicaciones implica almacenar y recuperar información de tu dispositivo, como cookies y otros identificadores, que se pueden compartir con terceros para diversas actividades. A continuación, te ofrecemos una herramienta sencilla para que personalices tus preferencias. Puedes cambiar tu consentimiento en cualquier momento.
                        </Text>

                        <TouchableOpacity onPress={() => router.push('/privacy')}>
                            <Text style={styles.moreInfoLink}>Obtener más información.</Text>
                        </TouchableOpacity>

                        {/* Cookie Categories */}
                        {categories.map((category) => (
                            <View key={category.id} style={styles.categoryItem}>
                                <TouchableOpacity
                                    style={styles.categoryHeader}
                                    onPress={() => setExpandedCategory(
                                        expandedCategory === category.id ? null : category.id
                                    )}
                                >
                                    <View style={styles.categoryLeft}>
                                        {category.required ? (
                                            <View style={styles.checkboxChecked}>
                                                <Check size={12} color="#fff" />
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={[styles.checkbox, category.enabled && styles.checkboxChecked]}
                                                onPress={() => toggleCategory(category.id)}
                                            >
                                                {category.enabled && <Check size={12} color="#fff" />}
                                            </TouchableOpacity>
                                        )}
                                        <View>
                                            <Text style={styles.categoryTitle}>{category.title}</Text>
                                            {category.required && (
                                                <Text style={styles.categoryRequired}>(siempre activas)</Text>
                                            )}
                                        </View>
                                    </View>
                                    {expandedCategory === category.id ? (
                                        <ChevronDown size={18} color="#6b7280" />
                                    ) : (
                                        <ChevronRight size={18} color="#6b7280" />
                                    )}
                                </TouchableOpacity>

                                {expandedCategory === category.id && (
                                    <Text style={styles.categoryDescription}>
                                        {category.description}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Footer Buttons */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleAcceptSelected}>
                            <Text style={styles.saveBtnText}>Guardar preferencias</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.acceptAllBtnModal} onPress={handleAcceptAll}>
                            <Text style={styles.acceptAllBtnText}>Aceptar todas</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: 16,
    },
    simpleBanner: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    simpleTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    simpleText: {
        color: '#9ca3af',
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 16,
    },
    simpleButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    manageBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'center',
    },
    manageBtnText: {
        color: '#9ca3af',
        fontSize: 13,
        fontWeight: '600',
    },
    acceptAllBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
    },
    acceptAllBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1f1f1f',
        borderRadius: 12,
        width: '100%',
        maxWidth: 450,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalScroll: {
        padding: 20,
    },
    modalDescription: {
        color: '#9ca3af',
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 8,
    },
    moreInfoLink: {
        color: '#3b82f6',
        fontSize: 13,
        textDecorationLine: 'underline',
        marginBottom: 20,
    },
    categoryItem: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 16,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#6b7280',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: '#3b82f6',
        borderWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    categoryRequired: {
        color: '#6b7280',
        fontSize: 12,
    },
    categoryDescription: {
        color: '#9ca3af',
        fontSize: 12,
        lineHeight: 18,
        marginTop: 12,
        marginLeft: 32,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 10,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    saveBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#9ca3af',
        fontSize: 13,
        fontWeight: '600',
    },
    acceptAllBtnModal: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
    },
});
