import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Boxes, FolderPlus, LayoutGrid, FileText, LogOut, Users, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';

const Sidebar = () => {
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(true); // Recolhido por padrão
    
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

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <>
            <aside className={`h-screen bg-surface border-r border-border-default flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
                <div className="p-4 border-b border-border-default flex items-center justify-between">
                    {!isCollapsed && (
                        <h1 className="text-xl font-bold text-text-primary whitespace-nowrap overflow-hidden">Tekla x Plannix</h1>
                    )}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={toggleSidebar}
                        className="ml-auto"
                    >
                        {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    </Button>
                </div>
                <nav className="flex-grow p-2 space-y-1">
                    <NavLink to="/" end className={navLinkClasses}>
                        <Home className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-3">Início</span>}
                    </NavLink>
                    <NavLink to="/importar-xml" className={navLinkClasses}>
                        <Upload className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-3">Importar XML</span>}
                    </NavLink>
                    <NavLink to="/cadastro-projetos" className={navLinkClasses}>
                        <FolderPlus className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-3">Cadastro de Projetos</span>}
                    </NavLink>
                    <NavLink to="/projetos" className={navLinkClasses}>
                        <LayoutGrid className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-3">Projetos</span>}
                    </NavLink>
                    <NavLink to="/clientes" className={navLinkClasses}>
                        <Users className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-3">Clientes</span>}
                    </NavLink>
                    <NavLink to="/relatorios" className={navLinkClasses}>
                        <FileText className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-3">Relatórios</span>}
                    </NavLink>
                </nav>
                <div className="p-2 border-t border-border-default">
                    <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-text-secondary hover:bg-slate-200 hover:text-text-primary">
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-3">Sair</span>}
                    </Button>
                </div>
            </aside>
        </>
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