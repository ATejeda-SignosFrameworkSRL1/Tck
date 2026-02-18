import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno desde .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function activateProjects() {
  console.log('🚀 Activando todos los proyectos...\n');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'SistemadeTickets',
  });

  try {
    await client.connect();
    console.log('✅ Conexión a la base de datos establecida\n');

    // Verificar proyectos antes de actualizar
    const beforeResult = await client.query(
      'SELECT id, name, is_active FROM core.projects ORDER BY name'
    );
    console.log('📁 Estado actual de proyectos:');
    beforeResult.rows.forEach((row) => {
      console.log(`  - ${row.name}: ${row.is_active ? '✅ Activo' : '❌ Inactivo'}`);
    });

    // Actualizar todos los proyectos a activos
    const updateResult = await client.query(
      'UPDATE core.projects SET is_active = true WHERE is_active = false RETURNING id, name'
    );

    if (updateResult.rowCount > 0) {
      console.log(`\n✅ ${updateResult.rowCount} proyecto(s) activado(s):`);
      updateResult.rows.forEach((row) => {
        console.log(`  - ${row.name}`);
      });
    } else {
      console.log('\n⏭️  Todos los proyectos ya estaban activos');
    }

    console.log('\n✨ Activación completada!\n');
  } catch (error) {
    console.error('❌ Error durante la activación:', error);
    throw error;
  } finally {
    await client.end();
  }
}

activateProjects().catch(console.error);
