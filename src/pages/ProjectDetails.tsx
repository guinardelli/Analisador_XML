import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Package, Scale, Ruler, Calendar } from 'lucide-react';
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

interface ProjectMetrics {
    totalPieces: number;
    totalWeight: number;
    totalVolume: number;
    uniqueGroups: number;
    uniqueSections: number;
    releasedPieces: number;
}

const ProjectDetails = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [editableProject, setEditableProject] = useState<Partial<Project>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false); // Alterado para false por padrão
    const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
    const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

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

    const fetchProjectMetrics = useCallback(async () => {
        if (!projectId) return;

        setIsLoadingMetrics(true);

        // Buscar todas as peças do projeto
        const { data: pieces, error: piecesError } = await supabase
            .from('pieces')
            .select('quantity, weight, unit_volume, group, section, piece_ids')
            .eq('project_id', projectId);

        if (piecesError) {
            console.error('Erro ao buscar métricas:', piecesError);
            setIsLoadingMetrics(false);
            return;
        }

        // Buscar peças liberadas
        const { data: releasedPieces, error: releasedError } = await supabase
            .from('piece_status')
            .select('piece_mark')
            .eq('project_id', projectId)
            .eq('is_released', true);

        if (releasedError) {
            console.error('Erro ao buscar peças liberadas:', releasedError);
            setIsLoadingMetrics(false);
            return;
        }

        // Calcular métricas
        let totalPieces = 0;
        let totalWeight = 0;
        let totalVolume = 0;
        const groups = new Set<string>();
        const sections = new Set<string>();
        
        pieces.forEach(piece => {
            // Contar peças individuais
            const pieceCount = piece.piece_ids ? piece.piece_ids.length : piece.quantity;
            totalPieces += pieceCount;
            totalWeight += piece.weight * pieceCount;
            totalVolume += piece.unit_volume * pieceCount;
            groups.add(piece.group);
            sections.add(piece.section);
        });

        const releasedCount = releasedPieces ? releasedPieces.length : 0;

        setMetrics({
            totalPieces,
            totalWeight,
            totalVolume,
            uniqueGroups: groups.size,
            uniqueSections: sections.size,
            releasedPieces: releasedCount
        });

        setIsLoadingMetrics(false);
    }, [projectId]);

    useEffect(() => {
        fetchProjectData();
        fetchProjectMetrics();
    }, [fetchProjectData, fetchProjectMetrics]);

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
            fetchProjectData();
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setIsSummaryOpen(true);
    };

    const handleCancelEdit = () => {
        setEditableProject(project || {});
        setIsEditing(false);
    };

    const formatNumber = (num: number, decimals: number = 2) => {
        return num.toLocaleString('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
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

                {/* Resumo do Projeto */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border-default p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <Package className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary dark:text-text-subtle">Total de Peças</p>
                                <p className="text-xl font-bold text-text-primary dark:text-white">
                                    {isLoadingMetrics ? '...' : metrics?.totalPieces || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border-default p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                <Scale className="h-5 w-5 text-green-600 dark:text-green-300" />
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary dark:text-text-subtle">Peso Total</p>
                                <p className="text-xl font-bold text-text-primary dark:text-white">
                                    {isLoadingMetrics ? '...' : `${formatNumber(metrics?.totalWeight || 0)} kg`}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border-default p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                <Ruler className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary dark:text-text-subtle">Volume Total</p>
                                <p className="text-xl font-bold text-text-primary dark:text-white">
                                    {isLoadingMetrics ? '...' : `${formatNumber(metrics?.totalVolume || 0, 3)} m³`}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border-default p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary dark:text-text-subtle">Peças Liberadas</p>
                                <p className="text-xl font-bold text-text-primary dark:text-white">
                                    {isLoadingMetrics ? '...' : `${metrics?.releasedPieces || 0} / ${metrics?.totalPieces || 0}`}
                                </p>
                            </div>
                        </div>
                    </div>
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