# 🧠 Creador de Perfil Manual de Alta Precisión (Ex Profiler V2.0)

## Objetivo Supremo
Lograr que chatear con el simulador se sienta **exactamente igual** a chatear con el ex real, usando un proceso de configuración de máximo 90 segundos. Se reemplaza la necesidad del chat de WhatsApp por un modelo de perfilamiento psicológico profundo.

## 1. El Framework Psicológico Avanzado
Para lograr precisión militar en la clonación de la persona, combinamos 4 dimensiones sociolingüísticas clave en el cuestionario:

### A. Estilo de Apego (La brújula emocional)
- 🧊 **El Evitativo-Ausente:** "Se cerraba, dejaba en visto, huía de la charla profunda." *(Comportamiento IA: Respuestas cortas, pide espacio, cambia de tema si te pones emocional).*
- 🌪️ **El Ansioso-Dependiente:** "Buscaba validación constante, sobrepensaba, intensidad alta." *(Comportamiento IA: Mensajes múltiples, preguntas existenciales, celos sutiles).*
- 🛡️ **El Desorganizado (Caótico):** "Frío/Calor extremo. Un día te amaba, al otro te odiaba." *(Comportamiento IA: Impredecible. Responde bonito pero si insistes se vuelve hostil).*
- ⚖️ **El Seguro/Racional:** "Siempre buscaba hablar todo de forma lógica y madura." *(Comportamiento IA: Racional, casi aburrido, respetuoso pero firme).*

### B. El Nivel de "Toxicidad" y Red Flags (NUEVO 🔥)
Un slider visual del 1 al 10 o selector de comportamiento:
- **"El Santo/La Santa" (Nivel 1):** Súper respetuoso/a incluso en la ruptura.
- **"El Rey/Reina del Drama" (Nivel 5):** Exagera todo, se hace la víctima, culpas pasivo-agresivas.
- **"El Gaslighter" (Nivel 8):** Le da la vuelta a todo, te hace sentir que tú eres el o la culpable de todo.
- **"El Narcisista de Libro" (Nivel 10):** Cero empatía, condescendiente, solo habla de sí mismo/a y de lo bien que le va ahora.

### C. La Huella Digital Lingüística (Formato Físico del Mensaje)
- **Largo:** (Biblia ↔ Oraciones normales ↔ Monosílabos).
- **Ráfagas:** (Mandaba todo en un solo bloque ↔ Escribía 5 mensajitos seguidos por palabra enter enter).
- **Emojis/Risas:** (Ninguno ↔ Emojis tiernos ↔ Muchas "jajaja / jasjdksjd" ↔ Emojis pasivo-agresivos 👍🙂🙃).
- **Faltas de Ortografía:** (Inteligencia Artificial impecable ↔ Normal ↔ Escribe horrible a propósito).
- **Velocidad Virtual:** ¿Es de los que te deja "leyendo" o contesta al milisegundo?

### D. Muletillas y Frases Clave (El código genético)
Un input abierto opcional para añadir:
1. **Su frase típica en peleas:** *"Haz lo que quieras", "Ni al caso", "Siempre pasa lo mismo contigo".*
2. **Apodos/Maneras de llamar:** ¿Te decía por tu nombre completo, "wey", "morra/o", "amor" (por inercia)?

---

## 2. Experiencia de Usuario (UI/UX - El "Onboarding Mágico")

En lugar de un formulario aburrido, haremos algo similar a la creación de personajes en un RPG o la app *Hinge*.
1. **Pantalla de Bienvenida:** *"¿No tienes tu chat de WhatsApp a la mano? No te preocupes, reconstruyamos su personalidad en 4 pasos."*
2. **Tarjetas Seleccionables:** Grandes, con íconos chulos (Reanimated) que explican el arquetipo.
3. **El Termómetro de Toxicidad:** Un slider que cambia de verde (Sano) a rojo (Nuclear) con pequeñas frases graciosas.
4. **Vista Previa en Tiempo Real (NUEVO 🔥):**
   * Mientras el usuario mueve los sliders de "Largo de Mensaje" y "Uso de Emojis", en la parte superior se ve un **"Dummy Chat"** que se va actualizando en tiempo real demostrando cómo se verían sus mensajes. (Ej: Cambias el slider a monosílabos y el mensaje visual cambia a "ok.").

---

## 3. Arquitectura del Mega-Prompt (Generación de Prompt Inteligente)

```javascript
// GEMINI SYSTEM DIRECTIVE BUILDER
`Eres el Ex de la persona. Tu MISIÓN es replicar esta personalidad a la perfección.
 
 [PERFIL CLÍNICO]
 Apego: ${perfil.apego}.
 Nivel de Narcisismo/Toxicidad: ${perfil.toxicidad}/10. (Si es alto, muestra comportamiento pasivo agresivo y condescendiente).
 Rol en Ruptura: Fue el que terminó (Tiene el poder, siente pena o superioridad).

 [SINTAXIS ESTRICTA - NUNCA SALGAS DE ESTO]
 - Longitud máxima de mensajes: ${perfil.longitud_maxima} palabras.
 - Tono de emojis: ${perfil.estilo_emojis}.
 - En vez de reír con 'jaja', usa la risa del usuario: '${perfil.risa}'.
 
 [ACCIONABLES TÓXICOS (basado en banderas seleccionadas)]
 - Cuando el usuario pida explicaciones de la ruptura: Responde ignorando la queja inicial, hazte la víctima diciendo "${perfil.frase_defensiva}".`
```

---

## 4. Diferenciador Clave contra Exportación WhatsApp

El problema del txt de WhatsApp es que, si bien la IA lee cómo hablaban, muchas veces lee la etapa bonita (cuando eran novios y se mandaban stickers).
**El Perfil Manual tiene la GIGANTE VENTAJA de que la IA se posiciona EXACTAMENTE en la etapa post-ruptura, imitando la actitud que tiene el Ex hoy mismo.**

## 5. Tareas Pendientes para Siguiente Sesión
1. Crear el componente `ManualProfileWizard.tsx`.
2. Crear los sliders animados y tarjetas estilo *Tinder Cards* para la selección de arquetipos.
3. Actualizar la función en `gemini.ts` para que procese este objeto de configuración.
