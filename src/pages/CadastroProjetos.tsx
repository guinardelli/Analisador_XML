import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building, 
  Calendar, 
  MapPin, 
  FileText, 
  Save, 
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const CadastroProjetos = () => {
    const { user } = useSession();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: '',
        start_date: '',
        end_date: '',
        client: '',
        status: 'planejamento'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            setError('Você precisa estar logado para cadastrar um projeto.');
            return;
        }
        
        // Validação básica
        if (!formData.name.trim()) {
            setError('O nome do projeto é obrigatório.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const { error: insertError } = await supabase
                .from('projects')
                .insert([
                    {
                        name: formData.name,
                        description: formData.description,
                        location: formData.location,
                        start_date: formData.start_date,
                        end_date: formData.end_date,
                        client: formData.client,
                        status: formData.status,
                        user_id: user.id
                    }
                ]);
            
            if (insertError) throw insertError;
            
            // Redirecionar para a lista de projetos após cadastro
            navigate('/projetos', { 
                state: { 
                    message: `Projeto "${formData.name}" cadastrado com sucesso!` 
                } 
            });
        } catch (err) {
            console.error('Erro ao cadastrar projeto:', err);
            setError('Ocorreu um erro ao cadastrar o projeto. Por favor, tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button 
                            variant="outline" 
                            onClick={() => navigate('/projetos')}
                            className="mb-4"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar para Projetos
                        </Button>
                        <h1 className="text-3xl font-bold text-text-primary">Cadastro de Projeto</h1>
                        <p className="text-text-secondary mt-2">
                            Preencha as informações do novo projeto
                        </p>
                    </div>
                    <div className="bg-primary w-12 h-12 rounded-lg flex items-center justify-center">
                        <Building className="h-6 w-6 text-primary-foreground" />
                    </div>
                </div>

                <Card className="border border-border-default">
                    <CardHeader>
                        <CardTitle>Informações do Projeto</CardTitle>
                        <CardDescription>
                            Preencha todos os campos obrigatórios para cadastrar um novo projeto
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <Alert variant="destructive" className="mb-6">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Erro</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome do Projeto *</Label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-3 h-4 w-4 text-text-subtle" />
                                        <Input
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Nome do projeto"
                                            className="pl-10"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="client">Cliente</Label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-3 h-4 w-4 text-text-subtle" />
                                        <Input
                                            id="client"
                                            name="client"
                                            value={formData.client}
                                            onChange={handleChange}
                                            placeholder="Nome do cliente"
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="location">Localização</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-text-subtle" />
                                        <Input
                                            id="location"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleChange}
                                            placeholder="Cidade, Estado"
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <select
                                        id="status"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="planejamento">Planejamento</option>
                                        <option value="andamento">Em Andamento</option>
                                        <option value="pausado">Pausado</option>
                                        <option value="concluido">Concluído</option>
                                    </select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">Data de Início</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-text-subtle" />
                                        <Input
                                            id="start_date"
                                            name="start_date"
                                            type="date"
                                            value={formData.start_date}
                                            onChange={handleChange}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="end_date">Data de Término</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-text-subtle" />
                                        <Input
                                            id="end_date"
                                            name="end_date"
                                            type="date"
                                            value={formData.end_date}
                                            onChange={handleChange}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 h-4 w-4 text-text-subtle" />
                                    <Textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Descrição detalhada do projeto"
                                        className="pl-10"
                                        rows={4}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-end pt-4">
                                <Button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full sm:w-auto"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Cadastrar Projeto
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
                
                <div className="mt-8 text-center text-sm text-text-subtle">
                    <p>Os campos marcados com * são obrigatórios</p>
                </div>
            </div>
        </div>
    );
};

export default CadastroProjetos;