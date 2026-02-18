-- =====================================================
-- Migración: Tabla deliverable_entries + logos en projects
-- Schema: matrix, core
-- Ejecutar para el módulo Matriz de Entregables (CRUD)
-- =====================================================

-- 1) Tabla deliverable_entries
CREATE TABLE IF NOT EXISTS matrix.deliverable_entries (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  entry_number INT NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  phase INT NOT NULL DEFAULT 1,
  responsible_front VARCHAR(255) NOT NULL DEFAULT '',
  planned_delivery_date TIMESTAMP NULL,
  actual_delivery_date TIMESTAMP NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sin_iniciar',
  progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  elaboration_responsible_name VARCHAR(255) NOT NULL DEFAULT '',
  elaboration_responsible_org VARCHAR(255) NOT NULL DEFAULT '',
  acceptance_criteria TEXT NOT NULL DEFAULT '',
  review_instance_name VARCHAR(255) NOT NULL DEFAULT '',
  approval_instance_name VARCHAR(255) NOT NULL DEFAULT '',
  baseline_photo_before VARCHAR(512) NULL,
  baseline_photo_after VARCHAR(512) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deliverable_entries_project
  ON matrix.deliverable_entries(project_id);

COMMENT ON TABLE matrix.deliverable_entries
  IS 'Entradas de la Matriz de Entregables - CRUD completo por proyecto';

-- 2) Logos de empresa en projects
ALTER TABLE core.projects
  ADD COLUMN IF NOT EXISTS client_logo_url VARCHAR(1024) NULL;

ALTER TABLE core.projects
  ADD COLUMN IF NOT EXISTS company_logo_url VARCHAR(1024) NULL;

COMMENT ON COLUMN core.projects.client_logo_url IS 'URL del logo de la empresa cliente (ej: RSM)';
COMMENT ON COLUMN core.projects.company_logo_url IS 'URL del logo de la empresa propia (ej: Signos Framework)';
