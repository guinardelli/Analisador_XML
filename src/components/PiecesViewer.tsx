import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface Piece {
  id: string;
  name: string;
}

interface PiecesViewerProps {
  projectId: string;
}

const PiecesViewer = ({ projectId }: PiecesViewerProps) => {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pieceStatuses, setPieceStatuses] = useState<Map<string, boolean>>(new Map());
  const [, setIsStatusLoading] = useState(true);

  useEffect(() => {
    const fetchPieces = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('pieces')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        setError(error.message);
      } else {
        setPieces(data || []);
      }
      setIsLoading(false);
    };

    const fetchStatuses = async () => {
        setIsStatusLoading(true);
        // Lógica para buscar status aqui
        setIsStatusLoading(false);
    }

    if (projectId) {
        fetchPieces();
        fetchStatuses();
    }
  }, [projectId]);

  if (isLoading) return <div>Carregando peças...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold">Peças</h2>
      <ul>
        {pieces.map(piece => (
          <li key={piece.id}>{piece.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default PiecesViewer;