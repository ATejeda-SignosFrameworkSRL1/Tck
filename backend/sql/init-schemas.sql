-- =====================================================
-- Script de inicialización de schemas para Sistema de Tickets
-- Ejecutar este script ANTES de iniciar la aplicación
-- =====================================================

-- Crear extensión para UUIDs (por si se necesita en el futuro)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear schema CORE (usuarios, roles, departamentos, proyectos)
CREATE SCHEMA IF NOT EXISTS core;

-- Crear schema TICK (tickets, asignaciones, transiciones)
CREATE SCHEMA IF NOT EXISTS tick;

-- Otorgar permisos al usuario de la aplicación
GRANT ALL ON SCHEMA core TO postgres;
GRANT ALL ON SCHEMA tick TO postgres;

-- Verificar schemas creados
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name IN ('core', 'tick');

-- =====================================================
-- NOTA: Las tablas serán creadas por TypeORM migrations
-- =====================================================
