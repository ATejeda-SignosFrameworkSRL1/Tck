/**
 * Ejecuta la migración del schema matrix y luego el seed SIPE
 *
 * Uso:
 *   npx ts-node scripts/run-migration-and-seed.ts
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

async function run() {
  const client = new Client(DB_CONFIG);

  try {
    console.log('🔌 Conectando a PostgreSQL...');
    await client.connect();
    console.log(`✅ Conectado a ${DB_CONFIG.database}\n`);

    // ── 1. Ejecutar migración ──
    console.log('📐 Paso 1: Ejecutando migración del schema matrix...');
    const migrationPath = path.join(__dirname, '..', 'sql', 'migration-matrix-schema.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    // Separar los bloques DO $$ que tienen ALTER TYPE ... ADD VALUE
    // ya que no pueden ejecutarse dentro de una transacción
    // Ejecutar en modo autocommit (cada statement por separado)
    const statements = splitSqlStatements(migrationSql);
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      try {
        await client.query(trimmed);
      } catch (err: any) {
        // Ignorar errores de "already exists" y "value already exists for enum"
        if (err.message?.includes('already exists') ||
            err.message?.includes('duplicate') ||
            err.code === '42710') {
          // skip
        } else {
          console.warn(`   ⚠️  Warning: ${err.message}`);
        }
      }
    }
    console.log('✅ Migración completada.\n');

    // Verificar que las tablas existen
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'matrix' ORDER BY table_name
    `);
    console.log(`   Tablas en schema matrix: ${tables.rows.map(r => r.table_name).join(', ')}\n`);

    // ── 2. Ejecutar seed ──
    console.log('🌱 Paso 2: Ejecutando seed SIPE...');
    const seedPath = path.join(__dirname, '..', 'sql', 'seed-sipe-demo.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    await client.query(seedSql);
    console.log('✅ Seed SIPE completado.\n');

    // ── 3. Verificar ──
    console.log('🔍 Paso 3: Verificación rápida...\n');

    const projectRes = await client.query(`
      SELECT id, name FROM public.projects WHERE is_active = true ORDER BY id LIMIT 1
    `);
    const pid = projectRes.rows[0]?.id;
    console.log(`   📁 Proyecto: "${projectRes.rows[0]?.name}" (id=${pid})`);

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM matrix.matrix_items WHERE project_id = $1) as items,
        (SELECT COUNT(*) FROM matrix.matrix_acceptance_criteria mac
         JOIN matrix.matrix_items mi ON mac.matrix_item_id = mi.id WHERE mi.project_id = $1) as criteria,
        (SELECT COUNT(*) FROM matrix.matrix_dependencies md
         JOIN matrix.matrix_items mi ON md.predecessor_id = mi.id WHERE mi.project_id = $1) as deps,
        (SELECT COUNT(*) FROM matrix.project_baselines WHERE project_id = $1) as baselines,
        (SELECT COUNT(*) FROM tick.tickets WHERE project_id = $1 AND matrix_item_id IS NOT NULL) as linked_tickets,
        (SELECT COUNT(*) FROM tick.tickets WHERE project_id = $1) as total_tickets
    `, [pid]);
    const c = counts.rows[0];
    console.log(`   📊 Ítems WBS:    ${c.items}`);
    console.log(`   ✅ Criterios:    ${c.criteria}`);
    console.log(`   🔗 Dependencias: ${c.deps}`);
    console.log(`   📸 Baselines:    ${c.baselines}`);
    console.log(`   🎫 Tickets:      ${c.total_tickets} (${c.linked_tickets} vinculados a matriz)`);

    console.log('\n═══════════════════════════════════════');
    console.log('🎉 ¡Migración + Seed SIPE listos!');
    console.log('   Ahora arranca el backend y frontend:');
    console.log('   cd backend && npm run start:dev');
    console.log('   cd frontend && npm run dev');
    console.log('═══════════════════════════════════════\n');

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    if (error.detail) console.error(`   Detail: ${error.detail}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

/**
 * Split SQL into executable statements, preserving DO $$ ... $$ blocks
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarBlock = false;
  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip pure comments
    if (trimmed.startsWith('--') && !inDollarBlock) {
      continue;
    }

    current += line + '\n';

    if (!inDollarBlock) {
      // Check if entering a DO $$ block
      if (trimmed.includes('DO $$') || trimmed.match(/^DO\s*\$/)) {
        inDollarBlock = true;
        continue;
      }
      // Check if statement ends with ;
      if (trimmed.endsWith(';')) {
        statements.push(current.trim());
        current = '';
      }
    } else {
      // Check if we're closing the $$ block
      if ((trimmed === '$$;' || trimmed.endsWith('$$;')) && !trimmed.startsWith('DO')) {
        inDollarBlock = false;
        statements.push(current.trim());
        current = '';
      }
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

run();
