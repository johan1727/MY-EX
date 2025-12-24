import { sendMessageToChatGPT } from './openai';

interface AnalysisResult {
    contentType: string;
    emotionalState: string;
    movingOnSignals: string[];
    stillThinkingAboutYou: string[];
    recommendations: string[];
    overallAssessment: string;
}

export async function analyzeSocialMedia(
    input: string,
    type: 'link' | 'screenshot'
): Promise<AnalysisResult> {
    const prompt = `Eres un experto en psicología de relaciones y análisis de comportamiento en redes sociales. 

${type === 'link'
            ? `Analiza el siguiente contenido de redes sociales basándote en el link: ${input}`
            : `Analiza el siguiente screenshot de redes sociales. Describe lo que ves y analiza su significado psicológico.`
        }

Proporciona un análisis detallado en formato JSON con la siguiente estructura:
{
    "contentType": "Descripción del tipo de contenido (reel motivacional, foto con amigos, indirecta, etc.)",
    "emotionalState": "Análisis del estado emocional que refleja este contenido",
    "movingOnSignals": [
        "Señales de que está superando la relación"
    ],
    "stillThinkingAboutYou": [
        "Señales de que aún piensa en ti o en la relación"
    ],
    "recommendations": [
        "Recomendaciones específicas basadas en este contenido"
    ],
    "overallAssessment": "Evaluación general de qué significa este contenido en el contexto de la ruptura"
}

Analiza:
1. Tipo de contenido y su significado
2. Estado emocional que refleja
3. Señales de superación vs señales de que aún piensa en la relación
4. Qué revela sobre su proceso de sanación
5. Recomendaciones para el usuario

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
        console.error('Error analyzing social media:', error);

        // Return a fallback response
        return {
            contentType: 'Contenido no analizado',
            emotionalState: 'No se pudo determinar',
            movingOnSignals: [],
            stillThinkingAboutYou: [],
            recommendations: ['Intenta analizar el contenido nuevamente'],
            overallAssessment: 'Análisis no disponible. Por favor intenta de nuevo.'
        };
    }
}
