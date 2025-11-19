import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Boxes, FolderPlus, LayoutGrid, FileText, LogOut, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';

const Sidebar = () => {
    const navigate = useNavigate();
    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            isActive
                ? 'bg-primary text-primary-text'
                : 'text-text-secondary hover:bg-slate-200'
        }`;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
    };

    return (
        <aside className="w-64 bg-surface border-r border-border-default flex flex-col">
            <div className="p-4 border-b border-border-default">
                <h1 className="text-xl font-bold text-text-primary">Tekla x Plannix</h1>
            </div>
            <nav className="flex-grow p-4 space-y-2">
                <NavLink to="/" end className={navLinkClasses}>
                    <Home className="w-5 h-5 mr-3" />
                    Início
                </NavLink>
                <NavLink to="/cadastro" className={navLinkClasses}>
                    <Boxes className="w-5 h-5 mr-3" />
                    Cadastrar Peças
                </NavLink>
                <NavLink to="/cadastro-projetos" className={navLinkClasses}>
                    <FolderPlus className="w-5 h-5 mr-3" />
                    Cadastro de Projetos
                </NavLink>
                <NavLink to="/projetos" className={navLinkClasses}>
                    <LayoutGrid className="w-5 h-5 mr-3" />
                    Projetos
                </NavLink>
                <NavLink to="/clientes" className={navLinkClasses}>
                    <Users className="w-5 h-5 mr-3" />
                    Clientes
                </NavLink>
                <NavLink to="/relatorios" className={navLinkClasses}>
                    <FileText className="w-5 h-5 mr-3" />
                    Relatórios
                </NavLink>
            </nav>
            <div className="p-4 border-t border-border-default">
                <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-text-secondary hover:bg-slate-200 hover:text-text-primary">
                    <LogOut className="w-5 h-5 mr-3" />
                    Sair
                </Button>
            </div>
        </aside>
    );
};

const Layout = () => {
    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;