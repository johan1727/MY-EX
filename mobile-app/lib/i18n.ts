import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'es';

interface Translation {
    [key: string]: {
        en: string;
        es: string;
    };
}

export const translations = {
    // Menu
    menu_chat: { en: 'Chat', es: 'Chat' },
    menu_tools: { en: 'Tools', es: 'Herramientas' },
    menu_progress: { en: 'Progress', es: 'Progreso' },
    menu_memories: { en: 'Memories', es: 'Memorias' },
    menu_profile: { en: 'Profile', es: 'Perfil' },
    menu_language: { en: 'Language', es: 'Idioma' },

    // Chat
    chat_placeholder: { en: 'Message Ex Coach...', es: 'Escribe a tu Ex Coach...' },
    chat_welcome_title: { en: 'Start Your Healing Journey', es: 'Inicia tu Sanación' },
    chat_welcome_subtitle: { en: "Share what's on your mind. I'm here to listen, support, and guide you through this.", es: 'Comparte lo que sientes. Estoy aquí para escucharte, apoyarte y guiarte.' },
    chat_disclaimer: { en: 'AI can make mistakes. Verify important information.', es: 'La IA puede cometer errores. Verifica la información importante.' },

    // Tools
    tools_title: { en: 'Healing Tools', es: 'Herramientas de Sanación' },
    tools_subtitle: { en: 'Powerful tools to support your journey', es: 'Herramientas poderosas para tu viaje' },
    tool_decoder_title: { en: 'Message Decoder', es: 'Decodificador de Mensajes' },
    tool_decoder_desc: { en: 'Analyze messages from your ex and get honest insights', es: 'Analiza mensajes de tu ex y obtén una perspectiva honesta' },
    tool_panic_title: { en: 'Panic Button', es: 'Botón de Pánico' },
    tool_panic_desc: { en: 'Emergency support when you want to reach out', es: 'Apoyo de emergencia cuando quieras contactarle' },
    tool_journal_title: { en: 'Mood Journal', es: 'Diario de Ánimo' },
    tool_journal_desc: { en: 'Track your emotions and identify patterns', es: 'Registra tus emociones e identifica patrones' },

    // Profile
    profile_title: { en: 'Profile', es: 'Perfil' },
    profile_days_strong: { en: 'Days Strong', es: 'Días Fuerte' },
    profile_member_since: { en: 'Member Since', es: 'Miembro Desde' },
    profile_account_info: { en: 'Account Information', es: 'Información de Cuenta' },
    profile_email: { en: 'Email', es: 'Correo' },
    profile_joined: { en: 'Joined', es: 'Unido' },
    profile_account_type: { en: 'Account Type', es: 'Tipo de Cuenta' },
    profile_guest: { en: 'Guest', es: 'Invitado' },
    profile_registered: { en: 'Registered', es: 'Registrado' },
    profile_sign_out: { en: 'Sign Out', es: 'Cerrar Sesión' },

    // Progress
    progress_title: { en: 'Your Progress', es: 'Tu Progreso' },
    progress_streak: { en: 'No Contact Streak', es: 'Racha de No Contacto' },
    progress_days_strong: { en: 'days strong 💪', es: 'días fuerte 💪' },
    progress_set_date: { en: 'Set Breakup Date', es: 'Fijar Fecha de Ruptura' },
    progress_update_date: { en: 'Update Date', es: 'Actualizar Fecha' },
    progress_stats: { en: 'Statistics', es: 'Estadísticas' },
    progress_total_msgs: { en: 'Total Messages', es: 'Mensajes Totales' },
    progress_ai_convos: { en: 'AI Conversations', es: 'Conversaciones con IA' },
    progress_chat_actions: { en: 'Chat Actions', es: 'Acciones de Chat' },
    progress_export: { en: 'Export Chat', es: 'Exportar Chat' },
    progress_clear: { en: 'Clear History', es: 'Borrar Historial' },

    // Memories
    memories_title: { en: 'Memory Bank', es: 'Banco de Memoria' },
    memories_subtitle: { en: 'What I remember about your relationship', es: 'Lo que recuerdo de tu relación' },
    memories_empty: { en: 'No memories yet', es: 'Aún no hay memorias' },
    memories_empty_sub: { en: "As we chat, I'll remember key details to help you better.", es: "Al chatear, recordaré detalles clave para ayudarte mejor." },
};

interface LanguageState {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof translations) => string;
}

export const useLanguage = create<LanguageState>()(
    persist(
        (set, get) => ({
            language: 'en',
            setLanguage: (lang) => set({ language: lang }),
            t: (key) => {
                const lang = get().language;
                return translations[key]?.[lang] || key;
            },
        }),
        {
            name: 'language-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
