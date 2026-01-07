
import { ParsedMessage } from './exSimulator';

/**
 * Utility for anonymizing chat data to mitigate legal risks (Right of Publicity / LFPDPPP).
 */

export interface AnonymizedResult {
    text: string;
    replacements: Map<string, string>;
}

export function anonymizeChatContent(text: string, participants: string[]): AnonymizedResult {
    let anonymizedText = text;
    const replacements = new Map<string, string>();

    // 1. Anonymize Participants (simulating generic roles)
    participants.forEach((name, index) => {
        if (!name) return;

        // Skip common generic names if they accidentally appear
        if (['yo', 'tú', 'él', 'ella', 'usted', 'nosotros'].includes(name.toLowerCase())) return;

        // Create generic placeholder
        const placeholder = index === 0 ? 'PERSONA_A' : 'PERSONA_B';
        replacements.set(name, placeholder);

        // Replace all occurrences of the name (globally, case insensitive)
        // Escaping special regex chars in name
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use word boundary to avoid replacing partial words
        const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
        anonymizedText = anonymizedText.replace(regex, placeholder);
    });

    // 2. Redact Phone Numbers (international formats)
    const phoneRegex = /\b\+?(\d[\d\s-]{8,})\b/g;
    anonymizedText = anonymizedText.replace(phoneRegex, '[PHONE_REDACTED]');

    // 3. Redact Emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    anonymizedText = anonymizedText.replace(emailRegex, '[EMAIL_REDACTED]');

    // 4. Redact Addresses (simple heuristic)
    const addressRegex = /\b(Calle|Av\.|Avenida|Colonia|Blvd\.|C\/)\s+[A-Za-z0-9\s,.-]{5,}\b/gi;
    anonymizedText = anonymizedText.replace(addressRegex, '[ADDRESS_REDACTED]');

    return {
        text: anonymizedText,
        replacements
    };
}

/**
 * Anonymizes an array of parsed messages.
 * Replaces sender names and sensitive content within messages.
 */
export function anonymizeMessages(messages: ParsedMessage[], participants: string[]): ParsedMessage[] {
    const rawText = messages.map(m => m.content).join('\n');
    // Generate replacement map from full context
    const { replacements } = anonymizeChatContent(rawText, participants);

    return messages.map(msg => {
        let newSender = msg.sender;
        let newContent = msg.content;

        // Replace sender name if in map
        // We check against the map keys (original names)
        for (const [original, replacement] of replacements.entries()) {
            if (msg.sender.toLowerCase() === original.toLowerCase()) {
                newSender = replacement;
            }

            // Also replace names inside content
            const escapedName = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
            newContent = newContent.replace(regex, replacement);
        }

        // Apply general redactions to content
        newContent = newContent.replace(/\b\+?(\d[\d\s-]{8,})\b/g, '[PHONE]');
        newContent = newContent.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

        return {
            ...msg,
            sender: newSender,
            content: newContent
        };
    });
}
