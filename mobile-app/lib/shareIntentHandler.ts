import * as FileSystem from 'expo-file-system';
import { parseWhatsAppExport, ParsedMessage } from './exSimulator';
import { intelligentTokenSampling } from './messageSampling';

export interface SharedFileResult {
    success: boolean;
    messages?: ParsedMessage[];
    rawText?: string;
    error?: string;
    fileName?: string;
}

/**
 * Process a shared file from WhatsApp export
 * Handles both .txt and .zip files
 */
export async function processSharedFile(fileUri: string, fileName?: string): Promise<SharedFileResult> {
    try {
        console.log('[ShareIntent] Processing shared file:', fileUri, fileName);

        // Determine file type
        const isZip = fileName?.toLowerCase().endsWith('.zip') || fileUri.toLowerCase().includes('.zip');

        if (isZip) {
            // For zip files, we'd need to extract - for now just inform user
            return {
                success: false,
                error: 'Por favor exporta el chat sin archivos multimedia. Selecciona "Sin archivos" al exportar.'
            };
        }

        // Read the text file
        const text = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.UTF8
        });

        if (!text || text.length < 100) {
            return {
                success: false,
                error: 'El archivo está vacío o es muy corto.'
            };
        }

        console.log('[ShareIntent] File size:', text.length, 'chars');

        // Parse WhatsApp messages
        const messages = parseWhatsAppExport(text);

        if (messages.length < 5) {
            return {
                success: false,
                error: 'No se encontraron suficientes mensajes de WhatsApp en el archivo.'
            };
        }

        // Apply intelligent sampling
        const { messages: sampledMessages } = intelligentTokenSampling(messages);

        console.log('[ShareIntent] Parsed', sampledMessages.length, 'messages');

        return {
            success: true,
            messages: sampledMessages,
            rawText: text,
            fileName
        };

    } catch (error: any) {
        console.error('[ShareIntent] Error processing file:', error);
        return {
            success: false,
            error: error.message || 'Error procesando el archivo'
        };
    }
}

/**
 * Check if the app was opened via share intent
 */
export function isShareIntent(url: string | null): boolean {
    // Android share intents typically have content:// or file:// URIs
    if (!url) return false;
    return url.startsWith('content://') ||
        url.startsWith('file://') ||
        url.includes('text/plain');
}
