import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';

const NewProject = () => {
  const [name, setName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        setError('Você precisa estar logado para criar um projeto.');
        setLoading(false);
        return;
    }

    const { error: insertError } = await supabase
      .from('projects')
      .insert({ 
        name, 
        project_code: projectCode, 
        client, 
        description,
        user_id: user.id,
        status: 'Programar'
      });

    if (insertError) {
      setError('Falha ao criar o projeto. Tente novamente.');
      console.error('Error creating project:', insertError);
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-2xl">
      <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome do Projeto</label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="projectCode" className="block text-sm font-medium text-gray-700 mb-1">Código do Projeto</label>
              <Input id="projectCode" value={projectCode} onChange={(e) => setProjectCode(e.target.value)} />
            </div>
            <div>
              <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <Input id="client" value={client} onChange={(e) => setClient(e.target.value)} />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Projeto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewProject;