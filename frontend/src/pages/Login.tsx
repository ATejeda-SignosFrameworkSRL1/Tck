import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Ticket, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { login, register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        setSuccess('Login exitoso! Redirigiendo...');
        // La redirección se maneja automáticamente por el useEffect cuando isAuthenticated cambia
      } else {
        await register({ email, password, name });
        setSuccess('Registro exitoso! Redirigiendo...');
      }
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Error de autenticación';
      setError(errorMessage);
      setIsLoading(false);
    }
    // No llamamos setIsLoading(false) en el caso exitoso porque vamos a navegar
  };

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex transition-colors">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 to-light-bg dark:to-dark-bg items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Ticket className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">TicketSystem</span>
          </div>
          
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            Sistema de Gestión de Tickets Enterprise
          </h1>
          
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
            Gestiona proyectos, equipos y tickets de forma eficiente con nuestra plataforma empresarial.
          </p>
          
          {/* <div className="space-y-4">
            <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
              <div className="w-8 h-8 rounded-lg bg-accent-success/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Gestión jerárquica de proyectos y departamentos</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
              <div className="w-8 h-8 rounded-lg bg-accent-success/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Kanban Board con drag and drop</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
              <div className="w-8 h-8 rounded-lg bg-accent-success/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Dashboards personalizados por rol</span>
            </div>
          </div> */}
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-zinc-900 dark:text-white">TicketSystem</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>
            <p className="text-zinc-500 mt-2">
              {isLogin 
                ? 'Ingresa tus credenciales para continuar' 
                : 'Completa el formulario para registrarte'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    required={!isLogin}
                    className="w-full pl-10 pr-4 py-2.5 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-accent-danger/20 border border-accent-danger/30">
                <p className="text-sm text-accent-danger">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-accent-success/20 border border-accent-success/30">
                <p className="text-sm text-accent-success">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Forgot password link */}
          {isLogin && (
            <div className="mt-4 text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          )}

          <div className="mt-6 text-center">
            {isLogin ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                ¿No tienes cuenta?{' '}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Regístrate con invitación
                </Link>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
                className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            )}
          </div>

          {/* Demo credentials */}
          {isLogin && (
            <div className="mt-8 p-4 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border">
              <p className="text-xs text-zinc-500 mb-2">Credenciales de demostración:</p>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                <p><span className="text-zinc-500">Admin:</span> admin@test.com / admin123</p>
                <p><span className="text-zinc-500">Dev:</span> dev@test.com / dev123</p>
                <p><span className="text-zinc-500">User:</span> user@test.com / user123</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
