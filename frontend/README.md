# Frontend - Sistema de Tickets

Aplicación web construida con React, TypeScript, Vite y TailwindCSS.

## Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Ejecutar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### 3. Build para producción

```bash
npm run build
npm run preview
```

## Estructura del Proyecto

```
src/
├── components/         # Componentes reutilizables
│   ├── comments/      # Componentes de comentarios
│   ├── tickets/       # Componentes de tickets
│   └── tracking/      # Componentes de tracking
├── context/           # Contextos de React (Auth)
├── pages/             # Páginas principales
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── CreateTicket.tsx
│   └── TicketDetail.tsx
├── services/          # Servicios API
│   └── api.ts
├── types/             # Definiciones de TypeScript
└── App.tsx            # Componente principal
```

## Características

- Autenticación con JWT
- Dashboard con filtros de tickets
- Creación y edición de tickets
- Sistema de comentarios
- Tracking de tiempo trabajado
- Historial de cambios
- Interfaz responsiva con TailwindCSS

## Credenciales de Prueba

Después de ejecutar el backend y crear algunos usuarios, puedes usar:

- Email: tu@email.com
- Password: tu contraseña

O crear una cuenta nueva desde la página de login.
