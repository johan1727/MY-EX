import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, Alert, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Smartphone, Shield, FileText, Trash2, ChevronRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';

export default function PreferencesScreen() {
    const router = useRouter();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [hapticsEnabled, setHapticsEnabled] = useState(true);

    const handleDeleteAccount = () => {
        Alert.alert(
            "Eliminar Cuenta",
            "¿Estás seguro? Esta acción no se puede deshacer y perderás todo tu progreso.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await supabase.auth.signOut();
                            router.replace('/onboarding');
                        } catch (e) {
                            Alert.alert("Error", "No se pudo eliminar la cuenta.");
                        }
                    }
                }
            ]
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
                        icon={Bell}
                        label="Notificaciones"
                        value={notificationsEnabled}
                        onToggle={setNotificationsEnabled}
                    />
                    <SettingRow
                        icon={Smartphone}
                        label="Sonidos y Vibración"
                        value={hapticsEnabled}
                        onToggle={setHapticsEnabled}
                    />
                </SettingGroup>

                <SettingGroup title="Legal">
                    <SettingRow
                        icon={Shield}
                        label="Política de Privacidad"
                        showChevron
                        onPress={() => router.push('/legal/privacy' as any)}
                    />
                    <SettingRow
                        icon={FileText}
                        label="Términos de Servicio"
                        showChevron
                        onPress={() => router.push('/legal/terms' as any)}
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
                    <Text style={styles.version}>SOYREMI v1.0.1 (Build 2025.12.23)</Text>
                    <Text style={styles.credits}>Made with ❤️ by AntiGravity</Text>
                </View>
            </ScrollView>
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
});
