import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/components/SessionContextProvider';
import { Link } from 'react-router-dom';
import { 
  Building, 
  Package, 
  FileText, 
  BarChart3, 
  Plus, 
  ArrowRight,
  Calendar,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Home = () => {
    const { user } = useSession();
    const [projectsCount, setProjectsCount] = useState(0);
    const [piecesCount, setPiecesCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            
            setIsLoading(true);
            
            try {
                // Contar projetos
                const { count: projectsCount, error: projectsError } = await supabase
                    .from('projects')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);
                
                if (!projectsError) {
                    setProjectsCount(projectsCount || 0);
                }
                
                // Contar peças
                const { count: piecesCount, error: piecesError } = await supabase
                    .from('pieces')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);
                
                if (!piecesError) {
                    setPiecesCount(piecesCount || 0);
                }
            } catch (error) {
                console.error('Erro ao buscar dados do dashboard:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    // Links rápidos para ações principais
    const quickActions = [
        { 
            title: 'Novo Projeto', 
            description: 'Cadastre um novo projeto no sistema', 
            icon: <Plus className="h-6 w-6" />,
            href: '/cadastro-projetos',
            color: 'bg-blue-100 text-blue-600'
        },
        { 
            title: 'Importar Peças', 
            description: 'Importe peças a partir de arquivos XML', 
            icon: <Package className="h-6 w-6" />,
            href: '/cadastro',
            color: 'bg-green-100 text-green-600'
        },
        { 
            title: 'Ver Projetos', 
            description: 'Visualize e gerencie seus projetos', 
            icon: <Building className="h-6 w-6" />,
            href: '/projetos',
            color: 'bg-amber-100 text-amber-600'
        },
        { 
            title: 'Relatórios', 
            description: 'Gere relatórios detalhados', 
            icon: <BarChart3 className="h-6 w-6" />,
            href: '/relatorios',
            color: 'bg-purple-100 text-purple-600'
        }
    ];

    // Métricas do sistema
    const metrics = [
        { 
            title: 'Projetos', 
            value: isLoading ? '--' : projectsCount, 
            icon: <Building className="h-6 w-6" />,
            color: 'bg-blue-500'
        },
        { 
            title: 'Peças Cadastradas', 
            value: isLoading ? '--' : piecesCount, 
            icon: <Package className="h-6 w-6" />,
            color: 'bg-green-500'
        },
        { 
            title: 'Orçamentos', 
            value: '0', 
            icon: <FileText className="h-6 w-6" />,
            color: 'bg-amber-500'
        },
        { 
            title: 'Clientes', 
            value: '0', 
            icon: <Users className="h-6 w-6" />,
            color: 'bg-purple-500'
        }
    ];

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Bem-vindo ao Tekla x Plannix</h1>
                    <p className="mt-2 text-base sm:text-lg text-text-secondary">
                        Sistema integrado para gerenciamento de projetos de estrutura metálica
                    </p>
                </header>

                {/* Métricas do Sistema */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {metrics.map((metric, index) => (
                        <Card key={index} className="border border-border-default hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-text-secondary">{metric.title}</p>
                                        <p className="text-2xl font-bold text-text-primary mt-1">{metric.value}</p>
                                    </div>
                                    <div className={`p-3 rounded-full ${metric.color} bg-opacity-10`}>
                                        {metric.icon}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Links Rápidos */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-text-primary">Acesso Rápido</h2>
                        <Link to="/projetos" className="text-primary hover:underline flex items-center text-sm font-medium">
                            Ver todos <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {quickActions.map((action, index) => (
                            <Card key={index} className="border border-border-default hover:shadow-md transition-all hover:border-primary/30">
                                <Link to={action.href}>
                                    <CardContent className="p-6">
                                        <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-4`}>
                                            {action.icon}
                                        </div>
                                        <h3 className="font-bold text-text-primary mb-2">{action.title}</h3>
                                        <p className="text-sm text-text-secondary mb-4">{action.description}</p>
                                        <Button variant="outline" size="sm" className="w-full">
                                            Acessar
                                        </Button>
                                    </CardContent>
                                </Link>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Informações do Usuário */}
                <Card className="border border-border-default">
                    <CardHeader>
                        <CardTitle>Sessão Ativa</CardTitle>
                        <CardDescription>Informações sobre sua conta no sistema</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {user ? (
                            <div className="flex items-center">
                                <div className="bg-primary w-12 h-12 rounded-full flex items-center justify-center mr-4">
                                    <span className="text-primary-foreground font-bold">
                                        {user.email?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-text-secondary">Logado como:</p>
                                    <p className="font-medium text-text-primary text-lg">{user.email}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-text-secondary">Carregando informações do usuário...</p>
                        )}
                        <p className="text-sm text-text-subtle mt-6">
                            Utilize o menu lateral para navegar entre as funcionalidades do sistema.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Home;