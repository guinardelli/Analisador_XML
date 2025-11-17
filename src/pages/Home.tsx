import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '../components/SessionContextProvider';

const Home = () => {
  const { user } = useSession();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo!</CardTitle>
          <CardDescription>
            Você está logado como {user?.email}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Esta é a página inicial da sua aplicação.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;