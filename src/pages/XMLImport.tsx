import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// --- TYPE DEFINITIONS ---
interface PieceFromXml {
    name: string;
    type: string;
    quantity: number;
    section: string;
    length: number;
    weight: number;
    unit_volume: number;
    concreteClass: string;
    piece_ids: string[];
}

interface PieceForDb {
    name: string;
    group: string;
    quantity: number;
    section: string;
    length: number;
    weight: number;
    unit_volume: number;
    concrete_class: string;
    piece_ids: string[];
}

interface XmlHeader {
    obra: string;
    name: string;
    projetista: string;
}

interface Project {
    id: string;
    name: string;
    project_code: string;
}

interface Client {
    id: string;
    name: string;
}

// --- HELPER FUNCTIONS ---
const getElementTextContent = (element: Element, tagName: string): string => {
    return element.querySelector(tagName)?.textContent?.trim() || 'N/A';
};

const parseSafeFloat = (value: string): number => {
    if (!value) return 0;
    return parseFloat(value.replace(',', '.')) || 0;
};

// --- PARSING LOGIC ---
const parseSingleXml = (xmlString: string): { header: XmlHeader; pieces: PieceFromXml[] } => {
    // Corrigir codificação de caracteres
    const decodedXmlString = decodeURIComponent(escape(xmlString));
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(decodedXmlString, "application/xml");
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) throw new Error('Erro ao analisar o XML. Verifique o formato do arquivo.');
    const root = xmlDoc.querySelector('DETALHAMENTOTEKLA');
    if (!root) throw new Error('Elemento raiz <DETALHAMENTOTEKLA> não encontrado.');

    const header: XmlHeader = {
        obra: root.getAttribute('obra') || 'N/A',
        name: root.getAttribute('name') || 'N/A',
        projetista: root.getAttribute('projetista') || 'N/A',
    };

    const pieceElements = Array.from(xmlDoc.querySelectorAll('PECA'));
    if (pieceElements.length === 0) throw new Error('Nenhuma peça <PECA> encontrada no arquivo.');

    const pieces: PieceFromXml[] = pieceElements.map(p => {
        const pieceName = getElementTextContent(p, 'NOMEPECA');
        const idElements = Array.from(p.querySelectorAll('LISTAID ID'));
        
        // NOVO LOG: Para inspecionar o que querySelectorAll está retornando
        console.log(`PieceRegistry (parseSingleXml): Para a peça "${pieceName}", idElements encontrados:`, idElements);

        const piece_ids = idElements.map(id => id.textContent || '').filter(Boolean);
        
        // NOVO LOG: Para inspecionar os IDs após o map e filter
        console.log(`PieceRegistry (parseSingleXml): Para a peça "${pieceName}", piece_ids extraídos:`, piece_ids);

        return {
            name: pieceName,
            type: getElementTextContent(p, 'TIPOPRODUTO'),
            quantity: parseInt(getElementTextContent(p, 'QUANTIDADE'), 10) || 0,
            section: getElementTextContent(p, 'SECAO'),
            length: parseSafeFloat(getElementTextContent(p, 'COMPRIMENTO')),
            weight: parseSafeFloat(getElementTextContent(p, 'PESO')),
            unit_volume: parseSafeFloat(getElementTextContent(p, 'VOLUMEUNITARIO')),
            concreteClass: getElementTextContent(p, 'CLASSECONCRETO'),
            piece_ids: piece_ids,
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
    const [xmlHeader, setXmlHeader] = useState<XmlHeader | null>(null);
    const [parsedPieces, setParsedPieces] = useState<PieceForDb[]>([]);
    const [selectedPieces, setSelectedPieces] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSavingToDb, setIsSavingToDb] = useState<boolean>(false);
    
    const [projectsList, setProjectsList] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [xmlProjectCode, setXmlProjectCode] = useState<string | null>(null);
    const [xmlProjectName, setXmlProjectName] = useState<string | null>(null);
    const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    
    // Estados para seleção de cliente
    const [clientsList, setClientsList] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [clientNameInput, setClientNameInput] = useState<string>('');
    const [showClientSelectionModal, setShowClientSelectionModal] = useState<boolean>(false);

    const fetchProjects = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase.from('projects').select('id, name, project_code').eq('user_id', user.id).order('name');
        if (error) toast.error('Falha ao carregar la lista de projetos.');
        else setProjectsList(data || []);
    }, [user]);

    const fetchClients = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase.from('clients').select('id, name').eq('user_id', user.id).order('name');
        if (error) toast.error('Falha ao carregar a lista de clientes.');
        else setClientsList(data || []);
    }, [user]);

    useEffect(() => {
        fetchProjects();
        fetchClients();
    }, [fetchProjects, fetchClients]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files ? Array.from(event.target.files) : [];
        if (files.length === 0) return;
        setSelectedFiles(files);
        setFileInfoText(files.length === 1 ? files[0].name : `${files.length} arquivos selecionados`);
        setParsedPieces([]);
        setSelectedPieces(new Set());
        setXmlHeader(null);
        setSelectedProjectId(null);
        setXmlProjectCode(null);
        setXmlProjectName(null);
    };

    const handleProcessFiles = async () => {
        if (selectedFiles.length === 0) {
            setError('Nenhum arquivo selecionado.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const fileReadPromises = selectedFiles.map(file => file.text());
            const xmlStrings = await Promise.all(fileReadPromises);

            let combinedHeader: XmlHeader | null = null;
            const allPiecesFromXml: PieceFromXml[] = [];
            for (const xmlString of xmlStrings) {
                const { header, pieces } = parseSingleXml(xmlString);
                if (!combinedHeader) combinedHeader = header;
                allPiecesFromXml.push(...pieces);
            }

            if (!combinedHeader) throw new Error("Nenhum cabeçalho válido encontrado.");

            const piecesForDb = allPiecesFromXml.map(p => {
                return {
                    name: p.name,
                    group: p.type,
                    quantity: p.quantity,
                    section: p.section,
                    length: p.length,
                    weight: p.weight,
                    unit_volume: p.unit_volume,
                    concrete_class: p.concreteClass,
                    piece_ids: p.piece_ids,
                };
            });

            setXmlHeader(combinedHeader);
            setParsedPieces(piecesForDb);
            setSelectedPieces(new Set(piecesForDb.map(p => p.name))); // Select all by default

            const existingProject = projectsList.find(p => p.project_code === combinedHeader!.obra);
            if (existingProject) {
                setSelectedProjectId(existingProject.id);
                toast.success(`Projeto "${existingProject.name}" selecionado automaticamente.`);
            } else {
                setXmlProjectCode(combinedHeader.obra);
                setXmlProjectName(combinedHeader.name);
                setShowNewProjectModal(true);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.');
            setParsedPieces([]);
            setSelectedPieces(new Set());
            setXmlHeader(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveRequest = () => {
        if (!selectedProjectId || selectedPieces.size === 0) {
            toast.error("Selecione um projeto e ao menos uma peça.");
            return;
        }
        setShowClientSelectionModal(true);
    };

    const handleConfirmClientAndSave = async () => {
        if (!selectedClientId && !clientNameInput.trim()) {
            toast.error("Por favor, selecione um cliente ou informe o nome do cliente.");
            return;
        }
        
        setShowClientSelectionModal(false);
        setIsConfirmModalOpen(true);
    };

    const handleInsertPiecesToDb = useCallback(async () => {
        if (!user || !selectedProjectId || selectedPieces.size === 0) {
            toast.error("Nenhuma peça selecionada para importação.");
            return;
        }

        setIsConfirmModalOpen(false);
        setIsSavingToDb(true);
        
        // Obter o nome do cliente
        let clientName = '';
        if (selectedClientId) {
            const client = clientsList.find(c => c.id === selectedClientId);
            clientName = client ? client.name : '';
        } else {
            clientName = clientNameInput.trim();
        }

        const piecesToInsert = parsedPieces
            .filter(p => selectedPieces.has(p.name))
            .map(p => ({
                ...p,
                project_id: selectedProjectId,
                user_id: user.id,
            }));

        // Adicionando log para inspecionar piece_ids antes da inserção
        console.log('PieceRegistry: Peças a serem inseridas (com piece_ids):', piecesToInsert.map(p => ({ name: p.name, piece_ids: p.piece_ids })));

        const { error: insertError } = await supabase
            .from('pieces')
            .insert(piecesToInsert);

        if (insertError) {
            toast.error(`Erro ao salvar peças: ${insertError.message}`);
            setIsSavingToDb(false);
            return;
        }

        // Recalculate total volume
        const { data: allPieces, error: fetchError } = await supabase
            .from('pieces')
            .select('quantity, unit_volume')
            .eq('project_id', selectedProjectId);

        if (fetchError) {
            toast.error('Peças salvas, mas falha ao recalcular o volume total do projeto.');
        } else {
            const newTotalVolume = allPieces.reduce((acc, piece) => {
                return acc + (piece.quantity * piece.unit_volume);
            }, 0);

            // Atualizar o projeto com o cliente selecionado
            const { error: updateError } = await supabase
                .from('projects')
                .update({ 
                    total_volume: newTotalVolume,
                    client: clientName
                })
                .eq('id', selectedProjectId);
            
            if (updateError) {
                toast.error('Peças salvas, mas falha ao atualizar o volume total do projeto.');
            }
        }

        toast.success('Peças adicionadas com sucesso ao projeto!');
        navigate(`/projetos/${selectedProjectId}`);
        setIsSavingToDb(false);
    }, [user, parsedPieces, selectedPieces, navigate, selectedProjectId, selectedClientId, clientNameInput, clientsList]);

    const handleCreateNewProject = useCallback(async () => {
        if (!user || !xmlProjectCode || !xmlProjectName) return;
        setIsSavingToDb(true);

        // Obter o nome do cliente
        let clientName = '';
        if (selectedClientId) {
            const client = clientsList.find(c => c.id === selectedClientId);
            clientName = client ? client.name : '';
        } else {
            clientName = clientNameInput.trim();
        }

        const { data, error } = await supabase.from('projects').insert({
            name: xmlProjectName,
            project_code: xmlProjectCode,
            user_id: user.id,
            client: clientName,
            status: 'Programar',
        }).select('id, name, project_code').single();

        setIsSavingToDb(false);
        setShowNewProjectModal(false);
        setShowClientSelectionModal(false);

        if (error || !data) {
            toast.error(`Erro ao criar projeto: ${error?.message}`);
            return;
        }
        
        toast.success(`Projeto "${xmlProjectName}" criado com sucesso!`);
        
        await fetchProjects();
        setSelectedProjectId(data.id);

    }, [user, xmlProjectCode, xmlProjectName, fetchProjects, selectedClientId, clientNameInput, clientsList]);

    const handleTogglePieceSelection = (pieceName: string) => {
        setSelectedPieces(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pieceName)) {
                newSet.delete(pieceName);
            } else {
                newSet.add(pieceName);
            }
            return newSet;
        });
    };

    const handleToggleSelectAll = () => {
        if (selectedPieces.size === parsedPieces.length) {
            setSelectedPieces(new Set());
        } else {
            setSelectedPieces(new Set(parsedPieces.map(p => p.name)));
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Cadastro de Peças</h1>
                    <p className="mt-3 text-base sm:text-lg text-text-secondary">Carregue arquivos .xml do Tekla para cadastrar as peças de um projeto.</p>
                </header>

                <Card className="mb-8 sticky top-4 z-10">
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <Label htmlFor="file-upload" className="w-full sm:w-auto flex-grow cursor-pointer bg-surface border border-border-default text-text-secondary font-medium py-3 px-4 rounded-md text-center hover:bg-background transition-colors truncate">
                                <span>{fileInfoText || 'Selecionar Arquivo(s) XML'}</span>
                                <Input id="file-upload" type="file" accept=".xml,text/xml" onChange={handleFileChange} className="hidden" multiple />
                            </Label>
                            <Button onClick={handleProcessFiles} disabled={selectedFiles.length === 0 || isLoading} className="w-full sm:w-auto">
                                {isLoading ? 'Processando...' : 'Processar Arquivo(s)'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-8">{error}</div>

}

                {xmlHeader && (
                    <div className="space-y-8 animate-fade-in">
                        <Card>
                            <CardHeader><CardTitle>Informações do XML</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><Label>Obra</Label><p>{xmlHeader.obra}</p></div>
                                <div><Label>Relatório</Label><p>{xmlHeader.name}</p></div>
                                <div><Label>Projetista</Label><p>{xmlHeader.projetista}</p></div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Salvar Peças no Projeto</CardTitle>
                                <CardDescription>Selecione um projeto e clique em salvar para importar as peças selecionadas abaixo.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                    <div className="space-y-2">
                                        <Label htmlFor="project-select">Projeto de Destino</Label>
                                        <select id="project-select" className="w-full bg-surface border border-border-default rounded-md p-2 text-sm" value={selectedProjectId || ''} onChange={(e) => setSelectedProjectId(e.target.value)} disabled={!user || isLoading || isSavingToDb}>
                                            <option value="">Selecione um projeto</option>
                                            {projectsList.map(p => <option key={p.id} value={p.id}>{p.name} ({p.project_code})</option>)}
                                        </select>
                                    </div>
                                    <Button onClick={handleSaveRequest} disabled={isSavingToDb || !selectedProjectId || !user || selectedPieces.size === 0}>
                                        {isSavingToDb ? 'Salvando...' : `Salvar ${selectedPieces.size} Peças`}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Seleção de Peças para Importação</CardTitle>
                                <CardDescription>Selecione as peças que deseja importar para o projeto. {selectedPieces.size} de {parsedPieces.length} selecionadas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="p-2 w-12 text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                        checked={selectedPieces.size === parsedPieces.length && parsedPieces.length > 0}
                                                        onChange={handleToggleSelectAll}
                                                    />
                                                </th>
                                                <th className="p-2 text-left font-medium text-text-secondary">Nome da Peça</th>
                                                <th className="p-2 text-left font-medium text-text-secondary">Tipo</th>
                                                <th className="p-2 text-center font-medium text-text-secondary">Qtd.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {parsedPieces.map(piece => (
                                                <tr key={piece.name} className="hover:bg-slate-50">
                                                    <td className="p-2 w-12 text-center">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                            checked={selectedPieces.has(piece.name)}
                                                            onChange={() => handleTogglePieceSelection(piece.name)}
                                                        />
                                                    </td>
                                                    <td className="p-2 font-semibold text-text-primary">{piece.name}</td>
                                                    <td className="p-2 text-text-secondary">{piece.group}</td>
                                                    <td className="p-2 text-center text-text-secondary">{piece.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <Dialog open={showNewProjectModal} onOpenChange={setShowNewProjectModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Projeto Não Encontrado</DialogTitle>
                        <DialogDescription>O código da obra "{xmlProjectCode}" não foi encontrado. Deseja criar um novo projeto?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewProjectModal(false)}>Cancelar</Button>
                        <Button onClick={() => setShowClientSelectionModal(true)} disabled={isSavingToDb}>
                            {isSavingToDb ? 'Criando...' : 'Sim, Criar Projeto'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showClientSelectionModal} onOpenChange={setShowClientSelectionModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Selecionar Cliente</DialogTitle>
                        <DialogDescription>Selecione um cliente existente ou informe o nome do cliente para o projeto.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="client-select">Cliente Existente</Label>
                            <select 
                                id="client-select"
                                className="w-full bg-surface border border-border-default rounded-md p-2 text-sm"
                                value={selectedClientId || ''}
                                onChange={(e) => {
                                    setSelectedClientId(e.target.value || null);
                                    setClientNameInput('');
                                }}
                            >
                                <option value="">Selecione um cliente</option>
                                {clientsList.map(client => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border-default"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-text-secondary">ou</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="client-name">Nome do Cliente</Label>
                            <Input
                                id="client-name"
                                value={clientNameInput}
                                onChange={(e) => {
                                    setClientNameInput(e.target.value);
                                    setSelectedClientId(null);
                                }}
                                placeholder="Digite o nome do cliente"
                                disabled={!!selectedClientId}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowClientSelectionModal(false)}>Cancelar</Button>
                        <Button 
                            onClick={selectedProjectId ? handleConfirmClientAndSave : handleCreateNewProject}
                            disabled={isSavingToDb || (!selectedClientId && !clientNameInput.trim())}
                        >
                            {isSavingToDb ? 'Processando...' : (selectedProjectId ? 'Continuar' : 'Criar Projeto')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Importação</DialogTitle>
                        <DialogDescription>
                            Isso adicionará {selectedPieces.size} novas peças ao projeto. As peças existentes não serão alteradas. Deseja continuar?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleInsertPiecesToDb} disabled={isSavingToDb}>
                            {isSavingToDb ? 'Salvando...' : 'Sim, Adicionar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PieceRegistry;