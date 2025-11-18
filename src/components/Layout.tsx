import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession } from './SessionContextProvider';
import { supabase } from '../integrations/supabase/client';

const Layout = () => {
  const navigate = useNavigate();
  const { user } = useSession();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl">Meu App</h1>
        <nav className="space-x-4">
          <NavLink to="/">Início</NavLink>
          <NavLink to="/projetos">Projetos</NavLink>
          <NavLink to="/cadastro">Cadastro de Peças</NavLink>
          <NavLink to="/relatorios">Relatórios</NavLink>
          {user && <button onClick={handleSignOut} className="p-2">Sair</button>}
        </nav>
      </header>
      <main className="flex-grow p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;