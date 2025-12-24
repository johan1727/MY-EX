import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
});

interface DecoderResult {
    analysis: string;
    emotionalTone: string;
    hiddenMeaning: string;
    redFlags: string[];
    suggestedResponses: {
        noContact: string;
        friendly: string;
        closure: string;
    };
}

export async function analyzeMessage(message: string): Promise<DecoderResult> {
    try {
        const prompt = `You are an expert relationship coach analyzing a message from someone's ex. Provide a brutally honest but compassionate analysis.

Message from ex: "${message}"

Analyze this message and provide:

1. **Honest Analysis**: What are they REALLY saying? What do they want? Be direct but kind.

2. **Emotional Tone**: Identify the emotional state (e.g., "Manipulative and guilt-tripping", "Genuinely apologetic", "Confused and seeking validation", "Breadcrumbing", "Trying to keep you as backup")

3. **Hidden Meaning**: What's the subtext? What aren't they saying directly?

4. **Red Flags**: List any manipulative tactics, guilt-tripping, gaslighting, or concerning patterns. If none, return empty array.

5. **Suggested Responses**: Provide 3 different response options:
   - **No Contact**: A brief, boundary-setting response or recommendation to not respond at all
   - **Friendly but Distant**: Polite but makes it clear you've moved on
   - **Definitive Closure**: A final, clear message that closes the door

Return ONLY valid JSON in this exact format:
{
  "analysis": "string",
  "emotionalTone": "string",
  "hiddenMeaning": "string",
  "redFlags": ["string"],
  "suggestedResponses": {
    "noContact": "string",
    "friendly": "string",
    "closure": "string"
  }
}

Be empathetic but honest. Help them see the truth without being cruel.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert relationship coach who provides honest, compassionate analysis of messages from exes. You help people see manipulation, set boundaries, and make healthy decisions.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1000,
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');

        // Validate the response has all required fields
        if (!result.analysis || !result.emotionalTone || !result.suggestedResponses) {
            throw new Error('Invalid response from AI');
        }

        return result as DecoderResult;

    } catch (error) {
        console.error('Error in analyzeMessage:', error);

        // Return a fallback response
        return {
            analysis: "I apologize, but I couldn't analyze this message properly. Please try again or contact support if the issue persists.",
            emotionalTone: "Unable to determine",
            hiddenMeaning: "Analysis unavailable",
            redFlags: [],
            suggestedResponses: {
                noContact: "I need space right now. Please respect my boundaries.",
                friendly: "I appreciate you reaching out, but I think it's best we maintain our distance.",
                closure: "I've moved on and I think it's best we don't communicate anymore. I wish you well."
            }
        };
    }
}

// Helper function to detect common manipulation tactics
export function detectManipulationTactics(message: string): string[] {
    const tactics: string[] = [];
    const lowerMessage = message.toLowerCase();

    const patterns = {
        'Guilt-tripping': ['i miss you', 'i can\'t stop thinking', 'nobody understands me like you'],
        'Breadcrumbing': ['just checking in', 'thinking of you', 'hope you\'re well'],
        'Gaslighting': ['you\'re overreacting', 'that never happened', 'you\'re too sensitive'],
        'Love bombing': ['i love you so much', 'you\'re the only one', 'i can\'t live without you'],
        'Future faking': ['we can work this out', 'things will be different', 'i promise i\'ll change'],
        'Hoovering': ['i made a mistake', 'i realize now', 'can we talk'],
        'Playing victim': ['i\'m so alone', 'everyone left me', 'i have nobody'],
    };

    for (const [tactic, keywords] of Object.entries(patterns)) {
        if (keywords.some(keyword => lowerMessage.includes(keyword))) {
            tactics.push(tactic);
        }
    }

    return tactics;
}
