import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Save, 
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const CadastroCliente = () => {
    const { user } = useSession();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            setError('Você precisa estar logado para cadastrar um cliente.');
            return;
        }
        
        // Validação básica
        if (!formData.name.trim()) {
            setError('O nome do cliente é obrigatório.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const { error: insertError } = await supabase
                .from('clients')
                .insert([
                    {
                        name: formData.name,
                        email: formData.email || null,
                        phone: formData.phone || null,
                        address: formData.address || null,
                        user_id: user.id
                    }
                ]);
            
            if (insertError) throw insertError;
            
            // Redirecionar para a lista de clientes após cadastro
            navigate('/clientes', { 
                state: { 
                    message: `Cliente "${formData.name}" cadastrado com sucesso!` 
                } 
            });
        } catch (err) {
            console.error('Erro ao cadastrar cliente:', err);
            setError('Ocorreu um erro ao cadastrar o cliente. Por favor, tente novamente.');
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
                            onClick={() => navigate('/clientes')}
                            className="mb-4"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar para Clientes
                        </Button>
                        <h1 className="text-3xl font-bold text-text-primary">Cadastro de Cliente</h1>
                        <p className="text-text-secondary mt-2">
                            Preencha as informações do novo cliente
                        </p>
                    </div>
                    <div className="bg-primary w-12 h-12 rounded-lg flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary-foreground" />
                    </div>
                </div>

                <Card className="border border-border-default">
                    <CardHeader>
                        <CardTitle>Informações do Cliente</CardTitle>
                        <CardDescription>
                            Preencha todos os campos obrigatórios para cadastrar um novo cliente
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
                                    <Label htmlFor="name">Nome do Cliente *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Nome completo do cliente"
                                        required
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telefone</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="address">Endereço</Label>
                                    <Input
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Endereço completo"
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
                                            Cadastrar Cliente
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

export default CadastroCliente;