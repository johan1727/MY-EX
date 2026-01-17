import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, Platform, StyleSheet, Modal, StatusBar as RNStatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Smartphone, Shield, FileText, Trash2, ChevronRight, Globe, Cookie, Database, X, LogOut, Sparkles, HelpCircle, Check, Download } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../lib/ThemeContext';
import { storage } from '../lib/storage';

const LANGUAGES = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
];

export default function PreferencesScreen() {
    const { isDark } = useTheme();
    const router = useRouter();

    // Theme Constants (Eleven Labs Style)
    // Light: Clean White (#FFFFFF), Text (#111827), Border (#E5E7EB), Subtle BG (#F9FAFB)
    // Dark: Deep Black (#000000), Text (#FFFFFF), Border (#333333), Subtle BG (#111111)
    const theme = {
        bg: isDark ? '#000000' : '#F9FAFB',
        surface: isDark ? '#111111' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#111827',
        textSecondary: isDark ? '#A1A1AA' : '#6B7280',
        border: isDark ? '#333333' : '#E5E7EB',
        pressed: isDark ? '#222222' : '#F3F4F6',
        accent: isDark ? '#FFFFFF' : '#111827', // High contrast accent
        danger: '#EF4444',
    };

    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [hapticsEnabled, setHapticsEnabled] = useState(true);
    const [currentLanguage, setCurrentLanguage] = useState('es');
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    const [customAlert, setCustomAlert] = useState<{ visible: boolean; title: string; message: string; buttons?: any[]; type: 'success' | 'error' | 'warning' | 'info' }>({ visible: false, title: '', message: '', type: 'info' });

    const showAlert = (title: string, message: string, buttons?: any[], type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setCustomAlert({ visible: true, title, message, buttons, type });
    };

    const closeAlert = () => setCustomAlert(prev => ({ ...prev, visible: false }));

    const SettingGroup = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View style={styles.groupWrapper}>
            <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>{title}</Text>
            <View style={[styles.groupContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
        showChevron = false,
        isLast = false
    }: any) => (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress && !onToggle}
            style={[
                styles.row,
                !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border },
                onPress && { backgroundColor: 'transparent' } // Default bg
            ]}
            activeOpacity={0.7}
        >
            <View style={styles.rowLeft}>
                <View style={[
                    styles.iconBox,
                    { backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.1)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }
                ]}>
                    <Icon size={18} color={isDestructive ? theme.danger : theme.text} strokeWidth={2} />
                </View>
                <Text style={[styles.rowLabel, { color: isDestructive ? theme.danger : theme.text }]}>
                    {label}
                </Text>
            </View>

            {onToggle !== undefined && (
                <Switch
                    value={value}
                    onValueChange={onToggle}
                    trackColor={{ false: isDark ? '#333' : '#E5E7EB', true: theme.accent }}
                    thumbColor={'#FFFFFF'}
                    ios_backgroundColor={isDark ? '#333' : '#E5E7EB'}
                />
            )}

            {showChevron && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Value Text if needed */}
                    <ChevronRight size={18} color={theme.textSecondary} />
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* Header - Minimal Eleven Labs style */}
            <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.bg }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={[styles.backBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
                >
                    <ArrowLeft size={20} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>

                <SettingGroup title="GENERAL">
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
                        onToggle={setNotificationsEnabled}
                    />
                    <SettingRow
                        icon={Smartphone}
                        label="Haptics & Sonidos"
                        value={hapticsEnabled}
                        onToggle={setHapticsEnabled}
                        isLast
                    />
                </SettingGroup>

                <SettingGroup title="DATA">
                    <SettingRow
                        icon={Download}
                        label="Exportar Datos"
                        showChevron
                        onPress={() => showAlert('Exportar', 'Tu descarga comenzará en breve.', undefined, 'success')}
                    />
                    <SettingRow
                        icon={Cookie}
                        label="Privacidad & Cookies"
                        showChevron
                        onPress={() => showAlert('Cookies', 'Preferencias actualizadas.', undefined, 'info')}
                        isLast
                    />
                </SettingGroup>

                <SettingGroup title="LEGAL">
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
                        isLast
                        onPress={() => router.push('/terms' as any)}
                    />
                </SettingGroup>

                <SettingGroup title="DANGER ZONE">
                    <SettingRow
                        icon={Database}
                        label="Borrar Caché Local"
                        isDestructive
                        onPress={() => showAlert(
                            'Borrar Caché',
                            'Esto eliminará datos locales. ¿Continuar?',
                            [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                    text: 'Borrar', style: 'destructive', onPress: async () => {
                                        await storage.clear();
                                        showAlert('Listo', 'Caché eliminado.', [{ text: 'OK', onPress: () => router.replace('/tools/ex-simulator/import') }]);
                                    }
                                }
                            ],
                            'warning'
                        )}
                    />
                    <SettingRow
                        icon={Trash2}
                        label="Eliminar Cuenta"
                        isDestructive
                        isLast
                        onPress={() => showAlert('Eliminar Cuenta', 'Esta acción es irreversible.', [{ text: 'Cancelar' }, { text: 'Eliminar', style: 'destructive' }], 'error')}
                    />
                </SettingGroup>

                <View style={styles.footer}>
                    <Text style={[styles.version, { color: theme.textSecondary }]}>SOYREMI v1.0.2</Text>
                </View>

            </ScrollView>

            {/* Language Modal */}
            <Modal visible={showLanguageModal} transparent animationType="fade" onRequestClose={() => setShowLanguageModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Seleccionar Idioma</Text>
                        {LANGUAGES.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.langOption,
                                    { backgroundColor: currentLanguage === lang.code ? (isDark ? '#333' : '#F3F4F6') : 'transparent' }
                                ]}
                                onPress={() => { setCurrentLanguage(lang.code); setShowLanguageModal(false); }}
                            >
                                <Text style={[styles.langText, { color: theme.text }]}>{lang.label}</Text>
                                {currentLanguage === lang.code && <Check size={18} color={theme.text} />}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.closeModal} onPress={() => setShowLanguageModal(false)}>
                            <Text style={{ color: theme.textSecondary }}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modern Custom Alert (Refined) */}
            <Modal transparent visible={customAlert.visible} animationType="fade" onRequestClose={closeAlert}>
                <View style={styles.alertBackdrop}>
                    <View style={[styles.alertCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={[styles.alertIcon, { backgroundColor: isDark ? '#222' : '#F3F4F6' }]}>
                            {customAlert.type === 'error' && <X size={24} color={theme.danger} />}
                            {customAlert.type === 'warning' && <LogOut size={24} color="#F59E0B" />}
                            {customAlert.type === 'success' && <Sparkles size={24} color="#10B981" />}
                            {customAlert.type === 'info' && <HelpCircle size={24} color={theme.text} />}
                        </View>

                        <Text style={[styles.alertHeader, { color: theme.text }]}>{customAlert.title}</Text>
                        <Text style={[styles.alertBody, { color: theme.textSecondary }]}>{customAlert.message}</Text>

                        <View style={styles.alertActions}>
                            {(!customAlert.buttons || customAlert.buttons.length === 0) ? (
                                <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={closeAlert}>
                                    <Text style={[styles.btnText, { color: isDark ? '#000' : '#FFF' }]}>OK</Text>
                                </TouchableOpacity>
                            ) : (
                                customAlert.buttons.map((btn: any, i: number) => {
                                    const isDestructive = btn.style === 'destructive';
                                    const isCancel = btn.style === 'cancel';

                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={[
                                                styles.btn,
                                                isCancel ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border } :
                                                    isDestructive ? { backgroundColor: 'rgba(239, 68, 68, 0.1)' } :
                                                        { backgroundColor: theme.accent }
                                            ]}
                                            onPress={() => { if (btn.onPress) btn.onPress(); else closeAlert(); }}
                                        >
                                            <Text style={[
                                                styles.btnText,
                                                isCancel ? { color: theme.text } :
                                                    isDestructive ? { color: theme.danger } :
                                                        { color: isDark ? '#000' : '#FFF' }
                                            ]}>
                                                {btn.text}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.5,
        marginLeft: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    content: { flex: 1, paddingTop: 24 },
    groupWrapper: { marginBottom: 32, paddingHorizontal: 20 },
    groupTitle: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 10,
        opacity: 0.8,
        letterSpacing: 1,
        marginLeft: 4,
    },
    groupContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 10, // Softer radius
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    footer: { alignItems: 'center', marginTop: 20 },
    version: { fontSize: 12, opacity: 0.5 },

    // Alert Styles
    alertBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    alertCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 20,
    },
    alertIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    alertHeader: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    alertBody: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    alertActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    btn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: {
        fontWeight: '600',
        fontSize: 14,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 300,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    langOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 4,
    },
    langText: { fontSize: 15, fontWeight: '500' },
    closeModal: { alignItems: 'center', marginTop: 12, padding: 8 },
});
