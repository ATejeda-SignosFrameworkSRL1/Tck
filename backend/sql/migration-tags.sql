-- =====================================================
-- Migración: Tags para tickets (PostgreSQL)
-- Schema: tick
-- Ejecutar después de tener tick.tickets creada
-- =====================================================

-- 1) Tabla tags
CREATE TABLE IF NOT EXISTS tick.tags (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#6366F1',
  icon VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name ON tick.tags(name);

-- 2) Tabla ticket_tags (relación muchos a muchos)
CREATE TABLE IF NOT EXISTS tick.ticket_tags (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES tick.tickets(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES tick.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ticket_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_tags_ticket_id ON tick.ticket_tags(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tags_tag_id ON tick.ticket_tags(tag_id);

COMMENT ON TABLE tick.tags IS 'Tags/etiquetas reutilizables para clasificar tickets';
COMMENT ON TABLE tick.ticket_tags IS 'Relación muchos a muchos entre tickets y tags';
