import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Printer } from 'lucide-react';

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
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

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
    concrete_class: string;
}

interface Filters {
    name: string;
    group: string[];
    section: string[];
    concrete_class: string[];
}

const initialFilters: Filters = { name: '', group: [], section: [], concrete_class: [] };

const Reports = () => {
    const { user } = useSession();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [rawReportData, setRawReportData] = useState<ReportPiece[]>([]);
    const [reportData, setReportData] = useState<ReportPiece[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [currentProjectName, setCurrentProjectName] = useState('');

    const [filters, setFilters] = useState<Filters>(initialFilters);
    const [availableOptions, setAvailableOptions] = useState({
        groups: [] as string[],
        sections: [] as string[],
        concreteClasses: [] as string[],
    });

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
        setRawReportData([]);
        setReportData([]);
        setFilters(initialFilters);

        const selectedProject = projects.find(p => p.id === selectedProjectId);
        setCurrentProjectName(selectedProject ? `${selectedProject.name} (${selectedProject.project_code})` : '');

        // 1. Fetch all grouped pieces for the project
        const { data: groupedPieces, error: piecesError } = await supabase
            .from('pieces')
            .select('name, group, section, weight, unit_volume, piece_ids, concrete_class')
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
                        concrete_class: group.concrete_class,
                    });
                });
            }
        });
        
        // Sort by piece ID
        allPieces.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

        setRawReportData(allPieces);
        
        // Popula as opções de filtro disponíveis
        const uniqueGroups = [...new Set(allPieces.map(p => p.group))].sort();
        const uniqueSections = [...new Set(allPieces.map(p => p.section))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));
        const uniqueConcreteClasses = [...new Set(allPieces.map(p => p.concrete_class))].sort();
        setAvailableOptions({
            groups: uniqueGroups,
            sections: uniqueSections,
            concreteClasses: uniqueConcreteClasses,
        });

        setIsLoadingReport(false);
        toast.success(`Dados do relatório carregados.`);
    };

    // Efeito para aplicar os filtros sempre que rawReportData ou filters mudarem
    useEffect(() => {
        if (rawReportData.length === 0) {
            setReportData([]);
            return;
        }

        const filtered = rawReportData.filter(piece => {
            const nameMatch = filters.name ? piece.name.toLowerCase().includes(filters.name.toLowerCase()) : true;
            const groupMatch = filters.group.length > 0 ? filters.group.includes(piece.group) : true;
            const sectionMatch = filters.section.length > 0 ? filters.section.includes(piece.section) : true;
            const concreteClassMatch = filters.concrete_class.length > 0 ? filters.concrete_class.includes(piece.concrete_class) : true;
            return nameMatch && groupMatch && sectionMatch && concreteClassMatch;
        });

        setReportData(filtered);
    }, [rawReportData, filters]);
    
    const formatBRLDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('pt-BR');
        } catch (e) {
            return 'Data inválida';
        }
    };

    const handleFilterCheckboxChange = (field: 'group' | 'section' | 'concrete_class', value: string) => {
        setFilters(prev => {
            const currentValues = prev[field];
            const newValues = currentValues.includes(value) ? currentValues.filter(v => v !== value) : [...currentValues, value];
            return {...prev, [field]: newValues};
        });
    };

    const handleClearFilters = () => {
        setFilters(initialFilters);
    };

    const summary = useMemo(() => {
        if (reportData.length === 0) {
            return { totalPieces: 0, releasedCount: 0 };
        }
        const totalPieces = reportData.length;
        const releasedCount = reportData.filter(p => p.is_released).length;
        return { totalPieces, releasedCount };
    }, [reportData]);

    // Dados para o gráfico de distribuição por tipo de peça (agora como gráfico de barras)
    const piecesByGroupData = useMemo(() => {
        if (reportData.length === 0) return null;
        
        const groupCounts = reportData.reduce((acc, piece) => {
            acc[piece.group] = (acc[piece.group] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const sortedEntries = Object.entries(groupCounts).sort(([,a],[,b]) => b - a);
        const topEntries = sortedEntries.slice(0, 10);
        
        return {
            labels: topEntries.map(([group]) => group),
            datasets: [{
                label: 'Quantidade de Peças',
                data: topEntries.map(([,count]) => count),
                backgroundColor: '#3B82F6',
                borderColor: '#1D4ED8',
                borderWidth: 1
            }]
        };
    }, [reportData]);

    // Dados para o gráfico das top 10 peças mais pesadas
    const heaviestPiecesData = useMemo(() => {
        if (reportData.length === 0) return null;
        
        const uniquePieces = Array.from(
            new Map(reportData.map(p => [p.name, p])).values()
        );
        
        const sortedByWeight = uniquePieces
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 10);
        
        return {
            labels: sortedByWeight.map(p => p.name),
            datasets: [{
                label: 'Peso (kg)',
                data: sortedByWeight.map(p => p.weight),
                backgroundColor: '#fcc200',
                borderColor: '#e3af00',
                borderWidth: 1
            }]
        };
    }, [reportData]);

    // Opções comuns para os gráficos
    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                font: {
                    size: 16
                }
            }
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 no-print">
                    <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Relatórios</h1>
                    <p className="mt-3 text-base sm:text-lg text-text-secondary">Gere relatórios detalhados sobre as peças dos seus projetos.</p>
                </header>

                <Card className="mb-8 no-print">
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

                {rawReportData.length > 0 && (
                    <Card className="mb-8 animate-fade-in no-print">
                        <CardHeader>
                            <CardTitle>Filtros de Peças</CardTitle>
                            <CardDescription>Aplique filtros para refinar o relatório do projeto: {currentProjectName}.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="filter-name">Nome da Peça</Label>
                                    <Input
                                        id="filter-name"
                                        placeholder="Filtrar por nome da peça..."
                                        value={filters.name}
                                        onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[{ id: 'group', label: 'Tipo', options: availableOptions.groups, selected: filters.group }, { id: 'section', label: 'Seção', options: availableOptions.sections, selected: filters.section }, { id: 'concrete_class', label: 'Concreto', options: availableOptions.concreteClasses, selected: filters.concrete_class }].map(filterGroup => (
                                        <div key={filterGroup.id}>
                                            <Label className="block text-sm font-medium text-text-secondary mb-1">{filterGroup.label} {filterGroup.selected.length > 0 && `(${filterGroup.selected.length})`}</Label>
                                            <div className="h-32 overflow-y-auto p-2 border border-border-default rounded-lg bg-background space-y-1">
                                                {filterGroup.options.map(opt => (
                                                    <label key={opt} className="flex items-center space-x-2 text-sm cursor-pointer text-text-secondary hover:text-text-primary">
                                                        <input
                                                            type="checkbox"
                                                            checked={filterGroup.selected.includes(opt)}
                                                            onChange={() => handleFilterCheckboxChange(filterGroup.id as 'group' | 'section' | 'concrete_class', opt)}
                                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
                                    <Button variant="outline" onClick={handleClearFilters}>Limpar Filtros</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {reportData.length > 0 && (
                    <>
                        {/* Gráficos */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            <Card className="card-print">
                                <CardHeader>
                                    <CardTitle>Distribuição por Tipo de Peça</CardTitle>
                                    <CardDescription>Quantidade de peças por tipo (Top 10)</CardDescription>
                                </CardHeader>
                                <CardContent className="h-80 chart-print-container">
                                    {piecesByGroupData ? (
                                        <Bar 
                                            data={piecesByGroupData} 
                                            options={{
                                                ...chartOptions,
                                                indexAxis: 'y' as const,
                                                plugins: {
                                                    ...chartOptions.plugins,
                                                    legend: { display: false }
                                                }
                                            }} 
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-text-secondary">
                                            Nenhum dado disponível
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            
                            <Card className="card-print">
                                <CardHeader>
                                    <CardTitle>Top 10 Peças Mais Pesadas</CardTitle>
                                    <CardDescription>Peso das peças mais pesadas do projeto</CardDescription>
                                </CardHeader>
                                <CardContent className="h-80 chart-print-container">
                                    {heaviestPiecesData ? (
                                        <Bar 
                                            data={heaviestPiecesData} 
                                            options={{
                                                ...chartOptions,
                                                indexAxis: 'y' as const,
                                                plugins: {
                                                    ...chartOptions.plugins,
                                                    legend: { display: false }
                                                }
                                            }} 
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-text-secondary">
                                            Nenhum dado disponível
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Tabela de dados */}
                        <Card className="animate-fade-in card-print">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Relatório do Projeto: {currentProjectName}</CardTitle>
                                        <CardDescription>
                                            Total de {summary.totalPieces} peças. 
                                            Liberadas: {summary.releasedCount}. 
                                            Pendentes: {summary.totalPieces - summary.releasedCount}.
                                        </CardDescription>
                                    </div>
                                    <Button onClick={() => window.print()} className="no-print">
                                        <Printer className="h-4 w-4 mr-2" />
                                        Imprimir
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="p-3 text-left font-semibold text-text-secondary">ID Peça</th>
                                                <th className="p-3 text-left font-semibold text-text-secondary">Nome</th>
                                                <th className="p-3 text-left font-semibold text-text-secondary">Tipo</th>
                                                <th className="p-3 text-left font-semibold text-text-secondary">Seção</th>
                                                <th className="p-3 text-left font-semibold text-text-secondary">Concreto</th>
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
                                                    <td className="p-3 text-text-secondary">{piece.section}</td>
                                                    <td className="p-3 text-text-secondary">{piece.concrete_class}</td>
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
                    </>
                )}
            </div>
        </div>
    );
};

export default Reports;