import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
  isDeleting: boolean;
}

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, projectName, isDeleting }: DeleteConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Confirmar Exclusão</h2>
        <p className="mb-6">
          Você tem certeza que deseja excluir o projeto "<strong>{projectName}</strong>"? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmar Exclusão
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;