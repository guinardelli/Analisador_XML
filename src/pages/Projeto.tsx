import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Cuboid, Hash, Weight } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Define types for our data
interface Piece {
  id: string;
  name: string;
  group: string;
  quantity: number;
  section: string;
  length: number;
  weight: number;
  unit_volume: number;
  concrete_class: string;
}

interface Project {
  id: string;
  name: string;
  project_code: string;
  client: string;
  total_volume: number;
}

const Projeto = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (projectError) throw projectError;
        setProject(projectData);

        // Fetch pieces for the project
        const { data: piecesData, error: piecesError } = await supabase
          .from('pieces')
          .select('*')
          .eq('project_id', id);

        if (piecesError) throw piecesError;
        setPieces(piecesData || []);

      } catch (err: any) {
        setError(err.message);
        console.error("Erro ao buscar dados do projeto:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [id]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">Erro: {error}</div>;
  }

  if (!project) {
    return <div className="flex justify-center items-center h-screen">Projeto não encontrado.</div>;
  }

  // --- Data processing for charts ---
  const volumeByGroup = pieces.reduce((acc, piece) => {
    const group = piece.group || 'Sem Grupo';
    const pieceTotalVolume = piece.unit_volume * piece.quantity;
    acc[group] = (acc[group] || 0) + pieceTotalVolume;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = {
    labels: Object.keys(volumeByGroup),
    datasets: [
      {
        label: 'Volume por Grupo (m³)',
        data: Object.values(volumeByGroup),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const quantityByPiece = pieces.reduce((acc, piece) => {
    acc[piece.name] = piece.quantity;
    return acc;
  }, {} as Record<string, number>);

  const barChartData = {
    labels: Object.keys(quantityByPiece),
    datasets: [
      {
        label: 'Quantidade por Peça',
        data: Object.values(quantityByPiece),
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const totalPieces = pieces.reduce((sum, piece) => sum + piece.quantity, 0);
  const totalWeight = pieces.reduce((sum, piece) => sum + (piece.weight * piece.quantity), 0);


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{project.name}</h1>
        <p className="text-md text-gray-500">{project.project_code} - {project.client}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
            <Cuboid className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.total_volume?.toFixed(3) || '0.000'} m³</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantidade de Peças</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPieces}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso Total</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalWeight / 1000).toFixed(2)} t</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos Distintos</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(volumeByGroup).length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="resumo">Resumo (Filtrado)</TabsTrigger>
          <TabsTrigger value="detalhamento">Detalhamento das Peças</TabsTrigger>
          <TabsTrigger value="visualizacao">Visualização de Dados</TabsTrigger>
        </TabsList>
        
        <TabsContent value="resumo" className="mt-4">
           <Card>
            <CardHeader>
              <CardTitle>Resumo por Grupo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="text-right">Volume Total (m³)</TableHead>
                    <TableHead className="text-right">Percentual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(volumeByGroup).map(([group, volume]) => (
                    <TableRow key={group}>
                      <TableCell className="font-medium">{group}</TableCell>
                      <TableCell className="text-right">{volume.toFixed(3)}</TableCell>
                      <TableCell className="text-right">
                        {((volume / (project.total_volume || 1)) * 100).toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detalhamento" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Peças</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead>Seção</TableHead>
                      <TableHead className="text-right">Compr. (m)</TableHead>
                      <TableHead className="text-right">Peso (kg)</TableHead>
                      <TableHead className="text-right">Vol. Unit. (m³)</TableHead>
                      <TableHead>Classe Concreto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pieces.map((piece) => (
                      <TableRow key={piece.id}>
                        <TableCell className="font-medium">{piece.name}</TableCell>
                        <TableCell>{piece.group}</TableCell>
                        <TableCell className="text-right">{piece.quantity}</TableCell>
                        <TableCell>{piece.section}</TableCell>
                        <TableCell className="text-right">{piece.length?.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{piece.weight?.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{piece.unit_volume?.toFixed(4)}</TableCell>
                        <TableCell>{piece.concrete_class}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visualizacao" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Volume por Grupo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 md:h-80 flex items-center justify-center">
                  <Pie data={pieChartData} options={{ maintainAspectRatio: false }} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Quantidade por Tipo de Peça</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 md:h-80 flex items-center justify-center">
                  <Bar data={barChartData} options={{ maintainAspectRatio: false, indexAxis: 'y' }} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Projeto;