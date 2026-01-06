import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, Platform, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Smartphone, Shield, FileText, Trash2, ChevronRight, Globe, Moon, Download, Cookie, Check, Database, HelpCircle, X, LogOut, Sparkles } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../lib/storage';

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
        showAlert('Idioma actualizado', 'El idioma se aplicará en la próxima carga.', [{ text: 'OK', onPress: closeAlert }], 'success');
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
        showAlert('Exportar datos', 'Esta función estará disponible próximamente. Podrás descargar todos tus datos de la app.', [{ text: 'OK', onPress: closeAlert }], 'info');
    };

    const handleCookieSettings = async () => {
        await AsyncStorage.removeItem('cookie_consent_v2');
        showAlert('Cookies', 'Las preferencias de cookies se reiniciarán. Recarga la app para ver el banner.', [{ text: 'OK', onPress: closeAlert }], 'info');
    };

    const handleDeleteAccount = () => {
        const executeDelete = async () => {
            try {
                // In a real app, this would call an API to delete user data
                await supabase.auth.signOut();
                router.replace('/welcome');
            } catch (e) {
                showAlert("Error", "No se pudo eliminar la cuenta.", [{ text: 'OK' }], 'error');
            }
        };

        showAlert(
            "⚠️ Eliminar Cuenta",
            "¿Estás seguro? Esta acción NO se puede deshacer.\n\nPerderás todo tu progreso, análisis y conversaciones.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar Todo",
                    style: "destructive",
                    onPress: () => {
                        // Double confirmation
                        showAlert(
                            '🚨 ÚLTIMA CONFIRMACIÓN',
                            'Confirma que realmente deseas borrar todos tus datos permanentemente.',
                            [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'SÍ, ELIMINAR', style: 'destructive', onPress: () => { closeAlert(); executeDelete(); } }
                            ],
                            'warning'
                        );
                    }
                }
            ],
            'warning'
        );
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
                    <SettingRow
                        icon={Database}
                        label="Borrar Caché Local"
                        isDestructive
                        onPress={() => {
                            showAlert(
                                '⚠️ Borrar Caché',
                                'Esto eliminará TODOS los perfiles y conversaciones guardadas localmente en este dispositivo.\n\n' +
                                '✓ Útil si la app no funciona correctamente\n' +
                                '✓ No afecta tu cuenta ni datos en la nube\n' +
                                '✗ Perderás perfiles no sincronizados\n\n' +
                                '¿Continuar?',
                                [
                                    { text: 'Cancelar', style: 'cancel' },
                                    {
                                        text: 'Borrar Caché',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                await storage.clear();
                                                showAlert(
                                                    '✓ Caché Borrado',
                                                    'Todos los datos locales han sido eliminados. La app se reiniciará.',
                                                    [{
                                                        text: 'OK',
                                                        onPress: () => { closeAlert(); router.replace('/tools/ex-simulator/import'); }
                                                    }],
                                                    'success'
                                                );
                                            } catch (error) {
                                                showAlert('Error', 'No se pudo borrar el caché. Intenta de nuevo.', [{ text: 'OK' }], 'error');
                                            }
                                        }
                                    }
                                ],
                                'warning'
                            );
                        }}
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
                                        onPress={() => {
                                            if (btn.onPress) btn.onPress();
                                            else closeAlert();
                                        }}
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
        borderBottomColor: '#333',
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
        borderColor: '#333',
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
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
