# Sistema de Tickets - Backend

Backend del Sistema de Tickets multi-proyecto y multi-departamento desarrollado con NestJS + TypeORM + PostgreSQL.

## 🏗️ Estructura de Base de Datos

### Schemas
- **core**: usuarios, roles, departamentos, proyectos, relaciones
- **tick**: tickets, asignaciones, historial de movimientos

### Entidades Principales
- `core.users` - Usuarios del sistema
- `core.departments` - Departamentos (gerencia, desarrollo, soporte, etc.)
- `core.projects` - Proyectos (AGEport, Sistema de Visitas, PMS...)
- `core.user_departments` - Relación many-to-many usuario-departamento
- `tick.tickets` - Tickets con departamento origen/actual/destino
- `tick.ticket_assignments` - Asignaciones múltiples de usuarios
- `tick.ticket_transitions` - Historial de movimientos entre departamentos

## 🚀 Inicio Rápido

### 1. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL
```

### 2. Crear schemas en PostgreSQL
```sql
-- Ejecutar en PostgreSQL antes de iniciar la aplicación
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS tick;
```

O ejecutar el script:
```bash
psql -U postgres -d SistemadeTickets -f sql/init-schemas.sql
```

### 3. Instalar dependencias
```bash
npm install
```

### 4. Iniciar en modo desarrollo
```bash
npm run start:dev
```

### 5. Ejecutar seed de datos
```bash
npm run seed
```

## 📋 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run start:dev` | Iniciar en modo desarrollo |
| `npm run start:prod` | Iniciar en modo producción |
| `npm run build` | Compilar el proyecto |
| `npm run seed` | Ejecutar seed de datos |
| `npm run lint` | Ejecutar linter |
| `npm run test` | Ejecutar tests |

## 🔐 Credenciales de Demo

| Email | Password | Rol |
|-------|----------|-----|
| `user@test.com` | `user123` | USER |
| `dev@test.com` | `dev123` | DEV |
| `admin@test.com` | `admin123` | ADMIN |

## 📡 API Endpoints

### Autenticación
```bash
# Registro
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo@test.com",
    "password": "password123",
    "name": "Nuevo Usuario"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

### Proyectos
```bash
# Listar proyectos
curl -X GET http://localhost:3000/projects \
  -H "Authorization: Bearer <TOKEN>"
```

### Departamentos
```bash
# Listar departamentos
curl -X GET http://localhost:3000/departments \
  -H "Authorization: Bearer <TOKEN>"
```

### Usuarios
```bash
# Listar usuarios
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer <TOKEN>"

# Listar usuarios de un departamento
curl -X GET "http://localhost:3000/users?departmentId=1" \
  -H "Authorization: Bearer <TOKEN>"

# Obtener departamentos de un usuario
curl -X GET http://localhost:3000/users/1/departments \
  -H "Authorization: Bearer <TOKEN>"

# Asignar departamentos a usuario (solo ADMIN)
curl -X PATCH http://localhost:3000/users/1/departments \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"departmentIds": [1, 2, 3]}'
```

### Tickets

#### Crear ticket
```bash
curl -X POST http://localhost:3000/tickets \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nuevo ticket",
    "description": "Descripción del ticket",
    "projectId": 1,
    "originDepartmentId": 3,
    "targetDepartmentId": 4,
    "priority": "high",
    "assignedUserIds": [1, 2],
    "dueDate": "2026-03-01T00:00:00.000Z"
  }'
```

#### Listar tickets con filtros
```bash
# Todos los tickets
curl -X GET http://localhost:3000/tickets \
  -H "Authorization: Bearer <TOKEN>"

# Filtrar por proyecto
curl -X GET "http://localhost:3000/tickets?projectId=1" \
  -H "Authorization: Bearer <TOKEN>"

# Filtrar por departamento actual
curl -X GET "http://localhost:3000/tickets?currentDepartmentId=3" \
  -H "Authorization: Bearer <TOKEN>"

# Filtrar por departamento origen
curl -X GET "http://localhost:3000/tickets?originDepartmentId=2" \
  -H "Authorization: Bearer <TOKEN>"

# Filtrar por estado
curl -X GET "http://localhost:3000/tickets?status=open" \
  -H "Authorization: Bearer <TOKEN>"

# Filtrar por fecha de compromiso
curl -X GET "http://localhost:3000/tickets?dueDateFrom=2026-02-01&dueDateTo=2026-03-01" \
  -H "Authorization: Bearer <TOKEN>"

# Tickets de mis departamentos
curl -X GET http://localhost:3000/tickets/my-departments \
  -H "Authorization: Bearer <TOKEN>"
```

#### Obtener detalle de ticket (incluye historial)
```bash
curl -X GET http://localhost:3000/tickets/1 \
  -H "Authorization: Bearer <TOKEN>"
```

#### Actualizar ticket
```bash
curl -X PATCH http://localhost:3000/tickets/1 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "priority": "high"
  }'
```

#### Mover ticket entre departamentos
```bash
curl -X PATCH http://localhost:3000/tickets/1/move \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "toDepartmentId": 4,
    "note": "Pasando a implementación para pruebas"
  }'
```

#### Asignar usuarios a ticket
```bash
curl -X PATCH http://localhost:3000/tickets/1/assign \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [1, 2, 3]
  }'
```

## 📊 Esquema de Datos

### Estados de Ticket
- `open` - Abierto
- `in_progress` - En progreso
- `blocked` - Bloqueado
- `done` - Completado

### Prioridades
- `low` - Baja
- `medium` - Media
- `high` - Alta

### Roles de Usuario
- `admin` - Administrador (acceso total)
- `dev` - Desarrollador
- `user` - Usuario básico

## 🔒 Autorización

### Reglas de acceso a tickets:
1. **ADMIN** puede todo
2. **Usuarios normales** pueden:
   - Ver tickets de los departamentos a los que pertenecen
   - Ver tickets creados por ellos
   - Actualizar tickets donde están asignados
3. **Al mover ticket**: el usuario debe pertenecer al departamento actual o ser ADMIN

## 👥 Departamentos del Sistema

| ID | Nombre | Descripción |
|----|--------|-------------|
| 1 | gerencia | Departamento de Gerencia |
| 2 | proyecto | Departamento de Proyectos |
| 3 | desarrollo | Departamento de Desarrollo |
| 4 | implementacion | Departamento de Implementación |
| 5 | soporte | Departamento de Soporte |
| 6 | administracion | Departamento de Administración |
| 7 | ventas | Departamento de Ventas |

## 🏢 Proyectos del Sistema

| ID | Nombre |
|----|--------|
| 1 | AGEport |
| 2 | Sistema de Visitas |
| 3 | PMS Lifes Style |
| 4 | PMS Alojamiento |

## 📝 Variables de Entorno

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=SistemadeTickets
JWT_SECRET=tu_secret_jwt
NODE_ENV=development
```
