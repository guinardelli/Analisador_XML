import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseTeklaXML } from '@/lib/xmlParser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, AlertCircle } from 'lucide-react';

interface XMLImporterProps {
  projectId: string;
  onImportSuccess: () => void;
}

const XMLImporter = ({ projectId, onImportSuccess }: XMLImporterProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/xml' && !selectedFile.name.endsWith('.xml')) {
        setError('Por favor, selecione um arquivo .xml válido.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Nenhum arquivo selecionado.');
      return;
    }
    if (!projectId) {
      setError('ID do projeto não encontrado.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const fileContent = await file.text();
      const pieces = parseTeklaXML(fileContent);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { error: rpcError } = await supabase.rpc('replace_project_pieces', {
        p_project_id: projectId,
        p_user_id: user.id,
        p_pieces: pieces,
      });

      if (rpcError) {
        throw new Error(`Falha ao salvar as peças: ${rpcError.message}`);
      }

      onImportSuccess();
      setFile(null);
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Ocorreu um erro desconhecido durante a importação.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-slate-50">
      <h3 className="font-semibold mb-2">Importar Peças do XML</h3>
      <div className="flex flex-col sm:flex-row gap-4">
        <Input type="file" accept=".xml,text/xml" onChange={handleFileChange} className="flex-grow" />
        <Button onClick={handleImport} disabled={!file || isImporting}>
          {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {isImporting ? 'Importando...' : 'Importar'}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};

export default XMLImporter;