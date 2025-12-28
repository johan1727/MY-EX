import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, Alert, Platform, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Smartphone, Shield, FileText, Trash2, ChevronRight, Globe, Moon, Download, Cookie, Check } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGES = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
];

export default function PreferencesScreen() {
    const router = useRouter();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [hapticsEnabled, setHapticsEnabled] = useState(true);
    const [darkModeEnabled, setDarkModeEnabled] = useState(true);
    const [currentLanguage, setCurrentLanguage] = useState('es');
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const lang = await AsyncStorage.getItem('app_language');
            if (lang) setCurrentLanguage(lang);
            const notifs = await AsyncStorage.getItem('notifications_enabled');
            if (notifs !== null) setNotificationsEnabled(notifs === 'true');
            const haptics = await AsyncStorage.getItem('haptics_enabled');
            if (haptics !== null) setHapticsEnabled(haptics === 'true');
        } catch (e) { }
    };

    const handleLanguageChange = async (code: string) => {
        setCurrentLanguage(code);
        await AsyncStorage.setItem('app_language', code);
        setShowLanguageModal(false);
        Alert.alert('Idioma actualizado', 'El idioma se aplicará en la próxima carga.');
    };

    const handleToggleNotifications = async (value: boolean) => {
        setNotificationsEnabled(value);
        await AsyncStorage.setItem('notifications_enabled', value.toString());
    };

    const handleToggleHaptics = async (value: boolean) => {
        setHapticsEnabled(value);
        await AsyncStorage.setItem('haptics_enabled', value.toString());
    };

    const handleExportData = () => {
        Alert.alert('Exportar datos', 'Esta función estará disponible próximamente. Podrás descargar todos tus datos de la app.');
    };

    const handleCookieSettings = async () => {
        await AsyncStorage.removeItem('cookie_consent_v2');
        Alert.alert('Cookies', 'Las preferencias de cookies se reiniciarán. Recarga la app para ver el banner.');
    };

    const handleDeleteAccount = () => {
        const executeDelete = async () => {
            try {
                // In a real app, this would call an API to delete user data
                await supabase.auth.signOut();
                router.replace('/onboarding');
            } catch (e) {
                if (Platform.OS === 'web') {
                    alert('No se pudo eliminar la cuenta. Intenta de nuevo.');
                } else {
                    Alert.alert("Error", "No se pudo eliminar la cuenta.");
                }
            }
        };

        if (Platform.OS === 'web') {
            // Web: Use confirm() with double confirmation
            const firstConfirm = confirm(
                '⚠️ ELIMINAR CUENTA\n\n¿Estás seguro que deseas eliminar tu cuenta?\n\nEsta acción NO se puede deshacer y perderás todo tu progreso, análisis y conversaciones.'
            );
            if (firstConfirm) {
                const secondConfirm = confirm(
                    '🚨 ÚLTIMA CONFIRMACIÓN\n\nEscribe "ELIMINAR" mentalmente y confirma que realmente deseas borrar todos tus datos permanentemente.'
                );
                if (secondConfirm) {
                    executeDelete();
                }
            }
        } else {
            // Native: Use Alert with destructive button
            Alert.alert(
                "⚠️ Eliminar Cuenta",
                "¿Estás seguro? Esta acción NO se puede deshacer.\n\nPerderás todo tu progreso, análisis y conversaciones.",
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Eliminar Todo",
                        style: "destructive",
                        onPress: executeDelete
                    }
                ]
            );
        }
    };

    const SettingGroup = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View style={styles.settingGroup}>
            <Text style={styles.groupTitle}>{title}</Text>
            <View style={styles.groupContainer}>
                {children}
            </View>
        </View>
    );

    const SettingRow = ({
        icon: Icon,
        label,
        value,
        onToggle,
        isDestructive = false,
        onPress,
        showChevron = false
    }: any) => (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress && !onToggle}
            style={styles.settingRow}
            activeOpacity={0.7}
        >
            <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, isDestructive && styles.iconDestructive]}>
                    <Icon size={16} color={isDestructive ? '#ef4444' : '#a855f7'} />
                </View>
                <Text style={[styles.rowLabel, isDestructive && styles.labelDestructive]}>{label}</Text>
            </View>

            {onToggle !== undefined && (
                <Switch
                    value={value}
                    onValueChange={onToggle}
                    trackColor={{ false: '#3f3f46', true: '#a855f7' }}
                    thumbColor={Platform.OS === 'ios' ? '#fff' : '#f3f4f6'}
                />
            )}

            {showChevron && <ChevronRight size={16} color="#4b5563" />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Preferencias</Text>
            </View>

            <ScrollView style={styles.content}>
                <SettingGroup title="General">
                    <SettingRow
                        icon={Globe}
                        label="Idioma"
                        showChevron
                        onPress={() => setShowLanguageModal(true)}
                    />
                    <SettingRow
                        icon={Bell}
                        label="Notificaciones"
                        value={notificationsEnabled}
                        onToggle={handleToggleNotifications}
                    />
                    <SettingRow
                        icon={Smartphone}
                        label="Sonidos y Vibración"
                        value={hapticsEnabled}
                        onToggle={handleToggleHaptics}
                    />
                </SettingGroup>

                <SettingGroup title="Datos y Privacidad">
                    <SettingRow
                        icon={Download}
                        label="Exportar mis datos"
                        showChevron
                        onPress={handleExportData}
                    />
                    <SettingRow
                        icon={Cookie}
                        label="Preferencias de cookies"
                        showChevron
                        onPress={handleCookieSettings}
                    />
                </SettingGroup>

                <SettingGroup title="Legal">
                    <SettingRow
                        icon={Shield}
                        label="Política de Privacidad"
                        showChevron
                        onPress={() => router.push('/privacy' as any)}
                    />
                    <SettingRow
                        icon={FileText}
                        label="Términos de Servicio"
                        showChevron
                        onPress={() => router.push('/terms' as any)}
                    />
                </SettingGroup>

                <SettingGroup title="Zona de Peligro">
                    <SettingRow
                        icon={Trash2}
                        label="Eliminar Cuenta"
                        isDestructive
                        onPress={handleDeleteAccount}
                    />
                </SettingGroup>

                <View style={styles.footer}>
                    <Text style={styles.version}>SOYREMI v1.0.2 (Build 2025.12.24)</Text>
                    <Text style={styles.credits}>Made with ❤️</Text>
                </View>
            </ScrollView>

            {/* Language Selector Modal */}
            <Modal
                visible={showLanguageModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLanguageModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Seleccionar idioma</Text>
                        {LANGUAGES.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={styles.languageOption}
                                onPress={() => handleLanguageChange(lang.code)}
                            >
                                <Text style={[
                                    styles.languageText,
                                    currentLanguage === lang.code && styles.languageTextActive
                                ]}>
                                    {lang.label}
                                </Text>
                                {currentLanguage === lang.code && (
                                    <Check size={18} color="#3b82f6" />
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.modalCancelBtn}
                            onPress={() => setShowLanguageModal(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 56,
        paddingBottom: 16,
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        borderRadius: 20,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 8,
    },
    content: {
        flex: 1,
        paddingTop: 24,
    },
    settingGroup: {
        marginBottom: 24,
    },
    groupTitle: {
        color: '#6b7280',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    groupContainer: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
    },
    iconDestructive: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    rowLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#e5e7eb',
    },
    labelDestructive: {
        color: '#ef4444',
    },
    footer: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 40,
    },
    version: {
        color: '#4b5563',
        fontSize: 12,
    },
    credits: {
        color: '#374151',
        fontSize: 10,
        marginTop: 4,
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
        padding: 20,
        width: '100%',
        maxWidth: 320,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#2a2a2a',
        marginBottom: 8,
    },
    languageText: {
        color: '#9ca3af',
        fontSize: 15,
    },
    languageTextActive: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    modalCancelBtn: {
        paddingVertical: 12,
        marginTop: 8,
        alignItems: 'center',
    },
    modalCancelText: {
        color: '#6b7280',
        fontSize: 14,
    },
});
