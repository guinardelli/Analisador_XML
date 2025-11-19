import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Building,
  Users,
  FileSpreadsheet,
  BarChart3
} from 'lucide-react';

const Sidebar = () => {
  const { signOut } = useSession();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Projetos', href: '/projects', icon: Building },
    { name: 'Orçamentos', href: '/budgets', icon: FileSpreadsheet },
    { name: 'Cronograma', href: '/schedule', icon: Calendar },
    { name: 'Relatórios', href: '/reports', icon: BarChart3 },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Documentos', href: '/documents', icon: FileText },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Botão de menu para mobile */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="bg-white/80 backdrop-blur-sm border border-white/20"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Overlay para mobile */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white/80 backdrop-blur-sm border-r border-white/20 transition-transform duration-300 ease-in-out transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 flex flex-col`}
      >
        <div className="flex items-center h-16 px-6 border-b border-white/20">
          <div className="flex items-center space-x-2">
            <div className="bg-primary w-8 h-8 rounded-lg flex items-center justify-center">
              <Building className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-text-primary">Tekla x Plannix</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-text-secondary hover:bg-white/50 hover:text-text-primary'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/20">
          <Button
            variant="outline"
            className="w-full justify-start px-4 py-3 rounded-xl text-text-secondary hover:bg-white/50 hover:text-text-primary border-0"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className="font-medium">Sair</span>
          </Button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;