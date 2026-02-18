/**
 * Seed SIPE para "PMS Alojamiento"
 * =================================
 * Llena la matriz WBS, criterios, dependencias, baselines, tickets, tags, etc.
 * para el proyecto PMS Alojamiento.
 *
 * npx ts-node scripts/seed-pms-alojamiento.ts
 */

import { Client } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'SistemadeTicketsConMatriz',
};

async function run() {
  const c = new Client(DB);
  await c.connect();
  console.log('✅ Conectado a', DB.database);

  // ── Buscar proyecto PMS Alojamiento ──
  let projRes = await c.query(`SELECT id FROM public.projects WHERE LOWER(name) LIKE '%alojamiento%' LIMIT 1`);
  let projectId = projRes.rows[0]?.id;
  if (!projectId) {
    projRes = await c.query(`SELECT id FROM public.projects WHERE LOWER(name) LIKE '%pms%' LIMIT 1`);
    projectId = projRes.rows[0]?.id;
  }
  if (!projectId) {
    console.log('⚠️  No se encontró PMS Alojamiento. Creándolo...');
    const ins = await c.query(`INSERT INTO public.projects (name, description, is_active, created_at, updated_at) VALUES ('PMS Alojamiento', 'Property Management System - Módulo de Alojamiento', true, NOW(), NOW()) RETURNING id`);
    projectId = ins.rows[0].id;
  }
  console.log(`📁 Proyecto: PMS Alojamiento (id=${projectId})\n`);

  // ── Buscar usuarios ──
  const adminRes = await c.query(`SELECT id FROM core.users WHERE role = 'admin' ORDER BY id LIMIT 1`);
  const devRes = await c.query(`SELECT id FROM core.users WHERE role = 'dev' ORDER BY id LIMIT 1`);
  const userRes = await c.query(`SELECT id FROM core.users ORDER BY id OFFSET 2 LIMIT 1`);
  const adminId = adminRes.rows[0]?.id;
  const devId = devRes.rows[0]?.id;
  const userId = userRes.rows[0]?.id;
  console.log(`👤 Admin: ${adminId}, Dev: ${devId}, User: ${userId}`);

  // ── Buscar departamentos ──
  const deptDev = (await c.query(`SELECT id FROM core.departments WHERE LOWER(name) = 'desarrollo' LIMIT 1`)).rows[0]?.id
    || (await c.query(`SELECT id FROM core.departments ORDER BY id LIMIT 1`)).rows[0]?.id;
  const deptGer = (await c.query(`SELECT id FROM core.departments WHERE LOWER(name) = 'gerencia' LIMIT 1`)).rows[0]?.id || deptDev;
  const deptImpl = (await c.query(`SELECT id FROM core.departments WHERE LOWER(name) = 'implementacion' LIMIT 1`)).rows[0]?.id || deptDev;
  const deptSop = (await c.query(`SELECT id FROM core.departments WHERE LOWER(name) = 'soporte' LIMIT 1`)).rows[0]?.id || deptDev;

  // ── Limpiar datos SIPE previos ──
  console.log('🧹 Limpiando datos previos...');
  await c.query(`DELETE FROM matrix.baseline_snapshots WHERE baseline_id IN (SELECT id FROM matrix.project_baselines WHERE project_id = $1)`, [projectId]);
  await c.query(`DELETE FROM matrix.project_baselines WHERE project_id = $1`, [projectId]);
  await c.query(`DELETE FROM matrix.matrix_dependencies WHERE predecessor_id IN (SELECT id FROM matrix.matrix_items WHERE project_id = $1)`, [projectId]);
  await c.query(`DELETE FROM matrix.matrix_acceptance_criteria WHERE matrix_item_id IN (SELECT id FROM matrix.matrix_items WHERE project_id = $1)`, [projectId]);
  await c.query(`UPDATE tick.tickets SET matrix_item_id = NULL WHERE matrix_item_id IN (SELECT id FROM matrix.matrix_items WHERE project_id = $1)`, [projectId]);
  await c.query(`DELETE FROM matrix.matrix_items WHERE project_id = $1`, [projectId]);

  // ═══════════════════════════════════════════════════════════════════
  // MATRIZ WBS — PMS Alojamiento
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📊 Creando Matriz WBS...');

  const ins = async (parentCode: string | null, code: string, title: string, desc: string, weight: number, ps: string, pe: string, as_: string | null, ae: string | null, prog: number, milestone: boolean, critical: boolean, order: number, status: string) => {
    let parentId = null;
    if (parentCode) {
      const pr = await c.query(`SELECT id FROM matrix.matrix_items WHERE code = $1 AND project_id = $2`, [parentCode, projectId]);
      parentId = pr.rows[0]?.id;
    }
    const r = await c.query(`
      INSERT INTO matrix.matrix_items (project_id, parent_id, code, title, description, weight, planned_start, planned_end, actual_start, actual_end, progress_percentage, is_milestone, is_critical_path, sort_order, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW()) RETURNING id
    `, [projectId, parentId, code, title, desc, weight, ps, pe, as_, ae, prog, milestone, critical, order, status]);
    return r.rows[0].id;
  };

  // ── FASE 1: Análisis y Diseño ──
  await ins(null,  '1',   'Análisis y Diseño del PMS',           'Levantamiento de requerimientos del sistema de alojamiento.',             20, '2026-01-05','2026-02-02','2026-01-05','2026-01-31',  100, false, true,  1, 'completed');
  await ins('1',   '1.1', 'Relevamiento de Procesos Hoteleros',  'Mapeo de check-in, check-out, housekeeping, reservas.',                   30, '2026-01-05','2026-01-16','2026-01-05','2026-01-15',  100, false, true,  1, 'completed');
  await ins('1',   '1.2', 'Diseño de UX/UI del PMS',             'Wireframes y mockups en Figma para módulo de habitaciones.',               35, '2026-01-12','2026-01-26','2026-01-12','2026-01-25',  100, false, false, 2, 'completed');
  await ins('1',   '1.3', 'Modelo de Datos de Alojamiento',      'Entidades: habitaciones, tipos, tarifas, reservas, huéspedes.',           25, '2026-01-19','2026-01-30','2026-01-19','2026-01-30',  100, false, true,  3, 'completed');
  await ins('1',   '1.4', 'Hito: Aprobación del Diseño',         'Firma del diseño por gerencia y operaciones.',                            10, '2026-01-31','2026-02-02','2026-01-31','2026-01-31',  100, true,  true,  4, 'completed');

  // ── FASE 2: Backend Core ──
  await ins(null,  '2',   'Desarrollo Backend Core',              'APIs REST para gestión de habitaciones, reservas y huéspedes.',            30, '2026-02-03','2026-03-20','2026-02-03',null,           58, false, true,  2, 'in_progress');
  await ins('2',   '2.1', 'Módulo de Habitaciones',               'CRUD habitaciones, tipos, estados (disponible/ocupada/mantenimiento).',   20, '2026-02-03','2026-02-14','2026-02-03','2026-02-13',  100, false, true,  1, 'completed');
  await ins('2',   '2.2', 'Módulo de Tarifas y Temporadas',       'Gestión de tarifas por temporada, tipo de habitación y canal.',           15, '2026-02-10','2026-02-21','2026-02-10','2026-02-20',  100, false, false, 2, 'completed');
  await ins('2',   '2.3', 'Motor de Reservas',                    'Disponibilidad, bloqueo temporal, confirmación, modificación.',            25, '2026-02-17','2026-03-07','2026-02-18',null,            65, false, true,  3, 'in_progress');
  await ins('2',   '2.4', 'Módulo de Huéspedes y Check-in/out',   'Registro de huéspedes, check-in digital, check-out con factura.',         25, '2026-02-24','2026-03-14','2026-02-26',null,            40, false, true,  4, 'in_progress');
  await ins('2',   '2.5', 'Integraciones de Pago',                'Pasarela de pagos: Stripe/PayPal, generación de facturas.',               15, '2026-03-03','2026-03-20','2026-03-05',null,            15, false, false, 5, 'delayed');

  // ── FASE 3: Frontend ──
  await ins(null,  '3',   'Desarrollo Frontend',                  'Interfaz de recepción, panel de habitaciones, calendario de reservas.',    30, '2026-02-20','2026-04-10','2026-02-22',null,            32, false, false, 3, 'in_progress');
  await ins('3',   '3.1', 'Panel de Habitaciones (Grid)',          'Vista de cuadrícula con estado visual por habitación.',                   25, '2026-02-20','2026-03-06','2026-02-22',null,            75, false, false, 1, 'in_progress');
  await ins('3',   '3.2', 'Calendario de Reservas',                'Vista mensual/semanal con drag-and-drop para reservas.',                 25, '2026-03-01','2026-03-20','2026-03-03',null,            45, false, false, 2, 'in_progress');
  await ins('3',   '3.3', 'Flujo de Check-in Digital',             'Formulario paso a paso: datos huésped, documentos, asignación.',          20, '2026-03-10','2026-03-28',null,        null,            10, false, false, 3, 'in_progress');
  await ins('3',   '3.4', 'Dashboard de Ocupación',                'KPIs de ocupación, ADR, RevPAR, proyección semanal.',                    20, '2026-03-15','2026-04-05',null,        null,             0, false, false, 4, 'not_started');
  await ins('3',   '3.5', 'Portal del Huésped',                    'Auto-checkin, solicitudes de servicio, feedback.',                        10, '2026-03-25','2026-04-10',null,        null,             0, false, false, 5, 'not_started');

  // ── FASE 4: QA y Deploy ──
  await ins(null,  '4',   'QA, UAT y Despliegue',                 'Testing integral, capacitación del personal y go-live.',                   20, '2026-04-01','2026-05-05',null,        null,             0, false, false, 4, 'not_started');
  await ins('4',   '4.1', 'Tests de Integración',                  'Flujo completo: reserva → check-in → estadía → check-out → factura.',   30, '2026-04-01','2026-04-15',null,        null,             0, false, false, 1, 'not_started');
  await ins('4',   '4.2', 'UAT con Personal de Recepción',         'Pruebas en ambiente staging con recepcionistas reales.',                 25, '2026-04-10','2026-04-25',null,        null,             0, false, false, 2, 'not_started');
  await ins('4',   '4.3', 'Capacitación al Equipo',                'Sesiones de training para recepción, housekeeping y gerencia.',           20, '2026-04-20','2026-04-30',null,        null,             0, false, false, 3, 'not_started');
  await ins('4',   '4.4', 'Hito: Go-Live PMS Alojamiento',        'Despliegue a producción y monitoreo post-deploy.',                       25, '2026-05-01','2026-05-05',null,        null,             0, true,  true,  4, 'not_started');

  const itemCount = (await c.query(`SELECT COUNT(*) as n FROM matrix.matrix_items WHERE project_id = $1`, [projectId])).rows[0].n;
  console.log(`   ✅ ${itemCount} ítems WBS creados`);

  // ═══════════════════════════════════════════════════════════════════
  // CRITERIOS DE ACEPTACIÓN
  // ═══════════════════════════════════════════════════════════════════
  console.log('📋 Creando criterios de aceptación...');

  const addCrit = async (code: string, desc: string, met: boolean, verifier: number | null) => {
    const itemId = (await c.query(`SELECT id FROM matrix.matrix_items WHERE code=$1 AND project_id=$2`, [code, projectId])).rows[0]?.id;
    if (!itemId) return;
    await c.query(`INSERT INTO matrix.matrix_acceptance_criteria (matrix_item_id, description, is_met, verified_by_user_id, verified_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
      [itemId, desc, met, met ? verifier : null, met ? new Date() : null]);
  };

  await addCrit('1.1', 'Mapeo de procesos de check-in documentado y aprobado.', true, adminId);
  await addCrit('1.1', 'Entrevistas con 3+ recepcionistas completadas.', true, adminId);
  await addCrit('1.2', 'Wireframes aprobados por UX lead.', true, adminId);
  await addCrit('1.2', 'Mockups en Figma con 2 rondas de feedback.', true, devId);
  await addCrit('1.3', 'Modelo ER normalizado y revisado por DBA.', true, devId);
  await addCrit('1.3', 'Diccionario de datos documentado.', true, devId);
  await addCrit('2.1', 'CRUD de habitaciones con validaciones completas.', true, devId);
  await addCrit('2.1', 'Estados de habitación con transiciones válidas.', true, devId);
  await addCrit('2.2', 'Tarifas por temporada funcionando correctamente.', true, devId);
  await addCrit('2.3', 'Motor de disponibilidad sin overbooking.', false, null);
  await addCrit('2.3', 'Bloqueo temporal de 15min durante reserva.', false, null);
  await addCrit('2.3', 'Modificación de reserva sin perder datos.', false, null);
  await addCrit('2.4', 'Check-in digital con captura de documentos.', false, null);
  await addCrit('2.4', 'Check-out con generación automática de factura.', false, null);
  await addCrit('2.5', 'Integración con Stripe funcionando en sandbox.', false, null);
  await addCrit('3.1', 'Grid de habitaciones con código de colores por estado.', false, null);
  await addCrit('3.2', 'Calendario con drag-and-drop para mover reservas.', false, null);
  await addCrit('3.3', 'Formulario de check-in paso a paso validado.', false, null);
  await addCrit('3.4', 'KPIs: ocupación, ADR, RevPAR calculados correctamente.', false, null);
  await addCrit('4.4', 'Deploy exitoso sin downtime.', false, null);

  const critCount = (await c.query(`SELECT COUNT(*) as n FROM matrix.matrix_acceptance_criteria mac JOIN matrix.matrix_items mi ON mac.matrix_item_id=mi.id WHERE mi.project_id=$1`, [projectId])).rows[0].n;
  console.log(`   ✅ ${critCount} criterios creados`);

  // ═══════════════════════════════════════════════════════════════════
  // DEPENDENCIAS
  // ═══════════════════════════════════════════════════════════════════
  console.log('🔗 Creando dependencias...');

  const addDep = async (predCode: string, succCode: string, type: string, lag: number) => {
    const predId = (await c.query(`SELECT id FROM matrix.matrix_items WHERE code=$1 AND project_id=$2`, [predCode, projectId])).rows[0]?.id;
    const succId = (await c.query(`SELECT id FROM matrix.matrix_items WHERE code=$1 AND project_id=$2`, [succCode, projectId])).rows[0]?.id;
    if (!predId || !succId) return;
    await c.query(`INSERT INTO matrix.matrix_dependencies (predecessor_id, successor_id, dependency_type, lag_days, created_at) VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING`, [predId, succId, type, lag]);
  };

  await addDep('1.1', '1.2', 'SS', 5);     // UX empieza mientras se releva
  await addDep('1.1', '1.3', 'FS', 3);     // Modelo después del relevamiento
  await addDep('1.2', '1.4', 'FS', 3);     // Aprobación después del diseño UX
  await addDep('1.3', '1.4', 'FS', 0);     // Aprobación necesita modelo
  await addDep('1.4', '2.1', 'FS', 0);     // Backend empieza con aprobación
  await addDep('2.1', '2.2', 'SS', 5);     // Tarifas overlap con habitaciones
  await addDep('2.1', '2.3', 'FS', 3);     // Reservas necesita habitaciones
  await addDep('2.2', '2.3', 'SS', 7);     // Reservas usa tarifas
  await addDep('2.3', '2.4', 'SS', 7);     // Check-in overlap con reservas
  await addDep('2.3', '2.5', 'SS', 14);    // Pagos necesita reservas funcionando
  await addDep('2.1', '3.1', 'SS', 14);    // Grid empieza con API de habitaciones
  await addDep('2.3', '3.2', 'SS', 10);    // Calendario necesita motor de reservas
  await addDep('2.4', '3.3', 'SS', 7);     // Check-in frontend necesita backend
  await addDep('3.1', '3.4', 'FS', 5);     // Dashboard después del grid
  await addDep('3.3', '3.5', 'FS', 5);     // Portal después de check-in
  await addDep('2.5', '4.1', 'FS', 5);     // Tests después de pagos
  await addDep('3.4', '4.1', 'FS', 0);     // Tests después de dashboard
  await addDep('4.1', '4.2', 'FS', -3);    // UAT overlap con tests finales
  await addDep('4.2', '4.3', 'SS', 5);     // Capacitación overlap con UAT
  await addDep('4.3', '4.4', 'FS', 0);     // Go-live después de capacitación

  const depCount = (await c.query(`SELECT COUNT(*) as n FROM matrix.matrix_dependencies md JOIN matrix.matrix_items mi ON md.predecessor_id=mi.id WHERE mi.project_id=$1`, [projectId])).rows[0].n;
  console.log(`   ✅ ${depCount} dependencias creadas`);

  // ═══════════════════════════════════════════════════════════════════
  // TICKETS
  // ═══════════════════════════════════════════════════════════════════
  console.log('🎫 Creando tickets...');

  const addTicket = async (title: string, desc: string, status: string, priority: string, type: string, matrixCode: string, hours: number, startDate: string, dueDate: string, creator: number, dept: number) => {
    const matrixId = (await c.query(`SELECT id FROM matrix.matrix_items WHERE code=$1 AND project_id=$2`, [matrixCode, projectId])).rows[0]?.id;
    const r = await c.query(`
      INSERT INTO tick.tickets (title, description, status, priority, ticket_type, matrix_item_id, estimated_hours, project_id, start_date, due_date, created_by_user_id, origin_department_id, current_department_id, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,NOW(),NOW()) RETURNING id
    `, [title, desc, status, priority, type, matrixId, hours, projectId, startDate, dueDate, creator, dept]);
    return r.rows[0].id;
  };

  // Fase 1 - Completados
  await addTicket('Mapear proceso de check-in actual',           'Documentar flujo actual de recepción en 3 hoteles piloto.',    'done',        'high',   'task',       '1.1', 12, '2026-01-05','2026-01-10', adminId, deptGer);
  await addTicket('Entrevistar equipo de housekeeping',          'Entender flujo de limpieza y cambio de estado de habitación.', 'done',        'medium', 'task',       '1.1',  8, '2026-01-08','2026-01-14', adminId, deptGer);
  await addTicket('Crear wireframes de recepción en Figma',      'Pantallas: lobby, check-in, asignación, check-out.',          'done',        'high',   'task',       '1.2', 16, '2026-01-12','2026-01-22', devId,   deptDev);
  await addTicket('Diseñar modelo ER del PMS',                   'Tablas: rooms, room_types, rates, reservations, guests.',     'done',        'high',   'task',       '1.3', 10, '2026-01-19','2026-01-28', devId,   deptDev);
  await addTicket('Hito: Firma de diseño PMS',                   'Aprobación formal por gerencia de operaciones.',              'done',        'high',   'milestone',  '1.4',  2, '2026-01-31','2026-02-02', adminId, deptGer);

  // Fase 2 - Backend
  await addTicket('CRUD de tipos de habitación',                 'Endpoint /room-types con validaciones.',                      'done',        'high',   'task',       '2.1', 10, '2026-02-03','2026-02-07', devId, deptDev);
  await addTicket('CRUD de habitaciones con estado',             'Estados: available, occupied, maintenance, cleaning.',        'done',        'high',   'task',       '2.1', 14, '2026-02-05','2026-02-12', devId, deptDev);
  await addTicket('API de transición de estados',                'Validar transiciones válidas entre estados de habitación.',   'done',        'medium', 'task',       '2.1',  8, '2026-02-10','2026-02-14', devId, deptDev);
  await addTicket('CRUD de tarifas por temporada',               'Tarifas con fecha inicio/fin, tipo habitación, monto.',      'done',        'medium', 'task',       '2.2', 12, '2026-02-10','2026-02-18', devId, deptDev);
  await addTicket('Motor de cálculo de tarifa dinámica',         'Calcular tarifa según temporada, duración, canal.',          'done',        'medium', 'task',       '2.2', 10, '2026-02-14','2026-02-21', devId, deptDev);
  await addTicket('Endpoint de disponibilidad en tiempo real',   'GET /availability con filtros de fecha y tipo.',             'in_progress', 'high',   'task',       '2.3', 16, '2026-02-18','2026-03-01', devId, deptDev);
  await addTicket('Lógica de bloqueo temporal de reserva',       'Lock de 15min al iniciar reserva, liberar si no confirma.',  'in_progress', 'high',   'task',       '2.3', 12, '2026-02-22','2026-03-04', devId, deptDev);
  await addTicket('Confirmación y modificación de reserva',      'Confirmar con pago parcial, permitir cambio de fechas.',     'in_review',   'high',   'task',       '2.3', 14, '2026-02-25','2026-03-07', devId, deptDev);
  await addTicket('Registro digital de huéspedes',               'Formulario con datos personales y documentos escaneados.',   'in_progress', 'high',   'task',       '2.4', 12, '2026-02-26','2026-03-08', devId, deptDev);
  await addTicket('Proceso de check-in backend',                 'Asignar habitación, registrar hora, generar key card.',      'in_progress', 'high',   'task',       '2.4', 10, '2026-03-01','2026-03-10', devId, deptDev);
  await addTicket('Proceso de check-out con facturación',        'Cerrar estadía, generar factura, liberar habitación.',       'open',        'high',   'task',       '2.4', 14, '2026-03-05','2026-03-14', devId, deptDev);
  await addTicket('Integrar pasarela Stripe',                    'Cobros online, preautorizaciones, reembolsos.',              'in_progress', 'high',   'task',       '2.5', 16, '2026-03-05','2026-03-15', devId, deptDev);
  await addTicket('Generación de facturas PDF',                  'Template PDF con datos fiscales del hotel.',                 'open',        'medium', 'task',       '2.5', 10, '2026-03-10','2026-03-20', devId, deptDev);
  await addTicket('Bug: tarifa no aplica descuento por estancia larga', 'Estancias >7 noches no reciben descuento configurado.', 'blocked', 'high',   'correction', '2.2',  4, '2026-02-25','2026-02-28', devId, deptDev);

  // Fase 3 - Frontend
  await addTicket('Grid visual de habitaciones (floor plan)',    'Cuadrícula con colores: verde=libre, rojo=ocupada, amarillo=limpieza.', 'in_progress', 'high',   'task',  '3.1', 18, '2026-02-22','2026-03-04', devId, deptDev);
  await addTicket('Filtros de habitación por piso y tipo',       'Sidebar con filtros interactivos.',                           'in_review',   'medium', 'task',  '3.1',  8, '2026-02-28','2026-03-06', devId, deptDev);
  await addTicket('Calendario de reservas tipo Booking',         'Vista mensual con barras de reserva por habitación.',         'in_progress', 'high',   'task',  '3.2', 20, '2026-03-03','2026-03-16', devId, deptDev);
  await addTicket('Drag-and-drop para mover reservas',           'Arrastrar reserva a otra fecha u habitación.',                'open',        'medium', 'task',  '3.2', 12, '2026-03-10','2026-03-20', devId, deptDev);
  await addTicket('Wizard de check-in paso a paso',              'Step 1: Datos, Step 2: Documentos, Step 3: Habitación, Step 4: Confirmar.', 'in_progress', 'high', 'task', '3.3', 14, '2026-03-12','2026-03-25', devId, deptDev);
  await addTicket('Dashboard KPIs de ocupación',                 'Cards: ocupación %, ADR, RevPAR, reservas del día.',          'open',        'medium', 'task',  '3.4', 12, '2026-03-18','2026-04-02', devId, deptDev);
  await addTicket('Gráfica de proyección semanal',               'LineChart con ocupación proyectada vs real.',                 'open',        'low',    'task',  '3.4',  8, '2026-03-22','2026-04-05', devId, deptDev);
  await addTicket('Portal de auto-checkin para huésped',         'Link por email para completar datos antes de llegar.',        'open',        'medium', 'task',  '3.5', 16, '2026-03-25','2026-04-10', devId, deptDev);
  await addTicket('Incidencia: grid no actualiza en tiempo real', 'Al cambiar estado de habitación no se refleja sin refresh.', 'open',       'high',   'incident', '3.1',  4, '2026-03-05','2026-03-08', devId, deptDev);

  // Fase 4 - QA
  await addTicket('Test E2E: reserva → check-in → check-out',   'Flujo completo automatizado con Playwright.',                'open',        'high',   'task',       '4.1', 20, '2026-04-01','2026-04-12', devId, deptDev);
  await addTicket('Test de carga: 100 reservas simultáneas',     'Verificar que no haya overbooking bajo carga.',              'open',        'high',   'task',       '4.1', 12, '2026-04-05','2026-04-15', devId, deptDev);
  await addTicket('Sesión UAT con recepcionistas',               'Preparar guión de prueba con 5 escenarios reales.',          'open',        'medium', 'task',       '4.2', 16, '2026-04-10','2026-04-22', adminId, deptImpl);
  await addTicket('Capacitar equipo de recepción',               '3 sesiones de 2h sobre el nuevo sistema PMS.',               'open',        'medium', 'task',       '4.3', 12, '2026-04-20','2026-04-28', adminId, deptImpl);
  await addTicket('Manual de usuario para recepción',            'Documento paso a paso con capturas de pantalla.',             'open',        'low',    'task',       '4.3', 10, '2026-04-22','2026-04-30', adminId, deptSop);
  await addTicket('Hito: Go-Live PMS Alojamiento',              'Deploy y monitoreo 48h post-launch.',                         'open',        'high',   'milestone',  '4.4',  8, '2026-05-01','2026-05-05', adminId, deptImpl);

  const ticketCount = (await c.query(`SELECT COUNT(*) as n FROM tick.tickets WHERE project_id=$1 AND matrix_item_id IS NOT NULL`, [projectId])).rows[0].n;
  console.log(`   ✅ ${ticketCount} tickets vinculados a matriz`);

  // ═══════════════════════════════════════════════════════════════════
  // ASIGNACIONES
  // ═══════════════════════════════════════════════════════════════════
  console.log('👥 Creando asignaciones...');

  // Dev como assignee en todos los tickets de desarrollo
  await c.query(`
    INSERT INTO tick.ticket_assignments (ticket_id, user_id, role, assigned_at)
    SELECT t.id, $1, 'assignee', NOW() FROM tick.tickets t
    WHERE t.project_id = $2 AND t.created_by_user_id = $1
    ON CONFLICT (ticket_id, user_id) DO NOTHING
  `, [devId, projectId]);

  // Admin como responsible en todos
  await c.query(`
    INSERT INTO tick.ticket_assignments (ticket_id, user_id, role, assigned_at)
    SELECT t.id, $1, 'responsible', NOW() FROM tick.tickets t
    WHERE t.project_id = $2 AND t.created_by_user_id != $1
    ON CONFLICT (ticket_id, user_id) DO NOTHING
  `, [adminId, projectId]);

  // User como observer en tickets de alta prioridad
  if (userId) {
    await c.query(`
      INSERT INTO tick.ticket_assignments (ticket_id, user_id, role, assigned_at)
      SELECT t.id, $1, 'observer', NOW() FROM tick.tickets t
      WHERE t.project_id = $2 AND t.priority = 'high'
      ON CONFLICT (ticket_id, user_id) DO NOTHING
    `, [userId, projectId]);
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAGS
  // ═══════════════════════════════════════════════════════════════════
  console.log('🏷️  Asignando tags...');

  // Crear tags si no existen
  const tagDefs: [string, string][] = [['PMS', '#8B5CF6'], ['Backend', '#6366F1'], ['Frontend', '#2FC6F6'], ['Hotelería', '#F59E0B'], ['Ruta Crítica', '#FF5752']];
  for (const [tName, tColor] of tagDefs) {
    const exists = await c.query(`SELECT 1 FROM tick.tags WHERE name=$1`, [tName]);
    if (exists.rows.length === 0) {
      await c.query(`INSERT INTO tick.tags (name, color, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())`, [tName, tColor]);
    }
  }

  // Asignar PMS a todos los tickets del proyecto
  await c.query(`
    INSERT INTO tick.ticket_tags (ticket_id, tag_id, created_at)
    SELECT t.id, tg.id, NOW() FROM tick.tickets t CROSS JOIN tick.tags tg
    WHERE t.project_id = $1 AND tg.name = 'PMS' AND t.matrix_item_id IS NOT NULL
    ON CONFLICT (ticket_id, tag_id) DO NOTHING
  `, [projectId]);

  // Backend tags
  await c.query(`
    INSERT INTO tick.ticket_tags (ticket_id, tag_id, created_at)
    SELECT t.id, tg.id, NOW() FROM tick.tickets t
    CROSS JOIN tick.tags tg
    JOIN matrix.matrix_items mi ON t.matrix_item_id = mi.id
    WHERE t.project_id = $1 AND tg.name = 'Backend' AND mi.code LIKE '2.%'
    ON CONFLICT (ticket_id, tag_id) DO NOTHING
  `, [projectId]);

  // Frontend tags
  await c.query(`
    INSERT INTO tick.ticket_tags (ticket_id, tag_id, created_at)
    SELECT t.id, tg.id, NOW() FROM tick.tickets t
    CROSS JOIN tick.tags tg
    JOIN matrix.matrix_items mi ON t.matrix_item_id = mi.id
    WHERE t.project_id = $1 AND tg.name = 'Frontend' AND mi.code LIKE '3.%'
    ON CONFLICT (ticket_id, tag_id) DO NOTHING
  `, [projectId]);

  // ═══════════════════════════════════════════════════════════════════
  // CHECKLIST ITEMS
  // ═══════════════════════════════════════════════════════════════════
  console.log('☑️  Creando checklists...');

  const addChecklist = async (ticketTitle: string, items: { text: string; done: boolean }[]) => {
    const tid = (await c.query(`SELECT id FROM tick.tickets WHERE title=$1 AND project_id=$2 LIMIT 1`, [ticketTitle, projectId])).rows[0]?.id;
    if (!tid) return;
    for (let i = 0; i < items.length; i++) {
      await c.query(`INSERT INTO tick.ticket_checklist_items (ticket_id, text, is_completed, sort_order, created_at, updated_at) VALUES ($1,$2,$3,$4,NOW(),NOW())`, [tid, items[i].text, items[i].done, i + 1]);
    }
  };

  await addChecklist('Endpoint de disponibilidad en tiempo real', [
    { text: 'Query de disponibilidad por rango de fechas', done: true },
    { text: 'Filtro por tipo de habitación', done: true },
    { text: 'Excluir habitaciones en mantenimiento', done: false },
    { text: 'Cache de 30s para consultas frecuentes', done: false },
  ]);

  await addChecklist('Proceso de check-in backend', [
    { text: 'Validar reserva confirmada', done: true },
    { text: 'Asignar habitación disponible', done: true },
    { text: 'Cambiar estado a occupied', done: false },
    { text: 'Registrar hora de check-in', done: false },
    { text: 'Notificar a housekeeping', done: false },
  ]);

  await addChecklist('Grid visual de habitaciones (floor plan)', [
    { text: 'Componente base con grid responsive', done: true },
    { text: 'Código de colores por estado', done: true },
    { text: 'Tooltip con info de huésped actual', done: true },
    { text: 'Click para ver detalle de habitación', done: false },
    { text: 'Actualización en tiempo real via WebSocket', done: false },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // COMENTARIOS
  // ═══════════════════════════════════════════════════════════════════
  console.log('💬 Creando comentarios...');

  const addComment = async (ticketTitle: string, uid: number, content: string, date: string) => {
    const tid = (await c.query(`SELECT id FROM tick.tickets WHERE title=$1 AND project_id=$2 LIMIT 1`, [ticketTitle, projectId])).rows[0]?.id;
    if (!tid) return;
    await c.query(`INSERT INTO tick.comments (ticket_id, user_id, content, created_at) VALUES ($1,$2,$3,$4)`, [tid, uid, content, date]);
  };

  await addComment('Endpoint de disponibilidad en tiempo real', devId, 'Query optimizada con índice en (room_id, date_range). Respondiendo <50ms.', '2026-02-25 10:30:00');
  await addComment('Endpoint de disponibilidad en tiempo real', adminId, 'Bien, pero necesitamos manejar el caso de mantenimiento parcial.', '2026-02-25 14:00:00');
  await addComment('Lógica de bloqueo temporal de reserva', devId, 'Implementado con Redis TTL de 15 minutos. Si no se confirma, se libera.', '2026-02-28 11:00:00');
  await addComment('Confirmación y modificación de reserva', devId, 'Listo para review. Incluye validación de disponibilidad al modificar fechas.', '2026-03-05 16:30:00');
  await addComment('Grid visual de habitaciones (floor plan)', devId, 'Grid responsivo funcionando. Los colores cambian según estado.', '2026-03-01 09:00:00');
  await addComment('Bug: tarifa no aplica descuento por estancia larga', devId, 'El cálculo de noches no cuenta la última noche. Bloqueado hasta fix del motor.', '2026-02-26 10:00:00');
  await addComment('Calendario de reservas tipo Booking', devId, 'Usando FullCalendar con vista timeline. Se ven las barras de reserva.', '2026-03-08 15:00:00');

  // ═══════════════════════════════════════════════════════════════════
  // TIME TRACKING
  // ═══════════════════════════════════════════════════════════════════
  console.log('⏱️  Creando time tracking...');

  const addTime = async (ticketTitle: string, uid: number, hours: number, desc: string, date: string) => {
    const tid = (await c.query(`SELECT id FROM tick.tickets WHERE title=$1 AND project_id=$2 LIMIT 1`, [ticketTitle, projectId])).rows[0]?.id;
    if (!tid) return;
    await c.query(`INSERT INTO tick.time_tracking (ticket_id, user_id, "hoursSpent", description, logged_at) VALUES ($1,$2,$3,$4,$5)`, [tid, uid, hours, desc, date]);
  };

  await addTime('CRUD de tipos de habitación', devId, 9, 'CRUD completo con validaciones.', '2026-02-07');
  await addTime('CRUD de habitaciones con estado', devId, 12, 'CRUD + máquina de estados.', '2026-02-12');
  await addTime('CRUD de tarifas por temporada', devId, 11, 'Tarifas con lógica de temporadas.', '2026-02-18');
  await addTime('Endpoint de disponibilidad en tiempo real', devId, 10, 'Query + cache + filtros.', '2026-02-28');
  await addTime('Grid visual de habitaciones (floor plan)', devId, 14, 'Grid component + colores.', '2026-03-02');
  await addTime('Calendario de reservas tipo Booking', devId, 12, 'FullCalendar + timeline view.', '2026-03-10');
  await addTime('Integrar pasarela Stripe', devId, 8, 'SDK de Stripe + sandbox.', '2026-03-12');

  // ═══════════════════════════════════════════════════════════════════
  // BASELINE
  // ═══════════════════════════════════════════════════════════════════
  console.log('📸 Creando baseline...');

  await c.query(`INSERT INTO matrix.project_baselines (project_id, name, created_by_user_id, created_at) VALUES ($1, 'Baseline PMS v1.0 - Kick-off', $2, '2026-02-02')`, [projectId, adminId]);

  await c.query(`
    INSERT INTO matrix.baseline_snapshots (baseline_id, matrix_item_id, planned_start, planned_end, weight, created_at)
    SELECT (SELECT id FROM matrix.project_baselines WHERE project_id=$1 ORDER BY id DESC LIMIT 1),
           mi.id, mi.planned_start, mi.planned_end, mi.weight, '2026-02-02'
    FROM matrix.matrix_items mi WHERE mi.project_id=$1
  `, [projectId]);

  // ═══════════════════════════════════════════════════════════════════
  // RESUMEN
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════');
  console.log('🎉 Seed PMS Alojamiento completado!');

  const summary = await c.query(`
    SELECT
      (SELECT COUNT(*) FROM matrix.matrix_items WHERE project_id=$1) as items,
      (SELECT COUNT(*) FROM matrix.matrix_acceptance_criteria mac JOIN matrix.matrix_items mi ON mac.matrix_item_id=mi.id WHERE mi.project_id=$1) as criteria,
      (SELECT COUNT(*) FROM matrix.matrix_dependencies md JOIN matrix.matrix_items mi ON md.predecessor_id=mi.id WHERE mi.project_id=$1) as deps,
      (SELECT COUNT(*) FROM matrix.project_baselines WHERE project_id=$1) as baselines,
      (SELECT COUNT(*) FROM tick.tickets WHERE project_id=$1 AND matrix_item_id IS NOT NULL) as linked,
      (SELECT COUNT(*) FROM tick.tickets WHERE project_id=$1) as total_tickets
  `, [projectId]);
  const s = summary.rows[0];
  console.log(`   📊 Ítems WBS:    ${s.items}`);
  console.log(`   ✅ Criterios:    ${s.criteria}`);
  console.log(`   🔗 Dependencias: ${s.deps}`);
  console.log(`   📸 Baselines:    ${s.baselines}`);
  console.log(`   🎫 Tickets:      ${s.total_tickets} (${s.linked} vinculados)`);
  console.log('═══════════════════════════════════════════════\n');

  await c.end();
}

run().catch((e) => { console.error('❌', e.message); process.exit(1); });
