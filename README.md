# 💔 REMI - AI-Powered Emotional Recovery Assistant

> **Heal, grow, and find your path forward with personalized AI coaching and Ex-Simulation**

[![Status](https://img.shields.io/badge/Status-Production-green.svg)]()
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android%20%7C%20Web-lightgrey.svg)]()
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)]()

---

## 🎯 Overview

**REMI** (formerly My Ex Coach) is a comprehensive mobile application designed to help individuals navigate emotional recovery. Powered by advanced AI technology (Gemini 2.0 Flash) and gamification mechanics, the app provides personalized support, practical tools, and evidence-based strategies for healing and personal growth.

### 🌟 Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Coach (REMI)** | 24/7 personalized emotional support |
| 👤 **Ex-Simulator** | Realistic conversation simulation with AI-cloned personality |
| 🔍 **Message Decoder** | Analyze messages with AI-powered insights |
| 🚨 **Panic Button** | 60-second intervention to prevent impulsive contact |
| 📔 **Intelligent Journal** | Track emotions with weekly AI analysis |
| 🎮 **Gamification** | 9 milestone achievements to track progress |
| 🔒 **Secret Vault** | Protected memories with PIN/FaceID |

---

## 🤖 Ex-Simulator (Flagship Feature)

The **Ex-Simulator** is REMI's most advanced feature, allowing users to practice conversations with an AI that replicates their ex's (or any person's) communication style.

### How It Works

1. **Import Chat** - Upload WhatsApp/Telegram export (TXT/JSON)
2. **AI Analysis** - Deep psychological profiling (16 stages):
   - Relationship Type Detection (ex, friend, family, deceased)
   - Big Five Personality Traits
   - Attachment Style Analysis
   - Love Language Detection
   - Emotional Intelligence Mapping
   - MBTI-inspired Patterns
   - Linguistic Fingerprint
   - Cognitive Patterns
   - Manipulation Pattern Detection
   - **Dark Triad Analysis** (Narcissism, Machiavellianism, Psychopathy)
   - **Shadow Psychology** (Jung - repressed traits)
3. **Simulate** - Practice conversations with AI clone

### Supported Relationship Types

| Type | Description |
|------|-------------|
| `ex` | Former romantic partner |
| `partner` | Current romantic partner |
| `friend` | Friend |
| `crush` | Romantic interest |
| `family_parent` | Parent (father/mother) |
| `family_sibling` | Sibling |
| `family_other` | Other family member |
| `deceased` | Someone who passed away |
| `acquaintance` | Casual acquaintance |

### Parser Features

- ✅ Multi-line message support (captures full paragraphs)
- ✅ Multiple WhatsApp formats (Android, iOS, Spanish, etc.)
- ✅ Telegram JSON export support
- ✅ Instagram DM support

---

## 💰 Subscription Plans

| Feature | Survivor (Free) | Rising ($4.99/mo) | Phoenix ($9.99/mo) |
|---------|----------------|-------------------|-------------------|
| Daily Messages | 10 | 100 | 500 |
| Ex-Simulators | 1 | 3 | Unlimited |
| Message Decoder | 1/week | Unlimited | Unlimited |
| AI Analysis Depth | Basic | Advanced | Complete |
| Dark Triad Analysis | ❌ | ❌ | ✅ |
| Shadow Analysis | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |

---

## 🛠 Tech Stack

### Frontend
- **Framework:** React Native (Expo SDK 52)
- **Routing:** Expo Router v3
- **Styling:** NativeWind (Tailwind CSS)
- **Animations:** React Native Reanimated

### Backend
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (Email, Google, Discord)
- **Storage:** Supabase Storage
- **Real-time:** Supabase Realtime

### AI & APIs
- **Primary AI:** Google Gemini 2.0 Flash Exp
- **Fallback AI:** OpenAI GPT-4o-mini
- **Payments:** RevenueCat (iOS/Android)
- **Vector Search:** Supabase pgvector

### Security
- Row Level Security (RLS) on all tables
- Secure API key management
- GDPR-compliant data export/deletion

---

## 🚀 Quick Start

```bash
# Clone and install
cd my-ex-coach/mobile-app
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run development server
npx expo start

# Build for production
npx eas-cli build --platform android --profile production
```

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_revenuecat_key
```

---

## 📊 Project Status

### ✅ Completed
- Ex-Simulator with 16-stage psychological analysis
- Multi-line WhatsApp parsing
- Relationship type detection (9 types)
- Dark Triad and Shadow analysis
- Message limits for free users
- Account deletion (GDPR)
- Data export (GDPR)
- Animated splash screen
- API retry with exponential backoff

### 🔄 In Progress
- RevenueCat product configuration
- Google Play Console setup

### 📅 Planned
- Push notifications
- Offline mode
- Community features

---

## 📄 License

Proprietary - All rights reserved

---

## 👥 Team

- **Development:** AI-Powered Development
- **AI Integration:** Google Gemini 2.0 Flash

---

**Made with 💔 and 🤖 to help people heal and grow stronger**