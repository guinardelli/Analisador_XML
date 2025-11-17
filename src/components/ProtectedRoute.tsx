import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from './SessionContextProvider';

const ProtectedRoute = () => {
  const { session, isLoading } = useSession();

  if (isLoading) {
    // Pode ser substituído por um spinner de carregamento
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-text-secondary">Verificando autenticação...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;