import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Shield, Key, Check, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';

type Step = 'email' | 'otp' | 'password' | 'complete';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  // Estado
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Datos
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Paso 1: Solicitar código
  const handleRequestOtp = async () => {
    if (!email) {
      setError('Ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword(email);
      setCurrentStep('otp');
    } catch (err: any) {
      // Por seguridad, no revelamos si el email existe
      setCurrentStep('otp');
    } finally {
      setLoading(false);
    }
  };

  // Paso 2 y 3: Verificar OTP y cambiar contraseña
  const handleResetPassword = async () => {
    if (otpCode.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.resetPassword({
        email,
        otpCode,
        newPassword: password,
      });
      setCurrentStep('complete');

      // Redirigir después de 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  // Reenviar código
  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await authAPI.sendOtp(email, 'password_recovery');
      alert('Código reenviado');
    } catch {
      // Silenciar error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-purple-50 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary text-white mb-4">
            <Key className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Recuperar Contraseña</h1>
          <p className="text-zinc-500 mt-1">Sistema de Tickets</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Email */}
          {currentStep === 'email' && (
            <div className="space-y-4">
              <p className="text-zinc-600 dark:text-zinc-400 text-center mb-4">
                Ingresa tu correo electrónico y te enviaremos un código para restablecer tu contraseña.
              </p>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                  />
                </div>
              </div>

              <button
                onClick={handleRequestOtp}
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Enviar código
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: OTP + New Password */}
          {currentStep === 'otp' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-zinc-600 dark:text-zinc-400">
                  Si el correo existe, recibirás un código en:
                </p>
                <p className="font-medium text-zinc-900 dark:text-white">{email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Código de verificación
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 pr-10 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentStep('email')}
                  className="flex-1 py-3 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Atrás
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={loading || otpCode.length !== 6}
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cambiar'}
                </button>
              </div>

              <button
                onClick={handleResendOtp}
                disabled={loading}
                className="w-full text-sm text-primary hover:underline"
              >
                ¿No recibiste el código? Reenviar
              </button>
            </div>
          )}

          {/* Step 3: Complete */}
          {currentStep === 'complete' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                ¡Contraseña actualizada!
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Tu contraseña ha sido cambiada exitosamente.
              </p>
              <p className="mt-4 text-sm text-zinc-500">
                Redirigiendo al login...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link to="/login" className="text-primary hover:underline font-medium flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
