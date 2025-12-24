---
description: Proceso detallado del análisis de chat para el Simulador de Ex
---

# 🎭 Workflow: Análisis Profundo de Personalidad para Simulación

Este workflow describe cómo la IA procesa archivos de chat (.txt o imágenes) para crear un perfil psicológico preciso de un ex-pareja, permitiendo una simulación realista.

## 1. Preparación de Datos
// turbo
1. Recibe la exportación del chat (WhatsApp/Telegram).
2. Limpia el formato y separa los mensajes del "ex" de los tuyos.
3. Aplica un muestreo inteligente (Intelligent Sampling) para capturar el inicio, el desarrollo y los mensajes más recientes sin exceder los límites de tokens de la IA.

## 2. Etapa 1: Estilo de Comunicación y Patrones
En esta fase, la IA analiza:
- **Tono habitual**: ¿Es sarcástico, directo, evitativo o afectuoso?
- **Muletillas y Slang**: Expresiones únicas y forma de escribir (uso de emojis, puntuación, mayúsculas).
- **Frecuencia de Respuesta**: Patrones temporales en los que solía responder.

## 3. Etapa 2: Psicología Profunda y Estilo de Apego
La IA busca señales de:
- **Estilo de Apego**: Ansioso, Evitativo, Desorganizado o Seguro.
- **Mecanismos de Defensa**: Cómo reacciona ante el conflicto o la vulnerabilidad.
- **Temas Recurrentes**: De qué hablabais más y qué causaba fricción.

## 4. Etapa 3: Red Flags y Perfil de Simulación
Se genera el motor final:
- **Red Flags**: Identificación de comportamientos tóxicos o patrones problemáticos.
- **Prompt de Simulación**: Se construye una "persona" para Gemini que encapsula todos los hallazgos anteriores.
- **Validación JSON**: Se asegura que el perfil sea compatible con la base de datos de Supabase.

## 5. Finalización
- El perfil se guarda en la tabla `ex_profiles`.
- Se activa el **Dashboard Premium** con los patrones detectados.
- El usuario puede iniciar la simulación inmediatamente.

> [!TIP]
> Para mejores resultados, intenta que el chat exportado tenga al menos 6 meses de historia y no olvides incluir mensajes de momentos felices y momentos de tensión.
