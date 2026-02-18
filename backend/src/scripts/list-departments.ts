import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function listDepartments() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'SistemadeTickets',
  });

  try {
    await client.connect();
    console.log('📂 Departamentos en public.departments:\n');

    // Buscar tabla departments en cualquier schema
    const findRes = await client.query(
      `SELECT table_schema, table_name FROM information_schema.tables
       WHERE table_name = 'departments' ORDER BY table_schema`
    );
    if (findRes.rows.length === 0) {
      console.log('   No existe ninguna tabla "departments" en la base de datos.');
      return;
    }
    const schema = findRes.rows[0].table_schema;
    const table = `${schema}.departments`;
    console.log(`   Usando tabla: ${table}\n`);

    const res = await client.query(
      `SELECT id, name, description, project_id, created_at
       FROM ${schema}.departments
       ORDER BY project_id NULLS LAST, name`
    );

    if (res.rows.length === 0) {
      console.log('   (ningún registro)');
    } else {
      res.rows.forEach((row: any) => {
        console.log(`   ID ${row.id}  |  ${row.name}  |  project_id: ${row.project_id ?? 'NULL'}  |  ${row.description || '-'}`);
      });
      console.log(`\n   Total: ${res.rows.length} departamento(s)`);
    }
    console.log('');
  } catch (err) {
    console.error('Error:', err);
    throw err;
  } finally {
    await client.end();
  }
}

listDepartments().catch(() => process.exit(1));
