"use client";

import React, { useState, useMemo } from 'react';
import { ChevronDown, Trash2, Edit3, Search, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';

// --- TYPE DEFINITIONS ---
interface GroupedPiece {
  id: string;
  name: string;
  group: string;
  quantity: number;
  section: string;
  length: number;
  weight: number;
  unit_volume: number;
  concrete_class: string;
  piece_ids: string[] | null;
}

interface IndividualPiece {
  id: string;
  is_released: boolean;
}

interface PiecesListProps {
  groupedPieces: GroupedPiece[];
  individualPieces: IndividualPiece[];
  onStatusChange: (pieceId: string, newStatus: boolean) => void;
  onDeleteGroup: (group: GroupedPiece) => void;
  onDeleteBatch: (groupIds: string[]) => void;
}

const PiecesList: React.FC<PiecesListProps> = ({
  groupedPieces,
  individualPieces,
  onStatusChange,
  onDeleteGroup,
  onDeleteBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [groupToDelete, setGroupToDelete] = useState<GroupedPiece | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Filtrar grupos com base no termo de busca
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groupedPieces;
    
    const lowerSearch = searchTerm.toLowerCase();
    return groupedPieces.filter(group => {
      // Buscar por nome do grupo
      if (group.name.toLowerCase().includes(lowerSearch)) return true;
      
      // Buscar por ID das peças individuais
      const piecesInGroup = individualPieces.filter(p => group.piece_ids?.includes(p.id));
      return piecesInGroup.some(piece => piece.id.toLowerCase().includes(lowerSearch));
    });
  }, [groupedPieces, individualPieces, searchTerm]);

  const handleDeleteRequest = (group: GroupedPiece) => {
    setGroupToDelete(group);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (groupToDelete) onDeleteGroup(groupToDelete);
    setIsDeleteConfirmOpen(false);
    setGroupToDelete(null);
  };

  const handleBatchDelete = () => {
    if (selectedGroups.size > 0) {
      onDeleteBatch(Array.from(selectedGroups));
      setSelectedGroups(new Set());
      setIsBatchDeleteOpen(false);
    }
  };

  const handleEditStatus = (groupId: string) => {
    setEditingGroupId(groupId);
  };

  const closeEditModal = () => {
    setEditingGroupId(null);
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filteredGroups.map(g => g.id)));
    }
  };

  const formatNumber = (num: number, decimals: number = 2) =>
    num.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const getEditingGroup = () => {
    return groupedPieces.find((g) => g.id === editingGroupId);
  };

  const getEditingPieces = () => {
    const group = getEditingGroup();
    if (!group) return [];
    return individualPieces.filter((p) =>
      group.piece_ids?.includes(p.id)
    );
  };

  if (groupedPieces.length === 0) {
    return (
      <div className="bg-surface rounded-xl shadow-md border border-border-default p-6 text-center mt-8">
        <p className="text-text-secondary">Nenhuma peça encontrada com os filtros aplicados.</p>
      </div>
    );
  }

  return (
    <>
      {/* Barra de busca e ações em lote */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-subtle" />
          <Input
            placeholder="Buscar por nome ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          {selectedGroups.size > 0 && (
            <Button
              variant="destructive"
              onClick={() => setIsBatchDeleteOpen(true)}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Excluir Selecionados ({selectedGroups.size})
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-default shadow-sm">
        <table className="min-w-full divide-y divide-border-default">
          <thead className="sticky top-0 bg-surface shadow-sm z-10">
            <tr>
              <th className="px-4 py-3 text-left">
                <Checkbox
                  checked={selectedGroups.size === filteredGroups.length && filteredGroups.length > 0}
                  onCheckedChange={toggleSelectAll}
                  className="h-4 w-4"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[140px]">
                Nome da Peça
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[80px]">
                Seção
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[120px]">
                Grupo
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[100px]">
                Compr. (cm)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[100px]">
                Peso Un. (kg)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[110px]">
                Vol. Un. (m³)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[90px]">
                Qtd.
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[90px]">
                Lib.
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[100px]">
                Progresso
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider w-32">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default bg-white">
            {filteredGroups.map((group) => {
              const piecesInGroup = individualPieces.filter((p) =>
                group.piece_ids?.includes(p.id)
              );
              const total = piecesInGroup.length;
              const liberadas = piecesInGroup.filter((p) => p.is_released).length;
              const percent = total > 0 ? Math.round((liberadas / total) * 100) : 0;
              const isSelected = selectedGroups.has(group.id);

              return (
                <tr key={group.id} className={`hover:bg-gray-50 even:bg-gray-50/50 ${isSelected ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleGroupSelection(group.id)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-text-primary min-w-[140px]">
                    {group.name}
                  </td>
                  <td className="px-4 py-4 text-sm text-text-secondary min-w-[80px]">
                    {group.section}
                  </td>
                  <td className="px-4 py-4 text-sm text-text-secondary min-w-[120px]">
                    {group.group}
                  </td>
                  <td className="px-4 py-4 text-sm text-right text-text-secondary min-w-[100px]">
                    {formatNumber(group.length, 2)}
                  </td>
                  <td className="px-4 py-4 text-sm text-right text-text-secondary min-w-[100px]">
                    {formatNumber(group.weight, 2)}
                  </td>
                  <td className="px-4 py-4 text-sm text-right text-text-secondary min-w-[110px]">
                    {formatNumber(group.unit_volume, 4)}
                  </td>
                  <td className="px-4 py-4 text-sm text-right font-semibold text-text-primary min-w-[90px]">
                    {total}
                  </td>
                  <td className="px-4 py-4 text-sm text-right font-semibold text-text-primary min-w-[90px]">
                    {liberadas}
                  </td>
                  <td className="px-4 py-4 text-sm text-right min-w-[100px]">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-text-secondary">
                        {liberadas}/{total} ({percent}%)
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right space-x-1 w-32">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditStatus(group.id)}
                      disabled={total === 0}
                      className="h-8 px-2"
                      title="Editar status das peças"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRequest(group);
                      }}
                      className="h-8 px-2"
                      title="Excluir grupo"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Edição de Status */}
      <Dialog open={editingGroupId !== null} onOpenChange={closeEditModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Status das Peças - {getEditingGroup()?.name}</DialogTitle>
            <DialogDescription>
              Marque as peças liberadas. As alterações são salvas automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {getEditingPieces().map((piece) => (
              <div key={piece.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                <Checkbox
                  id={`status-${piece.id}`}
                  checked={piece.is_released}
                  onCheckedChange={(checked) => onStatusChange(piece.id, !!checked)}
                />
                <label
                  htmlFor={`status-${piece.id}`}
                  className="text-sm font-mono text-text-primary cursor-pointer flex-1 min-w-0 truncate"
                >
                  {piece.id}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão Individual */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o grupo de peças <strong>{groupToDelete?.name}</strong> e todas as suas{' '}
              <strong>{groupToDelete?.piece_ids?.length || 0}</strong> peças individuais? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Exclusão em Lote */}
      <AlertDialog open={isBatchDeleteOpen} onOpenChange={setIsBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão em Lote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir os <strong>{selectedGroups.size}</strong> grupos selecionados e todas as suas peças individuais? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} className="bg-red-600 hover:bg-red-700">
              Excluir Selecionados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PiecesList;