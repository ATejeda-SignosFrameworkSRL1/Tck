-- Columna is_deliverable en matrix.matrix_items (marcar ítem WBS como entregable)
ALTER TABLE matrix.matrix_items
  ADD COLUMN IF NOT EXISTS is_deliverable BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN matrix.matrix_items.is_deliverable
  IS 'Si true, el ítem se considera entregable y puede reflejarse en la Matriz de Entregables';
