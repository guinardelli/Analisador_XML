import { Piece } from '@/types';

interface PiecesViewerProps {
  pieces: Piece[];
}

const PiecesViewer = ({ pieces }: PiecesViewerProps) => {
  if (pieces.length === 0) {
    return <p className="text-center text-gray-500 py-8">Nenhuma peça importada para este projeto ainda.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead className="bg-slate-100">
          <tr>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Nome</th>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Grupo</th>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Qtd.</th>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Seção</th>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Vol. Unit. (m³)</th>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Peso (kg)</th>
          </tr>
        </thead>
        <tbody>
          {pieces.map((piece) => (
            <tr key={piece.id} className="hover:bg-slate-50">
              <td className="py-2 px-4 border-b text-sm">{piece.name}</td>
              <td className="py-2 px-4 border-b text-sm">{piece.group}</td>
              <td className="py-2 px-4 border-b text-sm">{piece.quantity}</td>
              <td className="py-2 px-4 border-b text-sm">{piece.section}</td>
              <td className="py-2 px-4 border-b text-sm">{piece.unit_volume?.toFixed(3) || '0.000'}</td>
              <td className="py-2 px-4 border-b text-sm">{piece.weight?.toFixed(2) || '0.00'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PiecesViewer;