import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Edit, X, Check } from 'lucide-react';

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

interface ProjectSummaryCardProps {
    project: Project;
    isEditing: boolean;
    editableProject: Partial<Project>;
    onToggle: () => void;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isOpen: boolean;
}

const ProjectSummaryCard: React.FC<ProjectSummaryCardProps> = ({
    project,
    isEditing,
    editableProject,
    onToggle,
    onEdit,
    onSave,
    onCancel,
    isSaving,
    onChange,
    isOpen
}) => {
    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('pt-BR');
        } catch {
            return 'Data inválida';
        }
    };

    const formatNumber = (num: number | null, decimals: number = 2) => {
        if (num === null || num === undefined) return 'N/A';
        return num.toLocaleString('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    };

    return (
        <Card className="mb-6">
            <CardHeader className="py-3 px-4">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Informações do Projeto</CardTitle>
                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <Button variant="outline" size="sm" onClick={onEdit}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
                                    <X className="h-4 w-4" />
                                </Button>
                                <Button size="sm" onClick={onSave} disabled={isSaving}>
                                    <Check className="h-4 w-4 mr-2" />
                                    {isSaving ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </div>
                        )}
                        <Button variant="ghost" size="sm" onClick={onToggle} className="h-8 w-8 p-0">
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            {isOpen && (
                <CardContent className="px-4 py-3">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="client">Cliente</Label>
                                <Input 
                                    id="client" 
                                    name="client" 
                                    value={isEditing ? (editableProject.client || '') : (project.client || '')} 
                                    onChange={onChange} 
                                    readOnly={!isEditing} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Input 
                                    id="status" 
                                    name="status" 
                                    value={isEditing ? (editableProject.status || '') : (project.status || '')} 
                                    onChange={onChange} 
                                    readOnly={!isEditing} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="project_code">Código da Obra</Label>
                                <Input 
                                    id="project_code" 
                                    name="project_code" 
                                    value={project.project_code || ''} 
                                    readOnly 
                                    className="bg-background" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="art_number">Nº ART</Label>
                                <Input 
                                    id="art_number" 
                                    name="art_number" 
                                    value={isEditing ? (editableProject.art_number || '') : (project.art_number || '')} 
                                    onChange={onChange} 
                                    readOnly={!isEditing} 
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="address">Endereço</Label>
                                <Input 
                                    id="address" 
                                    name="address" 
                                    value={isEditing ? (editableProject.address || '') : (project.address || '')} 
                                    onChange={onChange} 
                                    readOnly={!isEditing} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Input 
                                    id="description" 
                                    name="description" 
                                    value={isEditing ? (editableProject.description || '') : (project.description || '')} 
                                    onChange={onChange} 
                                    readOnly={!isEditing} 
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="area">Área (m²)</Label>
                                <Input 
                                    id="area" 
                                    name="area" 
                                    type="number" 
                                    value={isEditing ? (editableProject.area || '') : (project.area || '')} 
                                    onChange={onChange} 
                                    readOnly={!isEditing} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="total_volume">Volume Total (m³)</Label>
                                <Input 
                                    id="total_volume" 
                                    name="total_volume" 
                                    type="number" 
                                    value={project.total_volume || ''} 
                                    readOnly 
                                    className="bg-background" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Data de Início</Label>
                                <Input 
                                    id="start_date" 
                                    name="start_date" 
                                    type="date" 
                                    value={isEditing ? (editableProject.start_date || '') : (project.start_date || '')} 
                                    onChange={onChange} 
                                    readOnly={!isEditing} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date">Data de Término</Label>
                                <Input 
                                    id="end_date" 
                                    name="end_date" 
                                    type="date" 
                                    value={isEditing ? (editableProject.end_date || '') : (project.end_date || '')} 
                                    onChange={onChange} 
                                    readOnly={!isEditing} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Duração</Label>
                                <Input 
                                    value={
                                        project.start_date && project.end_date 
                                            ? `${Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))} dias`
                                            : 'N/A'
                                    } 
                                    readOnly 
                                    className="bg-background" 
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
};

export default ProjectSummaryCard;