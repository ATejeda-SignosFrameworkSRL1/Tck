/**
 * SIPE Seed Runner
 * ================
 * Ejecuta el seed SQL directamente y luego verifica con las APIs del backend.
 *
 * Uso:
 *   npx ts-node scripts/run-sipe-seed.ts
 *
 * Requisitos:
 *   - PostgreSQL corriendo con la BD SistemadeTicketsConMatriz
 *   - Las migraciones ya ejecutadas
 *   - El seed base (usuarios, proyectos, departamentos) ya cargado
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'SistemadeTicketsConMatriz',
};

async function runSeed() {
  const client = new Client(DB_CONFIG);

  try {
    console.log('🔌 Conectando a PostgreSQL...');
    console.log(`   Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
    console.log(`   Database: ${DB_CONFIG.database}`);
    await client.connect();
    console.log('✅ Conectado.\n');

    // Leer y ejecutar el SQL seed
    const sqlPath = path.join(__dirname, '..', 'sql', 'seed-sipe-demo.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📦 Ejecutando seed SIPE...');
    await client.query(sql);
    console.log('✅ Seed SIPE ejecutado correctamente.\n');

    // Verificar datos insertados
    console.log('🔍 Verificando datos insertados...\n');

    const projectRes = await client.query(`
      SELECT id, name FROM public.projects WHERE is_active = true ORDER BY id LIMIT 1
    `);
    const projectId = projectRes.rows[0]?.id;
    const projectName = projectRes.rows[0]?.name;
    console.log(`   📁 Proyecto: ${projectName} (id=${projectId})`);

    const matrixCount = await client.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
             SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
             SUM(CASE WHEN status = 'delayed' THEN 1 ELSE 0 END) as delayed,
             SUM(CASE WHEN status = 'not_started' THEN 1 ELSE 0 END) as not_started,
             SUM(CASE WHEN is_milestone = true THEN 1 ELSE 0 END) as milestones,
             SUM(CASE WHEN is_critical_path = true THEN 1 ELSE 0 END) as critical
      FROM matrix.matrix_items WHERE project_id = $1
    `, [projectId]);
    const m = matrixCount.rows[0];
    console.log(`   📊 Matriz WBS: ${m.total} ítems (${m.completed} completados, ${m.in_progress} en progreso, ${m.delayed} retrasados, ${m.not_started} sin iniciar)`);
    console.log(`      Hitos: ${m.milestones} | En ruta crítica: ${m.critical}`);

    const criteriaCount = await client.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN is_met = true THEN 1 ELSE 0 END) as met
      FROM matrix.matrix_acceptance_criteria mac
      JOIN matrix.matrix_items mi ON mac.matrix_item_id = mi.id
      WHERE mi.project_id = $1
    `, [projectId]);
    const c = criteriaCount.rows[0];
    console.log(`   ✅ Criterios de Aceptación: ${c.total} (${c.met} cumplidos)`);

    const depCount = await client.query(`
      SELECT COUNT(*) as total FROM matrix.matrix_dependencies md
      JOIN matrix.matrix_items mi ON md.predecessor_id = mi.id
      WHERE mi.project_id = $1
    `, [projectId]);
    console.log(`   🔗 Dependencias: ${depCount.rows[0].total}`);

    const baselineCount = await client.query(`
      SELECT COUNT(*) as baselines,
             (SELECT COUNT(*) FROM matrix.baseline_snapshots bs
              JOIN matrix.project_baselines pb ON bs.baseline_id = pb.id
              WHERE pb.project_id = $1) as snapshots
      FROM matrix.project_baselines WHERE project_id = $1
    `, [projectId]);
    const b = baselineCount.rows[0];
    console.log(`   📸 Baselines: ${b.baselines} (${b.snapshots} snapshots)`);

    const ticketCount = await client.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
             SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
             SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as in_review,
             SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
             SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
             SUM(CASE WHEN matrix_item_id IS NOT NULL THEN 1 ELSE 0 END) as linked
      FROM tick.tickets WHERE project_id = $1
    `, [projectId]);
    const t = ticketCount.rows[0];
    console.log(`   🎫 Tickets: ${t.total} total (${t.done} done, ${t.in_progress} in_progress, ${t.in_review} in_review, ${t.blocked} blocked, ${t.open} open)`);
    console.log(`      Vinculados a matriz: ${t.linked}/${t.total}`);

    const assignCount = await client.query(`
      SELECT role, COUNT(*) as total FROM tick.ticket_assignments ta
      JOIN tick.tickets t ON ta.ticket_id = t.id
      WHERE t.project_id = $1
      GROUP BY role ORDER BY role
    `, [projectId]);
    console.log(`   👥 Asignaciones: ${assignCount.rows.map(r => `${r.role}: ${r.total}`).join(', ')}`);

    const tagCount = await client.query(`
      SELECT tg.name, COUNT(*) as total FROM tick.ticket_tags tt
      JOIN tick.tags tg ON tt.tag_id = tg.id
      JOIN tick.tickets t ON tt.ticket_id = t.id
      WHERE t.project_id = $1
      GROUP BY tg.name ORDER BY tg.name
    `, [projectId]);
    console.log(`   🏷️  Tags: ${tagCount.rows.map(r => `${r.name}: ${r.total}`).join(', ')}`);

    const checklistCount = await client.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN is_completed = true THEN 1 ELSE 0 END) as done
      FROM tick.ticket_checklist_items ci
      JOIN tick.tickets t ON ci.ticket_id = t.id
      WHERE t.project_id = $1
    `, [projectId]);
    const cl = checklistCount.rows[0];
    console.log(`   ☑️  Checklist items: ${cl.total} (${cl.done} completados)`);

    const commentCount = await client.query(`
      SELECT COUNT(*) as total FROM tick.comments co
      JOIN tick.tickets t ON co.ticket_id = t.id
      WHERE t.project_id = $1
    `, [projectId]);
    console.log(`   💬 Comentarios: ${commentCount.rows[0].total}`);

    const timeCount = await client.query(`
      SELECT COUNT(*) as entries, COALESCE(SUM("hoursSpent"), 0) as total_hours
      FROM tick.time_tracking tt
      JOIN tick.tickets t ON tt.ticket_id = t.id
      WHERE t.project_id = $1
    `, [projectId]);
    const tc = timeCount.rows[0];
    console.log(`   ⏱️  Time tracking: ${tc.entries} entradas, ${tc.total_hours}h registradas`);

    console.log('\n═══════════════════════════════════════════');
    console.log('🎉 SIPE Seed completado exitosamente.');
    console.log('   Ahora inicia el backend y verifica en:');
    console.log(`   - Matriz: http://localhost:5173/matrix`);
    console.log(`   - Gantt:  http://localhost:5173/gantt`);
    console.log(`   - Kanban: http://localhost:5173/kanban`);
    console.log(`   - Dashboard: http://localhost:5173/metrics`);
    console.log('═══════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Error ejecutando seed:', error.message);
    if (error.detail) console.error('   Detalle:', error.detail);
    if (error.hint) console.error('   Hint:', error.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeed();
