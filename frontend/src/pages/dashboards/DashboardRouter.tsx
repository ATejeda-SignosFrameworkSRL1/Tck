import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  switch (user.role) {
    case 'admin':
      return <Navigate to="/dashboard/admin" replace />;
    case 'dev':
      return <Navigate to="/dashboard/manager" replace />;
    case 'user':
    default:
      return <Navigate to="/dashboard/user" replace />;
  }
};

export default DashboardRouter;
