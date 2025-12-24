# 🗄️ Supabase Setup - Ex Simulator Deep Profiles

## 📋 Instrucciones para Ejecutar la Migración

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Ir a Supabase Dashboard**
   - Abre https://supabase.com/dashboard
   - Selecciona tu proyecto: `mrabsfuwprxisgxfqnuy`

2. **Navegar al SQL Editor**
   - En el menú lateral, click en **"SQL Editor"**
   - Click en **"New query"**

3. **Copiar y Pegar el Script**
   - Abre el archivo: `supabase/migrations/20250119000000_add_ex_profiles_deep.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor

4. **Ejecutar**
   - Click en **"Run"** (Ctrl+Enter)
   - Espera a que ejecute (puede tardar ~5 segundos)
   - Deberías ver: ✅ "Success. No rows returned"

5. **Verificar**
   ```sql
   -- Ejecuta este query para verificar que se creó:
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name IN ('ex_profiles_deep', 'ex_simulator_conversations');
   ```
   - Deberías ver ambas tablas listadas

---

### Opción 2: Usando Supabase CLI (Avanzado)

```bash
# 1. Asegúrate de tener Supabase CLI instalado
supabase --version

# 2. Login (si no lo has hecho)
supabase login

# 3. Link a tu proyecto
supabase link --project-ref mrabsfuwprxisgxfqnuy

# 4. Aplicar migración
supabase db push

# 5. Verificar
supabase db diff
```

---

## 📊 Qué Hace Esta Migración

### 1. Tabla `ex_profiles_deep`
Almacena perfiles ultra-profundos analizados:

**Campos clave:**
- `basic_profile` (JSONB): Info básica + Big Five
- `family` (JSONB): Madre, padre, hermanos, mascotas
- `social_circle` (JSONB): Amigos, compañeros
- `routines` (JSONB): Horarios, comidas, actividades
- `emotions_topics` (JSONB): Preocupaciones, alegrías, temas
- `important_dates` (JSONB): Aniversarios, cumpleaños, eventos
- `relationship_dynamics` (JSONB): Apodos, poder, conflictos
- `voice_patterns` (JSONB): Frases, emojis, escritura

**Metadata:**
- `tokens_analyzed`: Tokens del chat original (hasta 900k)
- `tokens_in_prompt`: Tokens del prompt generado (100k-900k)
- `confidence_score`: Score de 0-1
- `analysis_cost_usd`: Costo del análisis

### 2. Tabla `ex_simulator_conversations`
Guarda historial de chats simulados:
- `messages` (JSONB): Array de mensajes
- `profile_id`: Referencia al perfil
- `last_message_at`: Última actividad

### 3. Funciones Helpers

**`get_deep_profile(profile_id)`**
```sql
-- Uso:
SELECT * FROM get_deep_profile('uuid-del-perfil');
```
Retorna perfil completo consolidado.

**`touch_profile(profile_id)`**
```sql
-- Uso:
SELECT touch_profile('uuid-del-perfil');
```
Actualiza `last_used_at` (para ordenar por uso reciente).

### 4. Row Level Security (RLS)
✅ Cada usuario solo ve sus propios perfiles  
✅ Protección automática de datos

---

## 🧪 Testing

Después de ejecutar la migración, prueba:

```sql
-- 1. Verificar tablas creadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ex_%';

-- 2. Verificar políticas RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('ex_profiles_deep', 'ex_simulator_conversations');

-- 3. Verificar índices
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('ex_profiles_deep', 'ex_simulator_conversations');

-- 4. Insertar perfil de prueba (cambia el UUID por tu user_id)
INSERT INTO ex_profiles_deep (
  user_id, 
  ex_name, 
  basic_profile,
  tokens_analyzed
) VALUES (
  'tu-user-id-aqui',
  'Test Profile',
  '{"test": true}'::jsonb,
  500000
);

-- 5. Verificar que se insertó
SELECT id, ex_name, tokens_analyzed 
FROM ex_profiles_deep 
WHERE user_id = 'tu-user-id-aqui';
```

---

## ⚠️ Troubleshooting

### Error: "relation already exists"
- La tabla ya existe. Puedes saltarte la migración.
- O ejecutar: `DROP TABLE ex_profiles_deep CASCADE;` y volver a correr.

### Error: "permission denied"
- Asegúrate de estar logueado en Supabase
- Verifica que tienes permisos de admin en el proyecto

### Error: "auth.uid() does not exist"
- Las políticas RLS necesitan que estés autenticado
- Usa service role key para bypass (solo en desarrollo)

---

## 🔄 Rollback (Si algo falla)

Si necesitas revertir la migración:

```sql
-- Cuidado: Esto borra TODOS los datos
DROP TABLE IF EXISTS ex_simulator_conversations CASCADE;
DROP TABLE IF EXISTS ex_profiles_deep CASCADE;
DROP FUNCTION IF EXISTS get_deep_profile CASCADE;
DROP FUNCTION IF EXISTS touch_profile CASCADE;
DROP FUNCTION IF EXISTS update_ex_profiles_deep_updated_at CASCADE;
```

---

## ✅ Checklist

- [ ] Migración ejecutada sin errores
- [ ] Tablas verificadas: `ex_profiles_deep`, `ex_simulator_conversations`
- [ ] Políticas RLS activas
- [ ] Índices creados
- [ ] Funciones helpers disponibles
- [ ] Test de inserción exitoso

---

## 📞 Soporte

Si tienes problemas, verifica:
1. Dashboard > Database > Tables (deberías ver las nuevas tablas)
2. Dashboard > Database > Policies (deberías ver las políticas RLS)
3. Console del navegador (busca errores)

**Proyecto:** `mrabsfuwprxisgxfqnuy`  
**URL:** `https://mrabsfuwprxisgxfqnuy.supabase.co`
