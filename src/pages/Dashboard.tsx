import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Search, Loader2, AlertTriangle, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

interface Project {
  id: string;
  name: string;
  project_code: string;
  client: string;
  status: string;
  total_volume: number;
  created_at: string;
}

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setError('Falha ao carregar projetos. Tente novamente mais tarde.');
        console.error('Error fetching projects:', error);
      } else {
        setProjects(data as Project[]);
      }
      setLoading(false);
    };

    fetchProjects();
  }, []);

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectToDelete.id);

    if (error) {
      alert(`Erro ao excluir o projeto: ${error.message}`);
      console.error('Error deleting project:', error);
    } else {
      setProjects(projects.filter(p => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    }
    setIsDeleting(false);
  };

  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects;
    return projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.project_code && project.project_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (project.client && project.client.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [projects, searchTerm]);

  const getStatusVariant = (status: string | null): 'default' | 'success' | 'secondary' | 'destructive' | 'outline' => {
    if (!status) return 'outline';
    switch (status.toLowerCase()) {
      case 'em andamento':
        return 'default';
      case 'concluído':
        return 'success';
      case 'programar':
        return 'secondary';
      case 'cancelado':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-red-50 text-red-700 rounded-lg p-4">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <p className="font-semibold">{error}</p>
        </div>
      );
    }

    if (filteredProjects.length === 0) {
      return (
        <div className="text-center py-16 text-gray-500">
          <h3 className="text-xl font-semibold">Nenhum projeto encontrado</h3>
          <p className="mt-2">
            {searchTerm 
              ? 'Tente ajustar sua busca ou crie um novo projeto.' 
              : 'Comece criando um novo projeto para vê-lo aqui.'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(project => (
          <Card key={project.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="truncate">{project.name}</CardTitle>
              <div className="text-sm text-gray-500">
                {project.project_code || 'Sem código'}
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-2 text-sm">
                <p><strong>Cliente:</strong> {project.client || 'Não informado'}</p>
                <p><strong>Volume Total:</strong> {project.total_volume ? `${project.total_volume.toFixed(2)} m³` : 'N/A'}</p>
                <p className="flex items-center gap-2">
                  <strong>Status:</strong> <Badge variant={getStatusVariant(project.status)}>{project.status || 'Não definido'}</Badge>
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/project/${project.id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setProjectToDelete(project)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Meus Projetos</h1>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Buscar projetos..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Link to="/new-project">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Projeto
            </Button>
          </Link>
        </div>
      </header>

      <main>
        {renderContent()}
      </main>

      <DeleteConfirmationModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleDeleteProject}
        projectName={projectToDelete?.name || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default Dashboard;