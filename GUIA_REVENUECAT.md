# 💳 GUÍA DE INTEGRACIÓN DE REVENUECAT

## 📋 Paso 1: Crear Cuenta en RevenueCat

1. Ve a [https://www.revenuecat.com](https://www.revenuecat.com)
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto: "My Ex Coach"

---

## 📱 Paso 2: Configurar Productos en las Tiendas

### **Google Play Console (Android)**

1. Ve a [Google Play Console](https://play.google.com/console)
2. Crea tu app si aún no existe
3. Ve a **Monetización → Productos → Suscripciones**
4. Crea 4 productos:

```
Product ID: warrior_monthly
Name: Warrior Monthly
Price: $7.99 USD
Billing period: 1 month
Free trial: 3 days (opcional)

Product ID: warrior_yearly
Name: Warrior Yearly
Price: $79.99 USD
Billing period: 1 year

Product ID: phoenix_monthly
Name: Phoenix Monthly
Price: $14.99 USD
Billing period: 1 month
Free trial: 3 days (opcional)

Product ID: phoenix_yearly
Name: Phoenix Yearly
Price: $149.99 USD
Billing period: 1 year
```

### **App Store Connect (iOS)**

1. Ve a [App Store Connect](https://appstoreconnect.apple.com)
2. Crea tu app si aún no existe
3. Ve a **Features → In-App Purchases → Manage**
4. Crea los mismos 4 productos con los mismos IDs

---

## 🔧 Paso 3: Conectar RevenueCat con las Tiendas

### **En RevenueCat Dashboard:**

1. **Google Play:**
   - Ve a Project Settings → Google Play
   - Sube tu Service Account JSON key
   - Ingresa tu Package Name

2. **App Store:**
   - Ve a Project Settings → App Store
   - Ingresa tu App Bundle ID
   - Conecta con App Store Connect (Shared Secret)

---

## 📦 Paso 4: Configurar Productos en RevenueCat

1. Ve a **Products** en RevenueCat
2. Crea 2 "Offerings":

### **Offering 1: "default"**
```
Packages:
- warrior_monthly ($7.99/month)
- warrior_yearly ($79.99/year)
- phoenix_monthly ($14.99/month)
- phoenix_yearly ($149.99/year)
```

3. Crea 2 "Entitlements":

```
Entitlement: "warrior"
Products: warrior_monthly, warrior_yearly

Entitlement: "phoenix"
Products: phoenix_monthly, phoenix_yearly
```

---

## 💻 Paso 5: Instalar SDK en la App

```bash
npm install react-native-purchases
npx pod-install  # Solo iOS
```

---

## 🔑 Paso 6: Obtener API Keys

En RevenueCat Dashboard:
1. Ve a **Project Settings → API Keys**
2. Copia:
   - **Public SDK Key** (para la app)
   - **Secret Key** (para el backend, si lo usas)

---

## 📝 Paso 7: Implementar en el Código

### **Archivo: `lib/revenuecat.ts`**

```typescript
import Purchases, { 
    PurchasesOfferings, 
    PurchasesPackage,
    CustomerInfo 
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { SubscriptionTier } from './subscriptions';
import { supabase } from './supabase';

const REVENUECAT_API_KEY = Platform.select({
    ios: 'appl_XXXXXXXXXXXXXXXX',  // Tu iOS API Key
    android: 'goog_XXXXXXXXXXXXXXXX'  // Tu Android API Key
}) || '';

export async function initializeRevenueCat(userId: string) {
    try {
        await Purchases.configure({ 
            apiKey: REVENUECAT_API_KEY,
            appUserID: userId  // Importante: usar el user ID de Supabase
        });
        
        console.log('RevenueCat initialized');
    } catch (error) {
        console.error('Error initializing RevenueCat:', error);
    }
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
    try {
        const offerings = await Purchases.getOfferings();
        return offerings;
    } catch (error) {
        console.error('Error getting offerings:', error);
        return null;
    }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
    try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        
        // Update Supabase with new subscription
        await syncSubscriptionToSupabase(customerInfo);
        
        return true;
    } catch (error: any) {
        if (error.userCancelled) {
            console.log('User cancelled purchase');
        } else {
            console.error('Error purchasing:', error);
        }
        return false;
    }
}

export async function restorePurchases(): Promise<boolean> {
    try {
        const customerInfo = await Purchases.restorePurchases();
        await syncSubscriptionToSupabase(customerInfo);
        return true;
    } catch (error) {
        console.error('Error restoring purchases:', error);
        return false;
    }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
        const customerInfo = await Purchases.getCustomerInfo();
        return customerInfo;
    } catch (error) {
        console.error('Error getting customer info:', error);
        return null;
    }
}

async function syncSubscriptionToSupabase(customerInfo: CustomerInfo) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let tier: SubscriptionTier = SubscriptionTier.SURVIVOR;
        let expiresAt: string | null = null;

        // Check active entitlements
        if (customerInfo.entitlements.active['phoenix']) {
            tier = SubscriptionTier.PHOENIX;
            expiresAt = customerInfo.entitlements.active['phoenix'].expirationDate || null;
        } else if (customerInfo.entitlements.active['warrior']) {
            tier = SubscriptionTier.WARRIOR;
            expiresAt = customerInfo.entitlements.active['warrior'].expirationDate || null;
        }

        // Update Supabase
        await supabase
            .from('profiles')
            .update({
                subscription_tier: tier,
                subscription_status: 'active',
                subscription_expires_at: expiresAt
            })
            .eq('id', user.id);

        console.log('Subscription synced to Supabase:', tier);
    } catch (error) {
        console.error('Error syncing subscription:', error);
    }
}

// Listen to subscription changes
export function setupPurchaseListener(callback: (customerInfo: CustomerInfo) => void) {
    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        syncSubscriptionToSupabase(customerInfo);
        callback(customerInfo);
    });
}
```

---

## 🎨 Paso 8: Actualizar Paywall Screen

### **Archivo: `app/paywall.tsx`** (actualizar)

```typescript
import { getOfferings, purchasePackage } from '../lib/revenuecat';

export default function PaywallScreen() {
    const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadOfferings();
    }, []);

    const loadOfferings = async () => {
        const offers = await getOfferings();
        setOfferings(offers);
    };

    const handleSubscribe = async () => {
        if (!offerings || !selectedPlan) return;
        
        setLoading(true);
        try {
            const pkg = offerings.current?.availablePackages.find(
                p => p.identifier === `${selectedPlan}_${billingPeriod}`
            );
            
            if (pkg) {
                const success = await purchasePackage(pkg);
                if (success) {
                    Alert.alert('Success!', 'Welcome to ' + selectedPlan);
                    router.back();
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Could not complete purchase');
        } finally {
            setLoading(false);
        }
    };

    // ... rest of the component
}
```

---

## 🔄 Paso 9: Inicializar en App Startup

### **Archivo: `app/_layout.tsx`** (actualizar)

```typescript
import { initializeRevenueCat } from '../lib/revenuecat';

export default function RootLayout() {
    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await initializeRevenueCat(user.id);
            }
        }
        init();
    }, []);

    // ... rest of the component
}
```

---

## ✅ Paso 10: Testing

### **Modo Sandbox (Testing):**

**iOS:**
1. Settings → App Store → Sandbox Account
2. Crea un tester en App Store Connect
3. Usa ese email para probar compras

**Android:**
1. Google Play Console → Testing → License Testing
2. Añade tu email como tester
3. Instala la app desde Internal Testing track

### **Probar Flujos:**
```typescript
// Test purchase
const testPurchase = async () => {
    const offerings = await getOfferings();
    const pkg = offerings?.current?.monthly;
    if (pkg) {
        await purchasePackage(pkg);
    }
};

// Test restore
const testRestore = async () => {
    await restorePurchases();
};

// Check subscription status
const checkStatus = async () => {
    const info = await getCustomerInfo();
    console.log('Active entitlements:', info?.entitlements.active);
};
```

---

## 💰 Paso 11: Configurar Webhooks (Opcional pero Recomendado)

1. En RevenueCat: **Integrations → Webhooks**
2. Añade tu endpoint: `https://tu-api.com/webhooks/revenuecat`
3. Selecciona eventos:
   - `INITIAL_PURCHASE`
   - `RENEWAL`
   - `CANCELLATION`
   - `EXPIRATION`

### **Ejemplo de Webhook Handler (Backend):**

```typescript
// Supabase Edge Function o tu backend
export async function handleRevenueCatWebhook(req: Request) {
    const event = await req.json();
    
    switch (event.type) {
        case 'INITIAL_PURCHASE':
            // Usuario se suscribió
            await updateUserSubscription(event.app_user_id, event.product_id);
            break;
            
        case 'CANCELLATION':
            // Usuario canceló
            await markSubscriptionCancelled(event.app_user_id);
            break;
            
        case 'EXPIRATION':
            // Suscripción expiró
            await downgradeToFree(event.app_user_id);
            break;
    }
    
    return new Response('OK', { status: 200 });
}
```

---

## 📊 Paso 12: Analytics y Monitoreo

En RevenueCat Dashboard puedes ver:
- **MRR (Monthly Recurring Revenue)**
- **Churn Rate**
- **LTV (Lifetime Value)**
- **Conversion Rate**
- **Active Subscriptions**

---

## ⚠️ IMPORTANTE: Compliance

### **Google Play:**
- Debes usar Google Play Billing (RevenueCat lo hace automáticamente)
- Comisión: 15% (primer $1M/año), 30% después

### **App Store:**
- Debes usar StoreKit (RevenueCat lo hace automáticamente)
- Comisión: 15% (primer $1M/año), 30% después
- Año 2+: 15% si el usuario mantiene la suscripción

### **Políticas:**
- Ofrece opción de cancelar fácilmente
- Muestra claramente los precios
- Política de reembolso clara

---

## 🎯 CHECKLIST FINAL

- [ ] Cuenta de RevenueCat creada
- [ ] Productos creados en Google Play Console
- [ ] Productos creados en App Store Connect
- [ ] RevenueCat conectado a ambas tiendas
- [ ] Offerings y Entitlements configurados
- [ ] SDK instalado en la app
- [ ] API Keys configuradas
- [ ] Código de integración implementado
- [ ] Testing en Sandbox completado
- [ ] Webhooks configurados (opcional)
- [ ] Políticas de privacidad actualizadas
- [ ] Términos de servicio actualizados

---

## 🆘 TROUBLESHOOTING

### **Error: "Product not found"**
- Verifica que los Product IDs coincidan exactamente
- Asegúrate de que los productos estén "Active" en las consolas
- Espera 24-48h después de crear productos en App Store

### **Error: "User cancelled"**
- Normal, el usuario canceló la compra
- No es un error, solo loguéalo

### **Compras no se sincronizan:**
- Verifica que `appUserID` sea el mismo que en Supabase
- Revisa los webhooks en RevenueCat Dashboard
- Checa los logs de RevenueCat

---

## 📚 RECURSOS

- [RevenueCat Docs](https://docs.revenuecat.com)
- [React Native SDK](https://docs.revenuecat.com/docs/reactnative)
- [Testing Guide](https://docs.revenuecat.com/docs/sandbox)
- [Webhooks](https://docs.revenuecat.com/docs/webhooks)

---

**¿Listo para implementar? Sigue estos pasos en orden y tendrás pagos funcionando en 1-2 días.** 🚀
