import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Edit, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import PiecesViewer from '@/components/PiecesViewer';

interface Project {
    id: string;
    name: string;
    project_code: string;
    client: string;
    description: string | null;
    status: string | null;
    address: string | null;
    area: number | null;
    art_number: string | null;
    total_volume: number | null;
    start_date: string | null;
    end_date: string | null;
}

interface Piece {
    name: string;
    group: string;
    quantity: number;
    section: string;
    length: number;
    weight: number | null;
    unit_volume: number;
    concrete_class: string | null;
    piece_ids: string[] | null;
}

const ProjectDetails = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [editableProject, setEditableProject] = useState<Partial<Project>>({});
    const [pieces, setPieces] = useState<Piece[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProjectData = useCallback(async () => {
        if (!projectId) return;

        setIsLoading(true);
        setError(null);

        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (projectError) {
            setError(`Erro ao buscar o projeto: ${projectError.message}`);
            setIsLoading(false);
            return;
        }
        
        setProject(projectData);
        setEditableProject(projectData);

        const { data: piecesData, error: piecesError } = await supabase
            .from('pieces')
            .select('*')
            .eq('project_id', projectId);

        if (piecesError) {
            toast.error(`Erro ao buscar as peças: ${piecesError.message}`);
        } else {
            setPieces(piecesData || []);
        }

        setIsLoading(false);
    }, [projectId]);

    useEffect(() => {
        fetchProjectData();
    }, [fetchProjectData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditableProject(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateProject = async () => {
        if (!projectId) return;

        setIsSaving(true);
        const { error: updateError } = await supabase
            .from('projects')
            .update({
                ...editableProject,
                area: editableProject.area ? parseFloat(String(editableProject.area)) : null,
            })
            .eq('id', projectId);

        setIsSaving(false);

        if (updateError) {
            toast.error(`Erro ao atualizar o projeto: ${updateError.message}`);
        } else {
            toast.success('Projeto atualizado com sucesso!');
            setIsEditing(false);
            fetchProjectData();
        }
    };

    const handleCancelEdit = () => {
        setEditableProject(project || {});
        setIsEditing(false);
    };

    if (isLoading) return <div className="p-8 text-center">Carregando detalhes do projeto...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
    if (!project) return <div className="p-8 text-center">Projeto não encontrado.</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <Link to="/projetos" className="flex items-center gap-2 text-primary hover:underline mb-6 font-medium">
                    <ArrowLeft size={18} />
                    Voltar para todos os projetos
                </Link>

                <Card>
                    <CardHeader className="flex flex-row justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl sm:text-3xl">{project.name}</CardTitle>
                            <CardDescription>{project.project_code}</CardDescription>
                        </div>
                        {!isEditing && (
                            <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-2"><Label htmlFor="client">Cliente</Label><Input id="client" name="client" value={editableProject.client || ''} onChange={handleInputChange} readOnly={!isEditing} /></div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    {isEditing ? (
                                        <select id="status" name="status" value={editableProject.status || ''} onChange={handleInputChange} className="w-full bg-surface border border-border-default rounded-md p-2 text-sm">
                                            <option value="Programar">Programar</option>
                                            <option value="Em Andamento">Em Andamento</option>
                                            <option value="Concluído">Concluído</option>
                                            <option value="Pausado">Pausado</option>
                                            <option value="Cancelado">Cancelado</option>
                                        </select>
                                    ) : (
                                        <Input value={editableProject.status || ''} readOnly />
                                    )}
                                </div>
                                <div className="space-y-2"><Label htmlFor="address">Endereço</Label><Input id="address" name="address" value={editableProject.address || ''} onChange={handleInputChange} readOnly={!isEditing} /></div>
                                <div className="space-y-2"><Label htmlFor="area">Área (m²)</Label><Input id="area" name="area" type="number" value={editableProject.area || ''} onChange={handleInputChange} readOnly={!isEditing} /></div>
                                <div className="space-y-2"><Label htmlFor="art_number">Nº ART</Label><Input id="art_number" name="art_number" value={editableProject.art_number || ''} onChange={handleInputChange} readOnly={!isEditing} /></div>
                                <div className="space-y-2"><Label htmlFor="total_volume">Volume Total (m³)</Label><Input id="total_volume" name="total_volume" type="number" value={editableProject.total_volume || ''} readOnly className="bg-slate-100 cursor-not-allowed" /></div>
                                <div className="space-y-2"><Label htmlFor="start_date">Data de Início</Label><Input id="start_date" name="start_date" type="date" value={editableProject.start_date || ''} onChange={handleInputChange} readOnly={!isEditing} /></div>
                                <div className="space-y-2"><Label htmlFor="end_date">Data de Término</Label><Input id="end_date" name="end_date" type="date" value={editableProject.end_date || ''} onChange={handleInputChange} readOnly={!isEditing} /></div>
                            </div>
                            {isEditing && (
                                <div className="flex justify-end pt-4 border-t border-border-default gap-3">
                                    <Button variant="ghost" onClick={handleCancelEdit} disabled={isSaving}>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancelar
                                    </Button>
                                    <Button onClick={handleUpdateProject} disabled={isSaving}>
                                        <Check className="h-4 w-4 mr-2" />
                                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {projectId && <PiecesViewer initialPieces={pieces} projectId={projectId} />}
            </div>
        </div>
    );
};

export default ProjectDetails;