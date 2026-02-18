-- ═══════════════════════════════════════════════════════════════════════════
-- SIPE SEED DATA — Demo completo para Dashboard, Matriz, Gantt y Tickets
-- ═══════════════════════════════════════════════════════════════════════════
-- Vincula al proyecto existente "AGEport" (id=1) o al primer proyecto activo.
-- Usa usuarios y departamentos existentes del seed-data.ts.
-- Ejecutar después de las migraciones y el seed base.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 0. Variables de referencia ──────────────────────────────────────────
-- Buscar el primer proyecto activo
DO $$
DECLARE
  v_project_id   INT;
  v_admin_id     BIGINT;
  v_dev_id       BIGINT;
  v_user_id      BIGINT;
  v_dept_dev     BIGINT;
  v_dept_mgmt    BIGINT;
  v_dept_impl    BIGINT;
BEGIN

  -- Proyecto
  SELECT id INTO v_project_id FROM public.projects WHERE is_active = true ORDER BY id LIMIT 1;
  IF v_project_id IS NULL THEN
    INSERT INTO public.projects (name, description, is_active, created_at, updated_at)
    VALUES ('Proyecto SIPE Demo', 'Proyecto de demostración del sistema SIPE', true, NOW(), NOW())
    RETURNING id INTO v_project_id;
  END IF;

  -- Usuarios de referencia
  SELECT id INTO v_admin_id FROM core.users WHERE email = 'admin@test.com' LIMIT 1;
  SELECT id INTO v_dev_id   FROM core.users WHERE email = 'dev@test.com' LIMIT 1;
  SELECT id INTO v_user_id  FROM core.users WHERE email = 'user@test.com' LIMIT 1;

  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM core.users WHERE role = 'admin' ORDER BY id LIMIT 1;
  END IF;
  IF v_dev_id IS NULL THEN
    SELECT id INTO v_dev_id FROM core.users WHERE role = 'dev' ORDER BY id LIMIT 1;
  END IF;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM core.users ORDER BY id OFFSET 2 LIMIT 1;
  END IF;

  -- Departamentos
  SELECT id INTO v_dept_dev  FROM core.departments WHERE LOWER(name) = 'desarrollo' LIMIT 1;
  SELECT id INTO v_dept_mgmt FROM core.departments WHERE LOWER(name) = 'gerencia'   LIMIT 1;
  SELECT id INTO v_dept_impl FROM core.departments WHERE LOWER(name) = 'implementacion' LIMIT 1;

  IF v_dept_dev IS NULL THEN
    SELECT id INTO v_dept_dev FROM core.departments ORDER BY id LIMIT 1;
  END IF;
  IF v_dept_mgmt IS NULL THEN v_dept_mgmt := v_dept_dev; END IF;
  IF v_dept_impl IS NULL THEN v_dept_impl := v_dept_dev; END IF;

  -- ── 1. LIMPIAR datos SIPE previos del proyecto (idempotente) ──────────
  DELETE FROM matrix.baseline_snapshots WHERE baseline_id IN (
    SELECT id FROM matrix.project_baselines WHERE project_id = v_project_id
  );
  DELETE FROM matrix.project_baselines WHERE project_id = v_project_id;
  DELETE FROM matrix.matrix_dependencies WHERE predecessor_id IN (
    SELECT id FROM matrix.matrix_items WHERE project_id = v_project_id
  );
  DELETE FROM matrix.matrix_acceptance_criteria WHERE matrix_item_id IN (
    SELECT id FROM matrix.matrix_items WHERE project_id = v_project_id
  );
  -- Desvincula tickets antes de borrar matrix items
  UPDATE tick.tickets SET matrix_item_id = NULL WHERE matrix_item_id IN (
    SELECT id FROM matrix.matrix_items WHERE project_id = v_project_id
  );
  DELETE FROM matrix.matrix_items WHERE project_id = v_project_id;

  -- ── 2. MATRIZ DE ENTREGABLES (WBS/EDT) ────────────────────────────────
  -- Nivel 0: Fases principales
  INSERT INTO matrix.matrix_items (project_id, parent_id, code, title, description, weight, planned_start, planned_end, actual_start, actual_end, progress_percentage, is_milestone, is_critical_path, sort_order, status, created_at, updated_at) VALUES
    (v_project_id, NULL, '1',   'Planificación y Diseño',         'Fase de levantamiento de requerimientos y diseño técnico.',       25, '2026-01-06', '2026-02-06', '2026-01-06', '2026-02-04', 100.00, false, true,  1, 'completed',   NOW(), NOW()),
    (v_project_id, NULL, '2',   'Desarrollo Backend',             'Construcción de APIs, servicios y lógica de negocio.',            35, '2026-02-07', '2026-04-10', '2026-02-07', NULL,          62.00, false, true,  2, 'in_progress', NOW(), NOW()),
    (v_project_id, NULL, '3',   'Desarrollo Frontend',            'Interfaz de usuario, dashboards y componentes interactivos.',     25, '2026-02-20', '2026-04-20', '2026-02-22', NULL,          38.00, false, false, 3, 'in_progress', NOW(), NOW()),
    (v_project_id, NULL, '4',   'QA y Despliegue',                'Testing integral, UAT y puesta en producción.',                   15, '2026-04-15', '2026-05-15', NULL,         NULL,           0.00, false, false, 4, 'not_started', NOW(), NOW());

  -- Nivel 1: Sub-partidas de "Planificación y Diseño" (1.x)
  INSERT INTO matrix.matrix_items (project_id, parent_id, code, title, description, weight, planned_start, planned_end, actual_start, actual_end, progress_percentage, is_milestone, is_critical_path, sort_order, status, created_at, updated_at) VALUES
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='1' AND project_id=v_project_id), '1.1', 'Levantamiento de Requerimientos', 'Entrevistas con stakeholders y documentación funcional.',  40, '2026-01-06', '2026-01-20', '2026-01-06', '2026-01-19', 100.00, false, true,  1, 'completed', NOW(), NOW()),
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='1' AND project_id=v_project_id), '1.2', 'Diseño de Arquitectura',          'Definición de microservicios, BD y diagramas C4.',        35, '2026-01-21', '2026-02-01', '2026-01-21', '2026-02-01', 100.00, false, true,  2, 'completed', NOW(), NOW()),
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='1' AND project_id=v_project_id), '1.3', 'Aprobación de Diseño',            'Hito: firma del documento de diseño por el comité.',       25, '2026-02-03', '2026-02-06', '2026-02-03', '2026-02-04', 100.00, true,  true,  3, 'completed', NOW(), NOW());

  -- Nivel 1: Sub-partidas de "Desarrollo Backend" (2.x)
  INSERT INTO matrix.matrix_items (project_id, parent_id, code, title, description, weight, planned_start, planned_end, actual_start, actual_end, progress_percentage, is_milestone, is_critical_path, sort_order, status, created_at, updated_at) VALUES
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='2' AND project_id=v_project_id), '2.1', 'Módulo de Autenticación',    'JWT, OAuth2, roles y permisos.',                       20, '2026-02-07', '2026-02-21', '2026-02-07', '2026-02-20', 100.00, false, true,  1, 'completed',   NOW(), NOW()),
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='2' AND project_id=v_project_id), '2.2', 'Módulo de Proyectos y Matriz', 'CRUD proyectos, WBS, criterios de aceptación.',       25, '2026-02-22', '2026-03-14', '2026-02-22', NULL,          80.00, false, true,  2, 'in_progress', NOW(), NOW()),
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='2' AND project_id=v_project_id), '2.3', 'Módulo de Tickets SIPE',      'Tickets con quality gates, reglas y transiciones.',    30, '2026-03-01', '2026-03-28', '2026-03-03', NULL,          55.00, false, true,  3, 'in_progress', NOW(), NOW()),
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='2' AND project_id=v_project_id), '2.4', 'Motor de Métricas y Gantt',   'Cálculo de ruta crítica, semáforo, curva S.',          25, '2026-03-15', '2026-04-10', '2026-03-18', NULL,          25.00, false, false, 4, 'delayed',     NOW(), NOW());

  -- Nivel 1: Sub-partidas de "Desarrollo Frontend" (3.x)
  INSERT INTO matrix.matrix_items (project_id, parent_id, code, title, description, weight, planned_start, planned_end, actual_start, actual_end, progress_percentage, is_milestone, is_critical_path, sort_order, status, created_at, updated_at) VALUES
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='3' AND project_id=v_project_id), '3.1', 'Vista de Matriz WBS',       'Árbol jerárquico interactivo con progreso.',           30, '2026-02-20', '2026-03-10', '2026-02-22', NULL,  70.00, false, false, 1, 'in_progress', NOW(), NOW()),
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='3' AND project_id=v_project_id), '3.2', 'Vista Gantt Dinámico',       'Timeline con barras, dependencias y ruta crítica.',    25, '2026-03-05', '2026-03-25', '2026-03-07', NULL,  40.00, false, false, 2, 'in_progress', NOW(), NOW()),
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='3' AND project_id=v_project_id), '3.3', 'Dashboard SIPE (4 cuadrantes)', 'Semáforo, curva S, distribución, compliance.',      25, '2026-03-15', '2026-04-05', NULL,         NULL,  10.00, false, false, 3, 'in_progress', NOW(), NOW()),
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='3' AND project_id=v_project_id), '3.4', 'Kanban Mejorado',             'Columna En Revisión, campos SIPE en tickets.',        20, '2026-03-20', '2026-04-15', NULL,         NULL,   0.00, false, false, 4, 'not_started', NOW(), NOW());

  -- Nivel 1: Sub-partidas de "QA y Despliegue" (4.x)
  INSERT INTO matrix.matrix_items (project_id, parent_id, code, title, description, weight, planned_start, planned_end, actual_start, actual_end, progress_percentage, is_milestone, is_critical_path, sort_order, status, created_at, updated_at) VALUES
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='4' AND project_id=v_project_id), '4.1', 'Test Unitarios e Integración',  'Cobertura >80% en servicios y controladores.',  30, '2026-04-15', '2026-04-30', NULL, NULL, 0.00, false, false, 1, 'not_started', NOW(), NOW()),
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='4' AND project_id=v_project_id), '4.2', 'UAT con Stakeholders',          'Pruebas de aceptación con usuarios finales.',   30, '2026-04-28', '2026-05-08', NULL, NULL, 0.00, false, false, 2, 'not_started', NOW(), NOW()),
    (v_project_id, (SELECT id FROM matrix.matrix_items WHERE code='4' AND project_id=v_project_id), '4.3', 'Go-Live',                       'Hito: despliegue a producción.',                40, '2026-05-12', '2026-05-15', NULL, NULL, 0.00, true,  true,  3, 'not_started', NOW(), NOW());

  -- ── 3. CRITERIOS DE ACEPTACIÓN ────────────────────────────────────────
  INSERT INTO matrix.matrix_acceptance_criteria (matrix_item_id, description, is_met, verified_by_user_id, verified_at, created_at, updated_at) VALUES
    -- 1.1 Levantamiento
    ((SELECT id FROM matrix.matrix_items WHERE code='1.1' AND project_id=v_project_id), 'Documento de requerimientos aprobado por gerencia.',      true,  v_admin_id, '2026-01-19', NOW(), NOW()),
    ((SELECT id FROM matrix.matrix_items WHERE code='1.1' AND project_id=v_project_id), 'Actas de entrevistas firmadas por los stakeholders.',     true,  v_admin_id, '2026-01-18', NOW(), NOW()),
    -- 1.2 Arquitectura
    ((SELECT id FROM matrix.matrix_items WHERE code='1.2' AND project_id=v_project_id), 'Diagrama C4 (contexto, contenedores, componentes).',      true,  v_admin_id, '2026-02-01', NOW(), NOW()),
    ((SELECT id FROM matrix.matrix_items WHERE code='1.2' AND project_id=v_project_id), 'Modelo ER de la base de datos revisado.',                 true,  v_dev_id,   '2026-02-01', NOW(), NOW()),
    -- 2.1 Auth
    ((SELECT id FROM matrix.matrix_items WHERE code='2.1' AND project_id=v_project_id), 'Login con JWT funcional y testeado.',                     true,  v_dev_id,   '2026-02-20', NOW(), NOW()),
    ((SELECT id FROM matrix.matrix_items WHERE code='2.1' AND project_id=v_project_id), 'Guard de roles implementado y verificado.',               true,  v_dev_id,   '2026-02-20', NOW(), NOW()),
    -- 2.2 Proyectos y Matriz
    ((SELECT id FROM matrix.matrix_items WHERE code='2.2' AND project_id=v_project_id), 'CRUD de proyectos con validaciones.',                     true,  v_dev_id,   '2026-03-05', NOW(), NOW()),
    ((SELECT id FROM matrix.matrix_items WHERE code='2.2' AND project_id=v_project_id), 'Árbol WBS con cálculo de progreso automático.',           false, NULL,        NULL,          NOW(), NOW()),
    ((SELECT id FROM matrix.matrix_items WHERE code='2.2' AND project_id=v_project_id), 'Baselines y snapshots funcionales.',                      false, NULL,        NULL,          NOW(), NOW()),
    -- 2.3 Tickets SIPE
    ((SELECT id FROM matrix.matrix_items WHERE code='2.3' AND project_id=v_project_id), 'Reglas REGLA 01-05 implementadas.',                       true,  v_dev_id,   '2026-03-15', NOW(), NOW()),
    ((SELECT id FROM matrix.matrix_items WHERE code='2.3' AND project_id=v_project_id), 'Status in_review con quality gates.',                     false, NULL,        NULL,          NOW(), NOW()),
    -- 2.4 Motor de Métricas
    ((SELECT id FROM matrix.matrix_items WHERE code='2.4' AND project_id=v_project_id), 'Cálculo de ruta crítica CPM funcional.',                  false, NULL,        NULL,          NOW(), NOW()),
    ((SELECT id FROM matrix.matrix_items WHERE code='2.4' AND project_id=v_project_id), 'Semáforo de salud con umbrales configurables.',           false, NULL,        NULL,          NOW(), NOW()),
    -- 3.1 Vista Matriz
    ((SELECT id FROM matrix.matrix_items WHERE code='3.1' AND project_id=v_project_id), 'Árbol expandible/colapsable con progreso visual.',        false, NULL,        NULL,          NOW(), NOW()),
    ((SELECT id FROM matrix.matrix_items WHERE code='3.1' AND project_id=v_project_id), 'Drill-down a tickets vinculados.',                        false, NULL,        NULL,          NOW(), NOW());

  -- ── 4. DEPENDENCIAS (para Gantt) ──────────────────────────────────────
  INSERT INTO matrix.matrix_dependencies (predecessor_id, successor_id, dependency_type, lag_days, created_at) VALUES
    -- 1.1 → 1.2 (FS)
    ((SELECT id FROM matrix.matrix_items WHERE code='1.1' AND project_id=v_project_id),
     (SELECT id FROM matrix.matrix_items WHERE code='1.2' AND project_id=v_project_id), 'FS', 0, NOW()),
    -- 1.2 → 1.3 (FS, +2 días lag)
    ((SELECT id FROM matrix.matrix_items WHERE code='1.2' AND project_id=v_project_id),
     (SELECT id FROM matrix.matrix_items WHERE code='1.3' AND project_id=v_project_id), 'FS', 2, NOW()),
    -- 1.3 → 2.1 (FS) — Aprobación habilita desarrollo
    ((SELECT id FROM matrix.matrix_items WHERE code='1.3' AND project_id=v_project_id),
     (SELECT id FROM matrix.matrix_items WHERE code='2.1' AND project_id=v_project_id), 'FS', 0, NOW()),
    -- 2.1 → 2.2 (FS)
    ((SELECT id FROM matrix.matrix_items WHERE code='2.1' AND project_id=v_project_id),
     (SELECT id FROM matrix.matrix_items WHERE code='2.2' AND project_id=v_project_id), 'FS', 0, NOW()),
    -- 2.2 → 2.3 (SS, overlap parcial)
    ((SELECT id FROM matrix.matrix_items WHERE code='2.2' AND project_id=v_project_id),
     (SELECT id FROM matrix.matrix_items WHERE code='2.3' AND project_id=v_project_id), 'SS', 7, NOW()),
    -- 2.3 → 2.4 (SS)
    ((SELECT id FROM matrix.matrix_items WHERE code='2.3' AND project_id=v_project_id),
     (SELECT id FROM matrix.matrix_items WHERE code='2.4' AND project_id=v_project_id), 'SS', 14, NOW()),
    -- 2.2 → 3.1 (SS, frontend empieza cuando backend tiene base)
    ((SELECT id FROM matrix.matrix_items WHERE code='2.2' AND project_id=v_project_id),
     (SELECT id FROM matrix.matrix_items WHERE code='3.1' AND project_id=v_project_id), 'SS', 5, NOW()),
    -- 2.4 → 3.2 (SS)
    ((SELECT id FROM matrix.matrix_items WHERE code='2.4' AND project_id=v_project_id),
     (SELECT id FROM matrix.matrix_items WHERE code='3.2' AND project_id=v_project_id), 'SS', 0, NOW()),
    -- 3.1 → 3.3 (FS)
    ((SELECT id FROM matrix.matrix_items WHERE code='3.1' AND project_id=v_project_id),
     (SELECT id FROM matrix.matrix_items WHERE code='3.3' AND project_id=v_project_id), 'FS', 5, NOW()),
    -- 3.3 → 3.4 (FS)
    ((SELECT id FROM matrix.matrix_items WHERE code='3.3' AND project_id=v_project_id),
     (SELECT id FROM matrix.matrix_items WHERE code='3.4' AND project_id=v_project_id), 'FS', 5, NOW()),
    -- 2.4 → 4.1 (FS)
    ((SELECT id FROM matrix.matrix_items WHERE code='2.4' AND project_id=v_project_id),
     (SELECT id FROM matrix.matrix_items WHERE code='4.1' AND project_id=v_project_id), 'FS', 5, NOW()),
    -- 4.1 → 4.2 (FS, -2 overlap)
    ((SELECT id FROM matrix.matrix_items WHERE code='4.1' AND project_id=v_project_id),
     (SELECT id FROM matrix.matrix_items WHERE code='4.2' AND project_id=v_project_id), 'FS', -2, NOW()),
    -- 4.2 → 4.3 (FS)
    ((SELECT id FROM matrix.matrix_items WHERE code='4.2' AND project_id=v_project_id),
     (SELECT id FROM matrix.matrix_items WHERE code='4.3' AND project_id=v_project_id), 'FS', 4, NOW());

  -- ── 5. TICKETS vinculados a la MATRIZ ─────────────────────────────────
  -- Tickets completados (Fase 1)
  INSERT INTO tick.tickets (title, description, status, priority, ticket_type, matrix_item_id, estimated_hours, project_id, start_date, due_date, created_by_user_id, origin_department_id, current_department_id, created_at, updated_at) VALUES
    ('Realizar entrevistas con stakeholders',          'Agendar y ejecutar 5 sesiones de levantamiento.',            'done',        'high',   'task',       (SELECT id FROM matrix.matrix_items WHERE code='1.1' AND project_id=v_project_id), 16, v_project_id, '2026-01-06', '2026-01-15', v_admin_id, v_dept_mgmt, v_dept_mgmt, NOW(), NOW()),
    ('Documentar requerimientos funcionales',          'Redactar SRS con user stories y criterios de aceptación.',   'done',        'high',   'task',       (SELECT id FROM matrix.matrix_items WHERE code='1.1' AND project_id=v_project_id), 24, v_project_id, '2026-01-10', '2026-01-20', v_admin_id, v_dept_mgmt, v_dept_mgmt, NOW(), NOW()),
    ('Diseñar diagrama C4 nivel contexto',             'Crear vistas C4 de contexto y contenedores.',                'done',        'high',   'task',       (SELECT id FROM matrix.matrix_items WHERE code='1.2' AND project_id=v_project_id), 12, v_project_id, '2026-01-21', '2026-01-28', v_dev_id,   v_dept_dev,  v_dept_dev,  NOW(), NOW()),
    ('Definir modelo ER de base de datos',             'Normalizar entidades core, tick y matrix.',                  'done',        'high',   'task',       (SELECT id FROM matrix.matrix_items WHERE code='1.2' AND project_id=v_project_id),  8, v_project_id, '2026-01-25', '2026-02-01', v_dev_id,   v_dept_dev,  v_dept_dev,  NOW(), NOW()),
    ('Hito: Firma de diseño',                          'Aprobación formal del documento de diseño técnico.',         'done',        'high',   'milestone',  (SELECT id FROM matrix.matrix_items WHERE code='1.3' AND project_id=v_project_id),  2, v_project_id, '2026-02-03', '2026-02-06', v_admin_id, v_dept_mgmt, v_dept_mgmt, NOW(), NOW());

  -- Tickets completados (Fase 2 - Auth)
  INSERT INTO tick.tickets (title, description, status, priority, ticket_type, matrix_item_id, estimated_hours, project_id, start_date, due_date, created_by_user_id, origin_department_id, current_department_id, created_at, updated_at) VALUES
    ('Implementar autenticación JWT',                  'Login, refresh token, middleware de auth.',                   'done',        'high',   'task',       (SELECT id FROM matrix.matrix_items WHERE code='2.1' AND project_id=v_project_id), 20, v_project_id, '2026-02-07', '2026-02-14', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Crear guard de roles y permisos',                'RolesGuard con decoradores @Roles.',                         'done',        'medium', 'task',       (SELECT id FROM matrix.matrix_items WHERE code='2.1' AND project_id=v_project_id), 12, v_project_id, '2026-02-14', '2026-02-21', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW());

  -- Tickets en progreso (Fase 2 - Módulos)
  INSERT INTO tick.tickets (title, description, status, priority, ticket_type, matrix_item_id, estimated_hours, project_id, start_date, due_date, created_by_user_id, origin_department_id, current_department_id, created_at, updated_at) VALUES
    ('CRUD de ítems WBS/EDT',                          'Create, Read, Update, Delete para matrix_items.',            'in_progress', 'high',   'task',       (SELECT id FROM matrix.matrix_items WHERE code='2.2' AND project_id=v_project_id), 16, v_project_id, '2026-02-22', '2026-03-07', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Cálculo automático de progreso',                 'Recalcular % bottom-up al actualizar hijos.',                'in_review',   'high',   'task',       (SELECT id FROM matrix.matrix_items WHERE code='2.2' AND project_id=v_project_id), 12, v_project_id, '2026-03-01', '2026-03-10', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('API de baselines y snapshots',                   'Captura y comparación de versiones de la matriz.',           'open',        'medium', 'task',       (SELECT id FROM matrix.matrix_items WHERE code='2.2' AND project_id=v_project_id), 10, v_project_id, '2026-03-07', '2026-03-14', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Implementar REGLA 01-04 en tickets',             'Auto-actualizar matriz al cambiar status de ticket.',        'in_progress', 'high',   'task',       (SELECT id FROM matrix.matrix_items WHERE code='2.3' AND project_id=v_project_id), 16, v_project_id, '2026-03-03', '2026-03-18', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Quality gate: REGLA 05 (in_review)',             'Validar adjuntos antes de permitir in_review.',              'in_progress', 'high',   'task',       (SELECT id FROM matrix.matrix_items WHERE code='2.3' AND project_id=v_project_id),  8, v_project_id, '2026-03-10', '2026-03-20', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Transiciones de estado por rol',                 'Limitar cambios de status según UserRole.',                  'open',        'medium', 'task',       (SELECT id FROM matrix.matrix_items WHERE code='2.3' AND project_id=v_project_id), 10, v_project_id, '2026-03-15', '2026-03-28', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Corrección: campo estimatedHours no persiste',   'Bug al guardar horas estimadas en ticket.',                  'blocked',     'high',   'correction', (SELECT id FROM matrix.matrix_items WHERE code='2.3' AND project_id=v_project_id),  4, v_project_id, '2026-03-12', '2026-03-15', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Servicio de cálculo de ruta crítica (CPM)',      'Implementar algoritmo CPM simplificado.',                    'in_progress', 'high',   'task',       (SELECT id FROM matrix.matrix_items WHERE code='2.4' AND project_id=v_project_id), 20, v_project_id, '2026-03-18', '2026-04-01', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Endpoints de métricas y semáforo',               'GET /health, /progress, /deviation, /forecast.',             'open',        'medium', 'task',       (SELECT id FROM matrix.matrix_items WHERE code='2.4' AND project_id=v_project_id), 14, v_project_id, '2026-03-25', '2026-04-10', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW());

  -- Tickets en progreso (Fase 3 - Frontend)
  INSERT INTO tick.tickets (title, description, status, priority, ticket_type, matrix_item_id, estimated_hours, project_id, start_date, due_date, created_by_user_id, origin_department_id, current_department_id, created_at, updated_at) VALUES
    ('Componente TreeTable para matriz WBS',           'Tabla-árbol expandible con barra de progreso.',              'in_progress', 'high',   'task',       (SELECT id FROM matrix.matrix_items WHERE code='3.1' AND project_id=v_project_id), 16, v_project_id, '2026-02-22', '2026-03-05', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Detail Drawer de ítem de matriz',                'Panel lateral con info, criterios y acciones.',              'in_review',   'medium', 'task',       (SELECT id FROM matrix.matrix_items WHERE code='3.1' AND project_id=v_project_id), 10, v_project_id, '2026-03-01', '2026-03-08', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Timeline bars del Gantt',                        'Barras horizontales con planned/actual/baseline.',           'in_progress', 'high',   'task',       (SELECT id FROM matrix.matrix_items WHERE code='3.2' AND project_id=v_project_id), 20, v_project_id, '2026-03-07', '2026-03-20', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Visualizar ruta crítica en rojo',                'Highlight de barras en path crítico.',                       'open',        'medium', 'task',       (SELECT id FROM matrix.matrix_items WHERE code='3.2' AND project_id=v_project_id),  6, v_project_id, '2026-03-18', '2026-03-25', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Widget Semáforo de Salud',                       'Banner verde/amarillo/rojo con KPIs inline.',                'in_progress', 'medium', 'task',       (SELECT id FROM matrix.matrix_items WHERE code='3.3' AND project_id=v_project_id),  8, v_project_id, '2026-03-15', '2026-03-22', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Gráfica Curva S con recharts',                   'LineChart planned vs actual acumulado.',                     'open',        'medium', 'task',       (SELECT id FROM matrix.matrix_items WHERE code='3.3' AND project_id=v_project_id), 10, v_project_id, '2026-03-20', '2026-04-01', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('PieChart distribución de tickets',               'Donut chart por status con leyenda.',                        'open',        'low',    'task',       (SELECT id FROM matrix.matrix_items WHERE code='3.3' AND project_id=v_project_id),  6, v_project_id, '2026-03-25', '2026-04-05', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Incidencia: timeout en carga de dashboard',      'El dashboard tarda >10s en proyectos grandes.',              'open',        'high',   'incident',   (SELECT id FROM matrix.matrix_items WHERE code='3.3' AND project_id=v_project_id),  4, v_project_id, '2026-03-28', '2026-04-02', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW());

  -- Tickets futuros (Fase 4 - QA)
  INSERT INTO tick.tickets (title, description, status, priority, ticket_type, matrix_item_id, estimated_hours, project_id, start_date, due_date, created_by_user_id, origin_department_id, current_department_id, created_at, updated_at) VALUES
    ('Test E2E del flujo SIPE completo',               'Cypress/Playwright: crear matriz → tickets → dashboard.',   'open',        'high',   'task',       (SELECT id FROM matrix.matrix_items WHERE code='4.1' AND project_id=v_project_id), 24, v_project_id, '2026-04-15', '2026-04-25', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Test unitarios de métricas service',             'Jest: verificar cálculos de CPM, semáforo, curva S.',        'open',        'medium', 'task',       (SELECT id FROM matrix.matrix_items WHERE code='4.1' AND project_id=v_project_id), 16, v_project_id, '2026-04-18', '2026-04-30', v_dev_id, v_dept_dev, v_dept_dev, NOW(), NOW()),
    ('Sesiones UAT con usuarios finales',              'Preparar guiones de prueba para cada rol.',                  'open',        'medium', 'task',       (SELECT id FROM matrix.matrix_items WHERE code='4.2' AND project_id=v_project_id), 20, v_project_id, '2026-04-28', '2026-05-08', v_admin_id, v_dept_impl, v_dept_impl, NOW(), NOW()),
    ('Hito: Go-Live producción',                       'Deploy final y verificación post-deploy.',                   'open',        'high',   'milestone',  (SELECT id FROM matrix.matrix_items WHERE code='4.3' AND project_id=v_project_id),  8, v_project_id, '2026-05-12', '2026-05-15', v_admin_id, v_dept_impl, v_dept_impl, NOW(), NOW());

  -- ── 6. CHECKLIST ITEMS (en tickets seleccionados) ─────────────────────
  -- Para "CRUD de ítems WBS/EDT"
  INSERT INTO tick.ticket_checklist_items (ticket_id, text, is_completed, sort_order, created_at, updated_at) VALUES
    ((SELECT id FROM tick.tickets WHERE title = 'CRUD de ítems WBS/EDT' AND project_id = v_project_id LIMIT 1), 'Endpoint POST /matrix/items', true,  1, NOW(), NOW()),
    ((SELECT id FROM tick.tickets WHERE title = 'CRUD de ítems WBS/EDT' AND project_id = v_project_id LIMIT 1), 'Endpoint GET /matrix/project/:id', true,  2, NOW(), NOW()),
    ((SELECT id FROM tick.tickets WHERE title = 'CRUD de ítems WBS/EDT' AND project_id = v_project_id LIMIT 1), 'Endpoint PATCH /matrix/items/:id', true,  3, NOW(), NOW()),
    ((SELECT id FROM tick.tickets WHERE title = 'CRUD de ítems WBS/EDT' AND project_id = v_project_id LIMIT 1), 'Endpoint DELETE /matrix/items/:id', false, 4, NOW(), NOW()),
    ((SELECT id FROM tick.tickets WHERE title = 'CRUD de ítems WBS/EDT' AND project_id = v_project_id LIMIT 1), 'Validaciones con class-validator', false, 5, NOW(), NOW());

  -- Para "Implementar REGLA 01-04 en tickets"
  INSERT INTO tick.ticket_checklist_items (ticket_id, text, is_completed, sort_order, created_at, updated_at) VALUES
    ((SELECT id FROM tick.tickets WHERE title = 'Implementar REGLA 01-04 en tickets' AND project_id = v_project_id LIMIT 1), 'REGLA 01: Al cerrar ticket → actualizar % matriz', true,  1, NOW(), NOW()),
    ((SELECT id FROM tick.tickets WHERE title = 'Implementar REGLA 01-04 en tickets' AND project_id = v_project_id LIMIT 1), 'REGLA 02: Primer ticket in_progress → actual_start', true,  2, NOW(), NOW()),
    ((SELECT id FROM tick.tickets WHERE title = 'Implementar REGLA 01-04 en tickets' AND project_id = v_project_id LIMIT 1), 'REGLA 03: Todos done → actual_end', false, 3, NOW(), NOW()),
    ((SELECT id FROM tick.tickets WHERE title = 'Implementar REGLA 01-04 en tickets' AND project_id = v_project_id LIMIT 1), 'REGLA 04: Desvío > 15% → status delayed', false, 4, NOW(), NOW());

  -- ── 7. TAGS ────────────────────────────────────────────────────────────
  -- Crear tags SIPE si no existen
  INSERT INTO tick.tags (name, color, icon, created_at, updated_at)
  SELECT 'Backend', '#6366F1', NULL, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM tick.tags WHERE name = 'Backend');

  INSERT INTO tick.tags (name, color, icon, created_at, updated_at)
  SELECT 'Frontend', '#2FC6F6', NULL, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM tick.tags WHERE name = 'Frontend');

  INSERT INTO tick.tags (name, color, icon, created_at, updated_at)
  SELECT 'SIPE', '#FFA900', NULL, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM tick.tags WHERE name = 'SIPE');

  INSERT INTO tick.tags (name, color, icon, created_at, updated_at)
  SELECT 'Ruta Crítica', '#FF5752', NULL, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM tick.tags WHERE name = 'Ruta Crítica');

  INSERT INTO tick.tags (name, color, icon, created_at, updated_at)
  SELECT 'QA', '#59C74C', NULL, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM tick.tags WHERE name = 'QA');

  -- Asignar tags a tickets (Backend a tickets de módulos backend)
  INSERT INTO tick.ticket_tags (ticket_id, tag_id, created_at)
  SELECT t.id, tg.id, NOW()
  FROM tick.tickets t
  CROSS JOIN tick.tags tg
  WHERE t.project_id = v_project_id
    AND tg.name = 'Backend'
    AND t.matrix_item_id IN (SELECT id FROM matrix.matrix_items WHERE code IN ('2.1','2.2','2.3','2.4') AND project_id = v_project_id)
  ON CONFLICT (ticket_id, tag_id) DO NOTHING;

  INSERT INTO tick.ticket_tags (ticket_id, tag_id, created_at)
  SELECT t.id, tg.id, NOW()
  FROM tick.tickets t
  CROSS JOIN tick.tags tg
  WHERE t.project_id = v_project_id
    AND tg.name = 'Frontend'
    AND t.matrix_item_id IN (SELECT id FROM matrix.matrix_items WHERE code IN ('3.1','3.2','3.3','3.4') AND project_id = v_project_id)
  ON CONFLICT (ticket_id, tag_id) DO NOTHING;

  INSERT INTO tick.ticket_tags (ticket_id, tag_id, created_at)
  SELECT t.id, tg.id, NOW()
  FROM tick.tickets t
  CROSS JOIN tick.tags tg
  WHERE t.project_id = v_project_id
    AND tg.name = 'SIPE'
    AND t.matrix_item_id IS NOT NULL
  ON CONFLICT (ticket_id, tag_id) DO NOTHING;

  INSERT INTO tick.ticket_tags (ticket_id, tag_id, created_at)
  SELECT t.id, tg.id, NOW()
  FROM tick.tickets t
  CROSS JOIN tick.tags tg
  WHERE t.project_id = v_project_id
    AND tg.name = 'Ruta Crítica'
    AND t.matrix_item_id IN (SELECT id FROM matrix.matrix_items WHERE is_critical_path = true AND project_id = v_project_id)
  ON CONFLICT (ticket_id, tag_id) DO NOTHING;

  -- ── 8. TICKET ASSIGNMENTS ─────────────────────────────────────────────
  -- Asignar dev como ejecutor de tickets de desarrollo
  INSERT INTO tick.ticket_assignments (ticket_id, user_id, role, assigned_at)
  SELECT t.id, v_dev_id, 'assignee', NOW()
  FROM tick.tickets t
  WHERE t.project_id = v_project_id
    AND t.created_by_user_id = v_dev_id
    AND NOT EXISTS (SELECT 1 FROM tick.ticket_assignments ta WHERE ta.ticket_id = t.id AND ta.user_id = v_dev_id)
  ON CONFLICT (ticket_id, user_id) DO NOTHING;

  -- Asignar admin como responsable de seguimiento
  INSERT INTO tick.ticket_assignments (ticket_id, user_id, role, assigned_at)
  SELECT t.id, v_admin_id, 'responsible', NOW()
  FROM tick.tickets t
  WHERE t.project_id = v_project_id
    AND t.created_by_user_id = v_dev_id
    AND NOT EXISTS (SELECT 1 FROM tick.ticket_assignments ta WHERE ta.ticket_id = t.id AND ta.user_id = v_admin_id)
  ON CONFLICT (ticket_id, user_id) DO NOTHING;

  -- Asignar user como observador en tickets de alta prioridad
  INSERT INTO tick.ticket_assignments (ticket_id, user_id, role, assigned_at)
  SELECT t.id, v_user_id, 'observer', NOW()
  FROM tick.tickets t
  WHERE t.project_id = v_project_id
    AND t.priority = 'high'
    AND v_user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM tick.ticket_assignments ta WHERE ta.ticket_id = t.id AND ta.user_id = v_user_id)
  ON CONFLICT (ticket_id, user_id) DO NOTHING;

  -- ── 9. BASELINE ───────────────────────────────────────────────────────
  INSERT INTO matrix.project_baselines (project_id, name, created_by_user_id, created_at)
  VALUES (v_project_id, 'Línea Base Inicial v1.0', v_admin_id, '2026-02-06');

  INSERT INTO matrix.baseline_snapshots (baseline_id, matrix_item_id, planned_start, planned_end, weight, created_at)
  SELECT
    (SELECT id FROM matrix.project_baselines WHERE project_id = v_project_id ORDER BY id DESC LIMIT 1),
    mi.id,
    mi.planned_start,
    mi.planned_end,
    mi.weight,
    '2026-02-06'
  FROM matrix.matrix_items mi
  WHERE mi.project_id = v_project_id;

  -- ── 10. COMENTARIOS (muestra de actividad) ────────────────────────────
  INSERT INTO tick.comments (ticket_id, user_id, content, created_at) VALUES
    ((SELECT id FROM tick.tickets WHERE title = 'CRUD de ítems WBS/EDT' AND project_id = v_project_id LIMIT 1), v_dev_id,   'Endpoints POST y GET funcionando. Falta DELETE con cascade.', '2026-03-03 10:30:00'),
    ((SELECT id FROM tick.tickets WHERE title = 'CRUD de ítems WBS/EDT' AND project_id = v_project_id LIMIT 1), v_admin_id, 'Revisar que el DELETE haga soft-delete o cascade correcto.', '2026-03-03 14:15:00'),
    ((SELECT id FROM tick.tickets WHERE title = 'Cálculo automático de progreso' AND project_id = v_project_id LIMIT 1), v_dev_id, 'Implementado cálculo bottom-up. Listo para review.', '2026-03-08 16:00:00'),
    ((SELECT id FROM tick.tickets WHERE title = 'Corrección: campo estimatedHours no persiste' AND project_id = v_project_id LIMIT 1), v_dev_id, 'El DTO no tiene @IsOptional() en estimatedHours. Bloqueado hasta fix.', '2026-03-13 09:00:00'),
    ((SELECT id FROM tick.tickets WHERE title = 'Servicio de cálculo de ruta crítica (CPM)' AND project_id = v_project_id LIMIT 1), v_dev_id, 'Algoritmo CPM simplificado funcionando para grafos DAG.', '2026-03-22 11:45:00');

  -- ── 11. TIME TRACKING ─────────────────────────────────────────────────
  INSERT INTO tick.time_tracking (ticket_id, user_id, "hoursSpent", description, logged_at) VALUES
    ((SELECT id FROM tick.tickets WHERE title = 'Implementar autenticación JWT' AND project_id = v_project_id LIMIT 1), v_dev_id, 18.5, 'Desarrollo completo JWT + middleware.', '2026-02-14'),
    ((SELECT id FROM tick.tickets WHERE title = 'Crear guard de roles y permisos' AND project_id = v_project_id LIMIT 1), v_dev_id, 11.0, 'Guard + decoradores + tests.', '2026-02-20'),
    ((SELECT id FROM tick.tickets WHERE title = 'CRUD de ítems WBS/EDT' AND project_id = v_project_id LIMIT 1), v_dev_id, 10.0, 'POST, GET y PATCH implementados.', '2026-03-04'),
    ((SELECT id FROM tick.tickets WHERE title = 'Implementar REGLA 01-04 en tickets' AND project_id = v_project_id LIMIT 1), v_dev_id, 8.0, 'REGLA 01 y 02 listas.', '2026-03-15'),
    ((SELECT id FROM tick.tickets WHERE title = 'Componente TreeTable para matriz WBS' AND project_id = v_project_id LIMIT 1), v_dev_id, 12.0, 'Tree rendering con expand/collapse.', '2026-03-03'),
    ((SELECT id FROM tick.tickets WHERE title = 'Servicio de cálculo de ruta crítica (CPM)' AND project_id = v_project_id LIMIT 1), v_dev_id, 14.0, 'Algoritmo CPM + forward/backward pass.', '2026-03-22');

  RAISE NOTICE '✅ SIPE SEED completado para proyecto id=%', v_project_id;

END $$;

COMMIT;
