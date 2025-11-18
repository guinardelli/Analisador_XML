import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import PiecesViewer from '@/components/PiecesViewer';
import ProjectSummaryCard from '@/components/ProjectSummaryCard';

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
}

const ProjectDetails = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [editableProject, setEditableProject] = useState<Partial<Project>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSummaryOpen, setIsSummaryOpen] = useState(true);

    const fetchProjectData = useCallback(async () => {
        if (!projectId) return;

        setIsLoading(true);
        setError(null);

        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (projectError) {
            setError(`Erro ao buscar o projeto: ${projectError.message}`);
            setIsLoading(false);
            return;
        }
        
        setProject(projectData);
        setEditableProject(projectData);
        setIsLoading(false);
    }, [projectId]);

    useEffect(() => {
        fetchProjectData();
    }, [fetchProjectData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditableProject(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateProject = async () => {
        if (!projectId) return;

        setIsSaving(true);
        const { error: updateError } = await supabase
            .from('projects')
            .update({
                ...editableProject,
                area: editableProject.area ? parseFloat(String(editableProject.area)) : null,
                total_volume: editableProject.total_volume ? parseFloat(String(editableProject.total_volume)) : null,
            })
            .eq('id', projectId);

        setIsSaving(false);

        if (updateError) {
            toast.error(`Erro ao atualizar o projeto: ${updateError.message}`);
        } else {
            toast.success('Projeto atualizado com sucesso!');
            setIsEditing(false);
            fetchProjectData(); // Re-fetch project data to get updated total_volume if any
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setEditableProject(project || {});
        setIsEditing(false);
    };

    if (isLoading) return <div className="p-8 text-center">Carregando detalhes do projeto...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
    if (!project) return <div className="p-8 text-center">Projeto não encontrado.</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <Link to="/projetos" className="flex items-center gap-2 text-primary hover:underline mb-6 font-medium">
                    <ArrowLeft size={18} />
                    Voltar para todos os projetos
                </Link>

                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{project.name}</h1>
                    <p className="text-text-secondary">{project.project_code}</p>
                </div>

                <ProjectSummaryCard 
                    project={project}
                    isEditing={isEditing}
                    editableProject={editableProject}
                    onToggle={() => setIsSummaryOpen(!isSummaryOpen)}
                    onEdit={handleEdit}
                    onSave={handleUpdateProject}
                    onCancel={handleCancelEdit}
                    isSaving={isSaving}
                    onChange={handleInputChange}
                    isOpen={isSummaryOpen}
                />

                {projectId && <PiecesViewer projectId={projectId} />}
            </div>
        </div>
    );
};

export default ProjectDetails;