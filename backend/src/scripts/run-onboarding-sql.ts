import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'SistemadeTickets',
  synchronize: false,
  logging: true,
});

async function runOnboardingSQL() {
  console.log('🚀 Ejecutando script de Secure Onboarding...\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Conexión a la base de datos establecida\n');

    // Crear tabla invitations
    console.log('📋 Creando tabla core.invitations...');
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS core.invitations (
        id BIGSERIAL PRIMARY KEY,
        pin_code VARCHAR(20) NOT NULL UNIQUE,
        target_role VARCHAR(10) NOT NULL CHECK (target_role IN ('admin', 'dev', 'user')),
        description VARCHAR(255),
        is_used BOOLEAN NOT NULL DEFAULT FALSE,
        used_by_user_id BIGINT REFERENCES core.users(id) ON DELETE SET NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_by_user_id BIGINT REFERENCES core.users(id) ON DELETE SET NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ Tabla invitations creada\n');

    // Crear tabla otp_verification
    console.log('📋 Creando tabla core.otp_verification...');
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS core.otp_verification (
        id BIGSERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        purpose VARCHAR(20) NOT NULL DEFAULT 'registration' CHECK (purpose IN ('registration', 'password_recovery', 'email_change')),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        verified_at TIMESTAMP WITH TIME ZONE,
        attempts INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 5,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ Tabla otp_verification creada\n');

    // Crear tabla password_reset_tokens
    console.log('📋 Creando tabla core.password_reset_tokens...');
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS core.password_reset_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_used BOOLEAN NOT NULL DEFAULT FALSE,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ Tabla password_reset_tokens creada\n');

    // Insertar invitaciones de prueba
    console.log('🎫 Insertando invitaciones de prueba...');
    await AppDataSource.query(`
      INSERT INTO core.invitations (pin_code, target_role, description, expires_at) VALUES
        ('ADMIN-2024-001', 'admin', 'Invitación de prueba para administrador', CURRENT_TIMESTAMP + INTERVAL '30 days'),
        ('DEV-2024-001', 'dev', 'Invitación de prueba para desarrollador', CURRENT_TIMESTAMP + INTERVAL '30 days'),
        ('USER-2024-001', 'user', 'Invitación de prueba para usuario', CURRENT_TIMESTAMP + INTERVAL '30 days')
      ON CONFLICT (pin_code) DO NOTHING
    `);
    console.log('  ✅ Invitaciones insertadas\n');

    // Verificar tablas creadas
    const tables = await AppDataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'core' 
      AND table_name IN ('invitations', 'otp_verification', 'password_reset_tokens')
    `);

    console.log('═══════════════════════════════════════');
    console.log('📊 TABLAS CREADAS EN SCHEMA core:');
    console.log('═══════════════════════════════════════');
    tables.forEach((t: any) => console.log(`  ✓ ${t.table_name}`));
    console.log('═══════════════════════════════════════\n');

    // Mostrar invitaciones
    const invitations = await AppDataSource.query(`
      SELECT pin_code, target_role, description, expires_at 
      FROM core.invitations 
      WHERE is_used = false
    `);

    console.log('🎫 INVITACIONES DISPONIBLES:');
    console.log('┌──────────────────────┬─────────┬────────────────────────────────────────┐');
    console.log('│ PIN Code             │ Rol     │ Descripción                            │');
    console.log('├──────────────────────┼─────────┼────────────────────────────────────────┤');
    invitations.forEach((inv: any) => {
      const pin = inv.pin_code.padEnd(20);
      const role = inv.target_role.padEnd(7);
      const desc = (inv.description || '').substring(0, 38).padEnd(38);
      console.log(`│ ${pin} │ ${role} │ ${desc} │`);
    });
    console.log('└──────────────────────┴─────────┴────────────────────────────────────────┘\n');

    console.log('✨ Script ejecutado exitosamente!\n');
    console.log('📝 Próximos pasos:');
    console.log('   1. Reinicia el backend: npm run start:dev');
    console.log('   2. Ve a http://localhost:5173/register');
    console.log('   3. Usa uno de los PIN codes de arriba para registrarte\n');

  } catch (error: any) {
    if (error.code === '42P07') {
      console.log('ℹ️  Las tablas ya existen, continuando...');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

runOnboardingSQL().catch(console.error);
