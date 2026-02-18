# Comandos Útiles - Sistema de Tickets

## 🚀 Comandos de Inicio

### Backend
```bash
cd backend

# Desarrollo con hot-reload
npm run start:dev

# Producción
npm run build
npm run start:prod

# Modo debug
npm run start:debug
```

### Frontend
```bash
cd frontend

# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

## 🗄️ PostgreSQL

### Conectarse a la base de datos
```bash
psql -U postgres -d SistemadeTickets
```

### Ver tablas
```sql
\dt
```

### Ver estructura de una tabla
```sql
\d users
\d tickets
\d comments
\d ticket_history
\d time_tracking
```

### Limpiar todas las tablas (¡CUIDADO!)
```sql
TRUNCATE TABLE time_tracking, ticket_history, comments, tickets, users RESTART IDENTITY CASCADE;
```

### Ver todos los usuarios
```sql
SELECT id, email, name, role FROM users;
```

### Ver todos los tickets
```sql
SELECT id, title, status, priority, created_at FROM tickets;
```

### Cambiar rol de un usuario
```sql
UPDATE users SET role = 'admin' WHERE email = 'usuario@email.com';
UPDATE users SET role = 'developer' WHERE email = 'usuario@email.com';
UPDATE users SET role = 'user' WHERE email = 'usuario@email.com';
```

## 🧪 Testing con cURL

### Registrar usuario
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123",
    "name": "Test User",
    "role": "user"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123"
  }'
```

### Guardar token en variable (Linux/Mac)
```bash
export TOKEN="tu_token_jwt_aqui"
```

### Guardar token en variable (Windows PowerShell)
```powershell
$TOKEN = "tu_token_jwt_aqui"
```

### Crear ticket (Linux/Mac)
```bash
curl -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Bug en login",
    "description": "El login no funciona con usuarios nuevos",
    "priority": "high"
  }'
```

### Crear ticket (Windows PowerShell)
```powershell
curl -X POST http://localhost:3000/tickets `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d '{
    \"title\": \"Bug en login\",
    \"description\": \"El login no funciona con usuarios nuevos\",
    \"priority\": \"high\"
  }'
```

### Listar tickets
```bash
curl -X GET http://localhost:3000/tickets \
  -H "Authorization: Bearer $TOKEN"
```

### Ver ticket específico
```bash
curl -X GET http://localhost:3000/tickets/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Actualizar ticket
```bash
curl -X PATCH http://localhost:3000/tickets/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "in_progress",
    "assignedToId": 2
  }'
```

### Agregar comentario
```bash
curl -X POST http://localhost:3000/tickets/1/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "Estoy trabajando en esto"
  }'
```

### Registrar tiempo trabajado
```bash
curl -X POST http://localhost:3000/tickets/1/time \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "hoursSpent": 2.5,
    "description": "Investigación del bug"
  }'
```

## 🧹 Limpieza

### Limpiar node_modules
```bash
# Backend
cd backend
rm -rf node_modules
npm install

# Frontend
cd frontend
rm -rf node_modules
npm install
```

### Limpiar builds
```bash
# Backend
cd backend
rm -rf dist

# Frontend
cd frontend
rm -rf dist
```

## 🔍 Debugging

### Ver logs del backend
Los logs se muestran directamente en la consola donde ejecutas `npm run start:dev`

### Ver requests en el navegador
1. Abre DevTools (F12)
2. Ve a la pestaña "Network"
3. Realiza acciones en la app
4. Revisa las peticiones HTTP

### Ver estado de React
1. Instala React DevTools
2. Abre DevTools
3. Ve a la pestaña "Components"
4. Inspecciona el estado y props

## 📊 Monitoreo

### Ver procesos de Node.js
```bash
# Ver todos los procesos de Node
ps aux | grep node

# Ver puertos en uso
netstat -ano | findstr :3000
netstat -ano | findstr :5173
```

### Matar proceso por puerto (Windows)
```bash
# Encontrar PID
netstat -ano | findstr :3000

# Matar proceso
taskkill /PID numero_pid /F
```

### Matar proceso por puerto (Linux/Mac)
```bash
# Encontrar y matar en un comando
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

## 🎯 Scripts Personalizados

### Crear usuario admin rápido
Crea un archivo `create-admin.sh`:

```bash
#!/bin/bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@system.com",
    "password": "admin123",
    "name": "Administrador",
    "role": "admin"
  }'
```

Ejecútalo con: `bash create-admin.sh`

### Crear múltiples usuarios de prueba
Crea un archivo `create-test-users.sh`:

```bash
#!/bin/bash

# Admin
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "admin123", "name": "Admin Test", "role": "admin"}'

# Developer 1
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "dev1@test.com", "password": "dev123", "name": "Developer One", "role": "developer"}'

# Developer 2
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "dev2@test.com", "password": "dev123", "name": "Developer Two", "role": "developer"}'

# User
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "user123", "name": "Regular User", "role": "user"}'
```

## 🛠️ Troubleshooting

### Error: "Cannot find module"
```bash
cd backend  # o frontend
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port already in use"
```bash
# Cambiar puerto del backend en .env
PORT=3001

# O matar el proceso que usa el puerto (ver arriba)
```

### Error: "Database connection failed"
```bash
# Verificar que PostgreSQL está corriendo
# Windows:
services.msc  # Buscar PostgreSQL

# Linux:
sudo systemctl status postgresql

# Mac:
brew services list
```

### Error de CORS
Verifica en `backend/src/main.ts` que el origen del frontend esté permitido:
```typescript
app.enableCors({
  origin: ['http://localhost:5173'],
  credentials: true,
});
```

## 📝 Notas

- Mantén el backend corriendo en puerto 3000
- Mantén el frontend corriendo en puerto 5173
- Siempre usa HTTPS en producción
- Cambia JWT_SECRET en producción
- Desactiva `synchronize: true` de TypeORM en producción
