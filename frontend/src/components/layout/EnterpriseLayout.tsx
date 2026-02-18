import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageLoader } from '../ui/Loader';

export const EnterpriseLayout: React.FC = () => {
  const { user, loading } = useAuth();

  // Verificar sessionStorage directamente para evitar race conditions
  const savedToken = sessionStorage.getItem('token');
  const savedUser = sessionStorage.getItem('user');

  // Mostrar loader mientras carga
  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center transition-colors">
        <PageLoader message="Cargando..." />
      </div>
    );
  }

  // Si no hay token en sessionStorage ni usuario en estado, redirigir a login
  if (!user && !savedToken) {
    return <Navigate to="/login" replace />;
  }

  // Si hay token en sessionStorage pero no hay usuario en estado, usar el de sessionStorage
  const currentUser = user || (savedUser ? JSON.parse(savedUser) : null);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="pl-16 min-h-screen">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EnterpriseLayout;
