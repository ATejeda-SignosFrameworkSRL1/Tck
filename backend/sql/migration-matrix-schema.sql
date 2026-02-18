-- =====================================================
-- Migración: Schema MATRIX - Sistema Integrado de Planificación y Ejecución (SIPE)
-- Ejecutar después de init-schemas.sql
-- =====================================================

-- Crear schema MATRIX (Matriz de Entregables, Gantt, Métricas)
CREATE SCHEMA IF NOT EXISTS matrix;
GRANT ALL ON SCHEMA matrix TO postgres;

-- =====================================================
-- 1. Tabla: matrix_items (Partidas WBS/EDT)
-- Estructura jerárquica auto-referencial
-- =====================================================
CREATE TABLE IF NOT EXISTS matrix.matrix_items (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES matrix.matrix_items(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,                   -- Código WBS: "1.1.2"
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  weight NUMERIC(5,2) DEFAULT 0,               -- Peso relativo (0-100)
  planned_start TIMESTAMP,
  planned_end TIMESTAMP,
  baseline_start TIMESTAMP,                    -- Línea base congelada
  baseline_end TIMESTAMP,
  actual_start TIMESTAMP,                      -- Calculado del primer ticket "En Progreso"
  actual_end TIMESTAMP,                        -- Calculado cuando todos los tickets están "Completado"
  progress_percentage NUMERIC(5,2) DEFAULT 0,  -- Auto-calculado
  is_milestone BOOLEAN DEFAULT false,
  is_critical_path BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'delayed', 'completed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matrix_items_project ON matrix.matrix_items(project_id);
CREATE INDEX IF NOT EXISTS idx_matrix_items_parent ON matrix.matrix_items(parent_id);

-- =====================================================
-- 2. Tabla: matrix_acceptance_criteria (Criterios de Aceptación)
-- =====================================================
CREATE TABLE IF NOT EXISTS matrix.matrix_acceptance_criteria (
  id BIGSERIAL PRIMARY KEY,
  matrix_item_id BIGINT NOT NULL REFERENCES matrix.matrix_items(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_met BOOLEAN DEFAULT false,
  verified_by_user_id BIGINT REFERENCES core.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acceptance_criteria_item ON matrix.matrix_acceptance_criteria(matrix_item_id);

-- =====================================================
-- 3. Tabla: matrix_dependencies (Dependencias para Gantt)
-- =====================================================
CREATE TABLE IF NOT EXISTS matrix.matrix_dependencies (
  id BIGSERIAL PRIMARY KEY,
  predecessor_id BIGINT NOT NULL REFERENCES matrix.matrix_items(id) ON DELETE CASCADE,
  successor_id BIGINT NOT NULL REFERENCES matrix.matrix_items(id) ON DELETE CASCADE,
  dependency_type VARCHAR(2) NOT NULL DEFAULT 'FS'
    CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
  lag_days INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(predecessor_id, successor_id)
);

CREATE INDEX IF NOT EXISTS idx_dependencies_predecessor ON matrix.matrix_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_successor ON matrix.matrix_dependencies(successor_id);

-- =====================================================
-- 4. Tabla: project_baselines (Líneas Base / Snapshots)
-- =====================================================
CREATE TABLE IF NOT EXISTS matrix.project_baselines (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_by_user_id BIGINT REFERENCES core.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baselines_project ON matrix.project_baselines(project_id);

-- =====================================================
-- 5. Tabla: baseline_snapshots (Foto individual de cada ítem)
-- =====================================================
CREATE TABLE IF NOT EXISTS matrix.baseline_snapshots (
  id BIGSERIAL PRIMARY KEY,
  baseline_id BIGINT NOT NULL REFERENCES matrix.project_baselines(id) ON DELETE CASCADE,
  matrix_item_id BIGINT NOT NULL REFERENCES matrix.matrix_items(id) ON DELETE CASCADE,
  planned_start TIMESTAMP,
  planned_end TIMESTAMP,
  weight NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_baseline ON matrix.baseline_snapshots(baseline_id);

-- =====================================================
-- 6. Modificar tabla tick.tickets: agregar campos SIPE
-- =====================================================

-- Agregar columna matrix_item_id (vínculo obligatorio a la Matriz)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tick' AND table_name = 'tickets' AND column_name = 'matrix_item_id'
  ) THEN
    ALTER TABLE tick.tickets ADD COLUMN matrix_item_id BIGINT REFERENCES matrix.matrix_items(id) ON DELETE SET NULL;
    CREATE INDEX idx_tickets_matrix_item ON tick.tickets(matrix_item_id);
  END IF;
END $$;

-- Agregar columna ticket_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tick' AND table_name = 'tickets' AND column_name = 'ticket_type'
  ) THEN
    ALTER TABLE tick.tickets ADD COLUMN ticket_type VARCHAR(20) DEFAULT 'task'
      CHECK (ticket_type IN ('task', 'milestone', 'correction', 'incident'));
  END IF;
END $$;

-- Agregar columna estimated_hours
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tick' AND table_name = 'tickets' AND column_name = 'estimated_hours'
  ) THEN
    ALTER TABLE tick.tickets ADD COLUMN estimated_hours NUMERIC(8,2) DEFAULT 0;
  END IF;
END $$;

-- Actualizar el enum de status para incluir 'in_review'
-- PostgreSQL no permite ALTER TYPE ... ADD VALUE dentro de transacción,
-- así que lo hacemos condicionalmente
DO $$
BEGIN
  -- Verificar si el valor ya existe en el enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'in_review'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'tickets_status_enum'
    )
  ) THEN
    ALTER TYPE tick.tickets_status_enum ADD VALUE IF NOT EXISTS 'in_review';
  END IF;
EXCEPTION
  WHEN others THEN
    -- Si el enum no existe como tipo nativo, ignorar
    NULL;
END $$;

-- =====================================================
-- 7. Expandir roles de usuario
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'supervisor'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'users_role_enum'
    )
  ) THEN
    ALTER TYPE core.users_role_enum ADD VALUE IF NOT EXISTS 'supervisor';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'collaborator'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'users_role_enum'
    )
  ) THEN
    ALTER TYPE core.users_role_enum ADD VALUE IF NOT EXISTS 'collaborator';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'client'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'users_role_enum'
    )
  ) THEN
    ALTER TYPE core.users_role_enum ADD VALUE IF NOT EXISTS 'client';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- =====================================================
-- Verificación
-- =====================================================
SELECT 'Schema matrix creado correctamente' AS resultado
WHERE EXISTS (
  SELECT 1 FROM information_schema.schemata WHERE schema_name = 'matrix'
);

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'matrix'
ORDER BY table_name;
