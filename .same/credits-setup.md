# Sistema de Créditos - Setup SQL

## Ejecutar en Supabase SQL Editor

```sql
-- ============================================
-- PASO 1: Agregar columnas de créditos a profiles
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_limit INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS trials_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_reset_date TIMESTAMPTZ;

-- ============================================
-- PASO 2: Crear tabla de transacciones de créditos
-- ============================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- Positivo para agregar, negativo para deducir
  type TEXT NOT NULL CHECK (type IN ('purchase', 'license_30d', 'license_permanent', 'adjustment', 'refund')),
  description TEXT,
  license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_credit_transactions_profile ON credit_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- ============================================
-- PASO 3: RLS para credit_transactions
-- ============================================
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Super admin ve todo
CREATE POLICY "credit_transactions_super_admin" ON credit_transactions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Otros usuarios ven solo sus propias transacciones
CREATE POLICY "credit_transactions_own" ON credit_transactions
FOR SELECT USING (
  profile_id = auth.uid()
);

-- ============================================
-- PASO 4: Dar créditos iniciales a revendedores existentes (opcional)
-- ============================================
-- UPDATE profiles SET credits = 10, trial_limit = 20 WHERE role = 'admin';
```

## Cómo Funciona el Sistema

### Costos:
| Tipo de Licencia | Costo |
|------------------|-------|
| 30 días | 1 crédito |
| Permanente | 10 créditos |
| Prueba | Gratis (límite mensual) |

### Para el Super Admin:
1. Ve a `/credits` para gestionar créditos
2. Agrega créditos a revendedores cuando te paguen
3. Configura el límite de pruebas por revendedor

### Para Revendedores:
1. Ven su balance de créditos al crear licencias
2. No pueden crear licencias si no tienen créditos suficientes
3. Las pruebas se resetean automáticamente cada mes

### Paquetes Sugeridos:
| Paquete | Precio | Por Licencia |
|---------|--------|--------------|
| 10 créditos | $250 | $25 |
| 25 créditos | $500 | $20 |
| 50 créditos | $875 | $17.50 |
| 100 créditos | $1,500 | $15 |
