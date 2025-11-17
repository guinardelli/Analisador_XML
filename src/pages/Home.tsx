import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/components/SessionContextProvider';

const Home = () => {
    const { user } = useSession();

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Página Inicial</h1>
                    <p className="mt-3 text-base sm:text-lg text-text-secondary">Bem-vindo(a) de volta ao sistema!</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Sessão Ativa</CardTitle>
                        <CardDescription>Você está autenticado no sistema.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {user ? (
                            <div>
                                <p className="text-text-secondary">Logado como:</p>
                                <p className="font-medium text-text-primary text-lg">{user.email}</p>
                            </div>
                        ) : (
                            <p className="text-text-secondary">Carregando informações do usuário...</p>
                        )}
                         <p className="text-sm text-text-subtle mt-6">Utilize o menu lateral para navegar entre as funcionalidades do sistema.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Home;