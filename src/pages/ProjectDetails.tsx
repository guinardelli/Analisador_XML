import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { ArrowLeft, Package, Scale, Ruler, Calendar, Edit, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import PiecesList from '@/components/PiecesList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler
);

// --- TYPE DEFINITIONS ---
interface Project {
    id: string; name: string; project_code: string; client: string; description: string | null; status: string | null; address: string | null; area: number | null; art_number: string | null; total_volume: number | null; start_date: string | null; end_date: string | null;
}
interface GroupedPiece {
    id: string; name: string; group: string; quantity: number; section: string; length: number; weight: number; unit_volume: number; concrete_class: string; piece_ids: string[] | null;
}
interface IndividualPiece {
    id: string; name: string; group: string; section: string; length: number; weight: number; unit_volume: number; concrete_class: string; is_released: boolean;
}
interface Filters {
    name: string; group: string[]; section: string[]; concrete_class: string[];
}
const initialFilters: Filters = { name: '', group: [], section: [], concrete_class: [] };

const ProjectDetails = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { user } = useSession();

    // --- STATE MANAGEMENT ---
    const [project, setProject] = useState<Project | null>(null);
    const [editableProject, setEditableProject] = useState<Partial<Project>>({});
    const [groupedPieces, setGroupedPieces] = useState<GroupedPiece[]>([]);
    const [pieceStatuses, setPieceStatuses] = useState<Map<string, boolean>>(new Map());
    const [filters, setFilters] = useState<Filters>(initialFilters);
    
    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // --- DATA FETCHING ---
    const fetchAllData = useCallback(async () => {
        if (!projectId || !user) return;
        setIsLoading(true);

        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
            .from('projects').select('*').eq('id', projectId).single();
        if (projectError) {
            toast.error(`Erro ao buscar o projeto: ${projectError.message}`);
            setIsLoading(false); return;
        }
        setProject(projectData);
        setEditableProject(projectData);

        // Fetch grouped pieces
        const { data: piecesData, error: piecesError } = await supabase
            .from('pieces').select('*').eq('project_id', projectId).eq('user_id', user.id);
        if (piecesError) {
            toast.error(`Erro ao buscar as peças: ${piecesError.message}`);
        } else {
            setGroupedPieces(piecesData || []);
        }

        // Fetch piece statuses
        const { data: statusesData, error: statusesError } = await supabase
            .from('piece_status').select('piece_mark, is_released').eq('project_id', projectId).eq('user_id', user.id);
        if (statusesError) {
            toast.error("Erro ao carregar status das peças.");
        } else {
            setPieceStatuses(new Map(statusesData.map(item => [item.piece_mark, item.is_released])));
        }

        setIsLoading(false);
    }, [projectId, user]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // --- MEMOIZED COMPUTATIONS ---
    const allIndividualPieces = useMemo((): IndividualPiece[] => {
        return groupedPieces.flatMap(group => 
            (group.piece_ids || []).map(id => ({
                id, name: group.name, group: group.group, section: group.section, length: group.length, weight: group.weight, unit_volume: group.unit_volume, concrete_class: group.concrete_class, is_released: pieceStatuses.get(id) || false,
            }))
        );
    }, [groupedPieces, pieceStatuses]);

    const displayedPieces = useMemo(() => {
        return allIndividualPieces.filter(piece => {
            const nameMatch = filters.name ? piece.name.toLowerCase().includes(filters.name.toLowerCase()) : true;
            const groupMatch = filters.group.length > 0 ? filters.group.includes(piece.group) : true;
            const sectionMatch = filters.section.length > 0 ? filters.section.includes(piece.section) : true;
            const concreteClassMatch = filters.concrete_class.length > 0 ? filters.concrete_class.includes(piece.concrete_class) : true;
            return nameMatch && groupMatch && sectionMatch && concreteClassMatch;
        });
    }, [filters, allIndividualPieces]);

    const filteredGroupedPieces = useMemo(() => {
        const displayedGroupNames = new Set(displayedPieces.map(p => p.name));
        return groupedPieces.filter(group => displayedGroupNames.has(group.name));
    }, [groupedPieces, displayedPieces]);

    const availableOptions = useMemo(() => {
        const uniqueGroups = [...new Set(allIndividualPieces.map(p => p.group))].sort();
        const uniqueSections = [...new Set(allIndividualPieces.map(p => p.section))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));
        const uniqueConcreteClasses = [...new Set(allIndividualPieces.map(p => p.concrete_class))].sort();
        return { groups: uniqueGroups, sections: uniqueSections, concreteClasses: uniqueConcreteClasses };
    }, [allIndividualPieces]);

    const metrics = useMemo(() => {
        const totalPieces = allIndividualPieces.length;
        const releasedPieces = allIndividualPieces.filter(p => p.is_released).length;
        const totalWeight = allIndividualPieces.reduce((sum, p) => sum + p.weight, 0);
        const totalVolume = allIndividualPieces.reduce((sum, p) => sum + p.unit_volume, 0);
        return { totalPieces, releasedPieces, totalWeight, totalVolume };
    }, [allIndividualPieces]);

    // --- CHART DATA ---
    const progressChartData = useMemo(() => ({
        labels: ['Liberadas', 'Pendentes'],
        datasets: [{
            data: [metrics.releasedPieces, metrics.totalPieces - metrics.releasedPieces],
            backgroundColor: ['#10B981', '#F59E0B'], borderColor: '#ffffff', borderWidth: 2,
        }]
    }), [metrics]);

    const weightByGroupData = useMemo(() => {
        const weightMap = displayedPieces.reduce((acc, piece) => {
            acc[piece.group] = (acc[piece.group] || 0) + piece.weight;
            return acc;
        }, {} as Record<string, number>);
        const sorted = Object.entries(weightMap).sort(([,a], [,b]) => b - a).slice(0, 10);
        return {
            labels: sorted.map(([group]) => group),
            datasets: [{ label: 'Peso Total (kg)', data: sorted.map(([, weight]) => weight), backgroundColor: '#8B5CF6' }]
        };
    }, [displayedPieces]);

    // --- HANDLERS ---
    const handleStatusChange = async (pieceId: string, newStatus: boolean) => {
        if (!user || !projectId) return;
        setPieceStatuses(prev => new Map(prev).set(pieceId, newStatus));
        const { error } = await supabase.from('piece_status').upsert({
            project_id: projectId, user_id: user.id, piece_mark: pieceId, is_released: newStatus, released_at: newStatus ? new Date().toISOString() : null,
        }, { onConflict: 'project_id,piece_mark' });
        if (error) {
            toast.error("Falha ao salvar o status.");
            setPieceStatuses(prev => new Map(prev).set(pieceId, !newStatus));
        }
    };

    const handleDeleteGroup = async (group: GroupedPiece) => {
        if (!user || !projectId) return;
        const toastId = toast.loading('Excluindo peças...');
        try {
            if (group.piece_ids?.length) {
                const { error: statusError } = await supabase.from('piece_status').delete().eq('project_id', projectId).in('piece_mark', group.piece_ids);
                if (statusError) throw statusError;
            }
            const { error: pieceError } = await supabase.from('pieces').delete().eq('id', group.id);
            if (pieceError) throw pieceError;
            toast.success(`Grupo "${group.name}" excluído.`, { id: toastId });
            fetchAllData();
        } catch (error) {
            toast.error('Falha ao excluir o grupo.', { id: toastId });
        }
    };

    const handleUpdateProject = async () => {
        if (!projectId) return;
        setIsSaving(true);
        const { error } = await supabase.from('projects').update({
            ...editableProject,
            area: editableProject.area ? parseFloat(String(editableProject.area)) : null,
        }).eq('id', projectId);
        setIsSaving(false);
        if (error) {
            toast.error(`Erro ao atualizar: ${error.message}`);
        } else {
            toast.success('Projeto atualizado!');
            setIsEditing(false);
            fetchAllData();
        }
    };

    const handleFilterCheckboxChange = (field: 'group' | 'section' | 'concrete_class', value: string) => {
        setFilters(prev => {
            const currentValues = prev[field];
            const newValues = currentValues.includes(value) ? currentValues.filter(v => v !== value) : [...currentValues, value];
            return {...prev, [field]: newValues};
        });
    };

    // --- RENDER LOGIC ---
    const formatNumber = (num: number, decimals: number = 2) => num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

    if (isLoading) return <div className="p-8 text-center">Carregando detalhes do projeto...</div>;
    if (!project) return <div className="p-8 text-center">Projeto não encontrado.</div>;

    const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' as const } } };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <Link to="/projetos" className="flex items-center gap-2 text-primary hover:underline mb-6 font-medium">
                    <ArrowLeft size={18} /> Voltar para todos os projetos
                </Link>
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{project.name}</h1>
                    <p className="text-text-secondary">{project.project_code}</p>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList>
                        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                        <TabsTrigger value="pieces">Lista de Peças</TabsTrigger>
                        <TabsTrigger value="info">Informações do Projeto</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Peças</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics.totalPieces}</div></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Peso Total</CardTitle><Scale className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatNumber(metrics.totalWeight)} kg</div></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Volume Total</CardTitle><Ruler className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatNumber(metrics.totalVolume, 3)} m³</div></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Peças Liberadas</CardTitle><Calendar className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics.releasedPieces} / {metrics.totalPieces}</div></CardContent></Card>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card><CardHeader><CardTitle>Progresso Geral</CardTitle></CardHeader><CardContent className="h-80"><Doughnut data={progressChartData} options={chartOptions} /></CardContent></Card>
                            <Card><CardHeader><CardTitle>Peso por Tipo (Top 10)</CardTitle></CardHeader><CardContent className="h-80"><Bar data={weightByGroupData} options={{...chartOptions, indexAxis: 'y'}} /></CardContent></Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="pieces">
                        <Card className="mt-6">
                            <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Input type="text" value={filters.name} onChange={e => setFilters(p => ({...p, name: e.target.value}))} placeholder="Buscar por nome..." />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[{ id: 'group', label: 'Tipo', options: availableOptions.groups, selected: filters.group }, { id: 'section', label: 'Seção', options: availableOptions.sections, selected: filters.section }, { id: 'concrete_class', label: 'Concreto', options: availableOptions.concreteClasses, selected: filters.concrete_class }].map(group => (
                                            <div key={group.id}><Label className="block mb-1">{group.label} {group.selected.length > 0 && `(${group.selected.length})`}</Label><div className="h-32 overflow-y-auto p-2 border rounded-lg space-y-1">{group.options.map(opt => (<label key={opt} className="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" checked={group.selected.includes(opt)} onChange={() => handleFilterCheckboxChange(group.id as any, opt)} /><span>{opt}</span></label>))}</div></div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end"><Button onClick={() => setFilters(initialFilters)} variant="outline">Limpar Filtros</Button></div>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="mt-6">
                            <p className="text-sm text-text-subtle mb-4">Exibindo {displayedPieces.length} de {allIndividualPieces.length} peças.</p>
                            <PiecesList groupedPieces={filteredGroupedPieces} individualPieces={displayedPieces.map(p => ({id: p.id, is_released: p.is_released}))} onStatusChange={handleStatusChange} onDeleteGroup={handleDeleteGroup} />
                        </div>
                    </TabsContent>

                    <TabsContent value="info">
                        <Card className="mt-6">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Informações do Projeto</CardTitle>
                                        <CardDescription>Visualize ou edite os detalhes cadastrais do projeto.</CardDescription>
                                    </div>
                                    {!isEditing ? (
                                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4 mr-2" />Editar</Button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setEditableProject(project); }} disabled={isSaving}><X className="h-4 w-4 mr-2" />Cancelar</Button>
                                            <Button size="sm" onClick={handleUpdateProject} disabled={isSaving}><Save className="h-4 w-4 mr-2" />{isSaving ? 'Salvando...' : 'Salvar'}</Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label>Cliente</Label><Input value={isEditing ? editableProject.client || '' : project.client || ''} name="client" onChange={e => setEditableProject(p => ({...p, client: e.target.value}))} readOnly={!isEditing} /></div>
                                    <div className="space-y-2"><Label>Status</Label><Input value={isEditing ? editableProject.status || '' : project.status || ''} name="status" onChange={e => setEditableProject(p => ({...p, status: e.target.value}))} readOnly={!isEditing} /></div>
                                    <div className="space-y-2"><Label>Nº ART</Label><Input value={isEditing ? editableProject.art_number || '' : project.art_number || ''} name="art_number" onChange={e => setEditableProject(p => ({...p, art_number: e.target.value}))} readOnly={!isEditing} /></div>
                                </div>
                                <div className="space-y-2"><Label>Endereço</Label><Input value={isEditing ? editableProject.address || '' : project.address || ''} name="address" onChange={e => setEditableProject(p => ({...p, address: e.target.value}))} readOnly={!isEditing} /></div>
                                <div className="space-y-2"><Label>Descrição</Label><Input value={isEditing ? editableProject.description || '' : project.description || ''} name="description" onChange={e => setEditableProject(p => ({...p, description: e.target.value}))} readOnly={!isEditing} /></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label>Área (m²)</Label><Input type="number" value={isEditing ? editableProject.area || '' : project.area || ''} name="area" onChange={e => setEditableProject(p => ({...p, area: e.target.valueAsNumber}))} readOnly={!isEditing} /></div>
                                    <div className="space-y-2"><Label>Data de Início</Label><Input type="date" value={isEditing ? (editableProject.start_date || '').split('T')[0] : (project.start_date || '').split('T')[0]} name="start_date" onChange={e => setEditableProject(p => ({...p, start_date: e.target.value}))} readOnly={!isEditing} /></div>
                                    <div className="space-y-2"><Label>Data de Término</Label><Input type="date" value={isEditing ? (editableProject.end_date || '').split('T')[0] : (project.end_date || '').split('T')[0]} name="end_date" onChange={e => setEditableProject(p => ({...p, end_date: e.target.value}))} readOnly={!isEditing} /></div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default ProjectDetails;