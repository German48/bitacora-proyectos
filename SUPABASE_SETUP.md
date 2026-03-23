# Configuración de Supabase para login multiusuario

## Qué ha cambiado

Cada usuario de la app tendrá ahora sus propios datos aislados en la tabla `proyectos_bitacora`.
El campo `id` del registro ya **no es `'bitacora-main'`**, sino el **UUID del usuario autenticado** (`user_id`).

---

## Pasos a ejecutar en el Dashboard de Supabase

Ve a **Supabase Dashboard → SQL Editor** y ejecuta los siguientes bloques:

### 1. Añadir columna `user_id`

```sql
ALTER TABLE proyectos_bitacora
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
```

### 2. Habilitar Row Level Security (RLS)

```sql
ALTER TABLE proyectos_bitacora ENABLE ROW LEVEL SECURITY;
```

### 3. Crear política de aislamiento por usuario

```sql
CREATE POLICY "users_own_data"
  ON proyectos_bitacora
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Esta política garantiza que cada usuario solo puede **ver y modificar** sus propios registros.

---

## Migración de datos existentes (opcional)

Si tienes datos en el registro antiguo `id = 'bitacora-main'`, puedes migrarlos
asignándolos a un usuario existente. Sustituye `'<UUID_DEL_USUARIO>'` por el
UUID real que ves en **Authentication → Users**:

```sql
UPDATE proyectos_bitacora
SET
  id = '<UUID_DEL_USUARIO>',
  user_id = '<UUID_DEL_USUARIO>'
WHERE id = 'bitacora-main';
```

---

## Notas

- La columna `user_id` debe coincidir con `id` para que RLS funcione correctamente
  (el código inserta ambos con el mismo valor al guardar).
- Si el email de confirmación está activado en tu proyecto Supabase, los nuevos
  usuarios deberán confirmar su cuenta antes de poder iniciar sesión.
- Para desactivar la confirmación de email (más cómodo para uso privado):
  **Authentication → Providers → Email → Disable email confirmations**.
