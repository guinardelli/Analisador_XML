import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';

const ProjectRegistry = () => {
    const [projectName, setProjectName] = useState('');
    const [projectCode, setProjectCode] = useState('');
    const [clientName, setClientName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useSession();
    const navigate = useNavigate();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!projectName || !projectCode || !clientName) {
            setError('Por favor, preencha todos os campos.');
            return;
        }
        if (!user) {
            setError('Você precisa estar logado para cadastrar um projeto.');
            return;
        }

        setIsLoading(true);
        setError(null);

        const { error: insertError } = await supabase
            .from('projects')
            .insert({
                name: projectName,
                project_code: projectCode,
                client: clientName,
                user_id: user.id,
            });

        setIsLoading(false);

        if (insertError) {
            setError(`Erro ao salvar o projeto: ${insertError.message}`);
        } else {
            // Limpa o formulário e navega para a lista de projetos
            setProjectName('');
            setProjectCode('');
            setClientName('');
            navigate('/projetos');
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Cadastro de Projetos</h1>
                    <p className="mt-3 text-base sm:text-lg text-text-secondary">Adicione um novo projeto ao sistema.</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Informações do Projeto</CardTitle>
                        <CardDescription>Preencha os campos abaixo para cadastrar um novo projeto.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="projectName">Nome do Projeto</Label>
                                    <Input id="projectName" placeholder="Ex: Edifício Residencial" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="projectCode">Código da Obra</Label>
                                    <Input id="projectCode" placeholder="Ex: TEK-001" value={projectCode} onChange={(e) => setProjectCode(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="clientName">Nome do Cliente</Label>
                                <Input id="clientName" placeholder="Ex: Construtora Exemplo" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                            </div>
                            
                            {error && (
                                <p className="text-sm text-red-600">{error}</p>
                            )}

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Salvando...' : 'Salvar Projeto'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProjectRegistry;