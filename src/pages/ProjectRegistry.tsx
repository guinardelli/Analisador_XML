import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';

const ProjectRegistry = () => {
    const { user } = useSession();
    const navigate = useNavigate();

    // State for all form fields
    const [projectName, setProjectName] = useState('');
    const [projectCode, setProjectCode] = useState('');
    const [clientName, setClientName] = useState('');
    const [status, setStatus] = useState('Programar');
    const [address, setAddress] = useState('');
    const [area, setArea] = useState('');
    const [artNumber, setArtNumber] = useState('');
    const [totalVolume, setTotalVolume] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearForm = () => {
        setProjectName('');
        setProjectCode('');
        setClientName('');
        setStatus('Programar');
        setAddress('');
        setArea('');
        setArtNumber('');
        setTotalVolume('');
        setStartDate('');
        setEndDate('');
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!projectName || !projectCode || !clientName) {
            setError('Nome do projeto, código e cliente são obrigatórios.');
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
                status,
                address: address || null,
                area: area ? parseFloat(area) : null,
                art_number: artNumber || null,
                total_volume: totalVolume ? parseFloat(totalVolume) : null,
                start_date: startDate || null,
                end_date: endDate || null,
            });

        setIsLoading(false);

        if (insertError) {
            setError(`Erro ao salvar o projeto: ${insertError.message}`);
        } else {
            clearForm();
            navigate('/projetos');
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Cadastro de Projetos</h1>
                    <p className="mt-3 text-base sm:text-lg text-text-secondary">Adicione um novo projeto ao sistema com todos os detalhes.</p>
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
                                    <Input id="projectName" placeholder="Ex: Edifício Residencial" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="projectCode">Código da Obra</Label>
                                    <Input id="projectCode" placeholder="Ex: TEK-001" value={projectCode} onChange={(e) => setProjectCode(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="clientName">Nome do Cliente</Label>
                                    <Input id="clientName" placeholder="Ex: Construtora Exemplo" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Input id="status" value={status} onChange={(e) => setStatus(e.target.value)} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="address">Endereço</Label>
                                    <Input id="address" placeholder="Ex: Rua das Flores, 123" value={address} onChange={(e) => setAddress(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="area">Área (m²)</Label>
                                    <Input id="area" type="number" placeholder="Ex: 1500.50" value={area} onChange={(e) => setArea(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="artNumber">Nº ART</Label>
                                    <Input id="artNumber" placeholder="Ex: 123456789" value={artNumber} onChange={(e) => setArtNumber(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="totalVolume">Volume Total (m³)</Label>
                                    <Input id="totalVolume" type="number" placeholder="Ex: 350.75" value={totalVolume} onChange={(e) => setTotalVolume(e.target.value)} />
                                </div>
                                <div className="space-y-2"></div> {/* Empty div for alignment */}
                                <div className="space-y-2">
                                    <Label htmlFor="startDate">Data de Início</Label>
                                    <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endDate">Data de Término</Label>
                                    <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                </div>
                            </div>
                            
                            {error && (
                                <p className="text-sm text-red-600 pt-2">{error}</p>
                            )}

                            <div className="flex justify-end pt-4 border-t border-border-default">
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