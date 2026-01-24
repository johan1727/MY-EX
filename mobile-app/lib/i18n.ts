import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type Language = 'en' | 'es';

interface Translation {
    [key: string]: {
        en: string;
        es: string;
    };
}

export const translations = {
    // General
    welcome: { en: 'Welcome', es: 'Bienvenido' },
    skip: { en: 'Skip', es: 'Saltar' },
    loading: { en: 'Loading...', es: 'Cargando...' },

    // Menu
    menu_chat: { en: 'Chat', es: 'Chat' },
    menu_tools: { en: 'Tools', es: 'Herramientas' },
    menu_progress: { en: 'Progress', es: 'Progreso' },
    menu_memories: { en: 'Memories', es: 'Memorias' },
    menu_profile: { en: 'Profile', es: 'Perfil' },
    menu_language: { en: 'Language', es: 'Idioma' },

    // Preferences
    pref_title: { en: 'Settings', es: 'Ajustes' },
    pref_group_general: { en: 'GENERAL', es: 'GENERAL' },
    pref_group_data: { en: 'DATA & PRIVACY', es: 'DATOS Y PRIVACIDAD' },
    pref_group_legal: { en: 'LEGAL', es: 'LEGAL' },
    pref_group_danger: { en: 'DANGER ZONE', es: 'ZONA PELIGROSA' },
    pref_language: { en: 'Language', es: 'Idioma' },
    pref_notifications: { en: 'Notifications', es: 'Notificaciones' },
    pref_haptics: { en: 'Haptics & Sounds', es: 'Vibraciones y Sonidos' },
    pref_export: { en: 'Export Data', es: 'Exportar Datos' },
    pref_privacy_cookies: { en: 'Privacy & Cookies', es: 'Privacidad y Cookies' },
    pref_privacy_policy: { en: 'Privacy Policy', es: 'Política de Privacidad' },
    pref_terms: { en: 'Terms of Service', es: 'Términos de Servicio' },
    pref_clear_cache: { en: 'Clear Cache', es: 'Borrar Caché' },
    pref_delete_account: { en: 'Delete Account', es: 'Eliminar Cuenta' },
    pref_modal_lang_title: { en: 'Select Language', es: 'Seleccionar Idioma' },
    pref_modal_cancel: { en: 'Cancel', es: 'Cancelar' },

    // Home/Simulator
    home_title: { en: 'Pattern Analysis', es: 'Análisis de Patrones' },
    home_new_sim: { en: 'New Simulation', es: 'Nueva Simulación' },
    home_your_profiles: { en: 'Your Profiles', es: 'Tus Perfiles' },
    home_no_profiles: { en: 'No profiles yet', es: 'Aún no hay perfiles' },
    home_create_first: { en: 'Create your first ex profile', es: 'Crea tu primer perfil de ex' },
    home_import_chat: { en: 'Import Chat', es: 'Importar Chat' },
    home_view_past_analysis: {
        en: 'View past analyses',
        es: 'Ver análisis anteriores',
    },
    // Paywall
    paywall_title: { en: 'Premium Plans', es: 'Planes Premium' },
    paywall_hero_title: { en: 'Choose your Plan', es: 'Elige tu Plan' },
    paywall_hero_subtitle: { en: 'Unlock the full power of REMI', es: 'Desbloquea todo el poder de REMI' },
    paywall_monthly: { en: 'Monthly', es: 'Mensual' },
    paywall_yearly: { en: 'Yearly', es: 'Anual' },
    paywall_popular: { en: 'MOST POPULAR', es: 'MÁS POPULAR' },
    paywall_best_value: { en: 'BEST VALUE', es: 'MEJOR VALOR' },
    paywall_free_trial: { en: 'FREE', es: 'GRATIS' },
    paywall_after_trial: { en: 'after trial', es: 'después del trial' },
    paywall_year: { en: 'year', es: 'año' },
    paywall_month: { en: 'month', es: 'mes' },
    paywall_unavailable: { en: 'Unavailable', es: 'No disponible' },
    paywall_start_trial: { en: 'Start Free Trial', es: 'Comenzar Prueba Gratis' },
    paywall_choose: { en: 'Choose', es: 'Elegir' },
    paywall_disclaimer: { en: 'Auto-renews. Cancel anytime via Google Play.', es: 'Se renovará automáticamente. Cancela cuando quieras desde Google Play.' },

    // Plan Features
    plan_explorer_1: { en: 'Higher usage limits', es: 'Límites más amplios de uso' },
    plan_explorer_2: { en: 'Create multiple profiles', es: 'Crea múltiples perfiles' },
    plan_explorer_3: { en: 'Deep pattern analysis', es: 'Análisis profundo de patrones' },
    plan_explorer_4: { en: 'REMI remembers full history', es: 'REMI recuerda tu historia completa' },

    plan_warrior_1: { en: 'Extended uninterrupted use', es: 'Uso extendido sin interrupciones' },
    plan_warrior_2: { en: 'Longer detailed responses', es: 'Respuestas más largas y detalladas' },
    plan_warrior_3: { en: 'Message decoder included', es: 'Decodificador de mensajes incluido' },
    plan_warrior_4: { en: 'Priority responses', es: 'Respuestas prioritarias' },

    plan_phoenix_1: { en: '✨ Highest limits', es: '✨ Los límites más altos' },
    plan_phoenix_2: { en: 'Personalized advanced AI coaching', es: 'Coaching personalizado con IA avanzada' },
    plan_phoenix_3: { en: '24/7 Priority VIP support', es: 'Soporte VIP prioritario 24/7' },
    plan_phoenix_4: { en: 'Exclusive access to beta features', es: 'Acceso exclusivo a funciones beta' },

    // Alerts
    alert_account_required_title: { en: 'Account Required', es: 'Cuenta requerida' },
    alert_account_required_msg: { en: 'To subscribe to a premium plan, you need an account. Your subscription will be saved to your account for access on any device.', es: 'Para suscribirte a un plan premium, necesitas tener una cuenta. Tu suscripción se guardará en tu cuenta para que puedas acceder desde cualquier dispositivo.' },
    alert_cancel: { en: 'Cancel', es: 'Cancelar' },
    alert_signin: { en: 'Sign In', es: 'Iniciar sesión' },
    alert_plan_unavailable_title: { en: 'Plan Unavailable', es: 'Plan no disponible' },
    alert_plan_unavailable_msg: { en: 'This plan is currently unavailable. Please try another plan.', es: 'Este plan no está disponible actualmente. Por favor intenta con otro plan.' },
    alert_purchase_success_title: { en: 'Purchase Successful!', es: '¡Compra exitosa!' },
    alert_purchase_success_msg: { en: 'Your subscription is active. Enjoy all premium features!', es: 'Tu suscripción ha sido activada. ¡Disfruta de todas las funciones premium!' },
    alert_purchase_error_title: { en: 'Purchase Error', es: 'Error en la compra' },
    alert_error_generic: { en: 'There was a problem with the purchase. Please try again.', es: 'Hubo un problema con la compra. Intenta de nuevo.' },
    alert_loading_plans: { en: 'Loading plans...', es: 'Cargando planes...' },
    home_pattern_analysis: { en: 'Pattern Analysis', es: 'Análisis de Patrones' },
    home_analysis_subtitle: { en: 'Analyze your past relationship dynamics to identify patterns and heal.', es: 'Analiza la dinámica de tu relación pasada para identificar patrones y sanar.' },

    // Chat
    chat_placeholder: { en: 'Type a message...', es: 'Escribe un mensaje...' },
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
    profile_sign_in: { en: 'Sign In', es: 'Iniciar Sesión' },
    profile_preferences: { en: 'Preferences', es: 'Preferencias' },
    profile_export_data: { en: 'Export Data', es: 'Exportar Datos' },
    profile_delete_account: { en: 'Delete Account', es: 'Eliminar Cuenta' },
    profile_help_support: { en: 'Help & Support', es: 'Ayuda y Soporte' },
    profile_badges: { en: 'Badges', es: 'Insignias' },

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

    // Drawer Menu
    drawer_new_simulation: { en: 'New simulation', es: 'Nueva simulación' },
    drawer_your_profiles: { en: 'Your profiles', es: 'Tus perfiles' },
    drawer_no_profiles: { en: 'No profiles yet. Create one above.', es: 'No hay perfiles aún. Crea uno nuevo arriba.' },
    drawer_my_profile: { en: 'My Profile', es: 'Mi Perfil' },
    drawer_preferences: { en: 'Preferences', es: 'Preferencias' },
    drawer_theme_light: { en: 'Light Mode', es: 'Modo Claro' },
    drawer_theme_dark: { en: 'Dark Mode', es: 'Modo Oscuro' },
    drawer_switch_account: { en: 'Switch account', es: 'Cambiar cuenta' },
    drawer_privacy: { en: 'Privacy', es: 'Privacidad' },
    drawer_premium_plans: { en: 'View Premium Plans', es: 'Ver Planes Premium' },
    drawer_sign_in: { en: 'Sign in', es: 'Iniciar sesión' },
    drawer_sign_out: { en: 'Sign out', es: 'Cerrar sesión' },
    drawer_guest: { en: 'Guest', es: 'Invitado' },
    drawer_free_plan: { en: 'Free Plan', es: 'Plan Gratuito' },
    drawer_delete: { en: 'Delete', es: 'Eliminar' },
    drawer_tap_to_chat: { en: 'Tap to chat →', es: 'Pulsa para chatear →' },
    drawer_coach_subtitle: { en: 'Your safe space →', es: 'Tu espacio seguro →' },

    // Import Wizard - Upload Screen
    import_new_analysis: { en: 'New Analysis', es: 'Nuevo Análisis' },
    import_select_source: { en: 'SELECT DATA SOURCE', es: 'SELECCIONA FUENTE DE DATOS' },
    import_whatsapp: { en: 'WhatsApp', es: 'WhatsApp' },
    import_whatsapp_subtitle: { en: 'Exported .txt file', es: 'Archivo .txt exportado' },
    import_upload_file: { en: 'Upload .txt File', es: 'Subir Archivo .txt' },
    import_upload_subtitle: { en: 'Supports full histories (10k - 200k+ msgs). We analyze everything automatically.', es: 'Soporta historiales completos (10k - 200k+ msgs). Analizamos todo automáticamente.' },

    // Import Wizard - Terms Screen
    import_terms_title: { en: 'Terms of Use', es: 'Términos de Uso' },
    import_legal_responsibility: { en: 'Legal Responsibility', es: 'Responsabilidad Legal' },
    import_terms_intro: { en: 'This tool is for therapeutic and self-analysis purposes only ("Coaching").', es: 'Esta herramienta es solo para fines terapéuticos y de auto-análisis ("Coaching").' },
    import_terms_declaration: { en: 'By continuing, you declare under oath that:', es: 'Al continuar, declaras bajo protesta de decir verdad que:' },
    import_terms_check1: { en: 'You have explicit permission from participants to process this chat.', es: 'Tienes permiso explícito de los participantes para procesar este chat.' },
    import_terms_check2: { en: 'The chat will be anonymized automatically before being sent to AI.', es: 'El chat será anonimizado automáticamente antes de enviarse a la IA.' },
    import_terms_check3: { en: 'You assume full legal responsibility for the use of this information.', es: 'Asumes total responsabilidad legal por el uso de esta información.' },
    import_accept_continue: { en: 'ACCEPT AND CONTINUE', es: 'ACEPTO Y CONTINUAR' },

    // Import Wizard - Processing Screen
    import_processing: { en: 'Processing', es: 'Procesando' },
    import_analyzing: { en: 'Analyzing', es: 'Analizando' },
    import_processing_time: { en: 'This may take up to 5 minutes...', es: 'Esto puede tomar hasta 5 minutos...' },
    import_stage1: { en: 'Connecting with your story...', es: 'Conectando con tu historia...' },
    import_stage2: { en: 'Listening to what went unsaid...', es: 'Escuchando lo que no se dijo...' },
    import_stage3: { en: 'Understanding the bonds of the heart...', es: 'Entendiendo los lazos del corazón...' },
    import_stage4: { en: 'Preparing your safe space...', es: 'Preparando tu espacio seguro...' },
    import_starting: { en: 'Starting...', es: 'Iniciando...' },

    // Import Wizard - Participant Selection
    import_confirm_identity: { en: 'CONFIRM IDENTITY', es: 'CONFIRMAR IDENTIDAD' },
    import_conversation_detected: { en: 'CONVERSATION DETECTED', es: 'CONVERSACIÓN DETECTADA' },
    import_total_messages: { en: 'Total messages', es: 'Mensajes totales' },
    import_participants: { en: 'Participants:', es: 'Participantes:' },
    import_who_are_you: { en: 'Who are you?', es: '¿Quién eres tú?' },
    import_who_subtitle: { en: 'Select your name so AI simulates the other person.', es: 'Selecciona tu nombre para que la IA simule a la otra persona.' },
    import_messages_count: { en: 'messages', es: 'mensajes' },
    import_wrong_names: { en: 'Names not correct? Enter manually', es: '¿No aparecen los nombres correctos? Ingresar manualmente' },
    import_enter_exact_name: { en: 'Enter exact name:', es: 'Escribe el nombre exacto:' },
    import_creating_simulation: { en: 'Creating simulation of:', es: 'Creando simulación de:' },
    import_relationship_question: { en: 'What relationship do you have with', es: '¿Qué relación tienes con' },
    import_relationship_help: { en: 'This helps AI be more accurate and respectful', es: 'Esto ayuda a la IA a ser más precisa y respetuosa' },
    import_partner: { en: 'Partner', es: 'Pareja' },
    import_ex_partner: { en: 'Ex-Partner', es: 'Ex-Pareja' },
    import_friend: { en: 'Friend', es: 'Amigo/a' },
    import_family: { en: 'Family', es: 'Familiar' },
    import_fake: { en: 'Situationship', es: 'Falseador/a' },

    // Coach Screen
    coach_title: { en: 'AI Coach', es: 'Coach IA' },
    coach_wellness_title: { en: 'Wellness Coach', es: 'Coach de Bienestar' },
    coach_subtitle: { en: 'I\'m here to listen and support you in processing your emotions.', es: 'Estoy aquí para escucharte y apoyarte a procesar tus emociones.' },
    coach_placeholder: { en: 'How can I help you today?', es: '¿Cómo te sientes hoy?' },
    coach_suggestion1: { en: 'How can I get over my ex?', es: '¿Cómo puedo superar a mi ex?' },
    coach_suggestion2: { en: 'I feel sad today', es: 'Me siento triste hoy' },
    coach_suggestion3: { en: 'Is it normal to miss someone?', es: '¿Es normal extrañar a alguien?' },

    // Home Screen (Tabs/Index)
    home_greeting: { en: 'How are you feeling today?', es: '¿Cómo te sientes hoy?' },
    home_greeting_subtitle: { en: 'I\'m here to listen and analyze your situation.', es: 'Estoy aquí para escucharte y analizar tu situación.' },
    home_suggestions_label: { en: 'Suggestions to start:', es: 'Sugerencias para iniciar:' },
    home_chip1: { en: 'Hello', es: 'Hola' },
    home_chip2: { en: 'I miss you', es: 'Te extraño' },
    home_chip3: { en: 'Can we talk?', es: '¿Podemos hablar?' },
    home_chip4: { en: 'I can\'t stop thinking about you', es: 'No dejo de pensar en ti' },
    home_chip5: { en: 'How have you been?', es: '¿Cómo has estado?' },

    // REMI Live - Voice Call
    remi_handsfree_hint_title: { en: '💡 Hands-Free Mode Active', es: '💡 Modo Manos Libres Activo' },
    remi_handsfree_hint_body: {
        en: 'Just speak normally. REMI listens and responds automatically when you finish talking.\n\nYou can switch to manual mode by tapping the microphone button.',
        es: 'Solo habla normalmente. REMI te escucha y responde automáticamente cuando terminas de hablar.\n\nPuedes cambiar a modo manual tocando el botón de micrófono.'
    },

    // General Buttons
    btn_upgrade: { en: 'Upgrade', es: 'Mejorar Plan' },
    btn_improve_plan: { en: 'Upgrade Plan', es: 'Mejorar Plan' },


    // Terms of Service
    terms_title: { en: 'Terms of Service', es: 'Términos de Servicio' },
    terms_crisis_warning: { en: 'If in crisis: Call 911 (MX) or 988 (US)', es: 'Si estás en crisis: Llama al 911 (MX) o 988 (US)' },
    terms_last_updated: { en: 'Last updated: December 23, 2025', es: 'Última actualización: 23 de diciembre de 2025' },
    terms_external_link: { en: '🌐 View Official Terms (Online)', es: '🌐 Ver Términos Oficiales (Online)' },

    terms_section_1_title: { en: '1. Disclaimer', es: '1. Descargo de Responsabilidad' },
    terms_section_1_text: { en: 'SOYREMI IS NOT a medical or psychological service. It is an emotional support and relationship coaching tool. It does not replace professional therapy.', es: 'SOYREMI NO ES un servicio médico ni psicológico. Es una herramienta de apoyo emocional y coaching de relaciones. No reemplaza la terapia profesional.' },

    terms_section_2_title: { en: '2. AI Generated Content', es: '2. Contenido Generado por IA' },
    terms_section_2_text: { en: 'This app uses Google Gemini AI. AI may make mistakes or generate inaccurate information. It is NOT a human therapist and cannot diagnose mental health conditions.', es: 'Esta app usa Google Gemini AI. La IA puede cometer errores o generar información inexacta. NO es un terapeuta humano y no puede diagnosticar condiciones de salud mental.' },

    terms_section_3_title: { en: '3. Subscriptions & Payments', es: '3. Suscripciones y Pagos' },
    terms_section_3_point_1: { en: '• Payments processed via Google Play Store', es: '• Los pagos se procesan via Google Play Store' },
    terms_section_3_point_2: { en: '• Refunds only within first 48 hours', es: '• Reembolsos solo en las primeras 48 horas' },
    terms_section_3_point_3: { en: '• SOYREMI does not manage refunds directly', es: '• SOYREMI no gestiona reembolsos directamente' },

    terms_section_4_title: { en: '4. Limitation of Liability', es: '4. Limitación de Responsabilidad' },
    terms_section_4_text: { en: 'We are NOT responsible for decisions made based on app content, nor for emotional, psychological or financial damages derived from use.', es: 'NO somos responsables por decisiones tomadas basándose en el contenido de la app, ni por daños emocionales, psicológicos o financieros derivados del uso.' },

    terms_section_5_title: { en: '5. Acceptable Use', es: '5. Uso Aceptable' },
    terms_section_5_point_1: { en: '• Do not use to harass or harm others', es: '• No usar para acosar o dañar a otros' },
    terms_section_5_point_2: { en: '• Do not share illegal content', es: '• No compartir contenido ilegal' },
    terms_section_5_point_3: { en: '• Must be 18+ years old', es: '• Ser mayor de 18 años' },

    terms_footer: { en: 'By using SOYREMI, you accept these Terms of Service.', es: 'Al usar SOYREMI, aceptas estos Términos de Servicio.' },


    // Welcome Confirmation
    welcome_conf_title: { en: 'Welcome to SOYREMI', es: 'Bienvenido a SOYREMI' },
    welcome_conf_subtitle: { en: 'Your safe space for healing and analysis.', es: 'Tu espacio seguro de sanación y análisis.' },
    welcome_conf_important: { en: 'Important', es: 'Importante' },
    welcome_conf_ai_desc: { en: 'SOYREMI uses advanced AI to analyze your conversations. While very accurate, AI may make mistakes.', es: 'SOYREMI utiliza Inteligencia Artificial avanzada para analizar tus conversaciones. Aunque es muy precisa, la IA puede cometer errores.' },
    welcome_conf_not_therapy: { en: 'This tool does not replace professional therapy or medical advice.', es: 'Esta herramienta no sustituye la terapia profesional ni el consejo médico.' },
    welcome_conf_privacy: { en: 'Your Privacy', es: 'Tu Privacidad' },
    welcome_conf_privacy_desc: { en: 'Your conversations are analyzed anonymously and securely.', es: 'Tus conversaciones son analizadas de forma anónima y segura.' },
    welcome_conf_no_storage: { en: 'We DO NOT save your original messages', es: 'NO guardamos tus mensajes originales' },
    welcome_conf_terms: { en: 'By continuing, you accept our', es: 'Al continuar, aceptas nuestros' },
    welcome_conf_button: { en: 'Accept and Continue', es: 'Aceptar y Continuar' },

    // Analysis Screen
    analysis_verifying: { en: 'Verifying status...', es: 'Verificando estado...' },
    analysis_title: { en: 'Analysis', es: 'Análisis' },
    analysis_of: { en: 'Analysis of', es: 'Análisis de' },
    analysis_no_profile: { en: 'No profile to analyze', es: 'No hay perfil para analizar' },
    analysis_retry: { en: 'Retry', es: 'Reintentar' },
    analysis_error_corrupt: { en: 'Profile is empty or corrupt', es: 'El perfil está vacío o corrupto' },
    analysis_error_desc: { en: 'Analysis did not complete correctly. Delete this profile and create a new one.', es: 'El análisis no se completó correctamente. Elimina este perfil y crea uno nuevo.' },
    analysis_delete_retry: { en: 'Delete and retry', es: 'Eliminar y reintentar' },
    analysis_create_new: { en: 'Create new analysis without deleting', es: 'Crear nuevo análisis sin eliminar' },
    analysis_msgs_analyzed: { en: 'messages analyzed', es: 'mensajes analizados' },
    analysis_deep_ai: { en: 'Deep AI Analysis', es: 'Análisis Profundo IA' },

    analysis_comm_style: { en: 'Communication Style', es: 'Estilo de Comunicación' },
    analysis_emotional_pat: { en: 'Emotional Patterns', es: 'Patrones Emocionales' },
    analysis_psych_xray: { en: 'Psychological X-Ray', es: 'Radiografía Psicológica' },
    analysis_4_horsemen: { en: 'The 4 Horsemen (Toxicity Scale)', es: 'Los 4 Jinetes (Escala de Toxicidad)' },

    // Horsemen Labels
    analysis_h_criticism: { en: '⚔️ Criticism (Attacks)', es: '⚔️ Crítica (Ataques)' },
    analysis_h_contempt: { en: '🙄 Contempt (The Worst)', es: '🙄 Desprecio (El peor)' },
    analysis_h_defensiveness: { en: '🛡️ Defensiveness', es: '🛡️ Defensividad' },
    analysis_h_stonewalling: { en: '🧱 Stonewalling', es: '🧱 Indiferencia (Muro)' },

    analysis_attachment_detected: { en: 'Detected Attachment Style', es: 'Estilo de Apego Detectado' },
    analysis_confidence: { en: 'Analysis confidence:', es: 'Confianza del análisis:' },
    analysis_attachment: { en: 'Attachment Style', es: 'Estilo de Apego' },
    analysis_conflict: { en: 'Conflict Management', es: 'Manejo de Conflictos' },
    analysis_red_flags: { en: 'Red Flags', es: 'Señales de Alerta' },

    analysis_intimate: { en: 'Intimate Details & Nicknames', es: 'Detalles Íntimos & Apodos' },
    analysis_nicknames_them: { en: 'They called you:', es: 'Te decía:' },
    analysis_nicknames_you: { en: 'You called them:', es: 'Tú le decías:' },
    analysis_jokes: { en: '🎭 Inside Jokes:', es: '🎭 Chistes Internos:' },
    analysis_love_gestures: { en: '💝 Specific Love Gestures:', es: '💝 Gestos de Amor Específicos:' },

    analysis_valid_warning: { en: '⚠️ Dubious Relationship Type', es: '⚠️ Tipo de Relación Dudoso' },
    analysis_valid_continue: { en: 'Do you want to continue anyway?', es: '¿Quieres continuar de todos modos?' },
    analysis_btn_continue: { en: 'Continue Analysis', es: 'Continuar Análisis' },
    analysis_btn_cancel: { en: 'Cancel and Fix', es: 'Cancelar y Corregir' },

    // Auth / Welcome
    auth_welcome_title: { en: 'Your AI coach to overcome the past', es: 'Tu coach de IA para superar el pasado' },
    auth_continue_google: { en: 'Continue with Google', es: 'Continuar con Google' },
    auth_sanacion: { en: 'Healing', es: 'Sanación' },
    auth_ia_coach: { en: 'AI Coach', es: 'IA Coach' },

    // Privacy & Legal
    privacy_legal_section_title: { en: 'Privacy & Legal', es: 'Privacidad y Legal' },
    privacy_mental_health_title: { en: 'Mental Health Notice', es: 'Aviso de Salud Mental' },
    privacy_mental_health_msg: {
        en: 'This application is a tool for practice and self-knowledge. It does not replace professional therapy. If you experience thoughts of self-harm, please seek professional help immediately.',
        es: 'Esta aplicación es una herramienta de práctica y autoconocimiento. No reemplaza la terapia profesional. Si experimentas pensamientos de autolesión, por favor busca ayuda profesional inmediatamente.'
    },
    privacy_section_legal: { en: 'Legal', es: 'Legal' },
    privacy_policy: { en: 'Privacy Policy', es: 'Política de Privacidad' },
    privacy_terms: { en: 'Terms of Service', es: 'Términos de Servicio' },
    privacy_section_contact: { en: 'Contact', es: 'Contacto' },
    privacy_contact_support: { en: 'Contact Support', es: 'Contactar Soporte' },

    // Export Guide
    guide_whatsapp_title: { en: 'WhatsApp', es: 'WhatsApp' },
    guide_step_by_step: { en: 'Step by step', es: 'Paso a paso' },

    // Web Steps
    guide_web_1_title: { en: 'From WhatsApp', es: 'Desde WhatsApp' },
    guide_web_1_desc: { en: 'Use WhatsApp Web or your phone to export.', es: 'Usa WhatsApp Web o tu celular para exportar.' },
    guide_web_2_title: { en: 'Export chat', es: 'Exportar chat' },
    guide_web_2_desc: { en: 'Enter chat > Menu (⋮) > More > Export chat.', es: 'Entra al chat > Menú (⋮) > Más > Exportar chat.' },
    guide_web_3_title: { en: 'No media', es: 'Sin archivos' },
    guide_web_3_desc: { en: 'Select "Without media" (important).', es: 'Selecciona "Sin archivos multimedia" (importante).' },
    guide_web_4_title: { en: 'Send to PC', es: 'Envíalo a tu PC' },
    guide_web_4_desc: { en: 'Send the .txt file via email, Drive or Telegram.', es: 'Mándate el archivo .txt por correo, Drive o Telegram.' },
    guide_web_5_title: { en: 'Download', es: 'Descárgalo' },
    guide_web_5_desc: { en: 'Save the .txt file on your computer.', es: 'Guarda el archivo .txt en tu computadora.' },
    guide_web_6_title: { en: 'Upload here', es: 'Súbelo aquí' },
    guide_web_6_desc: { en: 'Click "Upload .txt file" and select it.', es: 'Haz clic en "Subir archivo .txt" y selecciónalo.' },

    // Mobile Steps
    guide_mob_1_title: { en: 'Open chat', es: 'Abre el chat' },
    guide_mob_1_desc: { en: 'Go to the WhatsApp conversation you want to analyze.', es: 'Ve a la conversación en WhatsApp que quieres analizar.' },
    guide_mob_2_title: { en: 'Options menu', es: 'Menú de opciones' },
    guide_mob_2_desc: { en: 'Tap the 3 dots (⋮) in the top right corner.', es: 'Toca los 3 puntos (⋮) en la esquina superior derecha.' },
    guide_mob_3_title: { en: 'Export chat', es: 'Exportar chat' },
    guide_mob_3_desc: { en: 'Select "More" → "Export chat".', es: 'Selecciona "Más" → "Exportar chat".' },
    guide_mob_4_title: { en: 'No media', es: 'Sin archivos' },
    guide_mob_4_desc: { en: 'VERY IMPORTANT: Choose "Without media".', es: 'MUY IMPORTANTE: Elige "Sin archivos multimedia".' },
    guide_mob_5_title: { en: 'Share to REMI', es: 'Compartir a REMI' },
    guide_mob_5_desc: { en: 'Look for "REMI" in the share list.', es: 'Busca "REMI" en la lista de apps para compartir.' },
    guide_mob_6_title: { en: 'Don\'t see REMI?', es: '¿No ves REMI?' },
    guide_mob_6_desc: { en: 'Swipe right or tap "More" (...) to see all apps.', es: 'Desliza a la derecha o toca "Más" (...) para ver todas las apps disponibles.' },

    // Footer
    guide_footer_title: { en: 'REMI not in the list?', es: '¿REMI no aparece en la lista?' },
    guide_footer_1: { en: 'If REMI doesn\'t appear, save the .txt file to your device.', es: 'Si REMI no aparece, guarda el archivo .txt en tu dispositivo.' },
    guide_footer_2: { en: 'Then open REMI and upload the file from here.', es: 'Luego abre REMI y sube el archivo desde aquí.' },
    guide_btn_start: { en: 'Got it, Start', es: 'Entendido, Empezar' },

    // Privacy Policy
    privacy_title: { en: 'Privacy Policy', es: 'Política de Privacidad' },
    privacy_last_updated: { en: 'Last updated: December 23, 2025', es: 'Última actualización: 23 de diciembre de 2025' },
    privacy_official_btn: { en: 'View Official Policy (Online)', es: 'Ver Política Oficial (Online)' },

    privacy_section_1_title: { en: 'Information We Collect', es: 'Información que Recopilamos' },
    privacy_section_1_item_1: { en: 'Email and name (for your account)', es: 'Email y nombre (para tu cuenta)' },
    privacy_section_1_item_2: { en: 'Conversations with the AI', es: 'Conversaciones con la IA' },
    privacy_section_1_item_3: { en: 'App usage data', es: 'Datos de uso de la app' },

    privacy_section_2_title: { en: 'How We Use Your Data', es: 'Cómo Usamos tus Datos' },
    privacy_section_2_item_1: { en: 'Generate personalized AI responses', es: 'Generar respuestas personalizadas de IA' },
    privacy_section_2_item_2: { en: 'Improve the service', es: 'Mejorar el servicio' },
    privacy_section_2_item_3: { en: 'Process subscriptions', es: 'Procesar suscripciones' },

    privacy_section_3_title: { en: 'Sharing with Third Parties', es: 'Compartir con Terceros' },
    privacy_section_3_google: { en: 'Google Gemini AI: Your conversations are sent to Google to generate responses.', es: 'Google Gemini AI: Tus conversaciones se envían a Google para generar respuestas' },
    privacy_section_3_supabase: { en: 'Supabase: Storage and authentication.', es: 'Supabase: Almacenamiento y autenticación' },
    privacy_section_3_warning: { en: 'WE DO NOT SELL your data to third parties.', es: 'NO VENDEMOS tus datos a terceros' },

    privacy_section_4_title: { en: 'Your Rights', es: 'Tus Derechos (LFPDPPP)' },
    privacy_section_4_item_1: { en: 'Access: See your data', es: 'Acceso: Ver tus datos' },
    privacy_section_4_item_2: { en: 'Rectification: Correct errors', es: 'Rectificación: Corregir errores' },
    privacy_section_4_item_3: { en: 'Cancellation: Delete your account', es: 'Cancelación: Eliminar tu cuenta' },
    privacy_section_4_item_4: { en: 'Opposition: Control your data', es: 'Oposición: Control sobre tus datos' },

    privacy_contact_title: { en: 'Contact', es: 'Contacto' },
    privacy_contact_text: { en: 'If you have questions, write to us at:', es: 'Si tienes dudas, escríbenos a:' },

    // Alert Modals
    alert_clear_cache_title: { en: 'Clear Cache', es: 'Borrar Caché' },
    alert_clear_cache_msg: { en: 'This will delete local data. Continue?', es: 'Esto eliminará datos locales. ¿Continuar?' },
    alert_clear_cache_success_title: { en: 'Done', es: 'Listo' },
    alert_clear_cache_success_msg: { en: 'Cache cleared.', es: 'Caché eliminado.' },
    alert_delete_account_title: { en: 'Delete Account', es: 'Eliminar Cuenta' },
    alert_delete_account_msg: { en: 'This action is irreversible.', es: 'Esta acción es irreversible.' },
    alert_btn_cancel: { en: 'Cancel', es: 'Cancelar' },
    alert_btn_delete: { en: 'Delete', es: 'Eliminar' },
    alert_btn_clear: { en: 'Clear', es: 'Borrar' },
    alert_btn_ok: { en: 'OK', es: 'OK' },

    // Free Preview Banner
    free_preview_title: { en: 'Free Preview', es: 'Vista Previa Gratuita' },
    free_preview_limit_msg: { en: 'Daily message limit applies', es: 'Límite de mensajes diario aplica' },
    free_preview_limit_reached: { en: 'Daily limit reached', es: 'Has alcanzado el límite diario' },
};

interface LanguageState {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof translations) => string;
}

import { getLocales } from 'expo-localization';

// ... (previous imports)

// Detect initial language from browser or device
const detectInitialLanguage = (): Language => {
    // On web, use browser language
    if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined') {
            const browserLang = navigator.language || (navigator as any).userLanguage;
            return browserLang?.toLowerCase().startsWith('es') ? 'es' : 'en';
        }
        return 'en';
    }


    // On mobile, use expo-localization
    const locales = getLocales();
    if (locales && locales.length > 0) {
        const languageCode = locales[0].languageCode;
        // Check if language code starts with 'es' (e.g. 'es-MX', 'es-ES')
        if (languageCode?.startsWith('es')) {
            return 'es';
        }
    }

    // Default to Spanish for Latin American audience
    return 'es';
};

export const useLanguage = create<LanguageState>()(
    persist(
        (set, get) => ({
            language: detectInitialLanguage(),
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

// Sync language preference to user profile in Supabase
export const syncLanguageToProfile = async (userId: string) => {
    const currentLang = useLanguage.getState().language;
    try {
        const { supabase } = require('./supabase');
        await supabase
            .from('profiles')
            .update({ preferred_language: currentLang })
            .eq('id', userId);
    } catch (error) {
        console.error('Error syncing language to profile:', error);
    }
};
