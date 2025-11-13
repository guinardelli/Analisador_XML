import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

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
}

interface ParsedXmlData {
    header: XmlHeader;
    pieces: Piece[];
    summary: SummaryData;
}

interface FilterOptions {
    types: string[];
    concreteClasses: string[];
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
    
    const initialFilters = { name: '', type: '', section: '', concreteClass: '' };
    const [filters, setFilters] = useState(initialFilters);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({ types: [], concreteClasses: [] });
    const [availableSections, setAvailableSections] = useState<string[]>([]);
    
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
        filteredPieces.forEach(p => {
            totalPieces += p.quantity;
            totalWeight += p.weight * p.quantity;
            totalVolume += p.volume * p.quantity;
        });

        setDisplayedData({
            header: originalData.header,
            pieces: filteredPieces,
            summary: { totalPieces, totalWeight, totalVolume }
        });

    }, [filters, originalData]);
    
    // Effect for updating available sections based on the selected type
    useEffect(() => {
        if (!originalData) return;

        let newAvailableSections: string[];
        if (filters.type) {
            const sectionsForType = originalData.pieces
                .filter(p => p.type === filters.type)
                .map(p => p.section);
            newAvailableSections = [...new Set(sectionsForType)].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));
        } else {
            // If no type is selected, show all unique sections from the original data
            newAvailableSections = [...new Set(originalData.pieces.map(p => p.section))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));
        }
        
        setAvailableSections(newAvailableSections);

        // If the currently selected section is not valid for the selected type, reset it.
        if (filters.section && !newAvailableSections.includes(filters.section)) {
            setFilters(prev => ({...prev, section: ''}));
        }

    }, [filters.type, originalData]);


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

            const getUniqueSorted = (key: keyof Piece) => [...new Set(allPieces.map(p => p[key]))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));
            
            setFilterOptions({
                types: getUniqueSorted('type') as string[],
                concreteClasses: getUniqueSorted('concreteClass') as string[],
            });
            // Initially, available sections are all sections
            setAvailableSections(getUniqueSorted('section') as string[]);

            let totalPieces = 0;
            let totalWeight = 0;
            let totalVolume = 0;

            allPieces.forEach(p => {
                totalPieces += p.quantity;
                totalWeight += p.weight * p.quantity;
                totalVolume += p.volume * p.quantity;
            });

            const summary: SummaryData = { totalPieces, totalWeight, totalVolume };
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

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white">Analisador de XML de Construção</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Carregue um ou mais arquivos .xml (PILARES, VIGAS, etc.) para ver os dados.</p>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                <div className="lg:col-span-2">
                                    <label htmlFor="name-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Peça</label>
                                    <input type="text" id="name-filter" value={filters.name} onChange={e => handleFilterChange('name', e.target.value)} placeholder="Buscar por nome..." className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"/>
                                </div>
                                <div>
                                    <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                                    <select id="type-filter" value={filters.type} onChange={e => handleFilterChange('type', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">Todos</option>
                                        {filterOptions.types.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="section-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seção</label>
                                    <select id="section-filter" value={filters.section} onChange={e => handleFilterChange('section', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">Todas</option>
                                         {availableSections.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <button onClick={() => setFilters(initialFilters)} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-bold py-2 px-4 rounded-lg transition-colors h-full mt-auto text-sm">Limpar Filtros</button>
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
                                            <th scope="col" className="px-6 py-3">Comprimento</th>
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
                                                <td className="px-6 py-4">{piece.length}</td>
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
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
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
