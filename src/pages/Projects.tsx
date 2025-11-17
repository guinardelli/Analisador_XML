import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Folder } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    project_code: string;
    client: string;
    created_at: string;
}

const Projects = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProjects = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                setError(`Erro ao buscar projetos: ${error.message}`);
            } else {
                setProjects(data || []);
            }
            setIsLoading(false);
        };

        fetchProjects();
    }, []);

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <header className="mb-10">
                <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Projetos</h1>
                <p className="mt-3 text-base sm:text-lg text-text-secondary">Gerencie e visualize seus projetos cadastrados.</p>
            </header>

            {isLoading && (
                <div className="text-center text-text-secondary">
                    <p>Carregando projetos...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl" role="alert">
                    <p>{error}</p>
                </div>
            )}

            {!isLoading && !error && (
                projects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <Link to={`/projetos/${project.id}`} key={project.id} className="block group">
                                <Card className="h-full transition-all duration-200 group-hover:shadow-lg group-hover:border-primary group-hover:-translate-y-1">
                                    <CardHeader>
                                        <CardTitle className="flex items-start gap-3">
                                            <Folder className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                                            <span className="truncate">{project.name}</span>
                                        </CardTitle>
                                        <CardDescription>{project.project_code}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div>
                                            <p className="text-sm font-medium text-text-secondary">Cliente</p>
                                            <p className="text-base text-text-primary">{project.client}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center bg-surface rounded-xl shadow-md border border-border-default p-10">
                        <h3 className="text-xl font-semibold text-text-primary">Nenhum projeto encontrado</h3>
                        <p className="mt-2 text-text-secondary">
                            Comece cadastrando um novo projeto na página{' '}
                            <Link to="/cadastro-projetos" className="text-primary hover:underline font-medium">
                                Cadastro de Projetos
                            </Link>.
                        </p>
                    </div>
                )
            )}
        </div>
    );
};

export default Projects;