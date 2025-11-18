import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface Project {
    id: string;
    name: string;
    project_code: string;
}

interface ReportPiece {
    id: string; // piece_mark
    name: string;
    group: string;
    section: string;
    weight: number;
    unit_volume: number;
    is_released: boolean;
    released_at: string | null;
}

const Reports = () => {
    const { user } = useSession();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [reportData, setReportData] = useState<ReportPiece[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [currentProjectName, setCurrentProjectName] = useState('');

    useEffect(() => {
        const fetchProjects = async () => {
            if (!user) return;
            setIsLoadingProjects(true);
            const { data, error } = await supabase
                .from('projects')
                .select('id, name, project_code')
                .eq('user_id', user.id)
                .order('name');

            if (error) {
                toast.error('Falha ao carregar projetos.');
            } else {
                setProjects(data || []);
            }
            setIsLoadingProjects(false);
        };

        fetchProjects();
    }, [user]);

    const handleGenerateReport = async () => {
        if (!selectedProjectId) {
            toast.error('Por favor, selecione um projeto.');
            return;
        }
        setIsLoadingReport(true);
        setReportData([]);

        const selectedProject = projects.find(p => p.id === selectedProjectId);
        setCurrentProjectName(selectedProject ? `${selectedProject.name} (${selectedProject.project_code})` : '');

        // 1. Fetch all grouped pieces for the project
        const { data: groupedPieces, error: piecesError } = await supabase
            .from('pieces')
            .select('name, group, section, weight, unit_volume, piece_ids')
            .eq('project_id', selectedProjectId);

        if (piecesError) {
            toast.error(`Erro ao buscar peças: ${piecesError.message}`);
            setIsLoadingReport(false);
            return;
        }

        // 2. Fetch all piece statuses for the project
        const { data: statuses, error: statusError } = await supabase
            .from('piece_status')
            .select('piece_mark, is_released, released_at')
            .eq('project_id', selectedProjectId);

        if (statusError) {
            toast.error(`Erro ao buscar status das peças: ${statusError.message}`);
            setIsLoadingReport(false);
            return;
        }

        const statusMap = new Map(statuses.map(s => [s.piece_mark, { is_released: s.is_released, released_at: s.released_at }]));

        // 3. Create the report by expanding grouped pieces into individual ones
        const allPieces: ReportPiece[] = [];
        groupedPieces.forEach(group => {
            if (group.piece_ids) {
                group.piece_ids.forEach((pieceId: string) => {
                    const status = statusMap.get(pieceId) || { is_released: false, released_at: null };
                    allPieces.push({
                        id: pieceId,
                        name: group.name,
                        group: group.group,
                        section: group.section,
                        weight: group.weight,
                        unit_volume: group.unit_volume,
                        is_released: status.is_released,
                        released_at: status.released_at,
                    });
                });
            }
        });
        
        // Sort by piece ID
        allPieces.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

        setReportData(allPieces);
        setIsLoadingReport(false);
        toast.success(`Relatório gerado para ${allPieces.length} peças.`);
    };
    
    const formatBRLDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('pt-BR');
        } catch (e) {
            return 'Data inválida';
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Relatórios</h1>
                    <p className="mt-3 text-base sm:text-lg text-text-secondary">Gere relatórios detalhados sobre as peças dos seus projetos.</p>
                </header>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Gerar Relatório de Peças</CardTitle>
                        <CardDescription>Selecione um projeto para visualizar o status de todas as suas peças.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row items-end gap-4">
                            <div className="w-full sm:w-auto flex-grow space-y-2">
                                <Label htmlFor="project-select">Selecione o Projeto</Label>
                                <select
                                    id="project-select"
                                    className="w-full bg-surface border border-border-default rounded-md p-2 text-sm"
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    disabled={isLoadingProjects}
                                >
                                    <option value="">{isLoadingProjects ? 'Carregando...' : 'Selecione um projeto'}</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.project_code})</option>
                                    ))}
                                </select>
                            </div>
                            <Button onClick={handleGenerateReport} disabled={isLoadingReport || !selectedProjectId}>
                                {isLoadingReport ? 'Gerando...' : 'Gerar Relatório'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {reportData.length > 0 && (
                    <Card className="animate-fade-in">
                        <CardHeader>
                            <CardTitle>Relatório do Projeto: {currentProjectName}</CardTitle>
                            <CardDescription>
                                Total de {reportData.length} peças. 
                                Liberadas: {reportData.filter(p => p.is_released).length}. 
                                Pendentes: {reportData.filter(p => !p.is_released).length}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="p-3 text-left font-semibold text-text-secondary">ID Peça</th>
                                            <th className="p-3 text-left font-semibold text-text-secondary">Nome</th>
                                            <th className="p-3 text-left font-semibold text-text-secondary">Tipo</th>
                                            <th className="p-3 text-center font-semibold text-text-secondary">Status</th>
                                            <th className="p-3 text-left font-semibold text-text-secondary">Data Liberação</th>
                                            <th className="p-3 text-right font-semibold text-text-secondary">Peso (kg)</th>
                                            <th className="p-3 text-right font-semibold text-text-secondary">Volume (m³)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {reportData.map(piece => (
                                            <tr key={piece.id} className="hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-text-primary">{piece.id}</td>
                                                <td className="p-3 text-text-secondary">{piece.name}</td>
                                                <td className="p-3 text-text-secondary">{piece.group}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                        piece.is_released 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {piece.is_released ? 'Liberada' : 'Pendente'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-text-secondary">{formatBRLDate(piece.released_at)}</td>
                                                <td className="p-3 text-right text-text-secondary">{piece.weight.toFixed(2)}</td>
                                                <td className="p-3 text-right text-text-secondary">{piece.unit_volume.toFixed(4)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default Reports;