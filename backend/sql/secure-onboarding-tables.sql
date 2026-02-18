-- =====================================================
-- Script de creación de tablas para Secure Onboarding & RBAC
-- Ejecutar después de init-schemas.sql
-- =====================================================

-- =====================================================
-- TABLA: core.invitations
-- Propósito: Códigos PIN de invitación para registro
-- =====================================================
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
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_invitations_pin_code ON core.invitations(pin_code);
CREATE INDEX IF NOT EXISTS idx_invitations_is_used ON core.invitations(is_used);
CREATE INDEX IF NOT EXISTS idx_invitations_target_role ON core.invitations(target_role);

-- Comentarios de documentación
COMMENT ON TABLE core.invitations IS 'Códigos PIN de invitación para registro de nuevos usuarios con rol predefinido';
COMMENT ON COLUMN core.invitations.pin_code IS 'Código PIN único para la invitación';
COMMENT ON COLUMN core.invitations.target_role IS 'Rol que se asignará al usuario: admin, dev, user';
COMMENT ON COLUMN core.invitations.is_used IS 'Indica si la invitación ya fue utilizada';
COMMENT ON COLUMN core.invitations.used_by_user_id IS 'Usuario que utilizó la invitación';

-- =====================================================
-- TABLA: core.otp_verification
-- Propósito: Códigos OTP para verificación de email
-- =====================================================
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
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_otp_email ON core.otp_verification(email);
CREATE INDEX IF NOT EXISTS idx_otp_code ON core.otp_verification(code);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON core.otp_verification(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_purpose ON core.otp_verification(purpose);

-- Comentarios de documentación
COMMENT ON TABLE core.otp_verification IS 'Códigos OTP para verificación de email en diferentes flujos';
COMMENT ON COLUMN core.otp_verification.code IS 'Código OTP de 6 dígitos';
COMMENT ON COLUMN core.otp_verification.purpose IS 'Propósito del OTP: registration, password_recovery, email_change';
COMMENT ON COLUMN core.otp_verification.attempts IS 'Número de intentos de verificación';
COMMENT ON COLUMN core.otp_verification.max_attempts IS 'Máximo de intentos permitidos (por defecto 5)';

-- =====================================================
-- TABLA: core.password_reset_tokens
-- Propósito: Tokens para recuperación de contraseña
-- =====================================================
CREATE TABLE IF NOT EXISTS core.password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON core.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON core.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON core.password_reset_tokens(expires_at);

COMMENT ON TABLE core.password_reset_tokens IS 'Tokens para el flujo de recuperación de contraseña';

-- =====================================================
-- DATOS INICIALES: Invitaciones de prueba
-- =====================================================
INSERT INTO core.invitations (pin_code, target_role, description, expires_at) VALUES
    ('ADMIN-2024-001', 'admin', 'Invitación de prueba para administrador', CURRENT_TIMESTAMP + INTERVAL '30 days'),
    ('DEV-2024-001', 'dev', 'Invitación de prueba para desarrollador', CURRENT_TIMESTAMP + INTERVAL '30 days'),
    ('USER-2024-001', 'user', 'Invitación de prueba para usuario', CURRENT_TIMESTAMP + INTERVAL '30 days')
ON CONFLICT (pin_code) DO NOTHING;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT 'Tablas creadas exitosamente' AS status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'core' 
AND table_name IN ('invitations', 'otp_verification', 'password_reset_tokens');
