import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from './SessionContextProvider';

const ProtectedRoute = () => {
  const { user, loading } = useSession();

  if (loading) {
    return <div>Carregando...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;