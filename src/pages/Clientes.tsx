import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Building, 
  Plus, 
  Search, 
  Calendar,
  MapPin,
  Trash2,
  AlertCircle
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  project_code: string;
  address: string | null;
  start_date: string | null;
  status: string;
  total_volume: number | null;
}

const Clientes = () => {
    const { user } = useSession();
    const navigate = useNavigate();
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<{[key: string]: Project[]}>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [expandedClient, setExpandedClient] = useState<string | null>(null);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

    useEffect(() => {
        fetchClients();
    }, [user]);

    const fetchClients = async () => {
        if (!user) return;
        
        setIsLoading(true);
        
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .order('name');
            
            if (error) throw error;
            
            setClients(data || []);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchClientProjects = async (clientId: string) => {
        try {
            // Buscar projetos associados ao cliente pelo nome
            const client = clients.find(c => c.id === clientId);
            if (!client) return;

            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user?.id)
                .eq('client', client.name)
                .order('name');
            
            if (error) throw error;
            
            setProjects(prev => ({
                ...prev,
                [clientId]: data || []
            }));
        } catch (error) {
            console.error('Erro ao buscar projetos do cliente:', error);
        }
    };

    const toggleClientDetails = async (clientId: string) => {
        if (expandedClient === clientId) {
            setExpandedClient(null);
        } else {
            setExpandedClient(clientId);
            // Buscar projetos apenas se ainda não foram carregados
            if (!projects[clientId]) {
                await fetchClientProjects(clientId);
            }
        }
    };

    const handleDeleteClient = (client: Client) => {
        setClientToDelete(client);
        setDeleteConfirmationInput('');
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteClient = async () => {
        if (!clientToDelete || deleteConfirmationInput !== clientToDelete.name) {
            return;
        }

        try {
            // Verificar se o cliente tem projetos associados
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('id')
                .eq('user_id', user?.id)
                .eq('client', clientToDelete.name);

            if (projectsError) throw projectsError;

            if (projectsData && projectsData.length > 0) {
                // Se tiver projetos, não permitir exclusão
                alert('Não é possível excluir um cliente que possui projetos associados. Exclua os projetos primeiro.');
                return;
            }

            // Excluir o cliente
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientToDelete.id);

            if (error) throw error;

            // Atualizar a lista de clientes
            setClients(clients.filter(c => c.id !== clientToDelete.id));
            setIsDeleteDialogOpen(false);
            setClientToDelete(null);
        } catch (error) {
            console.error('Erro ao excluir cliente:', error);
            alert('Erro ao excluir cliente. Por favor, tente novamente.');
        }
    };

    const filteredClients = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'andamento': return 'bg-blue-100 text-blue-800';
            case 'concluido': return 'bg-green-100 text-green-800';
            case 'pausado': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'andamento': return 'Em Andamento';
            case 'concluido': return 'Concluído';
            case 'pausado': return 'Pausado';
            case 'planejamento': return 'Planejamento';
            default: return status;
        }
    };

    const formatNumber = (num: number | null | undefined, decimals: number = 2) => {
        if (num === null || num === undefined) return 'N/A';
        return num.toLocaleString('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">Clientes</h1>
                        <p className="text-text-secondary mt-2">
                            Gerencie seus clientes e visualize os projetos associados
                        </p>
                    </div>
                    <Button onClick={() => navigate('/cadastro-cliente')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Cliente
                    </Button>
                </div>

                <Card className="border border-border-default mb-8">
                    <CardContent className="p-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-text-subtle" />
                            <Input
                                placeholder="Buscar clientes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : filteredClients.length === 0 ? (
                    <Card className="border border-border-default text-center py-12">
                        <CardContent>
                            <Users className="h-12 w-12 text-text-subtle mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-text-primary mb-2">Nenhum cliente cadastrado</h3>
                            <p className="text-text-secondary mb-4">
                                {searchTerm ? 'Nenhum cliente encontrado com esse termo de busca.' : 'Cadastre seu primeiro cliente para começar.'}
                            </p>
                            <Button onClick={() => navigate('/cadastro-cliente')}>
                                <Plus className="h-4 w-4 mr-2" />
                                Cadastrar Cliente
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {filteredClients.map((client) => (
                            <Card 
                                key={client.id} 
                                className="border border-border-default hover:shadow-md transition-shadow"
                            >
                                <CardContent className="p-0">
                                    <div 
                                        className="p-6 cursor-pointer flex items-center justify-between"
                                        onClick={() => toggleClientDetails(client.id)}
                                    >
                                        <div className="flex items-center">
                                            <div className="bg-primary w-12 h-12 rounded-full flex items-center justify-center mr-4">
                                                <span className="text-primary-foreground font-bold">
                                                    {client.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-text-primary text-lg">{client.name}</h3>
                                                {client.email && (
                                                    <p className="text-text-secondary">{client.email}</p>
                                                )}
                                                {client.phone && (
                                                    <p className="text-text-secondary">{client.phone}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {projects[client.id] && (
                                                <span className="text-sm text-text-subtle mr-4">
                                                    {projects[client.id].length} projeto(s)
                                                </span>
                                            )}
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="mr-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleClientDetails(client.id);
                                                }}
                                            >
                                                {expandedClient === client.id ? 'Ocultar' : 'Ver'} Projetos
                                            </Button>
                                            <Button 
                                                variant="destructive" 
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClient(client);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {expandedClient === client.id && (
                                        <div className="border-t border-border-default p-6 bg-gray-50">
                                            <h4 className="font-medium text-text-primary mb-4">Projetos do Cliente</h4>
                                            
                                            {projects[client.id] && projects[client.id].length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {projects[client.id].map((project) => (
                                                        <Card key={project.id} className="border border-border-default">
                                                            <CardContent className="p-4">
                                                                <div className="flex items-start justify-between">
                                                                    <div>
                                                                        <h5 className="font-medium text-text-primary">{project.name}</h5>
                                                                        <p className="text-sm text-text-secondary mt-1">
                                                                            Código: {project.project_code}
                                                                        </p>
                                                                        {project.address && (
                                                                            <div className="flex items-center mt-2 text-sm text-text-secondary">
                                                                                <MapPin className="h-4 w-4 mr-1" />
                                                                                {project.address}
                                                                            </div>
                                                                        )}
                                                                        {project.start_date && (
                                                                            <div className="flex items-center mt-1 text-sm text-text-secondary">
                                                                                <Calendar className="h-4 w-4 mr-1" />
                                                                                {new Date(project.start_date).toLocaleDateString()}
                                                                            </div>
                                                                        )}
                                                                        {project.total_volume && (
                                                                            <div className="flex items-center mt-1 text-sm text-text-secondary">
                                                                                <span>Volume: {formatNumber(project.total_volume, 3)} m³</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
                                                                        {getStatusText(project.status)}
                                                                    </span>
                                                                </div>
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    className="w-full mt-4"
                                                                    onClick={() => navigate(`/projetos/${project.id}`)}
                                                                >
                                                                    <Building className="h-4 w-4 mr-2" />
                                                                    Ver Detalhes
                                                                </Button>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <Building className="h-12 w-12 text-text-subtle mx-auto mb-4" />
                                                    <p className="text-text-secondary">Nenhum projeto cadastrado para este cliente</p>
                                                    <Button 
                                                        variant="outline" 
                                                        className="mt-4"
                                                        onClick={() => navigate('/cadastro-projetos')}
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Cadastrar Projeto
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p>Tem certeza que deseja excluir o cliente <strong>{clientToDelete?.name}</strong>?</p>
                                    <p className="mt-2 text-sm text-text-secondary">
                                        Esta ação não pode ser desfeita. Todos os dados associados ao cliente serão permanentemente excluídos.
                                    </p>
                                    <p className="mt-3 text-sm font-medium">
                                        Para confirmar, digite o nome do cliente: <strong>{clientToDelete?.name}</strong>
                                    </p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Input
                            value={deleteConfirmationInput}
                            onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                            placeholder="Digite o nome do cliente para confirmar"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setClientToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmDeleteClient}
                            disabled={deleteConfirmationInput !== clientToDelete?.name}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Excluir Cliente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Clientes;