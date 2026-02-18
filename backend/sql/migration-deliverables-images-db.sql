-- =====================================================
-- Migración: Imágenes de entregables en PostgreSQL
-- Guarda bytes de imagen en la DB (SistemadeTicketsConMatriz)
-- Schema: matrix
-- =====================================================

-- 1) Tabla temporal para uploads antes de asociar al entregable
CREATE TABLE IF NOT EXISTS matrix.deliverable_image_uploads (
  id BIGSERIAL PRIMARY KEY,
  data BYTEA NOT NULL,
  mimetype VARCHAR(100) NOT NULL,
  filename VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE matrix.deliverable_image_uploads
  IS 'Imágenes subidas temporalmente; se copian a deliverable_entries al crear/actualizar y se eliminan';

-- 2) Columnas para guardar imagen en deliverable_entries (BYTEA + mimetype)
ALTER TABLE matrix.deliverable_entries
  ADD COLUMN IF NOT EXISTS baseline_photo_before_data BYTEA NULL;

ALTER TABLE matrix.deliverable_entries
  ADD COLUMN IF NOT EXISTS baseline_photo_before_mimetype VARCHAR(100) NULL;

ALTER TABLE matrix.deliverable_entries
  ADD COLUMN IF NOT EXISTS baseline_photo_after_data BYTEA NULL;

ALTER TABLE matrix.deliverable_entries
  ADD COLUMN IF NOT EXISTS baseline_photo_after_mimetype VARCHAR(100) NULL;

COMMENT ON COLUMN matrix.deliverable_entries.baseline_photo_before_data IS 'Imagen antes (bytes); si no NULL se sirve desde DB';
COMMENT ON COLUMN matrix.deliverable_entries.baseline_photo_after_data IS 'Imagen después (bytes); si no NULL se sirve desde DB';
