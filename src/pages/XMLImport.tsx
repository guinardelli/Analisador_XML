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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    obra: string; // NÚMERO DA OBRA
    name: string; // NOME DA OBRA
    client: string; // NOME DO CLIENTE
    engineer: string; // ENGENHEIRO RESPONSÁVEL
}

interface Project {
    id: string;
    name: string; // NOME DA OBRA
    project_code: string; // NÚMERO DA OBRA
    client: string; // NOME DO CLIENTE
}

interface Client {
    id: string;
    name: string; // NOME DO CLIENTE
}

// --- HELPER FUNCTIONS ---
const getElementTextContent = (element: Element, tagName: string): string => {
    return element.querySelector(tagName)?.textContent?.trim() || '';
};

const parseSafeFloat = (value: string): number => {
    if (!value) return 0;
    return parseFloat(value.replace(',', '.')) || 0;
};

// --- PARSING LOGIC ---
const parseSingleXml = (xmlString: string): { header: XmlHeader; pieces: PieceFromXml[] } => {
    // Corrigir codificação de caracteres
    let decodedXmlString = xmlString;
    try {
        decodedXmlString = decodeURIComponent(escape(xmlString));
    } catch (e) {
        // Se falhar, usa o original
        console.warn("Failed to decode XML string, using original");
    }
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(decodedXmlString, "application/xml");
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) throw new Error('Erro ao analisar o XML. Verifique o formato do arquivo.');
    
    const root = xmlDoc.querySelector('DETALHAMENTOTEKLA');
    if (!root) throw new Error('Elemento raiz <DETALHAMENTOTEKLA> não encontrado.');

    const header: XmlHeader = {
        obra: root.getAttribute('obra') || '', // NÚMERO DA OBRA
        name: root.getAttribute('name') || '', // NOME DA OBRA
        client: root.getAttribute('cliente') || '', // NOME DO CLIENTE
        engineer: root.getAttribute('projetista') || '', // ENGENHEIRO RESPONSÁVEL
    };

    // Validação dos campos obrigatórios no cabeçalho
    if (!header.obra) throw new Error('Número da Obra não encontrado no XML.');
    if (!header.name) throw new Error('Nome da Obra não encontrado no XML.');
    if (!header.client) throw new Error('Nome do Cliente não encontrado no XML.');

    const pieceElements = Array.from(xmlDoc.querySelectorAll('PECA'));
    if (pieceElements.length === 0) throw new Error('Nenhuma peça <PECA> encontrada no arquivo.');

    const pieces: PieceFromXml[] = pieceElements.map(p => {
        const pieceName = getElementTextContent(p, 'NOMEPECA');
        const idElements = Array.from(p.querySelectorAll('LISTAID ID'));
        const piece_ids = idElements.map(id => id.textContent || '').filter(Boolean);

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
const XMLImport = () => {
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
    const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);
    
    // Estados para seleção de cliente
    const [clientsList, setClientsList] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [showClientSelectionModal, setShowClientSelectionModal] = useState<boolean>(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const fetchProjects = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase.from('projects').select('id, name, project_code, client').eq('user_id', user.id).order('name');
        if (error) toast.error('Falha ao carregar a lista de projetos.');
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
        setError('');
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
                if (!combinedHeader) {
                    combinedHeader = header;
                } else {
                    // Combinar peças de múltiplos arquivos
                    allPiecesFromXml.push(...pieces);
                }
            }

            if (!combinedHeader) throw new Error("Nenhum cabeçalho válido encontrado.");

            const piecesForDb = allPiecesFromXml.map(p => ({
                name: p.name,
                group: p.type,
                quantity: p.quantity,
                section: p.section,
                length: p.length,
                weight: p.weight,
                unit_volume: p.unit_volume,
                concrete_class: p.concreteClass,
                piece_ids: p.piece_ids,
            }));

            setXmlHeader(combinedHeader);
            setParsedPieces(piecesForDb);
            setSelectedPieces(new Set(piecesForDb.map(p => p.name))); // Select all by default

            // Verificar se o projeto já existe
            const existingProject = projectsList.find(p => p.project_code === combinedHeader!.obra);
            if (existingProject) {
                setSelectedProjectId(existingProject.id);
                // Verificar se o cliente também corresponde
                const existingClient = clientsList.find(c => c.name === combinedHeader!.client);
                if (existingClient) {
                    setSelectedClientId(existingClient.id);
                }
                toast.success(`Projeto "${existingProject.name}" selecionado automaticamente.`);
            } else {
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
        setIsConfirmModalOpen(true);
    };

    const handleInsertPiecesToDb = useCallback(async () => {
        if (!user || !selectedProjectId || selectedPieces.size === 0) {
            toast.error("Nenhuma peça selecionada para importação.");
            return;
        }

        setIsConfirmModalOpen(false);
        setIsSavingToDb(true);

        const piecesToInsert = parsedPieces
            .filter(p => selectedPieces.has(p.name))
            .map(p => ({
                ...p,
                project_id: selectedProjectId,
                user_id: user.id,
            }));

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

            const { error: updateError } = await supabase
                .from('projects')
                .update({ 
                    total_volume: newTotalVolume
                })
                .eq('id', selectedProjectId);
            
            if (updateError) {
                toast.error('Peças salvas, mas falha ao atualizar o volume total do projeto.');
            }
        }

        toast.success('Peças adicionadas com sucesso ao projeto!');
        navigate(`/projetos/${selectedProjectId}`);
        setIsSavingToDb(false);
    }, [user, parsedPieces, selectedPieces, navigate, selectedProjectId]);

    const handleCreateNewProject = useCallback(async () => {
        if (!user || !xmlHeader) return;
        setIsSavingToDb(true);

        // Primeiro verificar se o cliente existe
        let clientId = selectedClientId;
        if (!clientId && xmlHeader.client) {
            const existingClient = clientsList.find(c => c.name === xmlHeader.client);
            if (existingClient) {
                clientId = existingClient.id;
            }
        }

        // Se ainda não tem cliente, criar um novo
        if (!clientId && xmlHeader.client) {
            const { data: newClient, error: clientError } = await supabase
                .from('clients')
                .insert({
                    name: xmlHeader.client,
                    user_id: user.id
                })
                .select('id')
                .single();
            
            if (clientError) {
                toast.error(`Erro ao criar cliente: ${clientError.message}`);
                setIsSavingToDb(false);
                return;
            }
            clientId = newClient.id;
        }

        const { data, error } = await supabase.from('projects').insert({
            name: xmlHeader.name, // NOME DA OBRA
            project_code: xmlHeader.obra, // NÚMERO DA OBRA
            client: xmlHeader.client, // NOME DO CLIENTE
            user_id: user.id,
            status: 'Programar',
        }).select('id, name, project_code').single();

        setIsSavingToDb(false);
        setShowNewProjectModal(false);

        if (error || !data) {
            toast.error(`Erro ao criar projeto: ${error?.message}`);
            return;
        }
        
        toast.success(`Projeto "${xmlHeader.name}" criado com sucesso!`);
        
        await fetchProjects();
        setSelectedProjectId(data.id);
    }, [user, xmlHeader, selectedClientId, clientsList, fetchProjects]);

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
                    <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Importação de Peças XML</h1>
                    <p className="mt-3 text-base sm:text-lg text-text-secondary">Carregue arquivos .xml do Tekla para importar as peças de um projeto.</p>
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

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-8">
                        {error}
                    </div>
                )}

                {xmlHeader && (
                    <div className="space-y-8 animate-fade-in">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informações do XML</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <Label>Número da Obra</Label>
                                    <p className="font-medium">{xmlHeader.obra}</p>
                                </div>
                                <div>
                                    <Label>Nome da Obra</Label>
                                    <p className="font-medium">{xmlHeader.name}</p>
                                </div>
                                <div>
                                    <Label>Cliente</Label>
                                    <p className="font-medium">{xmlHeader.client}</p>
                                </div>
                                <div>
                                    <Label>Engenheiro Responsável</Label>
                                    <p className="font-medium">{xmlHeader.engineer || 'Não informado'}</p>
                                </div>
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
                                        <Select 
                                            value={selectedProjectId || ''} 
                                            onValueChange={setSelectedProjectId}
                                            disabled={!user || isLoading || isSavingToDb}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um projeto" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {projectsList
                                                    .filter(p => p.project_code === xmlHeader.obra)
                                                    .map(p => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.name} ({p.project_code})
                                                        </SelectItem>
                                                    ))
                                                }
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button 
                                        onClick={handleSaveRequest} 
                                        disabled={isSavingToDb || !selectedProjectId || !user || selectedPieces.size === 0}
                                    >
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
                        <DialogDescription>
                            O número da obra "{xmlHeader?.obra}" não foi encontrado. 
                            O sistema tentará criar um novo projeto com as informações do XML.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewProjectModal(false)}>Cancelar</Button>
                        <Button onClick={handleCreateNewProject} disabled={isSavingToDb}>
                            {isSavingToDb ? 'Criando...' : 'Criar Projeto'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Importação</DialogTitle>
                        <DialogDescription>
                            Isso adicionará {selectedPieces.size} novas peças ao projeto. 
                            As peças existentes não serão alteradas. Deseja continuar?
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

export default XMLImport;