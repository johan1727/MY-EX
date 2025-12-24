import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />
            <SafeAreaView className="flex-1">
                <View className="px-6 py-4 border-b border-gray-100 flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <ArrowLeft size={24} color="#000" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold">Política de Privacidad</Text>
                </View>

                <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
                    <Text className="text-gray-800 mb-4 leading-relaxed">
                        Última actualización: {new Date().toLocaleDateString()}
                    </Text>

                    <Text className="text-lg font-bold mb-2 text-gray-900">1. Introducción</Text>
                    <Text className="text-gray-600 mb-6 leading-relaxed">
                        Bienvenido a My Ex Coach. Respetamos su privacidad y nos comprometemos a proteger sus datos personales. Esta política de privacidad le informará sobre cómo cuidamos sus datos personales cuando visita nuestra aplicación y le informará sobre sus derechos de privacidad y cómo la ley lo protege.
                    </Text>

                    <Text className="text-lg font-bold mb-2 text-gray-900">2. Los datos que recopilamos</Text>
                    <Text className="text-gray-600 mb-6 leading-relaxed">
                        Podemos recopilar, usar, almacenar y transferir diferentes tipos de datos personales sobre usted, que hemos agrupado de la siguiente manera:
                        {'\n\n'}• Datos de identidad: incluye nombre, apellido, nombre de usuario o identificador similar.
                        {'\n'}• Datos de contacto: incluye dirección de correo electrónico.
                        {'\n'}• Datos técnicos: incluye dirección IP, sus datos de inicio de sesión, tipo y versión del navegador, configuración de zona horaria y ubicación.
                        {'\n'}• Datos de uso: incluye información sobre cómo usa nuestra aplicación y servicios.
                        {'\n'}• Datos sensibles: incluye información sobre su estado emocional y detalles de relaciones que usted proporciona voluntariamente para el funcionamiento del servicio.
                    </Text>

                    <Text className="text-lg font-bold mb-2 text-gray-900">3. Cómo usamos sus datos</Text>
                    <Text className="text-gray-600 mb-6 leading-relaxed">
                        Solo usaremos sus datos personales cuando la ley lo permita. Más comúnmente, usaremos sus datos personales en las siguientes circunstancias:
                        {'\n\n'}• Para registrarlo como nuevo cliente.
                        {'\n'}• Para procesar y entregar su pedido, incluyendo gestionar pagos, tarifas y cargos.
                        {'\n'}• Para gestionar nuestra relación con usted.
                        {'\n'}• Para permitirle participar en funciones interactivas de nuestro servicio.
                        {'\n'}• Para mejorar nuestro sitio web, productos/servicios, marketing, relaciones con los clientes y experiencias.
                    </Text>

                    <Text className="text-lg font-bold mb-2 text-gray-900">4. Seguridad de los datos</Text>
                    <Text className="text-gray-600 mb-6 leading-relaxed">
                        Hemos implementado medidas de seguridad adecuadas para evitar que sus datos personales se pierdan accidentalmente, se usen o se acceda a ellos de forma no autorizada, se alteren o se divulguen. Además, limitamos el acceso a sus datos personales a aquellos empleados, agentes, contratistas y otros terceros que tengan una necesidad comercial de conocerlos.
                    </Text>

                    <Text className="text-lg font-bold mb-2 text-gray-900">5. Sus derechos legales</Text>
                    <Text className="text-gray-600 mb-8 leading-relaxed">
                        Bajo ciertas circunstancias, tiene derechos bajo las leyes de protección de datos en relación con sus datos personales, incluyendo el derecho a solicitar acceso, corrección, borrado, restricción, transferencia, u oponerse al procesamiento.
                    </Text>

                    <View className="h-10" />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
