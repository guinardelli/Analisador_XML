import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useSession } from '@/components/SessionContextProvider';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// --- CHART.JS REGISTRATION ---
ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
);

// --- TYPE DEFINITIONS ---
interface Piece {
    name: string;
    type: string; // Maps to 'group' in DB
    quantity: number;
    section: string;
    length: number; // Changed from string to number
    weight: number; // New column
    unit_volume: number; // Changed from 'volume' to 'unit_volume'
    concreteClass: string; // New column, maps to 'concrete_class' in DB
}

interface XmlHeader {
    obra: string;
    name: string;
    projetista: string;
}

interface SummaryData {
    totalPieces: number;
    totalWeight: number;
    totalVolume: number;
    avgWeight: number;
    maxWeight: number;
    avgLength: number;
    maxLength: number;
}

interface ParsedXmlData {
    header: XmlHeader;
    pieces: Piece[];
    summary: SummaryData;
}

interface Filters {
    name: string;
    type: string[];
    section: string[];
    concreteClass: string[];
}

// Data structure for session export/import
interface SessionData {
    version: string;
    originalData: ParsedXmlData;
    filters: Filters;
    stagedFilters: Filters;
    releasedPieces: string[]; // Set is not serializable, so we use an array
    fileInfoText: string;
    selectedProjectId: string | null; // Store selected project ID
}

interface Project {
    id: string;
    name: string;
    project_code: string;
    client: string;
    status: string;
    total_volume: number;
}

// --- HELPER FUNCTIONS ---
const getElementTextContent = (element: Element, tagName: string): string => {
    return element.querySelector(tagName)?.textContent?.trim() || 'N/A';
};

const parseSafeFloat = (value: string): number => {
    if (!value) return 0;
    // Handles both dot and comma decimal separators
    return parseFloat(value.replace(',', '.')) || 0;
};

// --- PARSING LOGIC ---
const parseSingleXml = (xmlString: string): { header: XmlHeader; pieces: Piece[] } => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        throw new Error('Erro ao analisar o XML. Verifique o formato do arquivo.');
    }
    
    const root = xmlDoc.querySelector('DETALHAMENTOTEKLA');
    if (!root) {
        throw new Error('Elemento raiz <DETALHAMENTOTEKLA> não encontrado.');
    }

    const header: XmlHeader = {
        obra: root.getAttribute('obra') || 'N/A',
        name: root.getAttribute('name') || 'N/A',
        projetista: root.getAttribute('projetista') || 'N/A',
    };

    const pieceElements = Array.from(xmlDoc.querySelectorAll('PECA'));
    if (pieceElements.length === 0) {
         throw new Error('Nenhuma peça <PECA> encontrada no arquivo.');
    }

    const pieces: Piece[] = pieceElements.map(p => {
        const quantity = parseInt(getElementTextContent(p, 'QUANTIDADE'), 10) || 0;
        const weight = parseSafeFloat(getElementTextContent(p, 'PESO'));
        const unit_volume = parseSafeFloat(getElementTextContent(p, 'VOLUMEUNITARIO'));
        const length = parseSafeFloat(getElementTextContent(p, 'COMPRIMENTO')); // Convert length to number

        return {
            name: getElementTextContent(p, 'NOMEPECA'),
            type: getElementTextContent(p, 'TIPOPRODUTO'),
            quantity,
            section: getElementTextContent(p, 'SECAO'),
            length, // Now a number
            weight,
            unit_volume, // Now unit_volume
            concreteClass: getElementTextContent(p, 'CLASSECONCRETO'),
        };
    });
    
    return { header, pieces };
};


// --- MAIN APP COMPONENT ---
const PieceRegistry = () => {
    const { user } = useSession();
    const navigate = useNavigate();

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [fileInfoText, setFileInfoText] = useState<string>('');
    const [originalData, setOriginalData] = useState<ParsedXmlData | null>(null);
    const [displayedData, setDisplayedData] = useState<ParsedXmlData | null>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSavingToDb, setIsSavingToDb] = useState<boolean>(false);
    
    const initialFilters: Filters = { name: '', type: [], section: [], concreteClass: [] };
    const [filters, setFilters] = useState<Filters>(initialFilters); // Applied filters
    const [stagedFilters, setStagedFilters] = useState<Filters>(initialFilters); // UI selections
    const [releasedPieces, setReleasedPieces] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: keyof Piece | null; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    
    const [availableOptions, setAvailableOptions] = useState({
        types: [] as string[],
        sections: [] as string[],
        concreteClasses: [] as string[],
    });

    // Project management states
    const [projectsList, setProjectsList] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [xmlProjectCode, setXmlProjectCode] = useState<string | null>(null);
    const [xmlProjectName, setXmlProjectName] = useState<string | null>(null);
    const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);
    const [parsedPiecesForDb, setParsedPiecesForDb] = useState<Piece[]>([]);
    const [currentProjectStatus, setCurrentProjectStatus] = useState<string | null>(null);

    // Fetch projects on component mount
    useEffect(() => {
        const fetchProjects = async () => {
            if (!user) return;
            const { data, error } = await supabase
                .from('projects')
                .select('id, name, project_code, client, status, total_volume')
                .eq('user_id', user.id)
                .order('name', { ascending: true });

            if (error) {
                console.error('Erro ao buscar projetos:', error.message);
                toast.error('Falha ao carregar a lista de projetos.');
            } else {
                setProjectsList(data || []);
            }
        };
        fetchProjects();
    }, [user]);

    // Effect for applying filters to the displayed data
    useEffect(() => {
        if (!originalData) return;

        const filteredPieces = originalData.pieces.filter(piece => {
            const nameMatch = filters.name ? piece.name.toLowerCase().includes(filters.name.toLowerCase()) : true;
            const typeMatch = filters.type.length > 0 ? filters.type.includes(piece.type) : true;
            const sectionMatch = filters.section.length > 0 ? filters.section.includes(piece.section) : true;
            const concreteClassMatch = filters.concreteClass.length > 0 ? filters.concreteClass.includes(piece.concreteClass) : true;
            return nameMatch && typeMatch && sectionMatch && concreteClassMatch;
        });

        let totalPieces = 0;
        let totalWeight = 0;
        let totalVolume = 0;
        let totalLengthWeighted = 0;
        let maxLength = 0;
        let maxWeight = 0;

        filteredPieces.forEach(p => {
            totalPieces += p.quantity;
            totalWeight += p.weight * p.quantity;
            totalVolume += p.unit_volume * p.quantity;
            totalLengthWeighted += p.length * p.quantity;
            if (p.weight > maxWeight) {
                maxWeight = p.weight;
            }
            if (p.length > maxLength) {
                maxLength = p.length;
            }
        });

        const avgWeight = totalPieces > 0 ? totalWeight / totalPieces : 0;
        const avgLength = totalPieces > 0 ? totalLengthWeighted / totalPieces : 0;

        setDisplayedData({
            header: originalData.header,
            pieces: filteredPieces,
            summary: { 
                totalPieces, 
                totalWeight, 
                totalVolume, 
                avgWeight, 
                maxWeight, 
                avgLength, 
                maxLength 
            }
        });

    }, [filters, originalData]);
    
    // Effect for updating available filter options based on other active filters (cascading filters)
    useEffect(() => {
        if (!originalData) return;

        const { type, section, concreteClass } = stagedFilters;

        // Available types depend on section and concrete class
        const piecesForType = originalData.pieces.filter(p =>
            (section.length === 0 || section.includes(p.section)) &&
            (concreteClass.length === 0 || concreteClass.includes(p.concreteClass))
        );
        const newTypes = [...new Set(piecesForType.map(p => p.type))].sort();

        // Available sections depend on type and concrete class
        const piecesForSection = originalData.pieces.filter(p =>
            (type.length === 0 || type.includes(p.type)) &&
            (concreteClass.length === 0 || concreteClass.includes(p.concreteClass))
        );
        const newSections = [...new Set(piecesForSection.map(p => p.section))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));

        // Available concrete classes depend on type and section
        const piecesForConcrete = originalData.pieces.filter(p =>
            (type.length === 0 || type.includes(p.type)) &&
            (section.length === 0 || section.includes(p.section))
        );
        const newConcreteClasses = [...new Set(piecesForConcrete.map(p => p.concreteClass))].sort();

        setAvailableOptions({
            types: newTypes,
            sections: newSections,
            concreteClasses: newConcreteClasses,
        });

    }, [stagedFilters, originalData]);

    const sortedPieces = useMemo(() => {
        if (!displayedData?.pieces) return [];
        
        const sortableItems = [...displayedData.pieces];
        
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];

                let comparison = 0;
                
                if (['quantity', 'weight', 'unit_volume', 'length'].includes(sortConfig.key!)) {
                    comparison = (aValue as number) - (bValue as number);
                } else {
                    const numericSort = ['name', 'section'].includes(sortConfig.key!);
                    comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: numericSort });
                }

                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        
        return sortableItems;
    }, [displayedData?.pieces, sortConfig]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = (event.target.files ? Array.from(event.target.files) : []) as File[];
        if (files.length === 0) return;

        const xmlFiles = files.filter(file => file.type === 'text/xml' || file.name.endsWith('.xml'));
        const jsonFiles = files.filter(file => file.type === 'application/json' || file.name.endsWith('.json'));

        setError('');
        let validFiles: File[] = [];
        let infoText = '';

        if (jsonFiles.length > 0) {
            if (files.length > 1) {
                setError('Por favor, carregue apenas um arquivo de sessão (.json) de cada vez.');
                event.target.value = '';
                return;
            }
            validFiles = jsonFiles;
            infoText = validFiles[0].name;
        } else if (xmlFiles.length > 0) {
            if (xmlFiles.length !== files.length) {
                setError('Alguns arquivos não são .xml e foram ignorados.');
            }
            validFiles = xmlFiles;
            if (validFiles.length === 1) {
                infoText = validFiles[0].name;
            } else {
                infoText = `${validFiles.length} arquivos selecionados`;
            }
        } else {
            setError('Nenhum arquivo .xml ou .json válido foi selecionado.');
            event.target.value = '';
            return;
        }

        setSelectedFiles(validFiles);
        setFileInfoText(infoText);
        setOriginalData(null);
        setDisplayedData(null);
        setSelectedProjectId(null); // Reset project selection
        setXmlProjectCode(null);
        setXmlProjectName(null);
        setCurrentProjectStatus(null);
    };

    const processXmlFiles = async () => {
        const fileReadPromises = selectedFiles.map(file => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = () => reject(new Error(`Falha ao ler o arquivo: ${file.name}`));
                reader.readAsText(file, 'ISO-8859-1');
            });
        });

        const xmlStrings = await Promise.all(fileReadPromises);

        let combinedHeader: XmlHeader | null = null;
        const allPieces: Piece[] = [];
        const reportNames: string[] = [];

        for (const xmlString of xmlStrings) {
            const { header, pieces } = parseSingleXml(xmlString);
            if (!combinedHeader) {
                combinedHeader = header;
            }
            reportNames.push(header.name);
            allPieces.push(...pieces);
        }

        if (!combinedHeader || allPieces.length === 0) {
            throw new Error('Nenhum dado válido encontrado nos arquivos selecionados.');
        }

        combinedHeader.name = reportNames.join(', ');
        
        const data = { header: combinedHeader, pieces: allPieces };
        return data;
    }

    const processJsonFile = async () => {
        const file = selectedFiles[0];
        const fileText = await file.text();
        const sessionData: SessionData = JSON.parse(fileText);

        // Basic validation
        if (sessionData.version !== '1.0' || !sessionData.originalData) {
            throw new Error('Arquivo de sessão inválido ou incompatível.');
        }
        
        setFilters(sessionData.filters);
        setStagedFilters(sessionData.stagedFilters);
        setReleasedPieces(new Set(sessionData.releasedPieces));
        setFileInfoText(sessionData.fileInfoText); // Restore original file info
        setSelectedProjectId(sessionData.selectedProjectId); // Restore selected project ID
        
        return sessionData.originalData;
    }

    const handleProcessFiles = async () => {
        if (selectedFiles.length === 0) {
            setError('Nenhum arquivo válido selecionado.');
            return;
        }

        setIsLoading(true);
        setError('');
        setOriginalData(null);
        setDisplayedData(null);
        setParsedPiecesForDb([]); // Clear pieces for DB insertion

        const isJsonImport = selectedFiles.length === 1 && selectedFiles[0].name.endsWith('.json');
        if (!isJsonImport) {
            setFilters(initialFilters);
            setStagedFilters(initialFilters);
            setReleasedPieces(new Set());
            setSelectedProjectId(null); // Reset project selection for XML
            setXmlProjectCode(null);
            setXmlProjectName(null);
            setCurrentProjectStatus(null);
        }

        try {
            const dataToProcess = isJsonImport ? await processJsonFile() : await processXmlFiles();

            const getUniqueSorted = (key: keyof Piece, numeric: boolean = false) =>
                [...new Set(dataToProcess.pieces.map(p => String(p[key])))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric }));

            setAvailableOptions({
                types: getUniqueSorted('type'),
                sections: getUniqueSorted('section', true),
                concreteClasses: getUniqueSorted('concreteClass'),
            });

            let totalPieces = 0, totalWeight = 0, totalVolume = 0, totalLengthWeighted = 0, maxLength = 0, maxWeight = 0;

            dataToProcess.pieces.forEach(p => {
                totalPieces += p.quantity;
                totalWeight += p.weight * p.quantity;
                totalVolume += p.unit_volume * p.quantity;
                totalLengthWeighted += p.length * p.quantity;
                if (p.weight > maxWeight) maxWeight = p.weight;
                if (p.length > maxLength) maxLength = p.length;
            });

            const avgWeight = totalPieces > 0 ? totalWeight / totalPieces : 0;
            const avgLength = totalPieces > 0 ? totalLengthWeighted / totalPieces : 0;

            const summary: SummaryData = { totalPieces, totalWeight, totalVolume, avgWeight, maxWeight, avgLength, maxLength };
            const fullData = { ...dataToProcess, summary };
            setOriginalData(fullData);
            setParsedPiecesForDb(fullData.pieces); // Store for DB insertion

            if (!isJsonImport && fullData.header.obra !== 'N/A') {
                const existingProject = projectsList.find(p => p.project_code === fullData.header.obra);
                if (existingProject) {
                    setSelectedProjectId(existingProject.id);
                    setCurrentProjectStatus(existingProject.status);
                    toast.success(`Projeto "${existingProject.name}" (${existingProject.project_code}) selecionado automaticamente.`);
                } else {
                    setXmlProjectCode(fullData.header.obra);
                    setXmlProjectName(fullData.header.name);
                    setShowNewProjectModal(true);
                }
            } else if (isJsonImport && sessionData.selectedProjectId) {
                const project = projectsList.find(p => p.id === sessionData.selectedProjectId);
                if (project) {
                    setCurrentProjectStatus(project.status);
                }
            }

        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            setError(`Erro ao processar arquivo: ${message}` || 'Ocorreu um erro desconhecido.');
            setOriginalData(null);
            setDisplayedData(null);
            setParsedPiecesForDb([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInsertPiecesToDb = useCallback(async (projectId: string, pieces: Piece[], userId: string) => {
        setIsSavingToDb(true);
        setError(null);
        try {
            // Delete existing pieces for this project to avoid duplicates
            const { error: deleteError } = await supabase
                .from('pieces')
                .delete()
                .eq('project_id', projectId);

            if (deleteError) {
                throw new Error(`Erro ao limpar peças existentes: ${deleteError.message}`);
            }

            const piecesToInsert = pieces.map(piece => ({
                project_id: projectId,
                user_id: userId,
                name: piece.name,
                group: piece.type, // Mapping 'type' from XML to 'group' in DB
                quantity: piece.quantity,
                section: piece.section,
                length: piece.length,
                unit_volume: piece.unit_volume,
                weight: piece.weight,
                concrete_class: piece.concreteClass,
            }));

            const { error: insertError } = await supabase
                .from('pieces')
                .insert(piecesToInsert);

            if (insertError) {
                throw new Error(`Erro ao inserir peças: ${insertError.message}`);
            }

            // Calculate total volume for the project
            const totalProjectVolume = pieces.reduce((sum, p) => sum + (p.unit_volume * p.quantity), 0);

            // Update project's total_volume
            const { error: updateProjectError } = await supabase
                .from('projects')
                .update({ total_volume: totalProjectVolume })
                .eq('id', projectId);

            if (updateProjectError) {
                console.error('Erro ao atualizar volume total do projeto:', updateProjectError.message);
                toast.error('Peças salvas, mas falha ao atualizar o volume total do projeto.');
            }

            toast.success('Peças salvas com sucesso no projeto!');
            navigate(`/projetos/${projectId}`); // Navigate to project details
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido ao salvar peças.';
            setError(message);
            toast.error(message);
        } finally {
            setIsSavingToDb(false);
        }
    }, [navigate]);

    const handleCreateNewProjectAndInsertPieces = useCallback(async () => {
        if (!user || !xmlProjectCode || !xmlProjectName || parsedPiecesForDb.length === 0) {
            setError('Dados insuficientes para criar projeto e salvar peças.');
            return;
        }

        setIsSavingToDb(true);
        setError(null);
        setShowNewProjectModal(false);

        try {
            const { data, error: insertProjectError } = await supabase
                .from('projects')
                .insert({
                    name: xmlProjectName,
                    project_code: xmlProjectCode,
                    user_id: user.id,
                    client: originalData?.header.obra || 'N/A', // Use obra as client if available
                    description: `Projeto gerado automaticamente a partir do XML: ${originalData?.header.name || ''}`,
                    status: 'Programar', // Default status
                })
                .select('id')
                .single();

            if (insertProjectError || !data) {
                throw new Error(`Erro ao criar novo projeto: ${insertProjectError?.message || 'Nenhum ID de projeto retornado.'}`);
            }

            const newProjectId = data.id;
            toast.success(`Novo projeto "${xmlProjectName}" (${xmlProjectCode}) criado com sucesso!`);
            setSelectedProjectId(newProjectId);
            setCurrentProjectStatus('Programar');
            setProjectsList(prev => [...prev, { id: newProjectId, name: xmlProjectName, project_code: xmlProjectCode, client: originalData?.header.obra || 'N/A', status: 'Programar', total_volume: 0 }]);

            await handleInsertPiecesToDb(newProjectId, parsedPiecesForDb, user.id);

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido ao criar projeto e salvar peças.';
            setError(message);
            toast.error(message);
        } finally {
            setIsSavingToDb(false);
        }
    }, [user, xmlProjectCode, xmlProjectName, parsedPiecesForDb, originalData?.header.obra, originalData?.header.name, handleInsertPiecesToDb]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await handleProcessFiles();
    };
    
    const handleExport = () => {
        if (!originalData) return;

        const sessionData: SessionData = {
            version: '1.0',
            originalData,
            filters,
            stagedFilters,
            releasedPieces: Array.from(releasedPieces),
            fileInfoText,
            selectedProjectId, // Include selected project ID in export
        };

        const jsonString = JSON.stringify(sessionData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeFileName = originalData.header.obra.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `analise_tekla_${safeFileName || 'sessao'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const handleStagedFilterChange = (field: 'name', value: string) => {
        setStagedFilters(prev => ({...prev, [field]: value}));
    };

    const handleStagedCheckboxChange = (field: 'type' | 'section' | 'concreteClass', value: string) => {
        setStagedFilters(prev => {
            const currentValues = prev[field];
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];
            return {...prev, [field]: newValues};
        });
    };
    
    const handleApplyFilters = () => {
        setFilters(stagedFilters);
    };

    const handleClearFilters = () => {
        setFilters(initialFilters);
        setStagedFilters(initialFilters);
    };

    const handleReleaseToggle = (pieceName: string) => {
        setReleasedPieces(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pieceName)) {
                newSet.delete(pieceName);
            } else {
                newSet.add(pieceName);
            }
            return newSet;
        });
    };

    const handleSort = (key: keyof Piece) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => {
        return num.toLocaleString('pt-BR', options);
    }

    // --- CHART DATA AND OPTIONS ---
    const chartColors = ['#fcc200', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#D946EF', '#06B6D4'];

    const quantityByTypeData = useMemo(() => {
        if (!displayedData) return null;
        const typeCounts = displayedData.pieces.reduce((acc, piece) => {
            acc[piece.type] = (acc[piece.type] || 0) + piece.quantity;
            return acc;
        }, {} as Record<string, number>);

        const sortedEntries = Object.entries(typeCounts).sort(([,a],[,b]) => Number(b) - Number(a));
        const labels = sortedEntries.map(([key]) => key);
        const data = sortedEntries.map(([,value]) => value);

        return {
            labels,
            datasets: [{
                label: 'Quantidade',
                data,
                backgroundColor: chartColors,
                borderColor: '#ffffff',
                borderWidth: 2,
            }]
        };
    }, [displayedData]);

    const heaviestPartsData = useMemo(() => {
        if (!displayedData) return null;
        const top10Heaviest = [...displayedData.pieces]
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 10);
        
        return {
            labels: top10Heaviest.map(p => p.name),
            datasets: [{
                label: 'Peso (kg)',
                data: top10Heaviest.map(p => p.weight),
                backgroundColor: '#fcc200',
                borderColor: '#e3af00',
                borderWidth: 1,
            }]
        };
    }, [displayedData]);
    
    const chartOptions = useMemo(() => {
        const textColor = '#475569'; // text-secondary (slate-600)
        const titleColor = '#1e293b'; // text-primary (slate-800)
        const gridColor = '#e2e8f0'; // border-default (slate-200)
        
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor }
                },
                title: {
                    display: true,
                    color: titleColor,
                    font: { size: 16, weight: 'bold' as const }
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            }
        };
    }, []);

    const SortableHeader = ({ label, sortKey, align = 'left' }: { label: string, sortKey: keyof Piece, align?: 'left' | 'center' | 'right' }) => {
        const isSorted = sortConfig.key === sortKey;
        const alignmentClasses = {
            left: 'justify-start',
            center: 'justify-center',
            right: 'justify-end'
        };

        return (
            <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort(sortKey)}>
                <div className={`flex items-center ${alignmentClasses[align]}`}>
                    <span>{label}</span>
                    {isSorted && (
                        <span className="text-[10px] ml-1.5">
                            {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                        </span>
                    )}
                </div>
            </th>
        );
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Cadastro de Peças</h1>
                    <p className="mt-3 text-base sm:text-lg text-text-secondary max-w-3xl mx-auto">Carregue arquivos .xml do Tekla para cadastrar as peças de um projeto.</p>
                </header>

                <div className="bg-surface rounded-xl shadow-md border border-border-default p-6 mb-8 sticky top-4 z-10">
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4">
                        <label className="w-full sm:w-auto flex-grow cursor-pointer bg-surface border border-border-default text-text-secondary font-medium py-3 px-4 rounded-md text-center hover:bg-background transition-colors truncate">
                            <span>{fileInfoText || 'Selecionar XML ou Sessão (.json)'}</span>
                            <input type="file" accept=".xml,text/xml,application/json,.json" onChange={handleFileChange} className="hidden" aria-label="Selecione os arquivos XML ou um arquivo de sessão JSON" multiple />
                        </label>
                        <button 
                            type="submit" 
                            disabled={selectedFiles.length === 0 || isLoading}
                            className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-primary-text font-bold py-3 px-6 rounded-md shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:bg-primary/50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transform hover:-translate-y-px"
                        >
                             {isLoading && <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            <span>{isLoading ? 'Processando...' : 'Processar Arquivo(s)'}</span>
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative mb-8" role="alert">
                        <strong className="font-bold">Erro: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {displayedData && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-surface rounded-xl shadow-md border border-border-default p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex-grow">
                                    <h2 className="text-xl font-bold text-text-primary mb-4">Informações do Projeto</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                                        <div className="flex flex-col"><span className="text-sm font-medium text-text-secondary">Obra</span><span className="text-lg text-text-primary mt-1">{displayedData.header.obra}</span></div>
                                        <div className="flex flex-col"><span className="text-sm font-medium text-text-secondary">Relatório(s)</span><span className="text-lg text-text-primary mt-1">{displayedData.header.name}</span></div>
                                        <div className="flex flex-col"><span className="text-sm font-medium text-text-secondary">Projetista</span><span className="text-lg text-text-primary mt-1">{displayedData.header.projetista}</span></div>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0 flex-shrink-0">
                                    <button
                                        onClick={handleExport}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
                                        title="Salvar sessão atual em um arquivo .json"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        <span>Exportar Sessão</span>
                                    </button>
                                    <Button
                                        onClick={() => {
                                            if (!user) {
                                                toast.error('Você precisa estar logado para salvar peças.');
                                                return;
                                            }
                                            if (!selectedProjectId) {
                                                toast.error('Por favor, selecione ou crie um projeto antes de salvar as peças.');
                                                return;
                                            }
                                            handleInsertPiecesToDb(selectedProjectId, parsedPiecesForDb, user.id);
                                        }}
                                        disabled={isSavingToDb || !selectedProjectId || !user || parsedPiecesForDb.length === 0}
                                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
                                    >
                                        {isSavingToDb && <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                        <span>{isSavingToDb ? 'Salvando...' : 'Salvar Peças no Projeto'}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Associar Peças a um Projeto</CardTitle>
                                <CardDescription>Selecione um projeto existente ou crie um novo para salvar as peças processadas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="project-select">Projeto Existente</Label>
                                        <select
                                            id="project-select"
                                            className="w-full bg-surface border border-border-default rounded-md p-2 text-sm focus:ring-primary focus:border-primary"
                                            value={selectedProjectId || ''}
                                            onChange={(e) => {
                                                setSelectedProjectId(e.target.value);
                                                const project = projectsList.find(p => p.id === e.target.value);
                                                setCurrentProjectStatus(project?.status || null);
                                            }}
                                            disabled={!user || isLoading || isSavingToDb}
                                        >
                                            <option value="">Selecione um projeto</option>
                                            {projectsList.map(project => (
                                                <option key={project.id} value={project.id}>
                                                    {project.name} ({project.project_code}) - Status: {project.status}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Status do Projeto Selecionado</Label>
                                        <Input
                                            value={currentProjectStatus || 'N/A'}
                                            readOnly
                                            className="bg-background text-text-secondary"
                                        />
                                    </div>
                                </div>
                                {selectedProjectId && (
                                    <p className="text-sm text-text-subtle mt-4">
                                        As peças serão salvas no projeto: <span className="font-medium text-text-primary">
                                            {projectsList.find(p => p.id === selectedProjectId)?.name}
                                        </span>. Peças existentes neste projeto serão substituídas.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <div className="bg-surface rounded-xl shadow-md border border-border-default p-6">
                            <h2 className="text-xl font-bold text-text-primary mb-6">Filtros</h2>
                            <div className="flex flex-col gap-6">
                                <div>
                                    <label htmlFor="name-filter" className="block text-sm font-medium text-text-secondary mb-1">Nome da Peça</label>
                                    <input type="text" id="name-filter" value={stagedFilters.name} onChange={e => handleStagedFilterChange('name', e.target.value)} placeholder="Buscar por nome..." className="w-full bg-surface border border-border-default rounded-md p-2 text-sm focus:ring-primary focus:border-primary"/>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { id: 'type', label: 'Tipo', options: availableOptions.types, selected: stagedFilters.type },
                                        { id: 'section', label: 'Seção', options: availableOptions.sections, selected: stagedFilters.section },
                                        { id: 'concreteClass', label: 'Concreto', options: availableOptions.concreteClasses, selected: stagedFilters.concreteClass }
                                    ].map(group => (
                                        <div key={group.id}>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                                {group.label} {group.selected.length > 0 && `(${group.selected.length} selecionado${group.selected.length > 1 ? 's' : ''})`}
                                            </label>
                                            <div className="h-40 overflow-y-auto p-3 border border-border-default rounded-lg bg-background space-y-2">
                                                {group.options.map(opt => (
                                                    <label key={opt} htmlFor={`${group.id}-${opt}`} className="flex items-center space-x-2 text-sm cursor-pointer text-text-secondary hover:text-text-primary">
                                                        <input
                                                            type="checkbox"
                                                            id={`${group.id}-${opt}`}
                                                            checked={group.selected.includes(opt)}
                                                            onChange={() => handleStagedCheckboxChange(group.id as 'type' | 'section' | 'concreteClass', opt)}
                                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="flex justify-end pt-4 mt-2 border-t border-border-default">
                                    <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                                        <button onClick={handleClearFilters} className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-md transition-colors text-sm">
                                            Limpar Filtros
                                        </button>
                                        <button onClick={handleApplyFilters} className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-md shadow-sm transition-colors text-sm">
                                            Aplicar Filtros
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface rounded-xl shadow-md border border-border-default overflow-hidden">
                             <div className="p-6">
                                <h2 className="text-xl font-bold text-text-primary">Resumo (Filtrado)</h2>
                                <div className="mt-6 flex flex-col gap-4">
                                    {/* First Row: Totals */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                                       <div className="p-4 bg-background rounded-lg">
                                           <p className="text-xs text-text-subtle uppercase tracking-wider">Nº Peças</p>
                                           <p className="text-2xl sm:text-3xl font-bold text-text-primary mt-1">{formatNumber(displayedData.summary.totalPieces)}</p>
                                       </div>
                                       <div className="p-4 bg-background rounded-lg">
                                           <p className="text-xs text-text-subtle uppercase tracking-wider">Peso Total</p>
                                           <div className="flex items-baseline justify-center gap-x-1 mt-1">
                                               <p className="text-2xl sm:text-3xl font-bold text-text-primary">{formatNumber(displayedData.summary.totalWeight, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                               <p className="text-sm font-medium text-text-secondary">kg</p>
                                           </div>
                                       </div>
                                       <div className="p-4 bg-background rounded-lg">
                                           <p className="text-xs text-text-subtle uppercase tracking-wider">Volume Total</p>
                                           <div className="flex items-baseline justify-center gap-x-1 mt-1">
                                               <p className="text-2xl sm:text-3xl font-bold text-text-primary">{formatNumber(displayedData.summary.totalVolume, {minimumFractionDigits: 4, maximumFractionDigits: 4})}</p>
                                               <p className="text-sm font-medium text-text-secondary">m³</p>
                                           </div>
                                       </div>
                                    </div>
                                    {/* Second Row: Averages & Maximums */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                       <div className="p-4 bg-background rounded-lg">
                                           <p className="text-xs text-text-subtle uppercase tracking-wider">Peso Médio</p>
                                           <div className="flex items-baseline justify-center gap-x-1 mt-1">
                                               <p className="text-2xl sm:text-3xl font-bold text-text-primary">{formatNumber(displayedData.summary.avgWeight, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                               <p className="text-sm font-medium text-text-secondary">kg</p>
                                           </div>
                                       </div>
                                       <div className="p-4 bg-background rounded-lg">
                                           <p className="text-xs text-text-subtle uppercase tracking-wider">Peso Máximo</p>
                                           <div className="flex items-baseline justify-center gap-x-1 mt-1">
                                               <p className="text-2xl sm:text-3xl font-bold text-text-primary">{formatNumber(displayedData.summary.maxWeight, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                               <p className="text-sm font-medium text-text-secondary">kg</p>
                                           </div>
                                       </div>
                                       <div className="p-4 bg-background rounded-lg">
                                           <p className="text-xs text-text-subtle uppercase tracking-wider">Compr. Médio</p>
                                           <div className="flex items-baseline justify-center gap-x-1 mt-1">
                                               <p className="text-2xl sm:text-3xl font-bold text-text-primary">{formatNumber(displayedData.summary.avgLength / 100, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                               <p className="text-sm font-medium text-text-secondary">m</p>
                                           </div>
                                       </div>
                                       <div className="p-4 bg-background rounded-lg">
                                           <p className="text-xs text-text-subtle uppercase tracking-wider">Compr. Máximo</p>
                                           <div className="flex items-baseline justify-center gap-x-1 mt-1">
                                               <p className="text-2xl sm:text-3xl font-bold text-text-primary">{formatNumber(displayedData.summary.maxLength / 100, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                               <p className="text-sm font-medium text-text-secondary">m</p>
                                           </div>
                                       </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-surface rounded-xl shadow-md border border-border-default overflow-hidden">
                             <div className="p-6">
                                <h2 className="text-xl font-bold text-text-primary">Detalhamento das Peças</h2>
                                {originalData && <p className="text-sm text-text-subtle mt-1">
                                    Exibindo {displayedData.pieces.length} de {originalData.pieces.length} tipos de peças ({formatNumber(displayedData.summary.totalPieces)} no total).
                                </p>}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-text-secondary">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 select-none">
                                        <tr>
                                            <th scope="col" className="px-4 py-3"></th>
                                            <SortableHeader label="Nome" sortKey="name" />
                                            <SortableHeader label="Tipo" sortKey="type" />
                                            <SortableHeader label="Qtd." sortKey="quantity" align="center" />
                                            <SortableHeader label="Seção" sortKey="section" />
                                            <SortableHeader label="Comprimento (m)" sortKey="length" align="right" />
                                            <SortableHeader label="Peso (kg)" sortKey="weight" align="right" />
                                            <SortableHeader label="Volume (m³)" sortKey="unit_volume" align="right" />
                                            <SortableHeader label="Concreto" sortKey="concreteClass" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-default">
                                        {sortedPieces.map((piece, index) => (
                                            <tr key={`${piece.name}-${index}`} className={`transition-colors ${releasedPieces.has(piece.name) ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-slate-50/50'}`}>
                                                <td className="px-4 py-4">
                                                    <input
                                                        type="checkbox"
                                                        aria-label={`Marcar ${piece.name} como liberado`}
                                                        checked={releasedPieces.has(piece.name)}
                                                        onChange={() => handleReleaseToggle(piece.name)}
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-text-primary whitespace-nowrap">{piece.name}</td>
                                                <td className="px-6 py-4">{piece.type}</td>
                                                <td className="px-6 py-4 text-center">{piece.quantity}</td>
                                                <td className="px-6 py-4">{piece.section}</td>
                                                <td className="px-6 py-4 text-right">{formatNumber(piece.length / 100, {minimumFractionDigits: 2})}</td>
                                                <td className="px-6 py-4 text-right">{formatNumber(piece.weight, {minimumFractionDigits: 2})}</td>
                                                <td className="px-6 py-4 text-right">{formatNumber(piece.unit_volume, {minimumFractionDigits: 4})}</td>
                                                <td className="px-6 py-4">{piece.concreteClass}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-surface rounded-xl shadow-md border border-border-default p-6">
                            <h2 className="text-xl font-bold text-text-primary mb-4 border-b border-border-default pb-3">Visualização de Dados</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                                <div className="min-h-[450px] relative">
                                    {quantityByTypeData && <Pie data={quantityByTypeData} options={{...chartOptions, plugins: {...chartOptions.plugins, title: {...chartOptions.plugins.title, text: 'Distribuição por Tipo de Produto'}}}} />}
                                </div>
                                <div className="min-h-[450px] relative">
                                    {quantityByTypeData && <Bar data={quantityByTypeData} options={{...chartOptions, plugins: {...chartOptions.plugins, legend: {display: false}, title: {...chartOptions.plugins.title, text: 'Quantidade de Peças por Tipo'}}}} />}
                                </div>
                                <div className="lg:col-span-2 min-h-[450px] relative">
                                    {heaviestPartsData && <Bar data={heaviestPartsData} options={{...chartOptions, indexAxis: 'y', plugins: {...chartOptions.plugins, legend: {display: false}, title: {...chartOptions.plugins.title, text: 'Top 10 Peças mais Pesadas'}}}} />}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* Modal para criar novo projeto */}
            <Dialog open={showNewProjectModal} onOpenChange={setShowNewProjectModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Projeto Não Encontrado</DialogTitle>
                        <DialogDescription>
                            O código da obra <span className="font-semibold text-text-primary">"{xmlProjectCode}"</span> do arquivo XML não corresponde a nenhum projeto existente.
                            Deseja criar um novo projeto com este código e nome sugerido?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-project-name">Nome do Projeto Sugerido</Label>
                            <Input id="new-project-name" value={xmlProjectName || ''} readOnly className="bg-background" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-project-code">Código da Obra</Label>
                            <Input id="new-project-code" value={xmlProjectCode || ''} readOnly className="bg-background" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowNewProjectModal(false);
                            setError('Criação de projeto cancelada. Selecione um projeto existente ou carregue outro arquivo.');
                            setOriginalData(null);
                            setDisplayedData(null);
                            setParsedPiecesForDb([]);
                        }}>
                            Não, Cancelar
                        </Button>
                        <Button onClick={handleCreateNewProjectAndInsertPieces} disabled={isSavingToDb}>
                            {isSavingToDb ? 'Criando...' : 'Sim, Criar Projeto'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PieceRegistry;