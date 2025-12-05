import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Plus, Clock, Trash2, Play, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import FeatureGate from '../../../components/FeatureGate';

interface ExProfile {
    id: string;
    ex_name: string;
    profile_data: any;
    message_count: number;
    created_at: string;
    last_used_at: string | null;
}

export default function ExSimulatorHome() {
    const router = useRouter();
    const [profiles, setProfiles] = useState<ExProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            if (!user) return;

            const { data, error } = await supabase
                .from('ex_profiles')
                .select('*')
                .eq('user_id', user.id)
                .order('last_used_at', { ascending: false, nullsFirst: false });

            if (error) throw error;

            setProfiles(data || []);
        } catch (error) {
            console.error('Error loading profiles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProfile = async (profileId: string, exName: string) => {
        Alert.alert(
            'Eliminar Perfil',
            `¿Estás seguro de eliminar el perfil de ${exName}? Esto también eliminará todas las simulaciones asociadas.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('ex_profiles')
                                .delete()
                                .eq('id', profileId);

                            if (error) throw error;

                            setProfiles(prev => prev.filter(p => p.id !== profileId));
                            Alert.alert('Éxito', 'Perfil eliminado correctamente');
                        } catch (error) {
                            console.error('Error deleting profile:', error);
                            Alert.alert('Error', 'No se pudo eliminar el perfil');
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <FeatureGate feature="ex_simulator">
            <View className="flex-1 bg-[#0a0a0a]">
                <LinearGradient
                    colors={['#1a1a2e', '#16213e', '#0a0a0a']}
                    className="flex-1"
                >
                    <ScrollView className="flex-1 px-6 pt-6">
                        {/* Header */}
                        <View className="mb-6">
                            <Text className="text-white text-3xl font-bold mb-2">
                                🎭 Ex Simulator
                            </Text>
                            <Text className="text-gray-400 leading-6">
                                Practica conversaciones con una simulación de tu ex basada en sus mensajes reales
                            </Text>
                        </View>

                        {/* Create New Profile Button */}
                        <TouchableOpacity
                            onPress={() => router.push('/tools/ex-simulator/import' as any)}
                            className="mb-6"
                        >
                            <LinearGradient
                                colors={['#a855f7', '#3b82f6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                className="rounded-2xl p-4 flex-row items-center justify-between"
                            >
                                <View className="flex-row items-center">
                                    <Plus size={24} color="white" />
                                    <Text className="text-white font-bold text-lg ml-3">
                                        Crear Nuevo Perfil
                                    </Text>
                                </View>
                                <ChevronRight size={24} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Profiles List */}
                        {loading ? (
                            <View className="items-center justify-center py-12">
                                <ActivityIndicator size="large" color="#a855f7" />
                            </View>
                        ) : profiles.length === 0 ? (
                            <View className="items-center justify-center py-12">
                                <Users size={64} color="#4b5563" />
                                <Text className="text-gray-400 text-center mt-4 text-lg">
                                    No tienes perfiles creados
                                </Text>
                                <Text className="text-gray-500 text-center mt-2">
                                    Crea tu primer perfil para comenzar
                                </Text>
                            </View>
                        ) : (
                            <View>
                                <Text className="text-white font-semibold text-lg mb-3">
                                    Tus Perfiles ({profiles.length})
                                </Text>
                                {profiles.map((profile) => (
                                    <View
                                        key={profile.id}
                                        className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3"
                                    >
                                        <View className="flex-row items-center justify-between mb-3">
                                            <View className="flex-1">
                                                <Text className="text-white font-bold text-lg">
                                                    {profile.ex_name}
                                                </Text>
                                                <Text className="text-gray-400 text-sm">
                                                    {profile.message_count} mensajes analizados
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteProfile(profile.id, profile.ex_name)}
                                                className="bg-red-500/20 p-2 rounded-full"
                                            >
                                                <Trash2 size={18} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>

                                        <View className="flex-row items-center mb-3">
                                            <Clock size={14} color="#9ca3af" />
                                            <Text className="text-gray-400 text-xs ml-2">
                                                Creado: {formatDate(profile.created_at)}
                                            </Text>
                                        </View>

                                        <TouchableOpacity
                                            onPress={() => router.push(`/tools/ex-simulator/simulate/${profile.id}` as any)}
                                            className="bg-purple-600 rounded-xl py-3 flex-row items-center justify-center"
                                        >
                                            <Play size={18} color="white" />
                                            <Text className="text-white font-bold ml-2">
                                                Iniciar Simulación
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Info Card */}
                        <View className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mt-6 mb-6">
                            <Text className="text-blue-400 font-bold mb-2">💡 ¿Cómo funciona?</Text>
                            <Text className="text-gray-300 text-sm leading-6">
                                1. Exporta tu conversación de WhatsApp/Telegram{'\n'}
                                2. La IA analiza el estilo de comunicación de tu ex{'\n'}
                                3. Practica conversaciones realistas{'\n'}
                                4. Recibe feedback para mejorar tu comunicación
                            </Text>
                        </View>
                    </ScrollView>
                </LinearGradient>
            </View>
        </FeatureGate>
    );
}
