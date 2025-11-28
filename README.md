# 💔 My Ex Coach - AI-Powered Breakup Recovery Assistant

> **Heal, grow, and find your path forward with personalized AI coaching**

[![Status](https://img.shields.io/badge/Status-Beta-blue.svg)]()
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android%20%7C%20Web-lightgrey.svg)]()
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

---

## 🎯 Overview

**My Ex Coach** is a comprehensive mobile application designed to help individuals navigate the emotional journey of breakup recovery. Powered by advanced AI technology and gamification mechanics, the app provides personalized support, practical tools, and evidence-based strategies for healing and personal growth.

### Key Features

- 🤖 **AI-Powered Chat Coach** - Personalized emotional support available 24/7
- 🔍 **Message Decoder 2.0** - Analyze messages from your ex with AI-powered insights
- 🚨 **Panic Button** - 60-second intervention system to prevent impulsive contact
- 🎮 **Gamification System** - 9 milestone achievements to track your progress
- 📝 **Intelligent Mood Journal** - Track emotions with weekly AI-generated insights
- 📊 **Progress Tracking** - Visual representation of your healing journey
- 💎 **Premium Features** - Advanced tools for accelerated recovery

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Expo CLI
- Supabase account
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd my-ex-coach/mobile-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
# Execute the SQL files in supabase-migrations/ in order

# Start the development server
npx expo start
```

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key
```

---

## 📱 Features

### Core Functionality

#### 1. **Personalized Onboarding**
- 6-question empathetic assessment
- Customizes AI responses based on user context
- Tracks breakup timeline and emotional state

#### 2. **AI Chat Coach**
- Context-aware conversations
- Crisis detection and intervention
- Personalized advice based on healing stage
- Token optimization for cost efficiency (60-70% savings)

#### 3. **Message Decoder 2.0**
- Analyzes messages from ex-partners
- Identifies manipulation tactics and red flags
- Provides 3 types of suggested responses:
  - No Contact
  - Friendly but Distant
  - Definitive Closure

#### 4. **Advanced Panic Button**
- 60-second countdown intervention
- Rotating motivational messages
- Alternative action suggestions
- Prevents impulsive contact decisions

#### 5. **Gamification & Milestones**
- 9 achievement levels (1 day to 365 days)
- Animated celebrations with confetti
- Progress tracking visualization
- Persistent achievement system

#### 6. **Intelligent Mood Journal**
- Daily mood tracking (1-10 scale)
- 10 emotion categories
- Weekly mood visualization charts
- AI-generated weekly analysis with:
  - Average mood and trends
  - Pattern recognition
  - Personalized recommendations

---

## 💰 Business Model

### Subscription Tiers

| Feature | Survivor (Free) | Warrior ($7.99/mo) | Phoenix ($14.99/mo) |
|---------|----------------|-------------------|-------------------|
| Daily Messages | 10 | Unlimited | Unlimited |
| Message Decoder | 1/week | Unlimited | Unlimited |
| Mood Journal | ✅ Basic | ✅ Advanced | ✅ Advanced |
| Weekly Analysis | ❌ | ✅ | ✅ Daily |
| Secret Vault | ❌ | ✅ | ✅ |
| Export Journal | ❌ | ✅ | ✅ PDF |
| Coaching Sessions | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |

### Revenue Projections

**Target: 10,000 active users**
- 6,000 Free users (60%)
- 3,200 Warrior users (32%) → $25,568/month
- 800 Phoenix users (8%) → $11,992/month

**Total MRR:** $37,560 ($450,720/year)  
**Estimated Costs:** ~$27,000/year (API, infrastructure)  
**Net Profit:** ~$423,720/year (94% margin)

---

## 🛠 Tech Stack

### Frontend
- **Framework:** React Native (Expo SDK 50+)
- **Routing:** Expo Router v3
- **Styling:** NativeWind (Tailwind CSS)
- **State Management:** React Hooks
- **Charts:** react-native-chart-kit
- **Animations:** Expo Linear Gradient

### Backend
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **Real-time:** Supabase Realtime

### AI & APIs
- **AI Model:** OpenAI GPT-4o-mini
- **Payments:** RevenueCat (iOS/Android)
- **Analytics:** (To be implemented)

### Security
- Row Level Security (RLS) on all tables
- Encrypted API keys
- Secure authentication flow

---

## 📊 Project Status

### Completed Features (100%)

**Phase 1: Foundation**
- ✅ Personalized onboarding (6 questions)
- ✅ Subscription system (3 tiers)
- ✅ Premium paywall screen
- ✅ AI prompt personalization
- ✅ Usage limits by tier
- ✅ Crisis detection

**Phase 2: Advanced Features**
- ✅ Message Decoder 2.0
- ✅ Panic Button 2.0
- ✅ Chat with limits
- ✅ RevenueCat integration (code ready)

**Phase 3: Gamification & Premium**
- ✅ Milestone system (9 levels)
- ✅ Achievement celebrations
- ✅ Intelligent mood journal
- ✅ Weekly AI analysis
- ✅ Token optimization (60-70% savings)

### In Progress
- ⏳ RevenueCat payment configuration
- ⏳ Beta testing
- ⏳ App Store/Play Store submission

### Planned Features
- 📅 Push notifications
- 📅 Secret vault with PIN/FaceID
- 📅 PDF journal export
- 📅 Offline mode
- 📅 Anonymous community
- 📅 Spotify integration

---

## 📖 Documentation

- **[Testing Guide](GUIA_DE_PRUEBAS.md)** - Comprehensive testing instructions
- **[RevenueCat Setup](GUIA_REVENUECAT.md)** - Payment integration guide
- **[Complete Roadmap](ROADMAP_COMPLETO.md)** - Full feature plan
- **[Implementation Summary](IMPLEMENTACION_FINAL.md)** - Project status
- **[Quick Start](INICIO_RAPIDO.md)** - Get started quickly

---

## 🧪 Testing

### Running Tests

```bash
# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run on web
npx expo start --web
```

### Test Checklist

- [ ] Complete onboarding flow
- [ ] Send 11 messages (test limits)
- [ ] Decode a message
- [ ] Activate panic button
- [ ] View milestones in Progress
- [ ] Create journal entry
- [ ] Generate weekly analysis
- [ ] Test paywall screen

---

## 🚀 Deployment

### Prerequisites
1. Execute all Supabase migrations
2. Configure RevenueCat
3. Set up App Store/Play Store accounts
4. Create subscription products

### Build Commands

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for both
eas build --platform all
```

---

## 📄 License

Proprietary - All rights reserved

---

## 👥 Team

- **Development:** AI-Powered Development Team
- **Design:** Modern UI/UX Principles
- **AI Integration:** OpenAI GPT-4o-mini

---

## 📞 Support

For support, please contact: [support@myexcoach.com](mailto:support@myexcoach.com)

---

## 🙏 Acknowledgments

- OpenAI for GPT-4o-mini API
- Supabase for backend infrastructure
- Expo team for the amazing framework
- RevenueCat for subscription management

---

**Made with 💔 and 🤖 to help people heal and grow stronger**