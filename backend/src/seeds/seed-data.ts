import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { User, UserRole } from '../users/user.entity';
import { UserDepartment } from '../users/user-department.entity';
import { Department } from '../departments/department.entity';
import { Project } from '../projects/project.entity';
import { Ticket } from '../tickets/ticket.entity';
import { TicketAssignment } from '../tickets/ticket-assignment.entity';
import { TicketTransition } from '../tickets/ticket-transition.entity';
import { TicketChecklistItem } from '../tickets/ticket-checklist-item.entity';
import { TicketAttachment } from '../tickets/ticket-attachment.entity';

// Cargar variables de entorno desde .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Entidades necesarias para que TypeORM resuelva relaciones (Project->Ticket, Ticket->checklistItems, etc.)
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'SistemadeTickets',
  entities: [
    User,
    UserDepartment,
    Department,
    Project,
    Ticket,
    TicketAssignment,
    TicketTransition,
    TicketChecklistItem,
    TicketAttachment,
  ],
  synchronize: false,
  logging: true,
});

// ============ DATOS DEL SEED ============

const PROJECTS = [
  { name: 'AGEport', description: 'Sistema AGEport' },
  { name: 'Sistema de Visitas', description: 'Control de visitas' },
  { name: 'PMS Lifes Style', description: 'Property Management System - Lifes Style' },
  { name: 'PMS Alojamiento', description: 'Property Management System - Alojamiento' },
];

const DEPARTMENTS = [
  { name: 'gerencia', description: 'Departamento de Gerencia' },
  { name: 'proyecto', description: 'Departamento de Proyectos' },
  { name: 'desarrollo', description: 'Departamento de Desarrollo' },
  { name: 'implementacion', description: 'Departamento de Implementación' },
  { name: 'soporte', description: 'Departamento de Soporte' },
  { name: 'administracion', description: 'Departamento de Administración' },
  { name: 'ventas', description: 'Departamento de Ventas' },
];

// Usuarios con sus departamentos
const USERS_DATA = [
  // Gerencia
  { name: 'Danny Encarnacion', email: 'danny.encarnacion@sistema.com', role: UserRole.ADMIN, departments: ['gerencia'] },
  { name: 'Junior Nuñez', email: 'junior.nunez@sistema.com', role: UserRole.DEV, departments: ['gerencia', 'desarrollo'] },
  { name: 'Carlos Wu', email: 'carlos.wu@sistema.com', role: UserRole.DEV, departments: ['gerencia', 'desarrollo'] },
  { name: 'Maribel Sole', email: 'maribel.sole@sistema.com', role: UserRole.ADMIN, departments: ['gerencia', 'proyecto'] },
  { name: 'Alfredo Sole', email: 'alfredo.sole@sistema.com', role: UserRole.ADMIN, departments: ['gerencia', 'desarrollo'] },

  // Administración
  { name: 'Synthia Peña', email: 'synthia.pena@sistema.com', role: UserRole.USER, departments: ['administracion'] },

  // Proyecto
  { name: 'Lili Ortiz', email: 'lili.ortiz@sistema.com', role: UserRole.USER, departments: ['proyecto', 'soporte'] },
  { name: 'Isabel Rojas', email: 'isabel.rojas@sistema.com', role: UserRole.USER, departments: ['proyecto', 'soporte'] },

  // Desarrollo
  { name: 'Luis Sierra', email: 'luis.sierra@sistema.com', role: UserRole.ADMIN, departments: ['desarrollo'] },
  { name: 'Victor Contreras Vargas', email: 'victor.contreras@sistema.com', role: UserRole.DEV, departments: ['desarrollo'] },
  { name: 'Anderson Tejeda', email: 'anderson.tejeda@sistema.com', role: UserRole.DEV, departments: ['desarrollo'] },
  { name: 'Eudys Saviñon', email: 'eudys.savinon@sistema.com', role: UserRole.DEV, departments: ['desarrollo'] },
  { name: 'Gregorio Mata', email: 'gregorio.mata@sistema.com', role: UserRole.DEV, departments: ['desarrollo'] },

  // Soporte e Implementación
  { name: 'Elvin Vargas', email: 'elvin.vargas@sistema.com', role: UserRole.ADMIN, departments: ['implementacion', 'soporte'] },
  { name: 'Kenny Rodriguez', email: 'kenny.rodriguez@sistema.com', role: UserRole.DEV, departments: ['implementacion', 'soporte'] },
  { name: 'Jose Martinez', email: 'jose.martinez@sistema.com', role: UserRole.DEV, departments: ['implementacion', 'soporte'] },
  { name: 'Alejandro Mata', email: 'alejandro.mata@sistema.com', role: UserRole.DEV, departments: ['implementacion', 'soporte'] },
  { name: 'Francisco Carvajal', email: 'francisco.carvajal@sistema.com', role: UserRole.DEV, departments: ['implementacion', 'soporte'] },
  { name: 'Allen Vargas', email: 'allen.vargas@sistema.com', role: UserRole.DEV, departments: ['implementacion', 'soporte', 'ventas'] },

  // Ventas
  { name: 'Johanna Quintana', email: 'johanna.quintana@sistema.com', role: UserRole.USER, departments: ['ventas'] },
];

// Credenciales de demo
const DEMO_USERS = [
  { name: 'Usuario Test', email: 'user@test.com', password: 'user123', role: UserRole.USER, departments: ['soporte'] },
  { name: 'Developer Test', email: 'dev@test.com', password: 'dev123', role: UserRole.DEV, departments: ['desarrollo'] },
  { name: 'Admin Test', email: 'admin@test.com', password: 'admin123', role: UserRole.ADMIN, departments: ['gerencia', 'desarrollo'] },
];

async function seed() {
  console.log('🚀 Iniciando seed de datos...\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Conexión a la base de datos establecida\n');

    // Asegurar que exista la tabla public.projects (puede no existir si synchronize está en false)
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS public.projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        client_deadline TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla public.projects verificada\n');

    const userRepo = AppDataSource.getRepository(User);
    const departmentRepo = AppDataSource.getRepository(Department);
    const projectRepo = AppDataSource.getRepository(Project);
    const userDepartmentRepo = AppDataSource.getRepository(UserDepartment);

    // ============ CREAR PROYECTOS ============
    console.log('📁 Creando proyectos...');
    const projects: Project[] = [];
    for (const projectData of PROJECTS) {
      let project = await projectRepo.findOne({ where: { name: projectData.name } });
      if (!project) {
        project = projectRepo.create(projectData);
        await projectRepo.save(project);
        console.log(`  ✅ Proyecto creado: ${project.name}`);
      } else {
        console.log(`  ⏭️  Proyecto ya existe: ${project.name}`);
      }
      projects.push(project);
    }
    console.log('');

    // ============ CREAR DEPARTAMENTOS ============
    console.log('🏢 Creando departamentos...');
    const departmentsMap = new Map<string, Department>();
    for (const deptData of DEPARTMENTS) {
      let department = await departmentRepo.findOne({ where: { name: deptData.name } });
      if (!department) {
        department = departmentRepo.create(deptData);
        await departmentRepo.save(department);
        console.log(`  ✅ Departamento creado: ${department.name}`);
      } else {
        console.log(`  ⏭️  Departamento ya existe: ${department.name}`);
      }
      departmentsMap.set(department.name, department);
    }
    console.log('');

    // ============ CREAR USUARIOS ============
    console.log('👤 Creando usuarios del sistema...');
    const defaultPassword = await bcrypt.hash('User123!', 10);

    for (const userData of USERS_DATA) {
      let user = await userRepo.findOne({ where: { email: userData.email } });
      if (!user) {
        user = userRepo.create({
          name: userData.name,
          email: userData.email,
          password: defaultPassword,
          role: userData.role,
        });
        await userRepo.save(user);
        console.log(`  ✅ Usuario creado: ${user.name} (${user.email})`);
      } else {
        console.log(`  ⏭️  Usuario ya existe: ${user.name}`);
      }

      // Asignar departamentos
      for (const deptName of userData.departments) {
        const department = departmentsMap.get(deptName);
        if (department) {
          const existingAssignment = await userDepartmentRepo.findOne({
            where: { userId: user.id, departmentId: department.id },
          });
          if (!existingAssignment) {
            const userDept = userDepartmentRepo.create({
              userId: user.id,
              departmentId: department.id,
            });
            await userDepartmentRepo.save(userDept);
            console.log(`    📎 Asignado a: ${deptName}`);
          }
        }
      }
    }
    console.log('');

    // ============ CREAR USUARIOS DE DEMO ============
    console.log('🧪 Creando usuarios de demo...');
    for (const demoUser of DEMO_USERS) {
      let user = await userRepo.findOne({ where: { email: demoUser.email } });
      if (!user) {
        const hashedPassword = await bcrypt.hash(demoUser.password, 10);
        user = userRepo.create({
          name: demoUser.name,
          email: demoUser.email,
          password: hashedPassword,
          role: demoUser.role,
        });
        await userRepo.save(user);
        console.log(`  ✅ Usuario demo creado: ${demoUser.email} / ${demoUser.password}`);
      } else {
        console.log(`  ⏭️  Usuario demo ya existe: ${demoUser.email}`);
      }

      // Asignar departamentos
      for (const deptName of demoUser.departments) {
        const department = departmentsMap.get(deptName);
        if (department) {
          const existingAssignment = await userDepartmentRepo.findOne({
            where: { userId: user.id, departmentId: department.id },
          });
          if (!existingAssignment) {
            const userDept = userDepartmentRepo.create({
              userId: user.id,
              departmentId: department.id,
            });
            await userDepartmentRepo.save(userDept);
            console.log(`    📎 Asignado a: ${deptName}`);
          }
        }
      }
    }
    console.log('');

    // ============ RESUMEN ============
    console.log('═══════════════════════════════════════');
    console.log('📊 RESUMEN DEL SEED');
    console.log('═══════════════════════════════════════');
    console.log(`  Proyectos: ${projects.length}`);
    console.log(`  Departamentos: ${departmentsMap.size}`);
    console.log(`  Usuarios del sistema: ${USERS_DATA.length}`);
    console.log(`  Usuarios de demo: ${DEMO_USERS.length}`);
    console.log('═══════════════════════════════════════\n');

    console.log('🔐 CREDENCIALES DE DEMO:');
    console.log('  ┌──────────────────┬──────────┬─────────┐');
    console.log('  │ Email            │ Password │ Rol     │');
    console.log('  ├──────────────────┼──────────┼─────────┤');
    console.log('  │ user@test.com    │ user123  │ USER    │');
    console.log('  │ dev@test.com     │ dev123   │ DEV     │');
    console.log('  │ admin@test.com   │ admin123 │ ADMIN   │');
    console.log('  └──────────────────┴──────────┴─────────┘\n');

    console.log('✨ Seed completado exitosamente!\n');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch(console.error);
