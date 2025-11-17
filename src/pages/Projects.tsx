import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

interface Project {
  id: string;
  name: string;
  description: string;
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase.from('projects').select('*');
      if (error) {
        console.error('Erro ao buscar projetos:', error);
      } else if (data) {
        setProjects(data);
      }
      setLoading(false);
    };

    fetchProjects();
  }, []);

  if (loading) {
    return <div>Carregando projetos...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Projetos</h1>
      <ul className="space-y-2">
        {projects.map(project => (
          <li key={project.id} className="p-2 border rounded">
            <strong>{project.name}</strong>: {project.description}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Projects;