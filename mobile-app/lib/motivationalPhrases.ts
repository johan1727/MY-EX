export const motivationalPhrases = {
    es: {
        // Fase temprana (0-30 días)
        early: [
            "Cada día sin contacto es un paso hacia tu sanación. Estás siendo valiente.",
            "El dolor que sientes hoy es la fuerza que tendrás mañana.",
            "No estás perdiendo a alguien, te estás encontrando a ti mismo/a.",
            "Llorar no es debilidad. Es valentía para sentir y sanar.",
            "Hoy elige amarte más de lo que extrañas a alguien que te dejó ir.",
            "Tu valor no disminuye por la incapacidad de alguien de verlo.",
            "Está bien no estar bien. La sanación no es lineal.",
            "Cada lágrima es un paso más cerca de tu mejor versión.",
            "No contactar no es rendirse, es elegirte a ti.",
            "Mereces alguien que elija quedarse, no alguien que dude en irse."
        ],
        // Fase media (31-90 días)
        middle: [
            "Mira cuánto has avanzado. Estás más fuerte de lo que crees.",
            "Tu futuro es más brillante que cualquier pasado.",
            "Cada día sin contacto es una inversión en tu felicidad futura.",
            "Estás reconstruyéndote, y eso es hermoso.",
            "El amor propio es el mejor tipo de amor.",
            "No estás empezando de cero, estás empezando con experiencia.",
            "Tu paz mental vale más que cualquier relación.",
            "Estás aprendiendo a ser feliz contigo mismo/a, y eso es poderoso.",
            "Las mejores cosas están por venir. Confía en el proceso.",
            "Cada día eres una versión más sabia y fuerte de ti."
        ],
        // Fase avanzada (90+ días)
        advanced: [
            "Mira todo lo que has logrado. Eres increíble.",
            "Tu crecimiento es inspirador. Sigue brillando.",
            "Has transformado el dolor en sabiduría. Eso es poder.",
            "Estás listo/a para escribir un nuevo capítulo hermoso.",
            "Tu felicidad ya no depende de nadie más. Eres libre.",
            "Has sanado más de lo que creías posible. Celebra eso.",
            "El amor que mereces está en camino. Mientras tanto, ámate.",
            "Tu historia de superación inspirará a otros.",
            "Has convertido tu ruptura en un despertar. Eso es transformación.",
            "Eres la prueba viviente de que se puede sanar y ser feliz de nuevo."
        ],
        // Recordatorios
        reminders: [
            "Recuerda: No contactar es cuidarte, no castigarte.",
            "Hoy es un buen día para elegirte a ti primero.",
            "Tu progreso merece ser celebrado. ¿Qué logro pequeño tuviste hoy?",
            "Escribe en tu diario hoy. Procesar tus emociones es sanar.",
            "¿Has hecho algo por ti hoy? Mereces tu propio amor.",
            "Recuerda por qué empezaste el no contacto. Esa razón sigue siendo válida.",
            "Tu ex no define tu valor. Tú lo defines.",
            "Hoy, sé amable contigo. Estás haciendo lo mejor que puedes.",
            "¿Necesitas hablar? Tu Ex Coach está aquí para ti.",
            "Celebra tus días sin contacto. Cada uno cuenta."
        ]
    },
    en: {
        early: [
            "Every day of no contact is a step toward healing. You're being brave.",
            "The pain you feel today is the strength you'll have tomorrow.",
            "You're not losing someone, you're finding yourself.",
            "Crying isn't weakness. It's courage to feel and heal.",
            "Today, choose to love yourself more than you miss someone who let you go.",
            "Your value doesn't decrease by someone's inability to see it.",
            "It's okay not to be okay. Healing isn't linear.",
            "Every tear is one step closer to your best self.",
            "No contact isn't giving up, it's choosing yourself.",
            "You deserve someone who chooses to stay, not someone who hesitates to leave."
        ],
        middle: [
            "Look how far you've come. You're stronger than you think.",
            "Your future is brighter than any past.",
            "Every day of no contact is an investment in your future happiness.",
            "You're rebuilding yourself, and that's beautiful.",
            "Self-love is the best kind of love.",
            "You're not starting from zero, you're starting with experience.",
            "Your peace of mind is worth more than any relationship.",
            "You're learning to be happy with yourself, and that's powerful.",
            "The best things are yet to come. Trust the process.",
            "Every day you're a wiser, stronger version of yourself."
        ],
        advanced: [
            "Look at everything you've achieved. You're amazing.",
            "Your growth is inspiring. Keep shining.",
            "You've transformed pain into wisdom. That's power.",
            "You're ready to write a beautiful new chapter.",
            "Your happiness no longer depends on anyone else. You're free.",
            "You've healed more than you thought possible. Celebrate that.",
            "The love you deserve is on its way. Meanwhile, love yourself.",
            "Your comeback story will inspire others.",
            "You've turned your breakup into an awakening. That's transformation.",
            "You're living proof that you can heal and be happy again."
        ],
        reminders: [
            "Remember: No contact is self-care, not punishment.",
            "Today is a good day to choose yourself first.",
            "Your progress deserves to be celebrated. What small win did you have today?",
            "Write in your journal today. Processing emotions is healing.",
            "Have you done something for yourself today? You deserve your own love.",
            "Remember why you started no contact. That reason is still valid.",
            "Your ex doesn't define your worth. You do.",
            "Today, be kind to yourself. You're doing the best you can.",
            "Need to talk? Your Ex Coach is here for you.",
            "Celebrate your no-contact days. Every one counts."
        ]
    }
};

export function getRandomPhrase(language: 'es' | 'en', daysSinceBreakup: number): string {
    const phrases = motivationalPhrases[language];

    let category: 'early' | 'middle' | 'advanced' | 'reminders';

    if (daysSinceBreakup < 30) {
        category = 'early';
    } else if (daysSinceBreakup < 90) {
        category = 'middle';
    } else {
        category = 'advanced';
    }

    // 70% chance of motivational phrase, 30% chance of reminder
    const useReminder = Math.random() < 0.3;
    const selectedCategory = useReminder ? 'reminders' : category;

    const categoryPhrases = phrases[selectedCategory];
    const randomIndex = Math.floor(Math.random() * categoryPhrases.length);

    return categoryPhrases[randomIndex];
}

export function getStreakCelebration(days: number, language: 'es' | 'en'): string | null {
    const milestones = [1, 3, 7, 14, 21, 30, 60, 90, 180, 365];

    if (!milestones.includes(days)) return null;

    const celebrations = {
        es: {
            1: "🎉 ¡Primer día sin contacto! El viaje de mil millas comienza con un paso.",
            3: "💪 ¡3 días! Estás demostrando fuerza. Sigue así.",
            7: "🌟 ¡Una semana completa! Tu determinación es admirable.",
            14: "🔥 ¡2 semanas! Estás en fuego. La sanación está sucediendo.",
            21: "✨ ¡21 días! Dicen que se necesitan 21 días para formar un hábito. Lo estás logrando.",
            30: "🎊 ¡UN MES! Este es un logro enorme. Estás increíble.",
            60: "🏆 ¡2 MESES! Tu transformación es inspiradora.",
            90: "👑 ¡3 MESES! Eres un guerrero/a de la sanación.",
            180: "🌈 ¡6 MESES! Mira cuánto has crecido. Eres imparable.",
            365: "🎆 ¡UN AÑO COMPLETO! Has renacido. Tu historia es de pura superación."
        },
        en: {
            1: "🎉 First day of no contact! The journey of a thousand miles begins with one step.",
            3: "💪 3 days! You're showing strength. Keep going.",
            7: "🌟 One full week! Your determination is admirable.",
            14: "🔥 2 weeks! You're on fire. Healing is happening.",
            21: "✨ 21 days! They say it takes 21 days to form a habit. You're doing it.",
            30: "🎊 ONE MONTH! This is a huge achievement. You're amazing.",
            60: "🏆 2 MONTHS! Your transformation is inspiring.",
            90: "👑 3 MONTHS! You're a healing warrior.",
            180: "🌈 6 MONTHS! Look how much you've grown. You're unstoppable.",
            365: "🎆 ONE FULL YEAR! You've been reborn. Your story is pure triumph."
        }
    };

    return celebrations[language][days as keyof typeof celebrations.es];
}
