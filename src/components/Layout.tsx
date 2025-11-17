import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart, FolderPlus, LayoutGrid, FileText } from 'lucide-react';

const Sidebar = () => {
    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            isActive
                ? 'bg-primary text-primary-text'
                : 'text-text-secondary hover:bg-slate-200'
        }`;

    return (
        <aside className="w-64 bg-surface border-r border-border-default flex flex-col">
            <div className="p-4 border-b border-border-default">
                <h1 className="text-xl font-bold text-text-primary">Tekla x Plannix</h1>
            </div>
            <nav className="flex-grow p-4 space-y-2">
                <NavLink to="/" className={navLinkClasses}>
                    <BarChart className="w-5 h-5 mr-3" />
                    Analisador
                </NavLink>
                <NavLink to="/cadastro-projetos" className={navLinkClasses}>
                    <FolderPlus className="w-5 h-5 mr-3" />
                    Cadastro de Projetos
                </NavLink>
                <NavLink to="/projetos" className={navLinkClasses}>
                    <LayoutGrid className="w-5 h-5 mr-3" />
                    Projetos
                </NavLink>
                <NavLink to="/relatorios" className={navLinkClasses}>
                    <FileText className="w-5 h-5 mr-3" />
                    Relatórios
                </NavLink>
            </nav>
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