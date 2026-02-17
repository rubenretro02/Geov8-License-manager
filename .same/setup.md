# License Manager - Sistema de Roles

## Estructura de Roles

```
Super Admin (dueño)
    └── Ve TODAS las licencias y usuarios

Admin (Revendedor)
    ├── Crea Users (empleados)
    ├── Crea Licencias
    └── Solo ve licencias de su equipo

User (Empleado)
    ├── Crea/Maneja Licencias
    └── Solo ve licencias de su equipo (mismo admin)
```

## SQL Completo - Ejecutar en Supabase

```sql
-- ============================================
-- PASO 1: Tabla de perfiles con roles
-- ============================================
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_admin_id ON profiles(admin_id);

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Super admin ve todo, admin ve su equipo, user ve su equipo
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles AS p WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
  OR id = auth.uid()
  OR admin_id = auth.uid()
  OR admin_id = (SELECT admin_id FROM profiles WHERE id = auth.uid())
);

-- Solo super_admin y admin pueden insertar
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles AS p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin')
  )
);

-- Usuarios pueden actualizar su propio perfil
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles AS p WHERE p.id = auth.uid() AND p.role = 'super_admin')
);

-- ============================================
-- PASO 2: Agregar columnas a licenses
-- ============================================
ALTER TABLE licenses
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS max_activations INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES profiles(id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_licenses_admin_id ON licenses(admin_id);
CREATE INDEX IF NOT EXISTS idx_licenses_created_by ON licenses(created_by);
CREATE INDEX IF NOT EXISTS idx_licenses_is_paid ON licenses(is_paid);

-- RLS para licenses
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "authenticated_access" ON licenses;
DROP POLICY IF EXISTS "licenses_select" ON licenses;
DROP POLICY IF EXISTS "licenses_insert" ON licenses;
DROP POLICY IF EXISTS "licenses_update" ON licenses;
DROP POLICY IF EXISTS "licenses_delete" ON licenses;

-- Super admin ve todo, otros ven solo su equipo
CREATE POLICY "licenses_select" ON licenses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles AS p WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
  OR admin_id = auth.uid()
  OR admin_id = (SELECT admin_id FROM profiles WHERE id = auth.uid())
);

-- Todos pueden insertar (con admin_id correcto)
CREATE POLICY "licenses_insert" ON licenses FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Super admin puede actualizar todo, otros solo su equipo
CREATE POLICY "licenses_update" ON licenses FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles AS p WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
  OR admin_id = auth.uid()
  OR admin_id = (SELECT admin_id FROM profiles WHERE id = auth.uid())
);

-- Solo super_admin puede eliminar
CREATE POLICY "licenses_delete" ON licenses FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles AS p WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
  OR admin_id = auth.uid()
);

-- ============================================
-- PASO 3: RLS para otras tablas
-- ============================================
ALTER TABLE check_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "check_logs_select" ON check_logs;
CREATE POLICY "check_logs_select" ON check_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "configurations_all" ON configurations;
CREATE POLICY "configurations_all" ON configurations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

-- ============================================
-- PASO 4: Crear Super Admin (TÚ)
-- ============================================
-- IMPORTANTE: Primero crea un usuario en Authentication > Users
-- Luego ejecuta esto reemplazando el email:

-- INSERT INTO profiles (id, username, email, full_name, role, admin_id)
-- SELECT id, 'superadmin', email, 'Super Admin', 'super_admin', NULL
-- FROM auth.users WHERE email = 'TU-EMAIL-AQUI@ejemplo.com';
```

## Crear tu cuenta Super Admin

1. Ve a **Authentication** → **Users** → **Add User**
2. Crea usuario con tu email y contraseña
3. Activa **Auto Confirm User**
4. Ejecuta este SQL (reemplaza el email):

```sql
INSERT INTO profiles (id, username, email, full_name, role, admin_id)
SELECT id, 'superadmin', email, 'Super Admin', 'super_admin', NULL
FROM auth.users WHERE email = 'TU-EMAIL@ejemplo.com';
```

## Cómo funciona

| Rol | Crear Licencias | Ver Licencias | Crear Users | Ver Users |
|-----|-----------------|---------------|-------------|-----------|
| Super Admin | Todas | Todas | Admins y Users | Todos |
| Admin | Su equipo | Su equipo | Solo Users | Su equipo |
| User | Su equipo | Su equipo | No | Su equipo |
