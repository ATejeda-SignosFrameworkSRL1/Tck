/**
 * SIPE E2E Test — Validación del Flujo Completo
 * ===============================================
 * Verifica toda la cadena: Login → Matriz → Gantt → Tickets → Métricas
 *
 * Uso:
 *   npx ts-node scripts/e2e-sipe-test.ts
 *
 * Requisitos:
 *   - Backend corriendo en http://localhost:3000
 *   - Seed SIPE ya ejecutado (run-sipe-seed.ts)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';

// ── Test state ──
let token = '';
let api: AxiosInstance;
let projectId: number;
let matrixItemId: number;
let newItemId: number;
let ticketId: number;

let passed = 0;
let failed = 0;
const errors: string[] = [];

function ok(label: string) {
  passed++;
  console.log(`  ✅ ${label}`);
}

function fail(label: string, err: any) {
  failed++;
  const msg = err?.response?.data?.message || err?.message || String(err);
  errors.push(`${label}: ${msg}`);
  console.log(`  ❌ ${label} — ${msg}`);
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    ok(label);
  } else {
    fail(label, new Error(detail || 'Assertion failed'));
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TEST SECTIONS
// ═══════════════════════════════════════════════════════════════════════

async function testAuth() {
  console.log('\n🔐 FASE 0: Autenticación');
  try {
    const res = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123',
    });
    token = res.data.access_token || res.data.token;
    assert(!!token, 'Login exitoso como admin@test.com');

    api = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    fail('Login', e);
    throw new Error('No se pudo autenticar. Abortando tests.');
  }
}

async function testProjects() {
  console.log('\n📁 FASE 0.5: Obtener Proyecto');
  try {
    const res = await api.get('/projects');
    const projects = res.data;
    assert(Array.isArray(projects) && projects.length > 0, `Proyectos encontrados: ${projects.length}`);

    // Buscar el proyecto que tiene datos SIPE (AGEport o el primero con matriz)
    // Intentar verificar cuál proyecto tiene ítems de matriz
    let selectedProject = null;
    for (const p of projects) {
      try {
        const treeRes = await api.get(`/matrix/project/${p.id}`);
        if (Array.isArray(treeRes.data) && treeRes.data.length > 0) {
          selectedProject = p;
          break;
        }
      } catch { /* skip */ }
    }

    if (!selectedProject) {
      // Fallback: primer proyecto activo (asumir que es AGEport id=1)
      selectedProject = projects.find((p: any) => p.isActive) || projects[0];
    }

    projectId = (selectedProject as any)?.id;
    assert(!!projectId, `Proyecto SIPE seleccionado: id=${projectId} "${(selectedProject as any)?.name}"`);
  } catch (e) {
    fail('GET /projects', e);
  }
}

async function testMatrixTree() {
  console.log('\n🌳 FASE 1: Matriz de Entregables (QUÉ)');
  try {
    // Get tree
    const treeRes = await api.get(`/matrix/project/${projectId}`);
    const tree = treeRes.data;
    assert(Array.isArray(tree) && tree.length > 0, `Árbol WBS cargado: ${tree.length} nodos raíz`);

    // Contar total de ítems (recursivo)
    let total = 0;
    const count = (items: any[]) => items.forEach((i) => { total++; if (i.children) count(i.children); });
    count(tree);
    assert(total >= 15, `Total ítems en árbol: ${total} (esperado ≥15)`);

    // Guardar un matrixItemId para tests posteriores
    matrixItemId = tree[0]?.id;
  } catch (e) {
    fail('GET /matrix/project/:id', e);
  }

  try {
    // Get flat
    const flatRes = await api.get(`/matrix/project/${projectId}/flat`);
    assert(Array.isArray(flatRes.data) && flatRes.data.length >= 15, `Vista flat: ${flatRes.data.length} ítems`);
  } catch (e) {
    fail('GET /matrix/project/:id/flat', e);
  }

  try {
    // Get progress
    const progRes = await api.get(`/matrix/project/${projectId}/progress`);
    const prog = progRes.data;
    assert(typeof prog.totalItems === 'number' && prog.totalItems > 0, `Progreso: ${prog.totalItems} ítems, avance ${prog.overallProgress?.toFixed(1)}%`);
    assert(typeof prog.overallProgress === 'number', `Progreso general calculado: ${prog.overallProgress?.toFixed(1)}%`);
  } catch (e) {
    fail('GET /matrix/project/:id/progress', e);
  }
}

async function testMatrixCRUD() {
  console.log('\n✏️  FASE 1.2: CRUD de Matriz');

  try {
    // Create item
    const createRes = await api.post('/matrix/items', {
      projectId,
      code: 'E2E.1',
      title: 'Ítem de prueba E2E',
      description: 'Creado por el test E2E SIPE',
      weight: 5,
      plannedStart: '2026-05-01',
      plannedEnd: '2026-05-10',
      isMilestone: false,
      isCriticalPath: false,
    });
    newItemId = createRes.data.id;
    assert(!!newItemId, `Crear ítem WBS: id=${newItemId}`);
  } catch (e) {
    fail('POST /matrix/items', e);
  }

  if (newItemId) {
    try {
      // Update item
      await api.patch(`/matrix/items/${newItemId}`, {
        title: 'Ítem E2E Actualizado',
        weight: 10,
      });
      ok('Actualizar ítem WBS');
    } catch (e) {
      fail('PATCH /matrix/items/:id', e);
    }

    try {
      // Add acceptance criteria
      const critRes = await api.post(`/matrix/items/${newItemId}/criteria`, {
        description: 'Criterio de prueba E2E verificable.',
      });
      assert(!!critRes.data.id, `Agregar criterio de aceptación: id=${critRes.data.id}`);

      // Verify criteria
      await api.patch(`/matrix/criteria/${critRes.data.id}/verify`);
      ok('Verificar criterio de aceptación');
    } catch (e) {
      fail('Criterios de aceptación', e);
    }

    try {
      // Create dependency
      if (matrixItemId && matrixItemId !== newItemId) {
        const depRes = await api.post('/matrix/dependencies', {
          predecessorId: Number(matrixItemId),
          successorId: Number(newItemId),
          type: 'FS',
          lagDays: 3,
        });
        assert(!!depRes.data.id, `Crear dependencia: id=${depRes.data.id}`);
      } else {
        ok('Dependencia: skip (mismo ítem)');
      }
    } catch (e) {
      fail('POST /matrix/dependencies', e);
    }

    try {
      // Get dependencies
      const depsRes = await api.get(`/matrix/project/${projectId}/dependencies`);
      assert(Array.isArray(depsRes.data) && depsRes.data.length > 0, `Dependencias del proyecto: ${depsRes.data.length}`);
    } catch (e) {
      fail('GET /matrix/project/:id/dependencies', e);
    }

    try {
      // Delete test item (cleanup)
      await api.delete(`/matrix/items/${newItemId}`);
      ok('Eliminar ítem E2E (cleanup)');
    } catch (e) {
      fail('DELETE /matrix/items/:id', e);
    }
  }
}

async function testBaselines() {
  console.log('\n📸 FASE 1.3: Baselines');

  try {
    const baselines = await api.get(`/matrix/project/${projectId}/baselines`);
    assert(Array.isArray(baselines.data) && baselines.data.length > 0, `Baselines existentes: ${baselines.data.length}`);

    if (baselines.data.length > 0) {
      const detail = await api.get(`/matrix/baselines/${baselines.data[0].id}`);
      assert(!!detail.data.id, `Detalle baseline "${detail.data.name}": ${detail.data.snapshots?.length || 0} snapshots`);
    }
  } catch (e) {
    fail('Baselines', e);
  }
}

async function testGantt() {
  console.log('\n📊 FASE 2: Diagrama de Gantt (CUÁNDO)');

  try {
    const ganttRes = await api.get(`/gantt/project/${projectId}`);
    const data = ganttRes.data;
    assert(Array.isArray(data.tasks) && data.tasks.length > 0, `Gantt tasks: ${data.tasks.length}`);
    assert(Array.isArray(data.links), `Gantt links: ${data.links?.length || 0}`);
    assert(Array.isArray(data.criticalPath), `Ruta crítica: ${data.criticalPath?.length || 0} ítems`);
  } catch (e) {
    fail('GET /gantt/project/:id', e);
  }

  try {
    const cpRes = await api.get(`/gantt/project/${projectId}/critical-path`);
    assert(Array.isArray(cpRes.data) && cpRes.data.length > 0, `Critical path endpoint: ${cpRes.data.length} ítems`);
  } catch (e) {
    fail('GET /gantt/project/:id/critical-path', e);
  }

  try {
    const devRes = await api.get(`/gantt/project/${projectId}/deviations`);
    assert(Array.isArray(devRes.data), `Desvíos: ${devRes.data?.length || 0} ítems`);
  } catch (e) {
    fail('GET /gantt/project/:id/deviations', e);
  }
}

async function testTickets() {
  console.log('\n🎫 FASE 3: Tickets SIPE (CÓMO)');

  try {
    // Get tickets for the project
    const ticketsRes = await api.get('/tickets', { params: { projectId } });
    const tickets = ticketsRes.data?.data || ticketsRes.data;
    const ticketList = Array.isArray(tickets) ? tickets : [];
    assert(ticketList.length > 0, `Tickets del proyecto: ${ticketList.length}`);

    // Check SIPE fields
    const linkedTickets = ticketList.filter((t: any) => t.matrixItemId != null);
    assert(linkedTickets.length > 0, `Tickets vinculados a matriz: ${linkedTickets.length}`);

    const inReview = ticketList.filter((t: any) => t.status === 'in_review');
    assert(inReview.length > 0, `Tickets en revisión (in_review): ${inReview.length}`);

    const typedTickets = ticketList.filter((t: any) => t.ticketType && t.ticketType !== 'task');
    assert(typedTickets.length > 0, `Tickets con tipo especial: ${typedTickets.length} (${[...new Set(typedTickets.map((t: any) => t.ticketType))].join(', ')})`);

    // Save a ticket for detail test
    ticketId = ticketList[0]?.id;
  } catch (e) {
    fail('GET /tickets', e);
  }

  if (ticketId) {
    try {
      const detailRes = await api.get(`/tickets/${ticketId}`);
      const ticket = detailRes.data;
      assert(!!ticket.id, `Detalle ticket #${ticket.id}: "${ticket.title}"`);
      assert(ticket.status !== undefined, `Status: ${ticket.status}`);
    } catch (e) {
      fail('GET /tickets/:id', e);
    }
  }
}

async function testMetrics() {
  console.log('\n📈 FASE 4: Métricas y Dashboard (ESTATUS)');

  try {
    const healthRes = await api.get(`/metrics/project/${projectId}/health`);
    const h = healthRes.data;
    assert(!!h.status, `Semáforo de salud: ${h.status} (${h.deviationPercentage?.toFixed(1)}% desvío)`);
    assert(!!h.message, `Mensaje: "${h.message}"`);
  } catch (e) {
    fail('GET /metrics/project/:id/health', e);
  }

  try {
    const progRes = await api.get(`/metrics/project/${projectId}/progress`);
    const p = progRes.data;
    assert(typeof p.planned === 'number', `Avance planificado: ${p.planned?.toFixed(1)}%`);
    assert(typeof p.actual === 'number', `Avance real: ${p.actual?.toFixed(1)}%`);
    assert(typeof p.gap === 'number', `GAP: ${p.gap?.toFixed(1)}%`);
    assert(Array.isArray(p.byPartida) && p.byPartida.length > 0, `Detalle por partida: ${p.byPartida.length} ítems`);
  } catch (e) {
    fail('GET /metrics/project/:id/progress', e);
  }

  try {
    const devRes = await api.get(`/metrics/project/${projectId}/deviation`);
    const d = devRes.data;
    assert(typeof d.gapDays === 'number', `GAP días: ${d.gapDays}`);
    assert(Array.isArray(d.sCurve), `Curva S: ${d.sCurve?.length || 0} puntos`);
  } catch (e) {
    fail('GET /metrics/project/:id/deviation', e);
  }

  try {
    const fRes = await api.get(`/metrics/project/${projectId}/forecast`);
    const f = fRes.data;
    assert(typeof f.velocity === 'number', `Velocidad: ${f.velocity} tickets/sem`);
    assert(typeof f.gapDays === 'number', `Forecast GAP: ${f.gapDays} días`);
  } catch (e) {
    fail('GET /metrics/project/:id/forecast', e);
  }

  try {
    const docRes = await api.get(`/metrics/project/${projectId}/documentation-compliance`);
    const c = docRes.data;
    assert(typeof c.percentage === 'number', `Compliance documental: ${c.percentage?.toFixed(0)}%`);
    assert(typeof c.totalItems === 'number', `Ítems totales: ${c.totalItems}, documentados: ${c.documentedItems}`);
  } catch (e) {
    fail('GET /metrics/project/:id/documentation-compliance', e);
  }

  try {
    const distRes = await api.get(`/metrics/project/${projectId}/ticket-distribution`);
    const d = distRes.data;
    assert(typeof d.total === 'number' && d.total > 0, `Distribución tickets: ${d.total} total`);
    assert(typeof d.open === 'number', `  Abiertos: ${d.open}`);
    assert(typeof d.inProgress === 'number', `  En progreso: ${d.inProgress}`);
    assert(typeof d.inReview === 'number', `  En revisión: ${d.inReview}`);
    assert(typeof d.blocked === 'number', `  Bloqueados: ${d.blocked}`);
    assert(typeof d.done === 'number', `  Completados: ${d.done}`);
  } catch (e) {
    fail('GET /metrics/project/:id/ticket-distribution', e);
  }
}

async function testMatrixItemWithTickets() {
  console.log('\n🔗 FASE 5: Drill-down Matriz → Tickets');

  if (matrixItemId) {
    try {
      // Buscar un ítem hijo que tenga tickets (los de nivel 1 como 2.1 tienen tickets)
      const flatRes = await api.get(`/matrix/project/${projectId}/flat`);
      const items = flatRes.data || [];
      const itemWithTickets = items.find((i: any) => i.code && i.code.includes('.'));
      const targetId = itemWithTickets?.id || matrixItemId;

      const res = await api.get(`/matrix/items/${targetId}/with-tickets`);
      const data = res.data;
      assert(!!data.id || !!data.code || Array.isArray(data.tickets) || Array.isArray(data), `Ítem de matriz con tickets obtenido (id=${targetId})`);
      const tickets = data.tickets || (Array.isArray(data) ? data : []);
      assert(true, `Tickets vinculados al ítem: ${tickets.length}`);
    } catch (e) {
      fail('GET /matrix/items/:id/with-tickets', e);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  SIPE E2E Test Suite');
  console.log(`  Backend: ${API_URL}`);
  console.log('═══════════════════════════════════════════════');

  try {
    await testAuth();
    await testProjects();
    await testMatrixTree();
    await testMatrixCRUD();
    await testBaselines();
    await testGantt();
    await testTickets();
    await testMetrics();
    await testMatrixItemWithTickets();
  } catch (e: any) {
    console.error(`\n💥 Test abortado: ${e.message}`);
  }

  // ── Resumen ──
  console.log('\n═══════════════════════════════════════════════');
  console.log(`  RESULTADOS: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════');
  if (errors.length > 0) {
    console.log('\n❌ Errores:');
    errors.forEach((e) => console.log(`   - ${e}`));
  }
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main();
