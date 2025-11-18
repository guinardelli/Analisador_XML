import React, { useState, useEffect, useMemo } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
} from 'chart.js';
import { supabase } from '@/integrations/supabase/client';
import toast from 'react-hot-toast';

// --- CHART.JS REGISTRATION ---
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// --- TYPE DEFINITIONS ---
interface GroupedPiece {
    name: string;
    group: string;
    quantity: number;
    section: string;
    length: number;
    weight: number;
    unit_volume: number;
    concrete_class: string;
    piece_ids: string[] | null;
}

interface IndividualPiece {
    id: string; // Unique piece mark
    name: string;
    group: string;
    section: string;
    length: number;
    weight: number;
    unit_volume: number;
    concrete_class: string;
    is_released: boolean;
}

interface SummaryData {
    totalPieces: number;
    totalWeight: number;
    totalVolume: number;
    avgWeight: number;
    maxWeight: number;
    avgLength: number;
    maxLength: number;
    releasedCount: number;
}

interface Filters {
    name: string;
    group: string[];
    section: string[];
    concrete_class: string[];
}

interface PiecesViewerProps {
    initialPieces: GroupedPiece[];
    projectId: string;
}

const PiecesViewer: React.FC<PiecesViewerProps> = ({ initialPieces, projectId }) => {
    const [pieceStatuses, setPieceStatuses] = useState<Map<string, boolean>>(new Map());
    const [isStatusLoading, setIsStatusLoading] = useState(true);

    const allIndividualPieces = useMemo((): IndividualPiece[] => {
        return initialPieces.flatMap(group => {
            if (!group.piece_ids) return [];
            return group.piece_ids.map(id => ({
                id: id,
                name: group.name,
                group: group.group,
                section: group.section,
                length: group.length,
                weight: group.weight,
                unit_volume: group.unit_volume,
                concrete_class: group.concrete_class,
                is_released: pieceStatuses.get(id) || false,
            }));
        });
    }, [initialPieces, pieceStatuses]);

    const [displayedPieces, setDisplayedPieces] = useState<IndividualPiece[]>([]);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    
    const initialFilters: Filters = { name: '', group: [], section: [], concrete_class: [] };
    const [filters, setFilters] = useState<Filters>(initialFilters);
    const [stagedFilters, setStagedFilters] = useState<Filters>(initialFilters);
    
    const [sortConfig, setSortConfig] = useState<{ key: keyof IndividualPiece | null; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    
    const [availableOptions, setAvailableOptions] = useState({
        groups: [] as string[],
        sections: [] as string[],
        concreteClasses: [] as string[],
    });

    useEffect(() => {
        const fetchStatuses = async () => {
            if (!projectId) return;
            setIsStatusLoading(true);
            const { data, error } = await supabase
                .from('piece_status')
                .select('piece_mark, is_released')
                .eq('project_id', projectId);

            if (error) {
                toast.error("Erro ao carregar status das peças.");
            } else {
                const statusMap = new Map(data.map(item => [item.piece_mark, item.is_released]));
                setPieceStatuses(statusMap);
            }
            setIsStatusLoading(false);
        };
        fetchStatuses();
    }, [projectId]);

    useEffect(() => {
        const filtered = allIndividualPieces.filter(piece => {
            const nameMatch = filters.name ? piece.name.toLowerCase().includes(filters.name.toLowerCase()) : true;
            const groupMatch = filters.group.length > 0 ? filters.group.includes(piece.group) : true;
            const sectionMatch = filters.section.length > 0 ? filters.section.includes(piece.section) : true;
            const concreteClassMatch = filters.concrete_class.length > 0 ? filters.concrete_class.includes(piece.concrete_class) : true;
            return nameMatch && groupMatch && sectionMatch && concreteClassMatch;
        });

        const totalPieces = filtered.length;
        if (totalPieces === 0) {
            setSummary({ totalPieces: 0, totalWeight: 0, totalVolume: 0, avgWeight: 0, maxWeight: 0, avgLength: 0, maxLength: 0, releasedCount: 0 });
            setDisplayedPieces([]);
            return;
        }

        const totalWeight = filtered.reduce((sum, p) => sum + p.weight, 0);
        const totalVolume = filtered.reduce((sum, p) => sum + p.unit_volume, 0);
        const totalLength = filtered.reduce((sum, p) => sum + p.length, 0);
        const releasedCount = filtered.filter(p => p.is_released).length;

        setDisplayedPieces(filtered);
        setSummary({
            totalPieces,
            totalWeight,
            totalVolume,
            avgWeight: totalWeight / totalPieces,
            maxWeight: Math.max(...filtered.map(p => p.weight)),
            avgLength: totalLength / totalPieces,
            maxLength: Math.max(...filtered.map(p => p.length)),
            releasedCount,
        });

    }, [filters, allIndividualPieces]);

    useEffect(() => {
        if (allIndividualPieces.length === 0) return;

        const { group, section, concrete_class } = stagedFilters;

        const piecesForGroup = allIndividualPieces.filter(p =>
            (section.length === 0 || section.includes(p.section)) &&
            (concrete_class.length === 0 || concrete_class.includes(p.concrete_class))
        );
        const newGroups = [...new Set(piecesForGroup.map(p => p.group))].sort();

        const piecesForSection = allIndividualPieces.filter(p =>
            (group.length === 0 || group.includes(p.group)) &&
            (concrete_class.length === 0 || concrete_class.includes(p.concrete_class))
        );
        const newSections = [...new Set(piecesForSection.map(p => p.section))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));

        const piecesForConcrete = allIndividualPieces.filter(p =>
            (group.length === 0 || group.includes(p.group)) &&
            (section.length === 0 || section.includes(p.section))
        );
        const newConcreteClasses = [...new Set(piecesForConcrete.map(p => p.concrete_class))].sort();

        setAvailableOptions({
            groups: newGroups,
            sections: newSections,
            concreteClasses: newConcreteClasses,
        });

    }, [stagedFilters, allIndividualPieces]);

    const sortedPieces = useMemo(() => {
        const sortableItems = [...displayedPieces];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];
                let comparison = 0;
                if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
                    comparison = aValue === bValue ? 0 : aValue ? -1 : 1;
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = aValue - bValue;
                } else {
                    comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
                }
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return sortableItems;
    }, [displayedPieces, sortConfig]);

    const handleSort = (key: keyof IndividualPiece) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleStatusChange = async (pieceId: string, newStatus: boolean) => {
        setPieceStatuses(prev => new Map(prev).set(pieceId, newStatus));

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("Usuário não autenticado.");
            setPieceStatuses(prev => new Map(prev).set(pieceId, !newStatus));
            return;
        }

        const { error } = await supabase
            .from('piece_status')
            .upsert({
                project_id: projectId,
                user_id: user.id,
                piece_mark: pieceId,
                is_released: newStatus,
                released_at: newStatus ? new Date().toISOString() : null,
            }, { onConflict: 'project_id,piece_mark' });

        if (error) {
            toast.error("Falha ao salvar o status da peça.");
            setPieceStatuses(prev => new Map(prev).set(pieceId, !newStatus));
        }
    };

    const handleStagedFilterChange = (field: 'name', value: string) => setStagedFilters(prev => ({...prev, [field]: value}));
    const handleStagedCheckboxChange = (field: 'group' | 'section' | 'concrete_class', value: string) => {
        setStagedFilters(prev => {
            const currentValues = prev[field];
            const newValues = currentValues.includes(value) ? currentValues.filter(v => v !== value) : [...currentValues, value];
            return {...prev, [field]: newValues};
        });
    };
    
    const handleApplyFilters = () => setFilters(stagedFilters);
    const handleClearFilters = () => {
        setFilters(initialFilters);
        setStagedFilters(initialFilters);
    };

    const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => num.toLocaleString('pt-BR', options);

    const chartColors = ['#fcc200', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#D946EF', '#06B6D4'];

    const quantityByGroupData = useMemo(() => {
        if (displayedPieces.length === 0) return null;
        const groupCounts = displayedPieces.reduce((acc, piece) => {
            acc[piece.group] = (acc[piece.group] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const sortedEntries = Object.entries(groupCounts).sort(([,a],[,b]) => Number(b) - Number(a));
        return {
            labels: sortedEntries.map(([key]) => key),
            datasets: [{ label: 'Quantidade', data: sortedEntries.map(([,value]) => value), backgroundColor: chartColors, borderColor: '#ffffff', borderWidth: 2 }]
        };
    }, [displayedPieces]);

    const heaviestPartsData = useMemo(() => {
        if (displayedPieces.length === 0) return null;
        const uniquePieceTypes = Array.from(new Map(displayedPieces.map(p => [p.name, p])).values());
        const top10Heaviest = uniquePieceTypes.sort((a, b) => b.weight - a.weight).slice(0, 10);
        return {
            labels: top10Heaviest.map(p => p.name),
            datasets: [{ label: 'Peso (kg)', data: top10Heaviest.map(p => p.weight), backgroundColor: '#fcc200', borderColor: '#e3af00', borderWidth: 1 }]
        };
    }, [displayedPieces]);
    
    const chartOptions = useMemo(() => ({
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#475569' } }, title: { display: true, color: '#1e293b', font: { size: 16, weight: 'bold' as const } } },
        scales: { x: { ticks: { color: '#475569' }, grid: { color: '#e2e8f0' } }, y: { ticks: { color: '#475569' }, grid: { color: '#e2e8f0' } } }
    }), []);

    const SortableHeader = ({ label, sortKey, align = 'left' }: { label: string, sortKey: keyof IndividualPiece, align?: 'left' | 'center' | 'right' }) => (
        <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort(sortKey)}>
            <div className={`flex items-center ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
                <span>{label}</span>
                {sortConfig.key === sortKey && <span className="text-[10px] ml-1.5">{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>}
            </div>
        </th>
    );

    if (initialPieces.length === 0) {
        return (
            <div className="bg-surface rounded-xl shadow-md border border-border-default p-6 text-center mt-8">
                <p className="text-text-secondary">Nenhuma peça cadastrada para este projeto.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 mt-8">
            <div className="bg-surface rounded-xl shadow-md border border-border-default p-6">
                <h2 className="text-xl font-bold text-text-primary mb-6">Filtros de Peças</h2>
                <div className="space-y-6">
                    <input type="text" value={stagedFilters.name} onChange={e => handleStagedFilterChange('name', e.target.value)} placeholder="Buscar por nome..." className="w-full bg-surface border border-border-default rounded-md p-2 text-sm focus:ring-primary focus:border-primary"/>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[{ id: 'group', label: 'Tipo', options: availableOptions.groups, selected: stagedFilters.group }, { id: 'section', label: 'Seção', options: availableOptions.sections, selected: stagedFilters.section }, { id: 'concrete_class', label: 'Concreto', options: availableOptions.concreteClasses, selected: stagedFilters.concrete_class }].map(group => (
                            <div key={group.id}><label className="block text-sm font-medium text-text-secondary mb-1">{group.label} {group.selected.length > 0 && `(${group.selected.length})`}</label><div className="h-40 overflow-y-auto p-3 border border-border-default rounded-lg bg-background space-y-2">{group.options.map(opt => (<label key={opt} className="flex items-center space-x-2 text-sm cursor-pointer text-text-secondary hover:text-text-primary"><input type="checkbox" checked={group.selected.includes(opt)} onChange={() => handleStagedCheckboxChange(group.id as 'group' | 'section' | 'concrete_class', opt)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/><span>{opt}</span></label>))}</div></div>
                        ))}
                    </div>
                    <div className="flex justify-end pt-4 mt-2 border-t border-border-default gap-3">
                        <button onClick={handleClearFilters} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-md transition-colors text-sm">Limpar</button>
                        <button onClick={handleApplyFilters} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-md shadow-sm transition-colors text-sm">Aplicar Filtros</button>
                    </div>
                </div>
            </div>

            {summary && (
                <div className="bg-surface rounded-xl shadow-md border border-border-default p-6">
                    <h2 className="text-xl font-bold text-text-primary">Resumo (Filtrado)</h2>
                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-background rounded-lg"><p className="text-xs text-text-subtle uppercase">Nº Peças</p><p className="text-2xl font-bold text-text-primary mt-1">{formatNumber(summary.totalPieces)}</p></div>
                        <div className="p-4 bg-background rounded-lg"><p className="text-xs text-text-subtle uppercase">Liberadas</p><p className="text-2xl font-bold text-text-primary mt-1">{summary.releasedCount} / {summary.totalPieces}</p></div>
                        <div className="p-4 bg-background rounded-lg"><p className="text-xs text-text-subtle uppercase">Peso Total</p><p className="text-2xl font-bold text-text-primary mt-1">{formatNumber(summary.totalWeight, {maximumFractionDigits: 2})} kg</p></div>
                        <div className="p-4 bg-background rounded-lg"><p className="text-xs text-text-subtle uppercase">Volume Total</p><p className="text-2xl font-bold text-text-primary mt-1">{formatNumber(summary.totalVolume, {maximumFractionDigits: 4})} m³</p></div>
                    </div>
                </div>
            )}

            <div className="bg-surface rounded-xl shadow-md border border-border-default overflow-hidden">
                <div className="p-6"><h2 className="text-xl font-bold text-text-primary">Detalhamento das Peças</h2><p className="text-sm text-text-subtle mt-1">Exibindo {displayedPieces.length} de {allIndividualPieces.length} peças.</p></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-text-secondary">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 select-none">
                            <tr>
                                <SortableHeader label="Liberada" sortKey="is_released" align="center" />
                                <SortableHeader label="ID Peça" sortKey="id" />
                                <SortableHeader label="Nome" sortKey="name" />
                                <SortableHeader label="Tipo" sortKey="group" />
                                <SortableHeader label="Seção" sortKey="section" />
                                <SortableHeader label="Comprimento (m)" sortKey="length" align="right" />
                                <SortableHeader label="Peso (kg)" sortKey="weight" align="right" />
                                <SortableHeader label="Volume (m³)" sortKey="unit_volume" align="right" />
                                <SortableHeader label="Concreto" sortKey="concrete_class" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default">
                            {sortedPieces.map((piece) => (
                                <tr key={piece.id} className={`hover:bg-slate-50/50 ${piece.is_released ? 'bg-green-50' : ''}`}>
                                    <td className="px-6 py-4 text-center">
                                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" checked={piece.is_released} onChange={(e) => handleStatusChange(piece.id, e.target.checked)} />
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-text-primary whitespace-nowrap">{piece.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{piece.name}</td>
                                    <td className="px-6 py-4">{piece.group}</td>
                                    <td className="px-6 py-4">{piece.section}</td>
                                    <td className="px-6 py-4 text-right">{formatNumber(piece.length / 100, {minimumFractionDigits: 2})}</td>
                                    <td className="px-6 py-4 text-right">{formatNumber(piece.weight, {minimumFractionDigits: 2})}</td>
                                    <td className="px-6 py-4 text-right">{formatNumber(piece.unit_volume, {minimumFractionDigits: 4})}</td>
                                    <td className="px-6 py-4">{piece.concrete_class}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-surface rounded-xl shadow-md border border-border-default p-6">
                <h2 className="text-xl font-bold text-text-primary mb-4">Visualização de Dados</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                    <div className="min-h-[450px] relative">{quantityByGroupData && <Pie data={quantityByGroupData} options={{...chartOptions, plugins: {...chartOptions.plugins, title: {...chartOptions.plugins.title, text: 'Distribuição por Tipo'}}}} />}</div>
                    <div className="min-h-[450px] relative">{heaviestPartsData && <Bar data={heaviestPartsData} options={{...chartOptions, indexAxis: 'y', plugins: {...chartOptions.plugins, legend: {display: false}, title: {...chartOptions.plugins.title, text: 'Top 10 Peças mais Pesadas'}}}} />}</div>
                </div>
            </div>
        </div>
    );
};

export default PiecesViewer;