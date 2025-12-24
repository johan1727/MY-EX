import { sendMessageToChatGPT } from './openai';

interface AnalysisResult {
    whoInitiatedMore: {
        user: number;
        ex: number;
    };
    interestLevel: {
        user: number;
        ex: number;
    };
    redFlags: string[];
    keyMoments: Array<{
        date: string;
        description: string;
        impact: 'positive' | 'negative' | 'neutral';
    }>;
    powerDynamics: string;
    recommendations: string[];
}

export async function analyzeConversation(
    conversationText: string,
    startDate?: string,
    endDate?: string
): Promise<AnalysisResult> {
    const prompt = `Eres un experto en psicología de relaciones y análisis de comunicación. Analiza la siguiente conversación entre dos personas que tuvieron una relación romántica.

${startDate && endDate ? `Período: ${startDate} - ${endDate}` : ''}

CONVERSACIÓN:
${conversationText}

Proporciona un análisis detallado en formato JSON con la siguiente estructura:
{
    "whoInitiatedMore": {
        "user": <porcentaje 0-100>,
        "ex": <porcentaje 0-100>
    },
    "interestLevel": {
        "user": <nivel 1-10>,
        "ex": <nivel 1-10>
    },
    "redFlags": [
        "Lista de red flags identificadas"
    ],
    "keyMoments": [
        {
            "date": "fecha aproximada",
            "description": "descripción del momento clave",
            "impact": "positive|negative|neutral"
        }
    ],
    "powerDynamics": "Análisis de las dinámicas de poder en la relación",
    "recommendations": [
        "Recomendaciones específicas basadas en el análisis"
    ]
}

Analiza:
1. Quién iniciaba más las conversaciones
2. Nivel de interés de cada persona (1-10)
3. Red flags en la comunicación
4. Momentos clave que marcaron cambios
5. Dinámicas de poder y apego
6. Recomendaciones para el usuario

Responde SOLO con el JSON, sin texto adicional.`;

    try {
        const response = await sendMessageToChatGPT([
            { role: 'user', content: prompt }
        ]);

        // Parse the JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid response format');
        }

        const analysis: AnalysisResult = JSON.parse(jsonMatch[0]);
        return analysis;

    } catch (error) {
        console.error('Error analyzing conversation:', error);

        // Return a fallback response
        return {
            whoInitiatedMore: { user: 50, ex: 50 },
            interestLevel: { user: 5, ex: 5 },
            redFlags: ['No se pudo completar el análisis. Por favor intenta de nuevo.'],
            keyMoments: [],
            powerDynamics: 'Análisis no disponible',
            recommendations: ['Intenta pegar la conversación nuevamente']
        };
    }
}
