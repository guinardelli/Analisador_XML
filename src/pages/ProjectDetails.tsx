import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Package, Scale, Ruler, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import PiecesViewer from '@/components/PiecesViewer';
import ProjectSummaryCard from '@/components/ProjectSummaryCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Importações para os gráficos
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

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
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
    const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

    // State for chart data
    const [progressChartData, setProgressChartData] = useState<any>(null);
    const [progressOverTimeData, setProgressOverTimeData] = useState<any>(null);
    const [weightByGroupData, setWeightByGroupData] = useState<any>(null);

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

        const { data: pieces, error: piecesError } = await supabase
            .from('pieces')
            .select('quantity, weight, unit_volume, group, section, piece_ids')
            .eq('project_id', projectId);

        if (piecesError) {
            console.error('Erro ao buscar métricas:', piecesError);
            setIsLoadingMetrics(false);
            return;
        }

        const { data: releasedPieces, error: releasedError } = await supabase
            .from('piece_status')
            .select('piece_mark, released_at')
            .eq('project_id', projectId)
            .eq('is_released', true);

        if (releasedError) {
            console.error('Erro ao buscar peças liberadas:', releasedError);
            setIsLoadingMetrics(false);
            return;
        }

        let totalPieces = 0;
        let totalWeight = 0;
        let totalVolume = 0;
        const groups = new Set<string>();
        const sections = new Set<string>();
        const weightByGroup: { [key: string]: number } = {};
        
        pieces.forEach(piece => {
            const pieceCount = piece.piece_ids ? piece.piece_ids.length : piece.quantity;
            totalPieces += pieceCount;
            totalWeight += (piece.weight || 0) * pieceCount;
            totalVolume += (piece.unit_volume || 0) * pieceCount;
            groups.add(piece.group);
            sections.add(piece.section);

            if (piece.group) {
                weightByGroup[piece.group] = (weightByGroup[piece.group] || 0) + (piece.weight || 0) * pieceCount;
            }
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

        // --- Process data for charts ---

        // 1. Progress Doughnut Chart
        setProgressChartData({
            labels: ['Liberadas', 'Pendentes'],
            datasets: [{
                data: [releasedCount, totalPieces - releasedCount],
                backgroundColor: ['#10B981', '#F59E0B'],
                borderColor: ['#ffffff'],
                borderWidth: 2,
            }]
        });

        // 2. Progress Over Time Line Chart
        const releasesByDate: { [key: string]: number } = {};
        releasedPieces.forEach(p => {
            if (p.released_at) {
                const date = new Date(p.released_at).toISOString().split('T')[0];
                releasesByDate[date] = (releasesByDate[date] || 0) + 1;
            }
        });
        const sortedDates = Object.keys(releasesByDate).sort();
        let cumulativeCount = 0;
        const cumulativeData = sortedDates.map(date => {
            cumulativeCount += releasesByDate[date];
            return cumulativeCount;
        });
        setProgressOverTimeData({
            labels: sortedDates.map(d => new Date(d).toLocaleDateString('pt-BR')),
            datasets: [{
                label: 'Peças Liberadas (Acumulado)',
                data: cumulativeData,
                fill: true,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.1
            }]
        });

        // 3. Weight by Group Bar Chart
        const sortedWeightByGroup = Object.entries(weightByGroup).sort(([,a], [,b]) => b - a);
        setWeightByGroupData({
            labels: sortedWeightByGroup.map(([group]) => group),
            datasets: [{
                label: 'Peso Total (kg)',
                data: sortedWeightByGroup.map(([, weight]) => weight),
                backgroundColor: '#8B5CF6',
            }]
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

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
        },
    };

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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Summary Cards */}
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

                {/* Gráficos de Análise */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Progresso Geral</CardTitle>
                            <CardDescription>Visão geral de peças liberadas vs. pendentes.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-64">
                            {progressChartData && <Doughnut data={progressChartData} options={chartOptions} />}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Peso por Tipo de Peça</CardTitle>
                            <CardDescription>Distribuição do peso total entre os tipos de peças.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-64">
                            {weightByGroupData && <Bar data={weightByGroupData} options={chartOptions} />}
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Progresso ao Longo do Tempo</CardTitle>
                            <CardDescription>Acompanhe a evolução da liberação de peças.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-64">
                            {progressOverTimeData && <Line data={progressOverTimeData} options={chartOptions} />}
                        </CardContent>
                    </Card>
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