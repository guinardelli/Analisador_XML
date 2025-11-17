import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ProjectRegistry = () => {
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
                        <form className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="projectName">Nome do Projeto</Label>
                                    <Input id="projectName" placeholder="Ex: Edifício Residencial" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="projectCode">Código da Obra</Label>
                                    <Input id="projectCode" placeholder="Ex: TEK-001" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="clientName">Nome do Cliente</Label>
                                <Input id="clientName" placeholder="Ex: Construtora Exemplo" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="designer">Projetista</Label>
                                <Input id="designer" placeholder="Ex: João da Silva" />
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button type="submit">Salvar Projeto</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProjectRegistry;