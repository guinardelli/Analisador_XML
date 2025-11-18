import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Trash2, Building, Activity, Package, LayoutGrid, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Project {
    id: string;
    name: string;
    description: string;
    project_code: string;
    client: string;
    status: string;
    total_volume: number;
    created_at: string;
}

const Projects = () => {
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

    useEffect(() => {
        const fetchProjects = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching projects:', error);
                    toast.error('Falha ao carregar os projetos.');
                } else {
                    setAllProjects(data || []);
                    setFilteredProjects(data || []);
                }
            }
            setLoading(false);
        };

        fetchProjects();
    }, []);

    useEffect(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        const filtered = allProjects.filter(project => {
            return (
                project.name.toLowerCase().includes(lowercasedFilter) ||
                (project.project_code && project.project_code.toLowerCase().includes(lowercasedFilter)) ||
                (project.client && project.client.toLowerCase().includes(lowercasedFilter))
            );
        });
        setFilteredProjects(filtered);
    }, [searchTerm, allProjects]);

    const handleDeleteRequest = (project: Project) => {
        setProjectToDelete(project);
        setDeleteConfirmationInput('');
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!projectToDelete || deleteConfirmationInput !== projectToDelete.name) {
            toast.error("O nome do projeto não corresponde.");
            return;
        }

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectToDelete.id);

        if (error) {
            toast.error('Erro ao excluir o projeto.');
            console.error('Error deleting project:', error);
        } else {
            toast.success(`Projeto "${projectToDelete.name}" excluído com sucesso!`);
            const updatedProjects = allProjects.filter(p => p.id !== projectToDelete.id);
            setAllProjects(updatedProjects);
            setFilteredProjects(updatedProjects);
        }
        
        setIsDeleteDialogOpen(false);
        setProjectToDelete(null);
    };

    if (loading) {
        return <div className="p-4">Carregando projetos...</div>;
    }

    return (
        <div className="p-4 md:p-8">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Meus Projetos</h1>
                    <p className="text-text-secondary mt-1">Visualize e gerencie todos os seus projetos.</p>
                </div>
                <Button asChild>
                    <Link to="/cadastro-projetos">Novo Projeto</Link>
                </Button>
            </div>

            <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-surface rounded-lg border">
                <Input 
                    placeholder="Filtrar por nome, código ou cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm w-full"
                />
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-secondary">Visualizar como:</span>
                    <Button variant={viewMode === 'card' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('card')}>
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('list')}>
                        <List className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {filteredProjects.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500">{searchTerm ? 'Nenhum projeto encontrado com os filtros aplicados.' : 'Nenhum projeto encontrado.'}</p>
                    {!searchTerm && (
                        <p className="mt-2">
                            <Link to="/cadastro-projetos" className="text-primary hover:underline">
                                Crie seu primeiro projeto
                            </Link>
                        </p>
                    )}
                </div>
            ) : viewMode === 'card' ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProjects.map(project => (
                        <Card key={project.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="hover:text-primary transition-colors">
                                    <Link to={`/projetos/${project.id}`}>{project.name}</Link>
                                </CardTitle>
                                <CardDescription>Código: {project.project_code || 'N/A'}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-3 text-sm text-text-secondary">
                                <div className="flex items-center gap-2">
                                    <Building className="h-4 w-4 text-text-subtle" />
                                    <span>{project.client || 'Cliente não informado'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-text-subtle" />
                                    <span>{project.status || 'Status não definido'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-text-subtle" />
                                    <span>Volume: {project.total_volume ? `${project.total_volume.toFixed(2)} m³` : 'N/A'}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">
                                    Criado em: {new Date(project.created_at).toLocaleString()}
                                </span>
                                <Button variant="destructive" size="icon" onClick={() => handleDeleteRequest(project)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-4 text-left font-semibold text-text-secondary">Nome do Projeto</th>
                                        <th className="p-4 text-left font-semibold text-text-secondary">Código</th>
                                        <th className="p-4 text-left font-semibold text-text-secondary">Cliente</th>
                                        <th className="p-4 text-left font-semibold text-text-secondary">Status</th>
                                        <th className="p-4 text-right font-semibold text-text-secondary">Volume (m³)</th>
                                        <th className="p-4 text-right font-semibold text-text-secondary">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredProjects.map(project => (
                                        <tr key={project.id} className="hover:bg-slate-50/50">
                                            <td className="p-4 font-medium text-text-primary">
                                                <Link to={`/projetos/${project.id}`} className="hover:underline">{project.name}</Link>
                                            </td>
                                            <td className="p-4 text-text-secondary">{project.project_code || 'N/A'}</td>
                                            <td className="p-4 text-text-secondary">{project.client || 'N/A'}</td>
                                            <td className="p-4 text-text-secondary">{project.status || 'N/A'}</td>
                                            <td className="p-4 text-right text-text-secondary">{project.total_volume ? project.total_volume.toFixed(2) : 'N/A'}</td>
                                            <td className="p-4 text-right">
                                                <Button variant="destructive" size="icon" onClick={() => handleDeleteRequest(project)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Exclusão</DialogTitle>
                        <DialogDescription>
                            Esta ação não pode ser desfeita. Para confirmar, digite <strong>{projectToDelete?.name}</strong> no campo abaixo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="delete-confirm">Nome do Projeto</Label>
                        <Input 
                            id="delete-confirm"
                            value={deleteConfirmationInput}
                            onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                            placeholder="Digite o nome do projeto"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDeleteConfirm}
                            disabled={deleteConfirmationInput !== projectToDelete?.name}
                        >
                            Excluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Projects;