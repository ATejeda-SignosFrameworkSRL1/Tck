-- ============================================================
-- Migración: Permitir borrar tags por su creador
-- Agrega created_by_user_id a tick.tags y FK a core.users
-- ============================================================

ALTER TABLE tick.tags
  ADD COLUMN IF NOT EXISTS created_by_user_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_tags_created_by_user_id'
      AND table_schema = 'tick'
      AND table_name = 'tags'
  ) THEN
    ALTER TABLE tick.tags
      ADD CONSTRAINT fk_tags_created_by_user_id
      FOREIGN KEY (created_by_user_id) REFERENCES core.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tags_created_by_user_id
  ON tick.tags (created_by_user_id);

