import { sendMessageToChatGPT } from './openai';

interface StalkerAnalysisResult {
    riskLevel: 'low' | 'medium' | 'high';
    behaviors: Array<{
        behavior: string;
        severity: 'low' | 'medium' | 'high';
        description: string;
    }>;
    recommendations: string[];
    privacyTips: string[];
    contentStrategy: {
        whatToPost: string[];
        whatToAvoid: string[];
    };
}

export async function analyzeStalkerBehavior(
    behaviors: string[],
    context?: string
): Promise<StalkerAnalysisResult> {
    const prompt = `Eres un experto en psicología de relaciones y comportamiento post-ruptura. Analiza los siguientes comportamientos que el usuario ha observado de su ex:

COMPORTAMIENTOS OBSERVADOS:
${behaviors.map((b, i) => `${i + 1}. ${b}`).join('\n')}

${context ? `\nCONTEXTO ADICIONAL:\n${context}` : ''}

Proporciona un análisis detallado en formato JSON con la siguiente estructura:
{
    "riskLevel": "low|medium|high",
    "behaviors": [
        {
            "behavior": "Nombre del comportamiento",
            "severity": "low|medium|high",
            "description": "Explicación de por qué es preocupante o normal"
        }
    ],
    "recommendations": [
        "Recomendaciones específicas para manejar la situación"
    ],
    "privacyTips": [
        "Tips de privacidad en redes sociales"
    ],
    "contentStrategy": {
        "whatToPost": [
            "Tipo de contenido que puede ayudar a establecer límites o seguir adelante"
        ],
        "whatToAvoid": [
            "Tipo de contenido que podría empeorar la situación"
        ]
    }
}

Analiza:
1. Nivel de riesgo general (bajo/medio/alto)
2. Cada comportamiento individualmente
3. Recomendaciones para protegerse
4. Tips de privacidad
5. Estrategia de contenido en redes sociales

Responde SOLO con el JSON, sin texto adicional.`;

    try {
        const response = await sendMessageToChatGPT(prompt);

        // Parse the JSON response
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid response format');
        }

        const analysis: StalkerAnalysisResult = JSON.parse(jsonMatch[0]);
        return analysis;

    } catch (error) {
        console.error('Error analyzing stalker behavior:', error);

        // Return a fallback response
        return {
            riskLevel: 'low',
            behaviors: [],
            recommendations: ['No se pudo completar el análisis. Por favor intenta de nuevo.'],
            privacyTips: ['Revisa tu configuración de privacidad en redes sociales'],
            contentStrategy: {
                whatToPost: [],
                whatToAvoid: []
            }
        };
    }
}
