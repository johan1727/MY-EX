import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function TermsScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />
            <SafeAreaView className="flex-1">
                <View className="px-6 py-4 border-b border-gray-100 flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <ArrowLeft size={24} color="#000" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold">Términos y Condiciones</Text>
                </View>

                <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
                    <Text className="text-gray-800 mb-4 leading-relaxed">
                        Última actualización: {new Date().toLocaleDateString()}
                    </Text>

                    <Text className="text-lg font-bold mb-2 text-gray-900">1. Aceptación de los Términos</Text>
                    <Text className="text-gray-600 mb-6 leading-relaxed">
                        Al acceder y utilizar My Ex Coach, usted acepta estar sujeto a estos Términos y Condiciones de Uso. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio.
                    </Text>

                    <Text className="text-lg font-bold mb-2 text-gray-900">2. Uso del Servicio</Text>
                    <Text className="text-gray-600 mb-6 leading-relaxed">
                        My Ex Coach es una herramienta de apoyo emocional y coaching basada en IA. No sustituye el asesoramiento profesional médico, psicológico o psiquiátrico. Si está en crisis o necesita ayuda urgente, contacte a los servicios de emergencia locales.
                        {'\n\n'}Usted se compromete a no utilizar el servicio para ningún propósito ilegal o prohibido por estos términos.
                    </Text>

                    <Text className="text-lg font-bold mb-2 text-gray-900">3. Cuentas</Text>
                    <Text className="text-gray-600 mb-6 leading-relaxed">
                        Cuando crea una cuenta con nosotros, debe proporcionarnos información precisa, completa y actual. El incumplimiento de esto constituye una violación de los términos, que puede resultar en la terminación inmediata de su cuenta.
                    </Text>

                    <Text className="text-lg font-bold mb-2 text-gray-900">4. Propiedad Intelectual</Text>
                    <Text className="text-gray-600 mb-6 leading-relaxed">
                        El servicio y su contenido original, características y funcionalidad son y seguirán siendo propiedad exclusiva de My Ex Coach y sus licenciantes.
                    </Text>

                    <Text className="text-lg font-bold mb-2 text-gray-900">5. Limitación de Responsabilidad</Text>
                    <Text className="text-gray-600 mb-6 leading-relaxed">
                        En ningún caso My Ex Coach, ni sus directores, empleados, socios, agentes, proveedores o afiliados, serán responsables por daños indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo sin limitación, pérdida de beneficios, datos, uso, buena voluntad, u otras pérdidas intangibles.
                    </Text>

                    <Text className="text-lg font-bold mb-2 text-gray-900">6. Cambios</Text>
                    <Text className="text-gray-600 mb-8 leading-relaxed">
                        Nos reservamos el derecho, a nuestra sola discreción, de modificar o reemplazar estos Términos en cualquier momento. Si una revisión es material, intentaremos proporcionar un aviso de al menos 30 días antes de que entren en vigor los nuevos términos.
                    </Text>

                    <View className="h-10" />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
