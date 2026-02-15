# 🔧 Cambios Temporales para Testing Web

## ⚠️ RECORDATORIO: Volver a Activar Después de Probar

Este archivo documenta los cambios temporales para probar la detección de idioma en web.

## 📝 Plugins Desactivados Temporalmente

### En `app.json` - Sección `plugins`:

**ANTES (versión completa):**
```json
"plugins": [
  "expo-router",
  "expo-secure-store",
  "expo-share-intent",        // ← COMENTADO TEMPORALMENTE
  "expo-share-intent",        // ← COMENTADO TEMPORALMENTE (duplicado)
  "@react-native-community/datetimepicker",
  "@siteed/expo-audio-studio", // ← COMENTADO TEMPORALMENTE
  "expo-localization"
]
```

**DESPUÉS (para testing web):**
```json
"plugins": [
  "expo-router",
  "expo-secure-store",
  // "expo-share-intent",        // DESACTIVADO PARA TESTING WEB
  // "expo-share-intent",        // DESACTIVADO PARA TESTING WEB
  "@react-native-community/datetimepicker",
  // "@siteed/expo-audio-studio", // DESACTIVADO PARA TESTING WEB
  "expo-localization"
]
```

## 🔄 Para RESTAURAR después de probar:

1. Abrir `mobile-app/app.json`
2. Descomentar las 3 líneas:
   - `"expo-share-intent"`
   - `"expo-share-intent"` (duplicado - necesario para el plugin)
   - `"@siteed/expo-audio-studio"`
3. Guardar archivo
4. Reiniciar servidor: `npx expo start --clear`

## ⚡ Comando rápido para restaurar:

```bash
# Abrir app.json y buscar las líneas comentadas con //
# Quitar los // de las 3 líneas mencionadas arriba
```

## 📋 Checklist de Restauración

- [ ] Descomentar `expo-share-intent` (primera línea)
- [ ] Descomentar `expo-share-intent` (segunda línea - duplicado)
- [ ] Descomentar `@siteed/expo-audio-studio`
- [ ] Guardar `app.json`
- [ ] Reiniciar servidor con `npx expo start --clear`
- [ ] Verificar que importación de chat funcione en móvil

## 💡 Funcionalidades que NO funcionarán mientras esté desactivado:

- ❌ Importar chats desde WhatsApp (compartir archivo → REMI)
- ❌ Entrada de voz (si estaba implementada)

## ✅ Lo que SÍ funcionará en web durante el testing:

- ✅ Detección automática de idioma
- ✅ Cambio manual de idioma
- ✅ Todas las traducciones (español/inglés)
- ✅ Chat con AI Coach
- ✅ Herramientas básicas

---

**Fecha de desactivación:** 21 de enero, 2026
**Razón:** Testing de detección de idioma en navegador web
**Duración esperada:** Temporal - restaurar después de probar
