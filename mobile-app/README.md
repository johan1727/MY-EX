# My Ex Coach - Mobile App

Una aplicación de React Native (Expo) para ayudar a usuarios a superar rupturas amorosas mediante IA.

## 🚀 Características

- **Chat Coach**: Asistente de IA (Gemini) con memoria de conversación
- **Decodificador de Mensajes**: Analiza mensajes de texto o screenshots
- **Botón de Pánico**: Ejercicio de respiración antes de contactar a tu ex
- **Racha de No Contacto**: Gamificación estilo Duolingo
- **Onboarding Inteligente**: Personaliza el coach según tu objetivo

## 📋 Requisitos Previos

- Node.js 18+
- npm o yarn
- Expo CLI
- Cuenta de Supabase
- API Key de Google Gemini

## 🛠️ Instalación

1. **Instalar dependencias**:
```bash
npm install
```

2. **Configurar variables de entorno**:
Crea un archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

Edita `.env` y agrega tus credenciales de Supabase:
```
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

3. **Iniciar la app**:
```bash
npx expo start
```

## 🗄️ Configuración de Backend

### Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ejecuta el SQL en `../supabase/migrations/20240523000000_initial_schema.sql`
3. Despliega la Edge Function:
```bash
cd ../supabase
supabase functions deploy chat-with-coach --project-ref tu-proyecto-ref
```

4. Configura el secreto de Gemini:
```bash
supabase secrets set GEMINI_API_KEY=tu-api-key
```

## 📱 Estructura del Proyecto

```
mobile-app/
├── app/
│   ├── (tabs)/          # Navegación principal
│   │   ├── index.tsx    # Chat Coach
│   │   ├── tools.tsx    # Herramientas
│   │   └── profile.tsx  # Perfil y Racha
│   ├── tools/
│   │   ├── decoder.tsx  # Decodificador de Mensajes
│   │   └── panic.tsx    # Botón de Pánico
│   ├── onboarding.tsx   # Selección de objetivo
│   └── _layout.tsx      # Layout raíz
├── components/
│   └── StreakCounter.tsx
├── lib/
│   └── supabase.ts      # Cliente de Supabase
└── package.json
```

## 🎨 Tecnologías

- **Frontend**: React Native + Expo SDK 50
- **Routing**: Expo Router v3
- **Styling**: NativeWind (TailwindCSS)
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **IA**: Google Gemini 1.5 Flash

## 🔐 Seguridad

- La API Key de Gemini está protegida en Supabase Edge Functions
- Row Level Security (RLS) habilitado en todas las tablas
- Autenticación mediante Supabase Auth

## 📝 Próximos Pasos

- [ ] Implementar autenticación completa (Login/Signup)
- [ ] Mejorar análisis de mensajes con Gemini Vision
- [ ] Agregar notificaciones push para la racha
- [ ] Sistema de suscripciones (Stripe/RevenueCat)
- [ ] Modo oscuro

## 📄 Licencia

Privado - Todos los derechos reservados
