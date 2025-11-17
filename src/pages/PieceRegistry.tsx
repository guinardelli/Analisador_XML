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
import PiecesViewer from '@/components/PiecesViewer';

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
    return parseFloat(value.replace(',', '.')) || 0;
};

// --- PARSING LOGIC ---
const parseSingleXml = (xmlString: string): { header: XmlHeader; pieces: PieceFromXml[] } => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
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

    const pieces: PieceFromXml[] = pieceElements.map(p => ({
        name: getElementTextContent(p, 'NOMEPECA'),
        type: getElementTextContent(p, 'TIPOPRODUTO'),
        quantity: parseInt(getElementTextContent(p, 'QUANTIDADE'), 10) || 0,
        section: getElementTextContent(p, 'SECAO'),
        length: parseSafeFloat(getElementTextContent(p, 'COMPRIMENTO')),
        weight: parseSafeFloat(getElementTextContent(p, 'PESO')),
        unit_volume: parseSafeFloat(getElementTextContent(p, 'VOLUMEUNITARIO')),
        concreteClass: getElementTextContent(p, 'CLASSECONCRETO'),
    }));
    
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
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSavingToDb, setIsSavingToDb] = useState<boolean>(false);
    
    const [projectsList, setProjectsList] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [xmlProjectCode, setXmlProjectCode] = useState<string | null>(null);
    const [xmlProjectName, setXmlProjectName] = useState<string | null>(null);
    const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);
    const [currentProjectStatus, setCurrentProjectStatus] = useState<string | null>(null);

    useEffect(() => {
        const fetchProjects = async () => {
            if (!user) return;
            const { data, error } = await supabase.from('projects').select('*').eq('user_id', user.id).order('name');
            if (error) toast.error('Falha ao carregar a lista de projetos.');
            else setProjectsList(data || []);
        };
        fetchProjects();
    }, [user]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files ? Array.from(event.target.files) : [];
        if (files.length === 0) return;
        setSelectedFiles(files);
        setFileInfoText(files.length === 1 ? files[0].name : `${files.length} arquivos selecionados`);
        setParsedPieces([]);
        setXmlHeader(null);
        setSelectedProjectId(null);
        setXmlProjectCode(null);
        setXmlProjectName(null);
        setCurrentProjectStatus(null);
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
            const allPieces: PieceFromXml[] = [];
            for (const xmlString of xmlStrings) {
                const { header, pieces } = parseSingleXml(xmlString);
                if (!combinedHeader) combinedHeader = header;
                allPieces.push(...pieces);
            }

            if (!combinedHeader) throw new Error("Nenhum cabeçalho válido encontrado.");

            setXmlHeader(combinedHeader);
            setParsedPieces(allPieces.map(p => ({
                name: p.name,
                group: p.type,
                quantity: p.quantity,
                section: p.section,
                length: p.length,
                weight: p.weight,
                unit_volume: p.unit_volume,
                concrete_class: p.concreteClass,
            })));

            const existingProject = projectsList.find(p => p.project_code === combinedHeader!.obra);
            if (existingProject) {
                setSelectedProjectId(existingProject.id);
                setCurrentProjectStatus(existingProject.status);
                toast.success(`Projeto "${existingProject.name}" selecionado automaticamente.`);
            } else {
                setXmlProjectCode(combinedHeader.obra);
                setXmlProjectName(combinedHeader.name);
                setShowNewProjectModal(true);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.');
            setParsedPieces([]);
            setXmlHeader(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInsertPiecesToDb = useCallback(async (projectId: string) => {
        if (!user || parsedPieces.length === 0) return;
        setIsSavingToDb(true);
        
        const { error: deleteError } = await supabase.from('pieces').delete().eq('project_id', projectId);
        if (deleteError) {
            toast.error(`Erro ao limpar peças antigas: ${deleteError.message}`);
            setIsSavingToDb(false);
            return;
        }

        const piecesToInsert = parsedPieces.map(piece => ({ ...piece, project_id: projectId, user_id: user.id }));
        const { error: insertError } = await supabase.from('pieces').insert(piecesToInsert);
        if (insertError) {
            toast.error(`Erro ao salvar peças: ${insertError.message}`);
            setIsSavingToDb(false);
            return;
        }

        const totalProjectVolume = parsedPieces.reduce((sum, p) => sum + (p.unit_volume * p.quantity), 0);
        const { error: updateError } = await supabase.from('projects').update({ total_volume: totalProjectVolume }).eq('id', projectId);
        if (updateError) toast.error('Peças salvas, mas falha ao atualizar o volume do projeto.');

        toast.success('Peças salvas com sucesso no projeto!');
        navigate(`/projetos/${projectId}`);
        setIsSavingToDb(false);
    }, [user, parsedPieces, navigate]);

    const handleCreateNewProjectAndInsertPieces = useCallback(async () => {
        if (!user || !xmlProjectCode || !xmlProjectName) return;
        setIsSavingToDb(true);
        setShowNewProjectModal(false);

        const { data, error } = await supabase.from('projects').insert({
            name: xmlProjectName,
            project_code: xmlProjectCode,
            user_id: user.id,
            client: xmlHeader?.projetista || 'N/A',
            status: 'Programar',
        }).select('id').single();

        if (error || !data) {
            toast.error(`Erro ao criar projeto: ${error?.message}`);
            setIsSavingToDb(false);
            return;
        }
        
        toast.success(`Projeto "${xmlProjectName}" criado!`);
        await handleInsertPiecesToDb(data.id);
        setIsSavingToDb(false);

    }, [user, xmlProjectCode, xmlProjectName, xmlHeader, handleInsertPiecesToDb]);

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

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-8">{error}</div>}

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
                                <CardTitle>Associar Peças a um Projeto</CardTitle>
                                <CardDescription>Selecione um projeto existente ou crie um novo para salvar as peças processadas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                    <div className="space-y-2">
                                        <Label htmlFor="project-select">Projeto Existente</Label>
                                        <select id="project-select" className="w-full bg-surface border border-border-default rounded-md p-2 text-sm" value={selectedProjectId || ''} onChange={(e) => setSelectedProjectId(e.target.value)} disabled={!user || isLoading || isSavingToDb}>
                                            <option value="">Selecione um projeto</option>
                                            {projectsList.map(p => <option key={p.id} value={p.id}>{p.name} ({p.project_code})</option>)}
                                        </select>
                                    </div>
                                    <Button onClick={() => handleInsertPiecesToDb(selectedProjectId!)} disabled={isSavingToDb || !selectedProjectId || !user || parsedPieces.length === 0}>
                                        {isSavingToDb ? 'Salvando...' : 'Salvar Peças no Projeto Selecionado'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <PiecesViewer initialPieces={parsedPieces} />
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
                        <Button onClick={handleCreateNewProjectAndInsertPieces} disabled={isSavingToDb}>{isSavingToDb ? 'Criando...' : 'Sim, Criar Projeto'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PieceRegistry;