
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
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
    type: string;
    quantity: number;
    section: string;
    length: string;
    weight: number;
    volume: number;
    concreteClass: string;
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

// --- HELPER FUNCTIONS ---
const getElementTextContent = (element: Element, tagName: string): string => {
    return element.querySelector(tagName)?.textContent?.trim() || 'N/A';
};

const parseSafeFloat = (value: string): number => {
    if (!value) return 0;
    // Handles both dot and comma decimal separators
    return parseFloat(value.replace(',', '.')) || 0;
};

// Custom hook to detect dark mode for chart styling
const useDarkMode = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    setIsDarkMode(document.documentElement.classList.contains('dark'));
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => observer.disconnect();
    }, []);

    return isDarkMode;
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
        const volume = parseSafeFloat(getElementTextContent(p, 'VOLUMEUNITARIO'));

        return {
            name: getElementTextContent(p, 'NOMEPECA'),
            type: getElementTextContent(p, 'TIPOPRODUTO'),
            quantity,
            section: getElementTextContent(p, 'SECAO'),
            length: getElementTextContent(p, 'COMPRIMENTO'),
            weight,
            volume,
            concreteClass: getElementTextContent(p, 'CLASSECONCRETO'),
        };
    });
    
    return { header, pieces };
};


// --- MAIN APP COMPONENT ---
const App = () => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [fileInfoText, setFileInfoText] = useState<string>('');
    const [originalData, setOriginalData] = useState<ParsedXmlData | null>(null);
    const [displayedData, setDisplayedData] = useState<ParsedXmlData | null>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const isDarkMode = useDarkMode();
    
    const initialFilters = { name: '', type: '', section: '', concreteClass: '' };
    const [filters, setFilters] = useState(initialFilters);
    const [availableOptions, setAvailableOptions] = useState({
        types: [] as string[],
        sections: [] as string[],
        concreteClasses: [] as string[],
    });
    
    // Effect for applying filters to the displayed data
    useEffect(() => {
        if (!originalData) return;

        const filteredPieces = originalData.pieces.filter(piece => {
            const nameMatch = filters.name ? piece.name.toLowerCase().includes(filters.name.toLowerCase()) : true;
            const typeMatch = filters.type ? piece.type === filters.type : true;
            const sectionMatch = filters.section ? piece.section === filters.section : true;
            const concreteClassMatch = filters.concreteClass ? piece.concreteClass === filters.concreteClass : true;
            return nameMatch && typeMatch && sectionMatch && concreteClassMatch;
        });

        let totalPieces = 0;
        let totalWeight = 0;
        let totalVolume = 0;
        let totalLengthWeighted = 0;
        let maxLength = 0;
        let maxWeight = 0;

        filteredPieces.forEach(p => {
            const pieceLength = parseSafeFloat(p.length);
            totalPieces += p.quantity;
            totalWeight += p.weight * p.quantity;
            totalVolume += p.volume * p.quantity;
            totalLengthWeighted += pieceLength * p.quantity;
            if (p.weight > maxWeight) {
                maxWeight = p.weight;
            }
            if (pieceLength > maxLength) {
                maxLength = pieceLength;
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

        const { type, section, concreteClass } = filters;

        // Available types depend on section and concrete class
        const piecesForType = originalData.pieces.filter(p =>
            (!section || p.section === section) &&
            (!concreteClass || p.concreteClass === concreteClass)
        );
        const newTypes = [...new Set(piecesForType.map(p => p.type))].sort();

        // Available sections depend on type and concrete class
        const piecesForSection = originalData.pieces.filter(p =>
            (!type || p.type === type) &&
            (!concreteClass || p.concreteClass === concreteClass)
        );
        const newSections = [...new Set(piecesForSection.map(p => p.section))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));

        // Available concrete classes depend on type and section
        const piecesForConcrete = originalData.pieces.filter(p =>
            (!type || p.type === type) &&
            (!section || p.section === section)
        );
        const newConcreteClasses = [...new Set(piecesForConcrete.map(p => p.concreteClass))].sort();

        setAvailableOptions({
            types: newTypes,
            sections: newSections,
            concreteClasses: newConcreteClasses,
        });

    }, [filters, originalData]);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files ? Array.from(event.target.files) : [];
        if (files.length > 0) {
            const validFiles = files.filter(file => file.type === 'text/xml' || file.name.endsWith('.xml'));
            
            if (validFiles.length !== files.length) {
                 setError('Alguns arquivos não são .xml e foram ignorados.');
            } else {
                setError('');
            }
            
            setSelectedFiles(validFiles);
            setOriginalData(null);
            setDisplayedData(null);
            
            if (validFiles.length === 1) {
                setFileInfoText(validFiles[0].name);
            } else if (validFiles.length > 1) {
                setFileInfoText(`${validFiles.length} arquivos selecionados`);
            } else {
                setFileInfoText('');
                if (files.length > 0) event.target.value = '';
            }
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (selectedFiles.length === 0) {
            setError('Nenhum arquivo XML válido selecionado.');
            return;
        }

        setIsLoading(true);
        setError('');
        setOriginalData(null);
        setDisplayedData(null);
        setFilters(initialFilters);

        try {
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

            xmlStrings.forEach((xmlString, index) => {
                try {
                    const { header, pieces } = parseSingleXml(xmlString);
                    if (!combinedHeader) {
                        combinedHeader = header;
                    }
                    reportNames.push(header.name);
                    allPieces.push(...pieces);
                } catch (e: any) {
                    throw new Error(`[${selectedFiles[index].name}] ${e.message}`);
                }
            });

            if (!combinedHeader || allPieces.length === 0) {
                throw new Error('Nenhum dado válido encontrado nos arquivos selecionados.');
            }
            
            combinedHeader.name = reportNames.join(', ');

            const getUniqueSorted = (key: keyof Piece, numeric: boolean = false) => 
                [...new Set(allPieces.map(p => String(p[key])))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric}));
            
            setAvailableOptions({
                types: getUniqueSorted('type'),
                sections: getUniqueSorted('section', true),
                concreteClasses: getUniqueSorted('concreteClass'),
            });

            let totalPieces = 0;
            let totalWeight = 0;
            let totalVolume = 0;
            let totalLengthWeighted = 0;
            let maxLength = 0;
            let maxWeight = 0;

            allPieces.forEach(p => {
                const pieceLength = parseSafeFloat(p.length);
                totalPieces += p.quantity;
                totalWeight += p.weight * p.quantity;
                totalVolume += p.volume * p.quantity;
                totalLengthWeighted += pieceLength * p.quantity;
                if (p.weight > maxWeight) {
                    maxWeight = p.weight;
                }
                if (pieceLength > maxLength) {
                    maxLength = pieceLength;
                }
            });

            const avgWeight = totalPieces > 0 ? totalWeight / totalPieces : 0;
            const avgLength = totalPieces > 0 ? totalLengthWeighted / totalPieces : 0;

            const summary: SummaryData = { 
                totalPieces, 
                totalWeight, 
                totalVolume, 
                avgWeight,
                maxWeight,
                avgLength,
                maxLength
            };
            const data = { header: combinedHeader, pieces: allPieces, summary };
            setOriginalData(data);
            setDisplayedData(data);

        } catch (e: any) {
            setError(e.message || 'Ocorreu um erro desconhecido.');
            setOriginalData(null);
            setDisplayedData(null);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({...prev, [field]: value}));
    };
    
    const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => {
        return num.toLocaleString('pt-BR', options);
    }

    // --- CHART DATA AND OPTIONS ---
    const chartColors = ['#4F46E5', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#D946EF', '#06B6D4'];

    const quantityByTypeData = useMemo(() => {
        if (!displayedData) return null;
        const typeCounts = displayedData.pieces.reduce((acc, piece) => {
            acc[piece.type] = (acc[piece.type] || 0) + piece.quantity;
            return acc;
        }, {} as Record<string, number>);

        const sortedEntries = Object.entries(typeCounts).sort(([,a],[,b]) => b - a);
        const labels = sortedEntries.map(([key]) => key);
        const data = sortedEntries.map(([,value]) => value);

        return {
            labels,
            datasets: [{
                label: 'Quantidade',
                data,
                backgroundColor: chartColors,
                borderColor: isDarkMode ? '#1f2937' : '#ffffff',
                borderWidth: 2,
            }]
        };
    }, [displayedData, isDarkMode]);

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
                backgroundColor: '#4F46E5',
                borderColor: '#3c34c4',
                borderWidth: 1,
            }]
        };
    }, [displayedData]);
    
    const chartOptions = useMemo(() => {
        const textColor = isDarkMode ? 'rgba(229, 231, 235, 0.9)' : 'rgba(55, 65, 81, 0.9)';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor }
                },
                title: {
                    display: true,
                    color: textColor,
                    font: { size: 16 }
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
    }, [isDarkMode]);

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white">Analisador de XML - Tekla x Plannix</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Carregue um ou mais arquivos em .xml gerados pelo Tekla para análise</p>
                </header>

                <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8 sticky top-4 z-10">
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4">
                        <label className="w-full sm:w-auto flex-grow cursor-pointer bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg text-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors truncate">
                            <span>{fileInfoText || 'Selecionar arquivo(s) XML'}</span>
                            <input type="file" accept=".xml,text/xml" onChange={handleFileChange} className="hidden" aria-label="Selecione os arquivos XML" multiple />
                        </label>
                        <button 
                            type="submit" 
                            disabled={selectedFiles.length === 0 || isLoading}
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 flex items-center justify-center space-x-2"
                        >
                             {isLoading && <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            <span>{isLoading ? 'Processando...' : 'Processar XML'}</span>
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-8" role="alert">
                        <strong className="font-bold">Erro: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {displayedData && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">Informações do Projeto</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                                <div><strong>Obra:</strong> <span className="text-gray-600 dark:text-gray-300">{displayedData.header.obra}</span></div>
                                <div><strong>Relatório:</strong> <span className="text-gray-600 dark:text-gray-300">{displayedData.header.name}</span></div>
                                <div><strong>Projetista:</strong> <span className="text-gray-600 dark:text-gray-300">{displayedData.header.projetista}</span></div>
                            </div>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-2xl font-semibold mb-4">Filtros</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                                <div className="lg:col-span-2">
                                    <label htmlFor="name-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Peça</label>
                                    <input type="text" id="name-filter" value={filters.name} onChange={e => handleFilterChange('name', e.target.value)} placeholder="Buscar por nome..." className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"/>
                                </div>
                                <div>
                                    <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                                    <select id="type-filter" value={filters.type} onChange={e => handleFilterChange('type', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">Todos</option>
                                        {availableOptions.types.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="section-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seção</label>
                                    <select id="section-filter" value={filters.section} onChange={e => handleFilterChange('section', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">Todas</option>
                                         {availableOptions.sections.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="concrete-class-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Concreto</label>
                                    <select id="concrete-class-filter" value={filters.concreteClass} onChange={e => handleFilterChange('concreteClass', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">Todas</option>
                                        {availableOptions.concreteClasses.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <button onClick={() => setFilters(initialFilters)} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-bold py-2 px-4 rounded-lg transition-colors h-full mt-auto text-sm">Limpar</button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                             <div className="p-6">
                                <h2 className="text-2xl font-semibold">Detalhamento das Peças</h2>
                                {originalData && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Exibindo {displayedData.pieces.length} de {originalData.pieces.length} peças.
                                </p>}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-300">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Nome</th>
                                            <th scope="col" className="px-6 py-3">Tipo</th>
                                            <th scope="col" className="px-6 py-3 text-center">Qtd.</th>
                                            <th scope="col" className="px-6 py-3">Seção</th>
                                            <th scope="col" className="px-6 py-3 text-right">Comprimento (m)</th>
                                            <th scope="col" className="px-6 py-3 text-right">Peso (kg)</th>
                                            <th scope="col" className="px-6 py-3 text-right">Volume (m³)</th>
                                            <th scope="col" className="px-6 py-3">Concreto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedData.pieces.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true})).map((piece, index) => (
                                            <tr key={index} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{piece.name}</td>
                                                <td className="px-6 py-4">{piece.type}</td>
                                                <td className="px-6 py-4 text-center">{piece.quantity}</td>
                                                <td className="px-6 py-4">{piece.section}</td>
                                                <td className="px-6 py-4 text-right">{formatNumber(parseSafeFloat(piece.length) / 100, {minimumFractionDigits: 2})}</td>
                                                <td className="px-6 py-4 text-right">{formatNumber(piece.weight, {minimumFractionDigits: 2})}</td>
                                                <td className="px-6 py-4 text-right">{formatNumber(piece.volume, {minimumFractionDigits: 4})}</td>
                                                <td className="px-6 py-4">{piece.concreteClass}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">Resumo (Filtrado)</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
                               <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                                   <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nº Total de Peças</p>
                                   <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatNumber(displayedData.summary.totalPieces)}</p>
                               </div>
                               <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                                   <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Peso Total (kg)</p>
                                   <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatNumber(displayedData.summary.totalWeight, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                               </div>
                               <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                                   <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Volume Total (m³)</p>
                                   <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatNumber(displayedData.summary.totalVolume, {minimumFractionDigits: 4, maximumFractionDigits: 4})}</p>
                               </div>
                               <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                                   <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Peso Médio (kg)</p>
                                   <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatNumber(displayedData.summary.avgWeight, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                               </div>
                               <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                                   <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Peso Máximo (kg)</p>
                                   <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatNumber(displayedData.summary.maxWeight, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                               </div>
                               <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                                   <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Compr. Médio (m)</p>
                                   <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatNumber(displayedData.summary.avgLength / 100, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                               </div>
                               <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                                   <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Compr. Máximo (m)</p>
                                   <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatNumber(displayedData.summary.maxLength / 100, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                               </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">Visualização de Dados</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                                <div className="min-h-[400px] relative">
                                    {quantityByTypeData && <Pie data={quantityByTypeData} options={{...chartOptions, plugins: {...chartOptions.plugins, title: {...chartOptions.plugins.title, text: 'Distribuição por Tipo de Produto'}}}} />}
                                </div>
                                <div className="min-h-[400px] relative">
                                    {quantityByTypeData && <Bar data={quantityByTypeData} options={{...chartOptions, plugins: {...chartOptions.plugins, legend: {display: false}, title: {...chartOptions.plugins.title, text: 'Quantidade de Peças por Tipo'}}}} />}
                                </div>
                                <div className="lg:col-span-2 min-h-[400px] relative">
                                    {heaviestPartsData && <Bar data={heaviestPartsData} options={{...chartOptions, indexAxis: 'y', plugins: {...chartOptions.plugins, legend: {display: false}, title: {...chartOptions.plugins.title, text: 'Top 10 Peças mais Pesadas'}}}} />}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
