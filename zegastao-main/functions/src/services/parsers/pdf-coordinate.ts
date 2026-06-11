// Extração de texto de PDF preservando a estrutura visual (linhas/colunas).
// O render padrão do pdf-parse achata o texto e embaralha a ordem das linhas de
// tabela. Aqui usamos o callback `pagerender` para ler cada fragmento com suas
// coordenadas X/Y e reconstruir as linhas na ordem visual correta. Custo: $0.
import pdfParse from 'pdf-parse';

// Tolerância em unidades de PDF para considerar fragmentos na mesma linha.
const Y_TOLERANCE = 3;

interface TextItem {
  str: string;
  transform: number[]; // [a, b, c, d, e, f] — e=x (índice 4), f=y (índice 5)
}

// Reconstrói as linhas de UMA página a partir dos fragmentos com coordenadas.
function renderPage(textContent: { items: TextItem[] }): string {
  const items = textContent.items.filter((it) => it.str && it.str.trim().length > 0);

  // Agrupa fragmentos por Y (mesma linha visual, dentro da tolerância).
  const rows: Array<{ y: number; items: TextItem[] }> = [];
  for (const item of items) {
    const y = item.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) <= Y_TOLERANCE);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }

  // Linhas de cima para baixo (Y decrescente no espaço do PDF).
  rows.sort((a, b) => b.y - a.y);

  return rows
    .map((row) => {
      // Dentro da linha, esquerda → direita (X crescente).
      row.items.sort((a, b) => a.transform[4] - b.transform[4]);
      return row.items.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
    })
    .filter(Boolean)
    .join('\n');
}

// Erros tipados (reexportados pelo pdf-parser para o backend mapear).
export class CoordinateParseError extends Error {
  code: 'password' | 'unreadable';
  constructor(code: 'password' | 'unreadable', message: string) {
    super(message);
    this.code = code;
  }
}

// Extrai texto completo do PDF como linhas reconstruídas por coordenada.
// Retorna a string completa (com \n entre páginas e linhas) para o parser de regex.
export async function extractTextByCoordinate(buffer: Buffer): Promise<string> {
  let data;
  try {
    data = await pdfParse(buffer, {
      // pdf-parse chama este callback por página; o retorno é concatenado.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pagerender: async (pageData: any) => {
        const textContent = await pageData.getTextContent();
        return renderPage(textContent) + '\n';
      },
    });
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    if (msg.includes('password') || msg.includes('encrypt')) {
      throw new CoordinateParseError('password', 'PDF protegido por senha');
    }
    throw new CoordinateParseError('unreadable', 'Não foi possível ler o PDF');
  }

  return data.text || '';
}
