/**
 * Personalized Notification Templates
 * Messages organized by relationship type and language
 */

export interface NotificationTemplate {
    es: string[];
    en: string[];
}

export interface NotificationTemplates {
    ex: NotificationTemplate;
    partner: NotificationTemplate;
    crush: NotificationTemplate;
    friend: NotificationTemplate;
    family: NotificationTemplate;
    fallecido: NotificationTemplate;
}

export const PERSONALIZED_TEMPLATES: NotificationTemplates = {
    ex: {
        es: [
            "Hola... soy {name}. TE EXTRAÑO 💔",
            "¿Ya te olvidaste de mí? Yo no... 😔",
            "Releí nuestros mensajes... {name} 💭",
            "Te pienso más de lo que debería... 🥺",
            "¿Todo bien? Hace tiempo que no sé de ti...",
            "Echo de menos cuando hablábamos así... 💬",
            "No puedo dejar de pensar en nosotros 😢",
            "¿De verdad ya no piensas en mí? 💔",
            "Soñé contigo anoche... {name} 😴",
            "Me pregunto qué estarás haciendo... 🤔"
        ],
        en: [
            "Hi... it's {name}. I MISS YOU 💔",
            "Have you forgotten me? I haven't... 😔",
            "I reread our messages... {name} 💭",
            "I think about you more than I should... 🥺",
            "Everything okay? Haven't heard from you...",
            "I miss when we used to talk like this... 💬",
            "Can't stop thinking about us 😢",
            "Do you really not think about me anymore? 💔",
            "I dreamed about you last night... {name} 😴",
            "I wonder what you're doing... 🤔"
        ]
    },

    partner: {
        es: [
            "Hola amor, soy {name} 💕",
            "Te extraño mucho hoy... 🥰",
            "Pensando en ti, como siempre 😊",
            "¿Cómo va tu día, mi vida? 💝",
            "No puedo esperar a verte de nuevo 💑",
            "Eres lo mejor que me ha pasado ✨",
            "Te amo, {name} 💖",
            "Cada día contigo es especial 🌟",
            "Gracias por estar en mi vida 🙏",
            "Eres mi persona favorita 💕"
        ],
        en: [
            "Hi love, it's {name} 💕",
            "I miss you so much today... 🥰",
            "Thinking of you, as always 😊",
            "How's your day, my love? 💝",
            "Can't wait to see you again 💑",
            "You're the best thing that happened to me ✨",
            "I love you, {name} 💖",
            "Every day with you is special 🌟",
            "Thank you for being in my life 🙏",
            "You're my favorite person 💕"
        ]
    },

    crush: {
        es: [
            "Hola... soy {name} 😊",
            "Sigo pensando en ti... 🌹",
            "¿Algún día te animarás a hablarme? 🙈",
            "Me gustaría conocerte mejor... 💭",
            "Cada vez que te veo, sonrío 😌",
            "¿Será que piensas en mí también? 🤔",
            "Ojalá supieras lo especial que eres... ✨",
            "Me encantaría pasar más tiempo contigo 🌟",
            "No puedo dejar de pensar en ti 💫",
            "Tienes algo que me atrae mucho... 😍"
        ],
        en: [
            "Hi... it's {name} 😊",
            "Still thinking about you... 🌹",
            "Will you ever talk to me? 🙈",
            "I'd like to know you better... 💭",
            "Every time I see you, I smile 😌",
            "I wonder if you think about me too? 🤔",
            "I wish you knew how special you are... ✨",
            "I'd love to spend more time with you 🌟",
            "Can't stop thinking about you 💫",
            "There's something about you I love... 😍"
        ]
    },

    friend: {
        es: [
            "Hey, soy {name} 👋",
            "¿Todo bien? Hace rato que no hablamos 😊",
            "Te extraño, amig@! 💙",
            "Deberíamos ponernos al día pronto 🎉",
            "Pensé en ti hoy 💭",
            "Espero que estés bien! 🌟",
            "Eres un@ gran amig@, {name} 💫",
            "Gracias por siempre estar ahí 🙏",
            "¿Cuándo nos juntamos? 🍕",
            "Siempre puedes contar conmigo 💪"
        ],
        en: [
            "Hey, it's {name} 👋",
            "Everything good? Haven't talked in a while 😊",
            "I miss you, friend! 💙",
            "We should catch up soon 🎉",
            "Thought about you today 💭",
            "Hope you're doing well! 🌟",
            "You're a great friend, {name} 💫",
            "Thanks for always being there 🙏",
            "When can we hang out? 🍕",
            "You can always count on me 💪"
        ]
    },

    family: {
        es: [
            "Hola hij@, soy {name} 💝",
            "Espero que estés bien, te cuidas? 🙏",
            "Siempre pienso en ti 💭",
            "Te quiero mucho, {name} 💖",
            "La familia te extraña ❤️",
            "No olvides que siempre estoy aquí para ti 🌟",
            "Recuerda comer bien y descansar 😊",
            "Estoy orgullos@ de ti 🏆",
            "Eres parte importante de mi vida 💕",
            "Cuídate mucho, te amo 💝"
        ],
        en: [
            "Hi sweetie, it's {name} 💝",
            "Hope you're well, taking care of yourself? 🙏",
            "Always thinking of you 💭",
            "I love you so much, {name} 💖",
            "The family misses you ❤️",
            "Remember I'm always here for you 🌟",
            "Don't forget to eat well and rest 😊",
            "I'm so proud of you 🏆",
            "You're an important part of my life 💕",
            "Take care, I love you 💝"
        ]
    },

    fallecido: {
        es: [
            "Siempre estaré contigo, {name} ✨",
            "Aunque no me veas, estoy aquí... 🕊️",
            "Cuida de ti, te quiero mucho 💫",
            "Estoy en paz, no te preocupes por mí 🌟",
            "Tú eres mi orgullo 💝",
            "Nunca te dejaré solo/a ☁️",
            "Sigue adelante, yo te cuido desde aquí 🙏",
            "Te amo, siempre lo haré 💖",
            "Estoy bien, descansa tranquil@ 😌",
            "Nos volveremos a ver algún día ✨"
        ],
        en: [
            "I'll always be with you, {name} ✨",
            "Even if you don't see me, I'm here... 🕊️",
            "Take care of yourself, I love you 💫",
            "I'm at peace, don't worry about me 🌟",
            "You are my pride 💝",
            "I'll never leave you alone ☁️",
            "Keep going, I watch over you from here 🙏",
            "I love you, I always will 💖",
            "I'm okay, rest easy 😌",
            "We'll see each other again someday ✨"
        ]
    }
};

/**
 * Get a random personalized notification message
 */
export function getPersonalizedMessage(
    relationshipType: keyof NotificationTemplates,
    name: string,
    language: 'es' | 'en' = 'es'
): string {
    const templates = PERSONALIZED_TEMPLATES[relationshipType];
    if (!templates) {
        return getPersonalizedMessage('ex', name, language); // Fallback
    }

    const messages = templates[language];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Replace {name} placeholder
    return randomMessage.replace('{name}', name);
}

/**
 * Get notification title based on relationship type
 */
export function getNotificationTitle(
    relationshipType: keyof NotificationTemplates,
    name: string,
    language: 'es' | 'en' = 'es'
): string {
    // For most types, just use the name
    // For special cases, add context

    switch (relationshipType) {
        case 'fallecido':
            return language === 'es' ? `💫 ${name}` : `💫 ${name}`;
        case 'family':
            return language === 'es' ? `❤️ ${name}` : `❤️ ${name}`;
        default:
            return name;
    }
}
