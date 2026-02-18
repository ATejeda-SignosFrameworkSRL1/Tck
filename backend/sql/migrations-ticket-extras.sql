-- =====================================================
-- Migraciones para extensión de tickets (PostgreSQL)
-- Schema: tick
-- Ejecutar después de tener tick.tickets creada
-- =====================================================

-- 1) Agregar columna start_date a tickets
ALTER TABLE tick.tickets
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMP NULL;

-- 2) Tabla ticket_checklist_items
CREATE TABLE IF NOT EXISTS tick.ticket_checklist_items (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES tick.tickets(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_checklist_ticket_id
  ON tick.ticket_checklist_items(ticket_id);

-- 3) Tabla ticket_attachments
CREATE TABLE IF NOT EXISTS tick.ticket_attachments (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES tick.tickets(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT NOT NULL,
  storage_path VARCHAR(512) NOT NULL,
  uploaded_by_user_id BIGINT NULL REFERENCES core.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id
  ON tick.ticket_attachments(ticket_id);

COMMENT ON COLUMN tick.tickets.start_date IS 'Fecha de inicio del ticket';
COMMENT ON TABLE tick.ticket_checklist_items IS 'Items de checklist por ticket';
COMMENT ON TABLE tick.ticket_attachments IS 'Archivos adjuntos por ticket';
