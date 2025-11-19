import React, { useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// --- TYPE DEFINITIONS ---
interface GroupedPiece {
    id: string; name: string; group: string; quantity: number; section: string; length: number; weight: number; unit_volume: number; concrete_class: string; piece_ids: string[] | null;
}
interface IndividualPiece {
    id: string; is_released: boolean;
}

interface PiecesListProps {
    groupedPieces: GroupedPiece[];
    individualPieces: IndividualPiece[]; // This is the filtered list of pieces
    onStatusChange: (pieceId: string, newStatus: boolean) => void;
    onDeleteGroup: (group: GroupedPiece) => void;
}

const PiecesList: React.FC<PiecesListProps> = ({
    groupedPieces,
    individualPieces,
    onStatusChange,
    onDeleteGroup,
}) => {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [groupToDelete, setGroupToDelete] = useState<GroupedPiece | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const toggleGroupExpansion = (groupId: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) newSet.delete(groupId);
            else newSet.add(groupId);
            return newSet;
        });
    };

    const handleDeleteRequest = (group: GroupedPiece) => {
        setGroupToDelete(group);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (groupToDelete) onDeleteGroup(groupToDelete);
        setIsDeleteConfirmOpen(false);
        setGroupToDelete(null);
    };

    const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => num.toLocaleString('pt-BR', options);

    if (groupedPieces.length === 0) {
        return (
            <div className="bg-surface rounded-xl shadow-md border border-border-default p-6 text-center mt-8">
                <p className="text-text-secondary">Nenhuma peça encontrada com os filtros aplicados.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {groupedPieces.map(group => {
                const isExpanded = expandedGroups.has(group.id);
                const piecesInGroup = individualPieces.filter(p => group.piece_ids?.includes(p.id));
                if (piecesInGroup.length === 0) return null; // Don't render group if no pieces match filter

                return (
                    <div key={group.id} className="bg-white rounded-lg shadow-sm border border-border-default">
                        <div className="flex justify-between items-center p-4">
                            <div className="flex-1 cursor-pointer" onClick={() => toggleGroupExpansion(group.id)}>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-bold text-text-primary">{group.name}</h2>
                                    <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-text-secondary rounded-full">
                                        {piecesInGroup.length} peça{piecesInGroup.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-3 text-sm">
                                    <div><p className="text-text-secondary">Tipo</p><p className="font-medium text-text-primary">{group.group}</p></div>
                                    <div><p className="text-text-secondary">Seção</p><p className="font-medium text-text-primary">{group.section}</p></div>
                                    <div><p className="text-text-secondary">Peso (Kg)</p><p className="font-medium text-text-primary">{formatNumber(group.weight, {minimumFractionDigits: 2})}</p></div>
                                    <div><p className="text-text-secondary">Volume (m³)</p><p className="font-medium text-text-primary">{formatNumber(group.unit_volume, {minimumFractionDigits: 4})}</p></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(group); }}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleGroupExpansion(group.id)}>
                                    <ChevronDown className={`w-5 h-5 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </Button>
                            </div>
                        </div>
                        {isExpanded && (
                            <div className="border-t border-border-default divide-y divide-border-default">
                                {piecesInGroup.map(individualPiece => (
                                    <div key={individualPiece.id} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50">
                                        <input
                                            className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                                            type="checkbox"
                                            checked={individualPiece.is_released}
                                            onChange={(e) => onStatusChange(individualPiece.id, e.target.checked)}
                                        />
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-mono text-xs text-text-secondary truncate">{individualPiece.id}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o grupo de peças <strong>{groupToDelete?.name}</strong> e todas as suas <strong>{groupToDelete?.piece_ids?.length || 0}</strong> peças individuais? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteConfirmOpen(false)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default PiecesList;