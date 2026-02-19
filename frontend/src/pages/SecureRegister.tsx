import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Key, User, Shield, Check, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Step = 'email' | 'otp' | 'invitation' | 'details' | 'complete';

interface StepInfo {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: Record<Step, StepInfo> = {
  email: { number: 1, title: 'Email', description: 'Ingresa tu correo', icon: <Mail className="w-5 h-5" /> },
  otp: { number: 2, title: 'Verificación', description: 'Código OTP', icon: <Shield className="w-5 h-5" /> },
  invitation: { number: 3, title: 'Invitación', description: 'Código PIN', icon: <Key className="w-5 h-5" /> },
  details: { number: 4, title: 'Datos', description: 'Tu información', icon: <User className="w-5 h-5" /> },
  complete: { number: 5, title: 'Listo', description: 'Registro exitoso', icon: <Check className="w-5 h-5" /> },
};

const SecureRegister: React.FC = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  // Estado del stepper
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Datos del formulario
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [assignedRole, setAssignedRole] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Paso 1: Enviar OTP
  const handleSendOtp = async () => {
    if (!email) {
      setError('Ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.sendOtp(email, 'registration');
      setCurrentStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al enviar el código');
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Verificar OTP
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyOtp(email, otpCode);
      setOtpToken(response.data.verificationToken);
      setCurrentStep('invitation');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Código incorrecto');
    } finally {
      setLoading(false);
    }
  };

  // Paso 3: Validar invitación
  const handleValidateInvitation = async () => {
    if (!pinCode) {
      setError('Ingresa el código de invitación');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.validateInvitation(pinCode);
      setAssignedRole(response.data.role);
      setCurrentStep('details');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Código de invitación inválido');
    } finally {
      setLoading(false);
    }
  };

  // Paso 4: Completar registro
  const handleCompleteRegistration = async () => {
    if (!name || !password || !confirmPassword) {
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
      const response = await authAPI.secureRegister({
        email,
        password,
        name,
        pinCode,
        otpVerificationToken: otpToken,
      });

      // Guardar token y usuario
      sessionStorage.setItem('token', response.data.access_token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
      
      setCurrentStep('complete');

      // Redirigir después de 2 segundos
      setTimeout(() => {
        authLogin(response.data.access_token, response.data.user);
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al completar el registro');
    } finally {
      setLoading(false);
    }
  };

  // Reenviar OTP
  const handleResendOtp = async () => {
    setLoading(true);
    setError('');

    try {
      await authAPI.sendOtp(email, 'registration');
      setError(''); // Limpiar error
      alert('Código reenviado a tu correo');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al reenviar');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      admin: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Administrador' },
      dev: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Desarrollador' },
      user: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Usuario' },
    };
    const badge = badges[role] || badges.user;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // Stepper visual
  const renderStepper = () => (
    <div className="flex items-center justify-center mb-8 w-full overflow-hidden">
      {(['email', 'otp', 'invitation', 'details'] as Step[]).map((step, index) => {
        const stepInfo = steps[step];
        const isActive = currentStep === step;
        const isComplete = stepInfo.number < steps[currentStep].number;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-primary text-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                }`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : React.cloneElement(stepInfo.icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4' })}
              </div>
              <span className={`mt-1.5 text-[10px] font-medium whitespace-nowrap ${isActive ? 'text-primary' : 'text-zinc-500'}`}>
                {stepInfo.title}
              </span>
            </div>
            {index < 3 && (
              <div
                className={`w-8 h-0.5 mx-1 flex-shrink ${
                  isComplete ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-purple-50 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary text-white mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Registro Seguro</h1>
          <p className="text-zinc-500 mt-1">Sistema de Tickets</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
          {/* Stepper */}
          {currentStep !== 'complete' && renderStepper()}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Email */}
          {currentStep === 'email' && (
            <div className="space-y-4">
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
                  />
                </div>
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Enviar código de verificación
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: OTP */}
          {currentStep === 'otp' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-zinc-600 dark:text-zinc-400">
                  Enviamos un código de 6 dígitos a
                </p>
                <p className="font-medium text-zinc-900 dark:text-white">{email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Código OTP
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

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentStep('email')}
                  className="flex-1 py-3 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Atrás
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otpCode.length !== 6}
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar'}
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

          {/* Step 3: Invitation */}
          {currentStep === 'invitation' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 mb-2">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-green-600 dark:text-green-400 font-medium">Email verificado</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Código de Invitación (PIN)
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.toUpperCase())}
                    placeholder="ADMIN-2024-XXXXX"
                    className="w-full pl-10 pr-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Solicita este código a tu administrador
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentStep('otp')}
                  className="flex-1 py-3 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Atrás
                </button>
                <button
                  onClick={handleValidateInvitation}
                  disabled={loading || !pinCode}
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Validar'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Details */}
          {currentStep === 'details' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-zinc-600 dark:text-zinc-400 mb-2">Tu rol asignado será:</p>
                {getRoleBadge(assignedRole)}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full pl-10 pr-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
                  onClick={() => setCurrentStep('invitation')}
                  className="flex-1 py-3 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Atrás
                </button>
                <button
                  onClick={handleCompleteRegistration}
                  disabled={loading}
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Crear cuenta
                      <Check className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                ¡Registro exitoso!
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Bienvenido al Sistema de Tickets
              </p>
              <div className="mt-4">
                {getRoleBadge(assignedRole)}
              </div>
              <p className="mt-4 text-sm text-zinc-500">
                Redirigiendo al sistema...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-zinc-600 dark:text-zinc-400">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecureRegister;
