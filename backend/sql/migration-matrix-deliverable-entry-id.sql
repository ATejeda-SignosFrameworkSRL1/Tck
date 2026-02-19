-- Relación ítem de matriz -> proyecto entregable (filas de la tabla Proyectos Entregables)
ALTER TABLE matrix.matrix_items
  ADD COLUMN IF NOT EXISTS deliverable_entry_id BIGINT NULL;

COMMENT ON COLUMN matrix.matrix_items.deliverable_entry_id
  IS 'ID del entregable (deliverable_entries) al que se asocia este ítem cuando is_deliverable=true';

-- Opcional: FK para integridad (requiere que deliverable_entries exista en matrix schema)
-- ALTER TABLE matrix.matrix_items
--   ADD CONSTRAINT fk_matrix_items_deliverable_entry
--   FOREIGN KEY (deliverable_entry_id) REFERENCES matrix.deliverable_entries(id) ON DELETE SET NULL;
