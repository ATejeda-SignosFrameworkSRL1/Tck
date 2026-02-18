-- =====================================================
-- Migración: Rol en asignaciones (assignee / observer / responsible)
-- Schema: tick
-- =====================================================

ALTER TABLE tick.ticket_assignments
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'assignee';

COMMENT ON COLUMN tick.ticket_assignments.role IS 'assignee = ejecutor, observer = en observación, responsible = responsable de seguimiento';

-- Índice único: solo puede haber un responsable por ticket
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_assignments_one_responsible
  ON tick.ticket_assignments (ticket_id)
  WHERE role = 'responsible';
