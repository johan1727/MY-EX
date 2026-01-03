/**
 * RELATIONSHIP WIKI - Entity Extractor
 * Feature #3: Extracts entities (pets, places, dates, people) from chat
 */

import type { ParsedMessage } from './exSimulator';

export interface RelationshipEntity {
    entityType: 'pet' | 'place' | 'date' | 'person' | 'event' | 'object';
    name: string;
    context: string;
    firstMentionedAt?: Date;
    frequency: number;
    importanceScore: number;
}

/**
 * Extract entities using AI analysis
 */
export async function extractEntities(
    messages: ParsedMessage[],
    exName: string,
    model: any
): Promise<RelationshipEntity[]> {
    // Sample messages for analysis (first 1000 + middle 500 + last 500)
    const sampleMessages = [
        ...messages.slice(0, Math.min(1000, messages.length / 3)),
        ...messages.slice(
            Math.floor(messages.length / 2) - 250,
            Math.floor(messages.length / 2) + 250
        ),
        ...messages.slice(-Math.min(500, messages.length / 3))
    ];

    const chatText = sampleMessages
        .map(m => `${m.sender}: ${m.content}`)
        .join('\n');

    const prompt = `Analiza este chat y extrae TODAS las entidades importantes mencionadas.

CHAT:
${chatText.slice(0, 15000)} // Limit to avoid token overflow

Extrae en formato JSON las siguientes entidades:

{
  "pets": [
    {"name": "Nombre", "context": "Descripción breve", "frequency": número_de_menciones}
  ],
  "places": [
    {"name": "Nombre del lugar", "context": "Qué pasó ahí", "frequency": número}
  ],
  "dates": [
    {"name": "Evento/Fecha", "context": "Qué se celebra", "frequency": número}
  ],
  "people": [
    {"name": "Nombre", "context": "Relación con ellos", "frequency": número}
  ],
  "events": [
    {"name": "Evento importante", "context": "Descripción", "frequency": número}
  ],
  "objects": [
    {"name": "Objeto significativo", "context": "Por qué es importante", "frequency": número}
  ]
}

REGLAS:
- Solo incluye entidades mencionadas 2+ veces
- NO incluyas a ${exName} ni nombres genéricos (mamá, papá)
- Usa el nombre EXACTO como aparece en el chat
- frequency = cuántas veces aproximadamente se menciona
- context = máximo 50 palabras

Responde SOLO con el JSON, sin explicaciones.`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Parse JSON response
        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleaned);

        // Convert to RelationshipEntity format
        const entities: RelationshipEntity[] = [];

        // Add pets
        if (data.pets && Array.isArray(data.pets)) {
            data.pets.forEach((item: any) => {
                entities.push({
                    entityType: 'pet',
                    name: item.name,
                    context: item.context || '',
                    frequency: item.frequency || 1,
                    importanceScore: 0.7 // Pets are generally important
                });
            });
        }

        // Add places
        if (data.places && Array.isArray(data.places)) {
            data.places.forEach((item: any) => {
                entities.push({
                    entityType: 'place',
                    name: item.name,
                    context: item.context || '',
                    frequency: item.frequency || 1,
                    importanceScore: 0.6
                });
            });
        }

        // Add dates
        if (data.dates && Array.isArray(data.dates)) {
            data.dates.forEach((item: any) => {
                entities.push({
                    entityType: 'date',
                    name: item.name,
                    context: item.context || '',
                    frequency: item.frequency || 1,
                    importanceScore: 0.8 // Dates are very important
                });
            });
        }

        // Add people
        if (data.people && Array.isArray(data.people)) {
            data.people.forEach((item: any) => {
                entities.push({
                    entityType: 'person',
                    name: item.name,
                    context: item.context || '',
                    frequency: item.frequency || 1,
                    importanceScore: 0.5
                });
            });
        }

        // Add events
        if (data.events && Array.isArray(data.events)) {
            data.events.forEach((item: any) => {
                entities.push({
                    entityType: 'event',
                    name: item.name,
                    context: item.context || '',
                    frequency: item.frequency || 1,
                    importanceScore: 0.7
                });
            });
        }

        // Add objects
        if (data.objects && Array.isArray(data.objects)) {
            data.objects.forEach((item: any) => {
                entities.push({
                    entityType: 'object',
                    name: item.name,
                    context: item.context || '',
                    frequency: item.frequency || 1,
                    importanceScore: 0.4
                });
            });
        }

        console.log('[EntityExtractor] Extracted', entities.length, 'entities');
        return entities;

    } catch (error) {
        console.error('[EntityExtractor] Failed:', error);
        return [];
    }
}

/**
 * Save entities to Supabase
 */
export async function saveEntitiesToSupabase(
    entities: RelationshipEntity[],
    profileId: string,
    userId: string,
    supabase: any
): Promise<void> {
    if (entities.length === 0) return;

    try {
        const rows = entities.map(entity => ({
            profile_id: profileId,
            user_id: userId,
            entity_type: entity.entityType,
            name: entity.name,
            context: entity.context,
            frequency: entity.frequency,
            importance_score: entity.importanceScore
        }));

        const { error } = await supabase
            .from('relationship_entities')
            .insert(rows);

        if (error) throw error;

        console.log('[EntityExtractor] Saved', entities.length, 'entities to Supabase');
    } catch (error) {
        console.error('[EntityExtractor] Save failed:', error);
        throw error;
    }
}

/**
 * Load entities from Supabase
 */
export async function loadEntitiesFromSupabase(
    profileId: string,
    supabase: any
): Promise<RelationshipEntity[]> {
    try {
        const { data, error } = await supabase
            .from('relationship_entities')
            .select('*')
            .eq('profile_id', profileId)
            .order('importance_score', { ascending: false });

        if (error) throw error;

        return (data || []).map((row: any) => ({
            entityType: row.entity_type,
            name: row.name,
            context: row.context,
            frequency: row.frequency,
            importanceScore: row.importance_score,
            firstMentionedAt: row.first_mentioned_at ? new Date(row.first_mentioned_at) : undefined
        }));
    } catch (error) {
        console.error('[EntityExtractor] Load failed:', error);
        return [];
    }
}
