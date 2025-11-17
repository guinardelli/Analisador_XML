import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Trash2, Building, Activity, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Project {
    id: string;
    name: string;
    description: string;
    project_code: string;
    client: string;
    status: string;
    total_volume: number;
    created_at: string;
}

const Projects = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching projects:', error);
                    toast.error('Falha ao carregar os projetos.');
                } else {
                    setProjects(data || []);
                }
            }
            setLoading(false);
        };

        fetchProjects();
    }, []);

    const handleDelete = async (projectId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este projeto? Todos os dados relacionados serão perdidos.')) {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', projectId);

            if (error) {
                toast.error('Erro ao excluir o projeto.');
                console.error('Error deleting project:', error);
            } else {
                toast.success('Projeto excluído com sucesso!');
                setProjects(projects.filter(p => p.id !== projectId));
            }
        }
    };

    if (loading) {
        return <div className="p-4">Carregando projetos...</div>;
    }

    return (
        <div className="p-4 md:p-8">
            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-3xl font-bold">Meus Projetos</h1>
                <Button asChild>
                    <Link to="/cadastro-projetos">Novo Projeto</Link>
                </Button>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500">Nenhum projeto encontrado.</p>
                    <p className="mt-2">
                        <Link to="/cadastro-projetos" className="text-primary hover:underline">
                            Crie seu primeiro projeto
                        </Link>
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map(project => (
                        <Card key={project.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="hover:text-primary transition-colors">
                                    <Link to={`/projetos/${project.id}`}>{project.name}</Link>
                                </CardTitle>
                                <CardDescription>Código: {project.project_code || 'N/A'}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-3 text-sm text-text-secondary">
                                <div className="flex items-center gap-2">
                                    <Building className="h-4 w-4 text-text-subtle" />
                                    <span>{project.client || 'Cliente não informado'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-text-subtle" />
                                    <span>{project.status || 'Status não definido'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-text-subtle" />
                                    <span>Volume: {project.total_volume ? `${project.total_volume.toFixed(2)} m³` : 'N/A'}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">
                                    Criado em: {new Date(project.created_at).toLocaleDateString()}
                                </span>
                                <Button variant="destructive" size="icon" onClick={() => handleDelete(project.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Projects;