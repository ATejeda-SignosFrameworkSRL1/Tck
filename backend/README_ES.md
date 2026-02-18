# Backend - Sistema de Tickets

API REST construida con NestJS, TypeORM y PostgreSQL.

## Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y configura tus credenciales de PostgreSQL:

```bash
cp .env.example .env
```

Edita el archivo `.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=tu_password
DB_DATABASE=SistemadeTickets
JWT_SECRET=tu-clave-secreta
JWT_EXPIRES_IN=7d
PORT=3000
```

### 3. Asegúrate de que la base de datos existe

La base de datos `SistemadeTickets` debe existir en PostgreSQL. Las tablas se crearán automáticamente gracias a TypeORM.

### 4. Ejecutar el servidor

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## API Endpoints

### Autenticación

- `POST /auth/register` - Registrar usuario
- `POST /auth/login` - Iniciar sesión
- `GET /auth/profile` - Obtener perfil (requiere JWT)

### Usuarios

- `GET /users` - Listar todos los usuarios
- `GET /users/developers` - Listar solo developers
- `GET /users/:id` - Obtener usuario por ID

### Tickets

- `POST /tickets` - Crear ticket
- `GET /tickets` - Listar tickets (filtros: status, assignedToId, createdById)
- `GET /tickets/:id` - Obtener ticket por ID
- `PATCH /tickets/:id` - Actualizar ticket
- `DELETE /tickets/:id` - Eliminar ticket (solo admin)

### Comentarios

- `POST /tickets/:ticketId/comments` - Agregar comentario
- `GET /tickets/:ticketId/comments` - Listar comentarios del ticket

### Tracking

- `GET /tickets/:ticketId/history` - Historial de cambios
- `POST /tickets/:ticketId/time` - Registrar tiempo trabajado
- `GET /tickets/:ticketId/time` - Listar tiempo trabajado
- `GET /tickets/:ticketId/time/total` - Total de horas trabajadas

## Roles de Usuario

- **admin** - Acceso completo
- **developer** - Puede trabajar en tickets asignados
- **user** - Puede crear y ver sus propios tickets

## Estructura del Proyecto

```
src/
├── auth/           # Autenticación JWT
├── users/          # Gestión de usuarios
├── tickets/        # CRUD de tickets
├── comments/       # Sistema de comentarios
├── tracking/       # Historial y time tracking
├── app.module.ts   # Módulo principal
└── main.ts         # Punto de entrada
```
