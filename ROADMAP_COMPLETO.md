# 🎯 MY EX COACH - ROADMAP DE MEJORAS
## Plan de Implementación Completo

---

## 📋 FASE 1: FUNDAMENTOS CRÍTICOS (2-3 semanas)

### 1.1 Onboarding Personalizado Empático ⭐⭐⭐
**Prioridad:** ALTA | **Impacto:** ALTO | **Esfuerzo:** Medio

**Implementación:**
```typescript
// Nuevo archivo: app/onboarding-extended.tsx

interface OnboardingData {
  name: string;
  breakupDate: Date;
  whoEnded: 'me' | 'them' | 'mutual';
  currentMood: number; // 1-10
  relationshipDuration: string;
  mainStruggles: string[];
}

const questions = [
  {
    id: 1,
    question: "¿Cómo te llamas?",
    type: "text",
    placeholder: "Tu nombre..."
  },
  {
    id: 2,
    question: "¿Hace cuánto terminaron?",
    type: "date-picker",
    options: ["Hace menos de 1 semana", "1-4 semanas", "1-3 meses", "3-6 meses", "Más de 6 meses"]
  },
  {
    id: 3,
    question: "¿Quién terminó la relación?",
    type: "choice",
    options: [
      { value: "them", label: "Mi ex terminó conmigo", emoji: "💔" },
      { value: "me", label: "Yo terminé la relación", emoji: "🚪" },
      { value: "mutual", label: "Fue mutuo", emoji: "🤝" }
    ]
  },
  {
    id: 4,
    question: "¿Cómo te sientes hoy?",
    type: "slider",
    min: 1,
    max: 10,
    labels: ["Terrible", "Regular", "Bien"]
  },
  {
    id: 5,
    question: "¿Cuánto duró la relación?",
    type: "choice",
    options: ["Menos de 6 meses", "6 meses - 1 año", "1-3 años", "3-5 años", "Más de 5 años"]
  },
  {
    id: 6,
    question: "¿Qué te cuesta más? (Puedes elegir varias)",
    type: "multi-choice",
    options: [
      "No contactarle",
      "Dormir bien",
      "Concentrarme en el trabajo/estudio",
      "Dejar de revisar sus redes sociales",
      "Sentirme solo/a",
      "Aceptar que terminó"
    ]
  }
];
```

**Personalización del System Prompt:**
```typescript
// lib/openai.ts - Función mejorada

function buildPersonalizedPrompt(userProfile: OnboardingData): string {
  const daysSinceBreakup = calculateDays(userProfile.breakupDate);
  
  let tone = "";
  if (daysSinceBreakup < 7) {
    tone = "Tu tono debe ser de CONTENCIÓN INMEDIATA y VALIDACIÓN. La herida está fresca. Evita frases como 'ya pasará' o 'hay más peces en el mar'. Enfócate en que se sienta escuchado/a y en técnicas de grounding.";
  } else if (daysSinceBreakup < 30) {
    tone = "Tu tono debe ser de APOYO ACTIVO. Ya pasó la crisis inicial. Ayúdale a establecer rutinas saludables y a procesar emociones. Puedes empezar a hablar de autocuidado y redescubrimiento personal.";
  } else if (daysSinceBreakup < 90) {
    tone = "Tu tono debe ser de EMPODERAMIENTO SUAVE. Ya hay cierta distancia. Enfócate en reconstrucción de identidad, nuevos hábitos y metas pequeñas. Celebra el progreso.";
  } else {
    tone = "Tu tono debe ser de CRECIMIENTO Y NUEVAS METAS. Ya hay perspectiva. Puedes ser más directo/a sobre patrones a cambiar y sobre mirar hacia adelante. Ayúdale a cerrar ciclos pendientes.";
  }

  return `You are an empathetic Ex Coach powered by GPT-4o-mini.

USER CONTEXT:
- Name: ${userProfile.name}
- Breakup: ${daysSinceBreakup} days ago
- Who ended it: ${userProfile.whoEnded === 'them' ? 'Their ex ended it (they may feel rejected)' : userProfile.whoEnded === 'me' ? 'They ended it (they may feel guilt or doubt)' : 'It was mutual'}
- Current mood: ${userProfile.currentMood}/10
- Main struggles: ${userProfile.mainStruggles.join(', ')}

${tone}

Your approach:
- Use their name occasionally to create connection
- Reference their specific struggles when relevant
- Adjust your advice based on how long ago the breakup was
- Be warm, understanding, and non-judgmental
- Validate their feelings while gently challenging unhealthy patterns
- Provide actionable advice, not just sympathy
- Celebrate their progress, no matter how small

If they mention wanting to contact their ex, remind them of their progress and suggest healthier alternatives.`;
}
```

**Base de Datos:**
```sql
-- Añadir a Supabase
ALTER TABLE profiles ADD COLUMN onboarding_data JSONB;
ALTER TABLE profiles ADD COLUMN breakup_date DATE;
ALTER TABLE profiles ADD COLUMN who_ended VARCHAR(20);
ALTER TABLE profiles ADD COLUMN current_mood INTEGER;
ALTER TABLE profiles ADD COLUMN relationship_duration VARCHAR(50);
ALTER TABLE profiles ADD COLUMN main_struggles TEXT[];
```

---

### 1.2 Sistema de Suscripciones (RevenueCat) ⭐⭐⭐
**Prioridad:** ALTA | **Impacto:** CRÍTICO | **Esfuerzo:** Alto

**Stack Recomendado:**
- **RevenueCat** (gestión de suscripciones multiplataforma)
- **Stripe** (procesamiento de pagos web)
- **Google Play Billing** (Android)
- **StoreKit** (iOS)

**Implementación:**
```bash
npm install react-native-purchases
```

```typescript
// lib/subscriptions.ts
import Purchases from 'react-native-purchases';

export enum SubscriptionTier {
  FREE = 'survivor',
  WARRIOR = 'warrior',
  PHOENIX = 'phoenix'
}

export const SUBSCRIPTION_CONFIG = {
  survivor: {
    name: 'Survivor',
    price: 0,
    features: {
      dailyMessages: 10,
      messageDecoder: 1, // per week
      moodJournal: true,
      analytics: false,
      panicButton: 'basic',
      notifications: 0,
      vault: false
    }
  },
  warrior: {
    name: 'Warrior',
    price: 7.99,
    monthlyProductId: 'warrior_monthly',
    yearlyProductId: 'warrior_yearly',
    features: {
      dailyMessages: -1, // unlimited
      messageDecoder: -1,
      moodJournal: true,
      analytics: 'weekly',
      panicButton: 'advanced',
      notifications: 5,
      vault: true,
      exportDiary: true
    }
  },
  phoenix: {
    name: 'Phoenix',
    price: 14.99,
    monthlyProductId: 'phoenix_monthly',
    yearlyProductId: 'phoenix_yearly',
    features: {
      dailyMessages: -1,
      messageDecoder: -1,
      moodJournal: true,
      analytics: 'daily',
      panicButton: 'advanced',
      notifications: -1,
      vault: true,
      exportDiary: true,
      coachingSessions: true,
      prioritySupport: true,
      earlyAccess: true
    }
  }
};

export async function initializePurchases() {
  await Purchases.configure({ apiKey: 'YOUR_REVENUECAT_API_KEY' });
}

export async function getUserSubscription(): Promise<SubscriptionTier> {
  const customerInfo = await Purchases.getCustomerInfo();
  
  if (customerInfo.entitlements.active['phoenix']) {
    return SubscriptionTier.PHOENIX;
  } else if (customerInfo.entitlements.active['warrior']) {
    return SubscriptionTier.WARRIOR;
  }
  
  return SubscriptionTier.FREE;
}

export function canUseFeature(tier: SubscriptionTier, feature: string): boolean {
  const config = SUBSCRIPTION_CONFIG[tier];
  return config.features[feature] === true || config.features[feature] === -1;
}
```

**Pantalla de Paywall:**
```typescript
// app/paywall.tsx
// Diseño atractivo con comparación de planes, testimonios, y CTA claro
```

---

### 1.3 Seguridad: PIN/FaceID ⭐⭐
**Prioridad:** MEDIA-ALTA | **Impacto:** ALTO (confianza) | **Esfuerzo:** Bajo

```bash
npm install expo-local-authentication expo-secure-store
```

```typescript
// lib/security.ts
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export async function setupAppLock() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  
  if (hasHardware && isEnrolled) {
    return 'biometric';
  }
  return 'pin'; // Fallback a PIN de 4 dígitos
}

export async function authenticateUser(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock My Ex Coach',
    fallbackLabel: 'Use PIN',
  });
  
  return result.success;
}
```

---

## 📋 FASE 2: FUNCIONALIDADES AVANZADAS (3-4 semanas)

### 2.1 Decodificador 2.0 con Generador de Respuestas ⭐⭐⭐
**Prioridad:** ALTA | **Impacto:** ALTO | **Esfuerzo:** Medio

```typescript
// app/tools/decoder-advanced.tsx

interface DecoderResponse {
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

async function analyzeAndGenerateResponses(message: string): Promise<DecoderResponse> {
  const prompt = `Analyze this message from an ex and provide:
1. Honest analysis of what they really mean
2. Emotional tone (manipulative, genuine, confused, etc.)
3. Any red flags
4. 3 response options:
   - No Contact: Brief or no response to maintain boundaries
   - Friendly but Distant: Polite but clear you've moved on
   - Definitive Closure: Clear, final message

Message: "${message}"

Return as JSON.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

**UI:**
- Mostrar análisis en cards expandibles
- Botones para copiar cada respuesta sugerida
- Advertencia: "Recuerda: No estás obligado/a a responder"

---

### 2.2 Botón de Pánico 2.0 ⭐⭐⭐
**Prioridad:** ALTA | **Impacto:** MUY ALTO | **Esfuerzo:** Medio

```typescript
// app/tools/panic-advanced.tsx

export default function PanicButtonAdvanced() {
  const [countdown, setCountdown] = useState(60);
  const [isActive, setIsActive] = useState(false);
  
  const messages = [
    "¿Vale la pena perder tu progreso de {days} días?",
    "Recuerda por qué terminaron",
    "Mañana te agradecerás no haberlo hecho",
    "Esta sensación pasará. Siempre pasa.",
    "¿Qué dirías a un amigo en tu situación?"
  ];
  
  useEffect(() => {
    if (isActive && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [isActive, countdown]);
  
  return (
    <View className="flex-1 bg-red-900/20">
      {isActive ? (
        <>
          <Text className="text-6xl font-bold text-red-500">{countdown}</Text>
          <Text className="text-xl text-white mt-4">
            {messages[Math.floor((60 - countdown) / 12)]}
          </Text>
          
          {countdown === 0 && (
            <View>
              <Button title="Escribir en el Diario" onPress={redirectToDiary} />
              <Button title="Llamar a un amigo" onPress={callFriend} />
              <Button title="Aún quiero contactarle" variant="ghost" />
            </View>
          )}
        </>
      ) : (
        <Button 
          title="¡NECESITO AYUDA AHORA!" 
          onPress={() => setIsActive(true)}
          className="bg-red-600"
        />
      )}
    </View>
  );
}
```

---

### 2.3 Gamificación del Progreso ⭐⭐
**Prioridad:** MEDIA | **Impacto:** MEDIO-ALTO | **Esfuerzo:** Medio

```typescript
// lib/gamification.ts

export const MILESTONES = [
  { days: 1, title: "First Step", badge: "🌱", reward: "Survivor Badge" },
  { days: 3, title: "Survivor", badge: "💪", reward: "Warrior Badge" },
  { days: 7, title: "One Week Warrior", badge: "🛡️", reward: "Shield Badge" },
  { days: 14, title: "Two Week Champion", badge: "🏆", reward: "Champion Badge" },
  { days: 30, title: "Month Master", badge: "👑", reward: "Crown Badge" },
  { days: 60, title: "Phoenix Rising", badge: "🔥", reward: "Phoenix Badge" },
  { days: 90, title: "Freedom Fighter", badge: "🦅", reward: "Eagle Badge" },
  { days: 180, title: "Half Year Hero", badge: "⭐", reward: "Star Badge" },
  { days: 365, title: "Year of Strength", badge: "💎", reward: "Diamond Badge" }
];

export function checkMilestones(days: number): Milestone | null {
  return MILESTONES.find(m => m.days === days) || null;
}

// Animación de celebración cuando se alcanza un hito
export function showMilestoneAnimation(milestone: Milestone) {
  // Confetti, modal con badge, sonido de celebración
}
```

---

### 2.4 Diario Inteligente con Análisis Semanal ⭐⭐
**Prioridad:** MEDIA | **Impacto:** ALTO | **Esfuerzo:** Alto

```typescript
// lib/journal-analytics.ts

interface WeeklyAnalysis {
  averageMood: number;
  moodTrend: 'improving' | 'stable' | 'declining';
  peakTimes: string[]; // "Nights", "Weekends"
  commonTriggers: string[];
  recommendations: string[];
}

async function generateWeeklyAnalysis(entries: JournalEntry[]): Promise<WeeklyAnalysis> {
  const prompt = `Analyze these mood journal entries from the past week and provide:
1. Average mood score
2. Trend (improving/stable/declining)
3. Times when mood is lowest
4. Common triggers or patterns
5. 3 personalized recommendations

Entries: ${JSON.stringify(entries)}

Return as JSON.`;

  // Call GPT-4o-mini
  // Parse and return analysis
}
```

**Visualización:**
```typescript
// Usar react-native-chart-kit
import { LineChart } from 'react-native-chart-kit';

<LineChart
  data={{
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{ data: moodScores }]
  }}
  width={Dimensions.get('window').width - 40}
  height={220}
  chartConfig={{
    backgroundColor: '#1a1a2e',
    backgroundGradientFrom: '#1a1a2e',
    backgroundGradientTo: '#16213e',
    color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
  }}
/>
```

---

## 📋 FASE 3: OPTIMIZACIONES Y PULIDO (2 semanas)

### 3.1 Gestión de Tokens GPT (Ahorro de Costos) ⭐⭐⭐
**Prioridad:** ALTA | **Impacto:** CRÍTICO (costos) | **Esfuerzo:** Medio

```typescript
// lib/context-management.ts

interface ConversationContext {
  recentMessages: Message[];
  summary: string;
  keyFacts: string[];
}

async function buildEfficientContext(
  userId: string,
  currentMessage: string
): Promise<Message[]> {
  // 1. Get last 10 messages
  const recentMessages = await getRecentMessages(userId, 10);
  
  // 2. If conversation is longer, get a summary of older messages
  const messageCount = await getTotalMessageCount(userId);
  
  if (messageCount > 10) {
    const olderMessages = await getMessages(userId, 10, messageCount - 10);
    const summary = await summarizeConversation(olderMessages);
    
    // 3. Combine summary + recent messages
    return [
      { role: 'system', content: `Previous conversation summary: ${summary}` },
      ...recentMessages,
      { role: 'user', content: currentMessage }
    ];
  }
  
  return [...recentMessages, { role: 'user', content: currentMessage }];
}

async function summarizeConversation(messages: Message[]): Promise<string> {
  const prompt = `Summarize this conversation in 2-3 sentences, focusing on:
- Main emotional state
- Key events or revelations
- Current goals or struggles

Messages: ${messages.map(m => m.content).join('\n')}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 150
  });
  
  return response.choices[0].message.content;
}
```

**Ahorro Estimado:** 60-70% en costos de tokens para conversaciones largas

---

### 3.2 Notificaciones Push Estratégicas ⭐⭐
**Prioridad:** MEDIA | **Impacto:** ALTO (engagement) | **Esfuerzo:** Medio

```bash
npm install expo-notifications
```

```typescript
// lib/notifications.ts

export const NOTIFICATION_TEMPLATES = {
  eveningCheckIn: {
    title: "Recuerda que eres fuerte 💪",
    body: "¿Cómo estuvo tu día? Cuéntame en el diario",
    time: "21:00"
  },
  morningMotivation: {
    title: "Buenos días, {name} ☀️",
    body: "Hoy es un nuevo día para crecer. ¿Cómo te sientes?",
    time: "09:00"
  },
  milestoneReminder: {
    title: "¡{days} días sin contacto! 🎉",
    body: "Estás haciendo un trabajo increíble. Sigue así.",
    trigger: "milestone"
  },
  weeklyReview: {
    title: "Tu resumen semanal está listo 📊",
    body: "Mira cómo has progresado esta semana",
    time: "Sunday 18:00"
  }
};

export async function scheduleSmartNotifications(userProfile: UserProfile) {
  // Solo para usuarios Premium
  if (userProfile.tier === 'warrior' || userProfile.tier === 'phoenix') {
    // Schedule based on user preferences and behavior patterns
  }
}
```

---

### 3.3 Modo Bóveda Secreta ⭐
**Prioridad:** BAJA-MEDIA | **Impacto:** MEDIO | **Esfuerzo:** Bajo

```typescript
// app/vault.tsx

// Sección privada donde el usuario puede:
// - Guardar fotos/mensajes que quiere recordar por qué terminó
// - Escribir cartas que nunca enviará
// - Lista de "Red Flags" de la relación
// - Protegido con PIN/FaceID adicional

export default function VaultScreen() {
  return (
    <View>
      <Section title="Cartas no enviadas" />
      <Section title="Red Flags que no debo olvidar" />
      <Section title="Momentos que me recuerdan por qué terminó" />
    </View>
  );
}
```

---

## 🎨 MEJORAS DE UX/UI

### 4.1 Animaciones y Micro-interacciones
- Confetti al alcanzar hitos
- Haptic feedback en acciones importantes
- Skeleton loaders
- Transiciones suaves entre pantallas

### 4.2 Temas Personalizables (Premium)
- Tema oscuro (default)
- Tema claro
- Tema "Zen" (colores pastel)
- Tema "Phoenix" (naranja/dorado) - Solo Phoenix tier

---

## 📊 MÉTRICAS Y ANALYTICS

### KPIs a Trackear:
1. **Retención:**
   - Day 1, Day 7, Day 30 retention
   - Churn rate por tier
   
2. **Engagement:**
   - Mensajes enviados/día
   - Uso del diario
   - Uso del decodificador
   - Activaciones del botón de pánico
   
3. **Monetización:**
   - Conversion rate Free → Warrior
   - Conversion rate Warrior → Phoenix
   - LTV (Lifetime Value) por tier
   - CAC (Customer Acquisition Cost)

4. **Salud Emocional (Proxy):**
   - Tendencia de mood scores
   - Días promedio sin contacto
   - Uso de funciones de apoyo vs. funciones de análisis

---

## 🚀 ESTRATEGIA DE LANZAMIENTO

### Fase Beta (1-2 meses):
1. Lanzar con plan Free + Warrior
2. Invitar a 50-100 beta testers
3. Recoger feedback intensivo
4. Iterar rápido

### Lanzamiento Público:
1. Lanzar en Product Hunt
2. Campaña en TikTok/Instagram (contenido de valor sobre rupturas)
3. Colaborar con influencers de salud mental
4. SEO: Blog con artículos sobre "cómo superar una ruptura"

### Post-Lanzamiento:
1. Añadir plan Phoenix después de validar Warrior
2. Programa de referidos (1 mes gratis por cada amigo que se suscriba)
3. Versión web progresiva (PWA)

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### Legal:
- **Disclaimer:** "Esta app no sustituye terapia profesional"
- **Términos de servicio** claros
- **Política de privacidad** robusta (GDPR, CCPA compliant)
- **Moderación de contenido** (si añades comunidad)

### Ética:
- No manipular emocionalmente para vender suscripciones
- Ofrecer recursos de crisis (líneas de ayuda) si detectas lenguaje suicida
- Transparencia sobre el uso de IA

### Técnico:
- **Backup automático** de datos del usuario
- **Rate limiting** para prevenir abuso de la API
- **Caché inteligente** para reducir llamadas a Supabase
- **Offline mode** básico (al menos para ver el diario)

---

## 💡 IDEAS ADICIONALES (Futuro)

1. **Modo "Accountability Partner":**
   - La IA te pregunta proactivamente: "¿Cómo vas con tu meta de no revisar sus redes?"
   
2. **Integración con Spotify:**
   - Playlists curadas para diferentes estados de ánimo
   
3. **Comunidad Anónima:**
   - Foro donde usuarios pueden compartir victorias (sin identificarse)
   
4. **Versión para Parejas en Crisis:**
   - Modo "Relationship Coach" (pivote de producto)

5. **API para Terapeutas:**
   - Dashboard para que terapeutas vean el progreso de sus pacientes (con consentimiento)

---

## 📈 PROYECCIÓN FINANCIERA (12 MESES)

### Escenario Conservador:
- Mes 1-3: 500 usuarios (400 Free, 80 Warrior, 20 Phoenix) = **$939/mes**
- Mes 4-6: 2,000 usuarios (1,400 Free, 480 Warrior, 120 Phoenix) = **$5,632/mes**
- Mes 7-9: 5,000 usuarios (3,000 Free, 1,600 Warrior, 400 Phoenix) = **$18,776/mes**
- Mes 10-12: 10,000 usuarios (6,000 Free, 3,200 Warrior, 800 Phoenix) = **$37,568/mes**

**Ingresos Año 1:** ~$190,000
**Costos Año 1:** ~$65,000 (API, infra, marketing)
**Ganancia Neta Año 1:** ~$125,000

### Escenario Optimista:
- Año 1: $300,000
- Año 2: $800,000
- Año 3: $2,000,000+

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

1. ✅ **Validar el modelo de negocio** con encuestas a usuarios potenciales
2. ✅ **Implementar onboarding personalizado** (mayor impacto/esfuerzo)
3. ✅ **Configurar RevenueCat** para suscripciones
4. ✅ **Desarrollar Decodificador 2.0**
5. ✅ **Lanzar beta privada** con 50 usuarios

---

**¿Listo para empezar? ¿Por dónde quieres que comencemos?** 🚀
