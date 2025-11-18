import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Project, Piece } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import XMLImporter from '@/components/XMLImporter';
import PiecesViewer from '@/components/PiecesViewer';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectData = useCallback(async () => {
    if (!id) {
      setError("ID do projeto não fornecido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch project details
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (projectError || !projectData) {
      setError('Falha ao carregar os detalhes do projeto.');
      console.error('Error fetching project:', projectError);
      setLoading(false);
      return;
    }
    setProject(projectData);

    // Fetch project pieces
    const { data: piecesData, error: piecesError } = await supabase
      .from('pieces')
      .select('*')
      .eq('project_id', id);

    if (piecesError) {
      setError('Falha ao carregar as peças do projeto.');
      console.error('Error fetching pieces:', piecesError);
    } else {
      setPieces(piecesData || []);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto p-8 text-center">
        <div className="bg-red-50 text-red-700 rounded-lg p-6">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Projeto</h2>
          <p>{error || 'O projeto que você está procurando não foi encontrado.'}</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Voltar para Meus Projetos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Projetos
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">{project.name}</CardTitle>
          <p className="text-sm text-gray-500">{project.project_code}</p>
        </CardHeader>
        <CardContent>
          <p><strong>Cliente:</strong> {project.client || 'Não informado'}</p>
          <p><strong>Descrição:</strong> {project.description || 'Sem descrição'}</p>
          <p><strong>Volume Total:</strong> {project.total_volume ? `${project.total_volume.toFixed(2)} m³` : 'Não calculado'}</p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <XMLImporter projectId={project.id} onImportSuccess={fetchProjectData} />
        <Card>
          <CardHeader>
            <CardTitle>Peças do Projeto</CardTitle>
          </CardHeader>
          <CardContent>
            <PiecesViewer pieces={pieces} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectDetail;