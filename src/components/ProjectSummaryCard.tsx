import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ProjectSummaryCardProps {
    project: {
        client: string;
        status: string;
        area: number | null;
        start_date: string | null;
        end_date: string | null;
        art_number: string | null;
        address: string | null;
    };
    isOpen: boolean;
    onToggle: () => void;
}

const ProjectSummaryCard: React.FC<ProjectSummaryCardProps> = ({ project, isOpen, onToggle }) => {
    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('pt-BR');
        } catch {
            return 'Data inválida';
        }
    };

    return (
        <Card className="mb-6">
            <CardHeader className="py-3 px-4">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Informações do Projeto</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onToggle} className="h-8 w-8 p-0">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </CardHeader>
            {isOpen && (
                <CardContent className="px-4 py-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div>
                            <p className="text-text-secondary">Cliente</p>
                            <p className="font-medium">{project.client || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-text-secondary">Status</p>
                            <p className="font-medium">{project.status || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-text-secondary">Área (m²)</p>
                            <p className="font-medium">{project.area ? project.area.toFixed(2) : 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-text-secondary">Data de Início</p>
                            <p className="font-medium">{formatDate(project.start_date)}</p>
                        </div>
                        <div>
                            <p className="text-text-secondary">Data de Término</p>
                            <p className="font-medium">{formatDate(project.end_date)}</p>
                        </div>
                        <div>
                            <p className="text-text-secondary">Nº ART</p>
                            <p className="font-medium">{project.art_number || 'N/A'}</p>
                        </div>
                        {project.address && (
                            <div className="md:col-span-2 lg:col-span-3">
                                <p className="text-text-secondary">Endereço</p>
                                <p className="font-medium">{project.address}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    );
};

export default ProjectSummaryCard;