import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    project_code: string;
    client: string;
    description: string | null;
    status: string | null;
    address: string | null;
    area: number | null;
    art_number: string | null;
    total_volume: number | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
}

const ProjectDetails = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) return;

            setIsLoading(true);
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (error) {
                setError(`Erro ao buscar o projeto: ${error.message}`);
            } else {
                setProject(data);
            }
            setIsLoading(false);
        };

        fetchProject();
    }, [projectId]);

    const DetailItem = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
        <div>
            <p className="text-sm font-medium text-text-secondary">{label}</p>
            <p className="text-base text-text-primary">{value || 'Não informado'}</p>
        </div>
    );

    if (isLoading) {
        return <div className="p-8 text-center">Carregando detalhes do projeto...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-600">{error}</div>;
    }

    if (!project) {
        return <div className="p-8 text-center">Projeto não encontrado.</div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <Link to="/projetos" className="flex items-center gap-2 text-primary hover:underline mb-6 font-medium">
                    <ArrowLeft size={18} />
                    Voltar para todos os projetos
                </Link>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl sm:text-3xl">{project.name}</CardTitle>
                        <CardDescription>{project.project_code}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <DetailItem label="Cliente" value={project.client} />
                            <DetailItem label="Status" value={project.status} />
                            <DetailItem label="Endereço" value={project.address} />
                            <DetailItem label="Área (m²)" value={project.area} />
                            <DetailItem label="Nº ART" value={project.art_number} />
                            <DetailItem label="Volume Total (m³)" value={project.total_volume} />
                            <DetailItem label="Data de Início" value={project.start_date ? new Date(project.start_date).toLocaleDateString('pt-BR') : null} />
                            <DetailItem label="Data de Término" value={project.end_date ? new Date(project.end_date).toLocaleDateString('pt-BR') : null} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProjectDetails;