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
    name: string;
    project_code: string;
    client: string;
}

interface Client {
    id: string;
    name: string;
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
    // Tentar decodificar o XML primeiro, se falhar usar o string original
    let decodedXmlString = xmlString;
    try {
        decodedXmlString = decodeURIComponent(escape(xmlString));
    } catch (e) {
        // Se falhar, usar o string original
        console.warn('Falha ao decodificar XML, usando string original');
    }
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(decodedXmlString, "application/xml");
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) throw new Error('Erro ao analisar o XML. Verifique o formato do arquivo.');
    
    const root = xmlDoc.querySelector('DETALHAMENTOTEKLA');
    if (!root) throw new Error('Elemento raiz <DETALHAMENTOTEKLA> não encontrado.');

    const header: XmlHeader = {
        obra: root.getAttribute('obra') || '',
        name: root.getAttribute('name') || '',
        client: root.getAttribute('cliente') || '',
        engineer: root.getAttribute('projetista') || '',
    };

    if (!header.obra || !header.name || !header.client) {
        throw new Error('O arquivo XML precisa conter "obra" (Número da Obra), "name" (Nome da Obra) e "cliente" (Nome do Cliente) no cabeçalho.');
    }

    const pieceElements = Array.from(xmlDoc.querySelectorAll('PECA'));
    if (pieceElements.length === 0) throw new Error('Nenhuma peça <PECA> encontrada no arquivo.');

    return {
        header,
        pieces: pieceElements.map(p => ({
            name: getElementTextContent(p, 'NOMEPECA'),
            group: getElementTextContent(p, 'TIPOPRODUTO'),
            quantity: parseInt(getElementTextContent(p, 'QUANTIDADE'), 10) || 0,
            section: getElementTextContent(p, 'SECAO'),
            length: parseSafeFloat(getElementTextContent(p, 'COMPRIMENTO')),
            weight: parseSafeFloat(getElementTextContent(p, 'PESO')),
            unit_volume: parseSafeFloat(getElementTextContent(p, 'VOLUMEUNITARIO')),
            concrete_class: getElementTextContent(p, 'CLASSECONCRETO'),
            piece_ids: Array.from(p.querySelectorAll('LISTAID ID')).map(id => id.textContent || '').filter(Boolean),
        }))
    };
};

// --- MAIN APP COMPONENT ---
const ImportacaoXML = () => {
    const { user } = useSession();
    const navigate = useNavigate();

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [fileInfoText, setFileInfoText] = useState<string>('');
    const [xmlHeader, setXmlHeader] = useState<XmlHeader | null>(null);
    const [parsedPieces, setParsedPieces] = useState<PieceFromXml[]>([]);
    const [selectedPieces, setSelectedPieces] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    
    const [projectsList, setProjectsList] = useState<Project[]>([]);
    const [clientsList, setClientsList] = useState<Client[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    const [existingClient, setExistingClient] = useState<Client | null>(null);

    const fetchProjectsAndClients = useCallback(async () => {
        if (!user) return;
        
        try {
            // Buscar projetos
            const { data: projects, error: projError } = await supabase
                .from('projects')
                .select('id, name, project_code, client')
                .eq('user_id', user.id);
            
            if (projError) {
                console.error('Erro ao carregar projetos:', projError);
                toast.error('Falha ao carregar projetos.');
            } else {
                setProjectsList(projects || []);
            }

            // Buscar clientes
            const { data: clients, error: clientError } = await supabase
                .from('clients')
                .select('id, name')
                .eq('user_id', user.id);
            
            if (clientError) {
                console.error('Erro ao carregar clientes:', clientError);
                toast.error('Falha ao carregar clientes.');
            } else {
                setClientsList(clients || []);
            }
        } catch (err) {
            console.error('Erro inesperado ao carregar dados:', err);
            toast.error('Erro ao carregar dados do sistema.');
        }
    }, [user]);

    useEffect(() => {
        fetchProjectsAndClients();
    }, [fetchProjectsAndClients]);

    const resetState = () => {
        setParsedPieces([]);
        setSelectedPieces(new Set());
        setXmlHeader(null);
        setSelectedProjectId(null);
        setError('');
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files ? Array.from(event.target.files) : [];
        setSelectedFiles(files);
        setFileInfoText(files.length === 1 ? files[0].name : `${files.length} arquivos selecionados`);
        resetState();
    };

    const handleProcessFiles = async () => {
        if (selectedFiles.length === 0) return;
        setIsLoading(true);
        resetState();

        try {
            const fileReadPromises = selectedFiles.map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const content = e.target?.result as string;
                        if (content) {
                            resolve(content);
                        } else {
                            reject(new Error('Falha ao ler o arquivo'));
                        }
                    };
                    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
                    reader.readAsText(file, 'ISO-8859-1'); // Especificar encoding
                });
            });

            const xmlStrings = await Promise.all(fileReadPromises);

            let combinedHeader: XmlHeader | null = null;
            const allPieces: PieceFromXml[] = [];
            for (const xmlString of xmlStrings) {
                const { header, pieces } = parseSingleXml(xmlString);
                if (!combinedHeader) combinedHeader = header;
                allPieces.push(...pieces);
            }

            if (!combinedHeader) throw new Error("Nenhum cabeçalho válido encontrado.");

            setXmlHeader(combinedHeader);
            setParsedPieces(allPieces);
            setSelectedPieces(new Set(allPieces.map(p => p.name)));

            const existingProject = projectsList.find(p => p.project_code === combinedHeader!.obra);
            if (existingProject) {
                if (existingProject.client.toLowerCase() !== combinedHeader.client.toLowerCase()) {
                    setError(`Conflito: A obra ${existingProject.project_code} já existe e pertence ao cliente "${existingProject.client}".`);
                    return;
                }
                setSelectedProjectId(existingProject.id);
                toast.success(`Projeto "${existingProject.name}" encontrado e selecionado.`);
            } else {
                const client = clientsList.find(c => c.name.toLowerCase() === combinedHeader!.client.toLowerCase());
                setExistingClient(client || null);
                setIsNewProjectModalOpen(true);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.');
            console.error('Erro ao processar arquivos:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateProject = async () => {
        if (!user || !xmlHeader) return;
        setIsSaving(true);

        try {
            let clientId = existingClient?.id;

            // Create client if it doesn't exist
            if (!clientId) {
                const { data: newClient, error: clientError } = await supabase
                    .from('clients')
                    .insert({ name: xmlHeader.client, user_id: user.id })
                    .select('id')
                    .single();
                
                if (clientError) {
                    toast.error(`Erro ao criar novo cliente: ${clientError.message}`);
                    setIsSaving(false);
                    return;
                }
                clientId = newClient?.id;
            }

            // Create project
            const { data: newProject, error: projectError } = await supabase
                .from('projects')
                .insert({
                    name: xmlHeader.name,
                    project_code: xmlHeader.obra,
                    client: xmlHeader.client,
                    user_id: user.id,
                    status: 'Programar',
                })
                .select('id')
                .single();

            if (projectError) {
                toast.error(`Erro ao criar projeto: ${projectError.message}`);
                setIsSaving(false);
                return;
            }

            toast.success(`Projeto "${xmlHeader.name}" criado com sucesso!`);
            await fetchProjectsAndClients();
            setSelectedProjectId(newProject?.id || null);
            setIsNewProjectModalOpen(false);
        } catch (err) {
            console.error('Erro inesperado ao criar projeto:', err);
            toast.error('Erro inesperado ao criar projeto.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!user || !selectedProjectId || selectedPieces.size === 0) return;
        
        setIsConfirmModalOpen(false);
        setIsSaving(true);

        try {
            const piecesToInsert = parsedPieces.filter(p => selectedPieces.has(p.name));

            const { error } = await supabase.rpc('replace_project_pieces', {
                p_project_id: selectedProjectId,
                p_user_id: user.id,
                p_pieces: piecesToInsert,
            });

            if (error) {
                toast.error(`Erro ao importar peças: ${error.message}`);
            } else {
                toast.success('Peças importadas com sucesso para o projeto!');
                navigate(`/projetos/${selectedProjectId}`);
            }
        } catch (err) {
            console.error('Erro inesperado ao salvar:', err);
            toast.error('Erro inesperado ao salvar peças.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleSelectAll = () => {
        setSelectedPieces(prev => 
            prev.size === parsedPieces.length ? new Set() : new Set(parsedPieces.map(p => p.name))
        );
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Importar Peças de XML</h1>
                    <p className="mt-3 text-base sm:text-lg text-text-secondary">Carregue arquivos .xml do Tekla para cadastrar ou atualizar as peças de um projeto.</p>
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

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-8">{error}</div>}

                {xmlHeader && (
                    <div className="space-y-8 animate-fade-in">
                        <Card>
                            <CardHeader><CardTitle>Informações do XML</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div><Label>Nº da Obra</Label><p>{xmlHeader.obra}</p></div>
                                <div><Label>Nome da Obra</Label><p>{xmlHeader.name}</p></div>
                                <div><Label>Cliente</Label><p>{xmlHeader.client}</p></div>
                                <div><Label>Engenheiro</Label><p>{xmlHeader.engineer}</p></div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Vincular ao Projeto</CardTitle>
                                <CardDescription>As peças selecionadas serão importadas para o projeto correspondente.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex-grow">
                                    <Label htmlFor="project-select">Projeto de Destino</Label>
                                    <Input 
                                        id="project-select" 
                                        value={selectedProjectId ? projectsList.find(p => p.id === selectedProjectId)?.name || '' : 'Nenhum projeto selecionado'}
                                        readOnly
                                        className="mt-1"
                                    />
                                </div>
                                <Button onClick={() => setIsConfirmModalOpen(true)} disabled={isSaving || !selectedProjectId || selectedPieces.size === 0} className="w-full md:w-auto mt-4 md:mt-0">
                                    {isSaving ? 'Salvando...' : `Importar ${selectedPieces.size} Tipos de Peças`}
                                </Button>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Peças Encontradas no XML</CardTitle>
                                <CardDescription>{selectedPieces.size} de {parsedPieces.length} tipos de peças selecionados para importação.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto border rounded-lg max-h-96">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="p-2 w-12 text-center">
                                                    <input type="checkbox" className="h-4 w-4" checked={selectedPieces.size === parsedPieces.length && parsedPieces.length > 0} onChange={handleToggleSelectAll} />
                                                </th>
                                                <th className="p-2 text-left font-medium">Nome da Peça</th>
                                                <th className="p-2 text-left font-medium">Tipo</th>
                                                <th className="p-2 text-center font-medium">Qtd. Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {parsedPieces.map(piece => (
                                                <tr key={piece.name} className="hover:bg-slate-50">
                                                    <td className="p-2 w-12 text-center">
                                                        <input type="checkbox" className="h-4 w-4" checked={selectedPieces.has(piece.name)} onChange={() => setSelectedPieces(prev => { const next = new Set(prev); next.has(piece.name) ? next.delete(piece.name) : next.add(piece.name); return next; })} />
                                                    </td>
                                                    <td className="p-2 font-semibold">{piece.name}</td>
                                                    <td className="p-2">{piece.group}</td>
                                                    <td className="p-2 text-center">{piece.quantity}</td>
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

            <Dialog open={isNewProjectModalOpen} onOpenChange={setIsNewProjectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Projeto Não Encontrado</DialogTitle>
                        <DialogDescription>
                            A obra com o número "{xmlHeader?.obra}" não foi encontrada.
                            {existingClient ? ` O cliente "${existingClient.name}" já existe.` : ` O cliente "${xmlHeader?.client}" também será criado.`}
                            <br/><br/>
                            Deseja criar este novo projeto?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewProjectModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateProject} disabled={isSaving}>
                            {isSaving ? 'Criando...' : 'Sim, Criar Projeto'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Importação</DialogTitle>
                        <DialogDescription>
                            Esta ação substituirá TODAS as peças existentes no projeto "{projectsList.find(p=>p.id === selectedProjectId)?.name}" pelas {selectedPieces.size} novas peças do arquivo. Esta ação não pode ser desfeita. Deseja continuar?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Importando...' : 'Sim, Substituir Peças'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ImportacaoXML;