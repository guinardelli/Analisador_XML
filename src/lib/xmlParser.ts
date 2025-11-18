import { XMLParser } from 'fast-xml-parser';

// Função para converter valores para float de forma segura, lidando com vírgulas e espaços.
const parseSafeFloat = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const cleanedValue = value.replace(/\s/g, '').replace(',', '.');
  const number = parseFloat(cleanedValue);
  return isNaN(number) ? 0 : number;
};

// Função para normalizar as chaves de um objeto para minúsculas.
const normalizeKeys = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => normalizeKeys(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const lowerKey = key.toLowerCase();
      result[lowerKey] = normalizeKeys(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

export const parseTeklaXML = (xmlData: string) => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseAttributeValue: true,
    isArray: (name, jpath, isLeafNode, isAttribute) => {
      // Trata 'Part' como um array, mesmo que haja apenas um.
      if (jpath === 'Project.Part') return true;
      return false;
    }
  });

  const jsonObj = parser.parse(xmlData);
  const normalizedObj = normalizeKeys(jsonObj);
  
  const parts = normalizedObj.project?.part;

  if (!parts || !Array.isArray(parts)) {
    throw new Error("Estrutura do XML inválida: a tag 'Part' não foi encontrada ou não é um array.");
  }

  const pieces = parts.map((part: any) => {
    const attributes = part['@_'];
    if (!attributes) throw new Error("Peça sem atributos encontrada no XML.");

    return {
      name: attributes.name || attributes.nome || 'N/A',
      group: attributes.group || attributes.grupo || 'N/A',
      quantity: parseInt(attributes.quantity || attributes.quantidade || '1', 10),
      section: attributes.section || attributes.secao || attributes.seção || 'N/A',
      length: parseSafeFloat(attributes.length || attributes.comprimento),
      weight: parseSafeFloat(attributes.weight || attributes.peso),
      unit_volume: parseSafeFloat(attributes.unit_volume || attributes.volume_unitario),
      concrete_class: attributes.concrete_class || attributes.classe_concreto || 'N/A',
      piece_ids: attributes.piece_ids || attributes.ids_peca ? [attributes.piece_ids || attributes.ids_peca] : [],
    };
  });

  return pieces;
};