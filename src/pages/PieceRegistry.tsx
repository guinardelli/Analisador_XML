import { useState } from 'react';

const getElementContent = (element: Element, tagName: string): string | null => {
    const content = element.querySelector(tagName)?.textContent?.trim();
    return content ? content : null;
};

const PieceRegistry = () => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setMessage('');
    }
  };

  const handleParse = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const items = xmlDoc.getElementsByTagName('item');
        console.log(`Found ${items.length} items.`);
        for (let i = 0; i < items.length; i++) {
          const name = getElementContent(items[i], 'name');
          console.log(`Item ${i + 1} name: ${name}`);
        }
        setMessage(`${items.length} peças processadas com sucesso!`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Cadastro de Peças</h1>
      <div className="space-y-4">
        <input type="file" onChange={handleFileChange} accept=".xml" />
        <button onClick={handleParse} disabled={!file} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
          Analisar Arquivo
        </button>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
};

export default PieceRegistry;