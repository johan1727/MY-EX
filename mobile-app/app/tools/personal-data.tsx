import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Save, User, Heart, Calendar, FileText, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function PersonalDataScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [exName, setExName] = useState('');
    const [breakupDate, setBreakupDate] = useState(new Date());
    const [noContactDate, setNoContactDate] = useState(new Date());
    const [story, setStory] = useState('');
    const [attachmentStyle, setAttachmentStyle] = useState('');

    // Date Picker State
    const [showBreakupPicker, setShowBreakupPicker] = useState(false);
    const [showNoContactPicker, setShowNoContactPicker] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('name, breakup_date, no_contact_since, onboarding_data')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data) {
                setName(data.name || '');
                if (data.breakup_date) setBreakupDate(new Date(data.breakup_date));
                if (data.no_contact_since) setNoContactDate(new Date(data.no_contact_since));

                // Load from JSONB onboarding_data
                const onboarding = data.onboarding_data || {};
                setExName(onboarding.ex_name || '');
                setStory(onboarding.story || '');
                setAttachmentStyle(onboarding.attachment_style || '');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'No se pudieron cargar tus datos.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            // Fetch current onboarding_data to merge
            const { data: currentData } = await supabase
                .from('profiles')
                .select('onboarding_data')
                .eq('id', user.id)
                .single();

            const currentOnboarding = currentData?.onboarding_data || {};

            const updates = {
                name,
                breakup_date: breakupDate.toISOString().split('T')[0],
                no_contact_since: noContactDate.toISOString().split('T')[0],
                onboarding_data: {
                    ...currentOnboarding,
                    ex_name: exName,
                    story,
                    attachment_style: attachmentStyle,
                },
                updated_at: new Date(),
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            Alert.alert('¡Guardado!', 'Tus datos se han actualizado correctamente.');
            router.back();
        } catch (error: any) {
            console.error('Error saving data:', error);
            Alert.alert('Error', 'No se pudieron guardar los cambios.');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    if (loading) {
        return (
            <View className="flex-1 bg-black justify-center items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-black">
            <StatusBar style="light" />
            <LinearGradient
                colors={['#0a0a0a', '#111827', '#0a0a0a']}
                className="absolute inset-0"
            />

            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="px-6 py-4 border-b border-white/10 flex-row items-center justify-between bg-black/50 backdrop-blur-md z-10">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center rounded-full bg-white/5 active:bg-white/10"
                    >
                        <ArrowLeft size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text className="text-white text-lg font-bold">Mis Datos</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving}
                        className="w-10 h-10 items-center justify-center rounded-full bg-blue-600/20 active:bg-blue-600/30"
                    >
                        {saving ? <ActivityIndicator size="small" color="#3b82f6" /> : <Save size={20} color="#3b82f6" />}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>

                        {/* Info Card */}
                        <View className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-4 mb-8 flex-row items-start">
                            <Sparkles size={20} color="#60a5fa" className="mt-1 mr-3" />
                            <Text className="text-blue-200 text-sm flex-1 leading-relaxed">
                                Esta información ayuda a la IA a personalizar tus consejos y análisis. Cuantos más detalles proporciones, mejor será tu Coach.
                            </Text>
                        </View>

                        {/* Section: Basic Info */}
                        <View className="mb-8">
                            <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 ml-1">Información Básica</Text>

                            <View className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                <View className="p-4 border-b border-white/10">
                                    <Text className="text-gray-400 text-xs mb-2">Tu Nombre</Text>
                                    <View className="flex-row items-center">
                                        <User size={18} color="#9ca3af" className="mr-3" />
                                        <TextInput
                                            value={name}
                                            onChangeText={setName}
                                            placeholder="Tu nombre"
                                            placeholderTextColor="#4b5563"
                                            className="flex-1 text-white text-base"
                                        />
                                    </View>
                                </View>

                                <View className="p-4">
                                    <Text className="text-gray-400 text-xs mb-2">Nombre de tu Ex</Text>
                                    <View className="flex-row items-center">
                                        <Heart size={18} color="#9ca3af" className="mr-3" />
                                        <TextInput
                                            value={exName}
                                            onChangeText={setExName}
                                            placeholder="Nombre de tu ex"
                                            placeholderTextColor="#4b5563"
                                            className="flex-1 text-white text-base"
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Section: Dates */}
                        <View className="mb-8">
                            <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 ml-1">Fechas Importantes</Text>

                            <View className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                <TouchableOpacity
                                    onPress={() => setShowBreakupPicker(true)}
                                    className="p-4 border-b border-white/10 active:bg-white/5"
                                >
                                    <Text className="text-gray-400 text-xs mb-2">Fecha de Ruptura</Text>
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center">
                                            <Calendar size={18} color="#ef4444" className="mr-3" />
                                            <Text className="text-white text-base">{formatDate(breakupDate)}</Text>
                                        </View>
                                        <Text className="text-blue-500 text-xs">Cambiar</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setShowNoContactPicker(true)}
                                    className="p-4 active:bg-white/5"
                                >
                                    <Text className="text-gray-400 text-xs mb-2">Contacto Cero Desde</Text>
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center">
                                            <Calendar size={18} color="#22c55e" className="mr-3" />
                                            <Text className="text-white text-base">{formatDate(noContactDate)}</Text>
                                        </View>
                                        <Text className="text-blue-500 text-xs">Cambiar</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Section: Story */}
                        <View className="mb-10">
                            <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 ml-1">Tu Historia</Text>

                            <View className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                <View className="flex-row items-start mb-2">
                                    <FileText size={18} color="#9ca3af" className="mr-3 mt-1" />
                                    <Text className="text-gray-400 text-xs flex-1">
                                        Cuéntanos brevemente qué pasó. ¿Por qué terminaron? ¿Cómo te sientes?
                                    </Text>
                                </View>
                                <TextInput
                                    value={story}
                                    onChangeText={setStory}
                                    placeholder="Escribe tu historia aquí..."
                                    placeholderTextColor="#4b5563"
                                    multiline
                                    numberOfLines={6}
                                    className="text-white text-base leading-relaxed min-h-[120px]"
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        {/* Section: Attachment Style (Optional) */}
                        <View className="mb-20">
                            <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 ml-1">Estilo de Apego</Text>
                            <View className="flex-row flex-wrap gap-3">
                                {['Ansioso', 'Evitativo', 'Seguro', 'Desorganizado'].map((style) => (
                                    <TouchableOpacity
                                        key={style}
                                        onPress={() => setAttachmentStyle(style)}
                                        className={`px-4 py-2 rounded-full border ${attachmentStyle === style
                                                ? 'bg-blue-600 border-blue-500'
                                                : 'bg-white/5 border-white/10'
                                            }`}
                                    >
                                        <Text className={`text-sm ${attachmentStyle === style ? 'text-white font-semibold' : 'text-gray-400'
                                            }`}>
                                            {style}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Date Pickers */}
                {showBreakupPicker && (
                    <DateTimePicker
                        value={breakupDate}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowBreakupPicker(false);
                            if (selectedDate) setBreakupDate(selectedDate);
                        }}
                    />
                )}
                {showNoContactPicker && (
                    <DateTimePicker
                        value={noContactDate}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowNoContactPicker(false);
                            if (selectedDate) setNoContactDate(selectedDate);
                        }}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

// Helper component for SafeAreaView if not imported from react-native-safe-area-context
function SafeAreaView({ children, className }: { children: React.ReactNode, className?: string }) {
    const { top, bottom } = require('react-native-safe-area-context').useSafeAreaInsets();
    return (
        <View style={{ paddingTop: top, paddingBottom: bottom }} className={className}>
            {children}
        </View>
    );
}
