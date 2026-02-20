-- ============================================================
-- Migración: Módulo de Clientes + relación Project -> Client
-- Ejecutar en PostgreSQL antes de usar el módulo de Clientes
-- ============================================================

-- 1. Tabla core.clients (si no existe)
CREATE TABLE IF NOT EXISTS core.clients (
  id         serial       PRIMARY KEY,
  name       varchar(255) NOT NULL,
  description text,
  contact_name varchar(255),
  contact_email varchar(255),
  contact_phone varchar(100),
  logo_url   text,
  is_active  boolean      DEFAULT true,
  created_at timestamp    DEFAULT now(),
  updated_at timestamp    DEFAULT now()
);

-- 2. Columnas nuevas para el CRUD de clientes
ALTER TABLE core.clients ADD COLUMN IF NOT EXISTS business_name varchar(255);
ALTER TABLE core.clients ADD COLUMN IF NOT EXISTS identification varchar(100);

-- Índice único en identification (parcial: solo no nulos)
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_identification
  ON core.clients (identification) WHERE identification IS NOT NULL;

-- 3. Columna client_id en core.projects
ALTER TABLE core.projects ADD COLUMN IF NOT EXISTS client_id bigint;

-- FK projects -> clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_projects_client_id'
      AND table_schema = 'core'
      AND table_name = 'projects'
  ) THEN
    ALTER TABLE core.projects
      ADD CONSTRAINT fk_projects_client_id
      FOREIGN KEY (client_id) REFERENCES core.clients(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Índice en client_id para performance
CREATE INDEX IF NOT EXISTS idx_projects_client_id
  ON core.projects (client_id);
