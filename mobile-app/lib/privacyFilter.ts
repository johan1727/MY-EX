/**
 * PRIVACY FILTER (PII Protection)
 * 
 * Sanitizes chat messages before sending to AI by:
 * - Masking phone numbers
 * - Masking email addresses
 * - Masking physical addresses
 * - Keeping only first names (removing full names)
 * 
 * Creates a reversible mapping to display original content to the user
 */

export interface SanitizedData {
    messages: any[]; // Sanitized messages
    reverseMap: Map<string, string>; // Masked → Original mapping
}

// Regex patterns for PII detection
const PHONE_REGEX = /\+?\d{1,4}?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const ADDRESS_REGEX = /\b\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|way|court|ct|circle|cir|plaza|pl)\b/gi;
const FULL_NAME_REGEX = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g; // Matches "Juan Pérez"

let maskCounter = 0;

/**
 * Generate unique mask for PII
 */
function generateMask(type: 'phone' | 'email' | 'address' | 'name'): string {
    maskCounter++;
    const prefix = {
        phone: 'PHONE',
        email: 'EMAIL',
        address: 'ADDR',
        name: 'NAME'
    }[type];
    return `[${prefix}_${maskCounter}]`;
}

/**
 * Sanitize a single message
 */
function sanitizeMessage(content: string, reverseMap: Map<string, string>): string {
    let sanitized = content;

    // 1. Mask phone numbers
    sanitized = sanitized.replace(PHONE_REGEX, (match) => {
        const mask = generateMask('phone');
        reverseMap.set(mask, match);
        return mask;
    });

    // 2. Mask emails
    sanitized = sanitized.replace(EMAIL_REGEX, (match) => {
        const mask = generateMask('email');
        reverseMap.set(mask, match);
        return mask;
    });

    // 3. Mask addresses
    sanitized = sanitized.replace(ADDRESS_REGEX, (match) => {
        const mask = generateMask('address');
        reverseMap.set(mask, match);
        return mask;
    });

    // 4. Keep only first names - replace "Juan Pérez" with "Juan"
    sanitized = sanitized.replace(FULL_NAME_REGEX, (match, firstName, lastName) => {
        // Only mask if it looks like a real full name (not common phrases)
        const commonWords = ['de', 'la', 'el', 'los', 'las', 'del'];
        if (commonWords.includes(firstName.toLowerCase()) || commonWords.includes(lastName.toLowerCase())) {
            return match; // Keep common phrases like "de la"
        }

        const mask = generateMask('name');
        reverseMap.set(mask, match);
        return firstName; // Keep first name only
    });

    return sanitized;
}

/**
 * Sanitize an array of parsed messages
 */
export function sanitizeChat(messages: any[]): SanitizedData {
    maskCounter = 0; // Reset counter
    const reverseMap = new Map<string, string>();

    const sanitizedMessages = messages.map(msg => ({
        ...msg,
        content: sanitizeMessage(msg.content, reverseMap),
        sender: sanitizeSenderName(msg.sender, reverseMap)
    }));

    console.log('[PrivacyFilter] Sanitized', reverseMap.size, 'PII items');

    return {
        messages: sanitizedMessages,
        reverseMap
    };
}

/**
 * Sanitize sender name (keep first name only)
 */
function sanitizeSenderName(sender: string, reverseMap: Map<string, string>): string {
    // If sender is a phone number, mask it
    if (PHONE_REGEX.test(sender)) {
        const mask = generateMask('phone');
        reverseMap.set(mask, sender);
        return mask;
    }

    // If sender is full name, keep first name
    const match = sender.match(FULL_NAME_REGEX);
    if (match) {
        const firstName = match[1];
        const mask = generateMask('name');
        reverseMap.set(mask, sender);
        return firstName;
    }

    return sender;
}

/**
 * Restore PII in text (for displaying to user)
 */
export function restorePII(text: string, reverseMap: Map<string, string>): string {
    let restored = text;

    reverseMap.forEach((original, mask) => {
        restored = restored.replace(new RegExp(mask, 'g'), original);
    });

    return restored;
}

/**
 * Check if text contains PII
 */
export function containsPII(text: string): boolean {
    return PHONE_REGEX.test(text) ||
        EMAIL_REGEX.test(text) ||
        ADDRESS_REGEX.test(text) ||
        FULL_NAME_REGEX.test(text);
}
