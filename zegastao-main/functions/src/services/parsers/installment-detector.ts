// Detecta padrões de parcelamento em descrições de transações bancárias brasileiras.
// Suporta: "Parcela 3/12", "Parcela 3 de 12", "SHOPEE 03/12", etc.

export interface InstallmentInfo {
  isInstallment: true;
  installmentCurrent: number;
  installmentTotal: number;
  installmentGroup: string; // chave normalizada para agrupar parcelas do mesmo produto/compra
}

// Padrões em ordem de especificidade (mais específicos primeiro)
const PATTERNS: RegExp[] = [
  // "Parcela 3 de 12" / "PARCELA 03 DE 12"
  /\s*parcela\s+(\d{1,2})\s+de\s+(\d{1,2})\s*/i,
  // "Parcela 3/12" / "PARCELA 3-12"
  /\s*parcela\s+(\d{1,2})[/\-](\d{1,2})\s*/i,
  // " 03/12" no final ou no meio — padrão mais comum em faturas de cartão
  /\s+0?(\d{1,2})[/](\d{2})\b/,
];

export function detectInstallment(description: string): InstallmentInfo | null {
  for (const re of PATTERNS) {
    const m = description.match(re);
    if (!m) continue;

    const current = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);

    // Validação: mínimo 2 parcelas, máximo 72 (6 anos), atual <= total
    if (total < 2 || total > 72 || current < 1 || current > total) continue;

    // Remove o trecho detectado para obter apenas o nome do estabelecimento
    const merchant = description
      .replace(re, ' ')
      .toLowerCase()
      .replace(/[^a-záàãâéêíóôõúüç0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (merchant.length < 2) continue;

    // Inclui o total no group para separar "amazon 6x" de "amazon 12x"
    const installmentGroup = `${merchant}_${total}x`;

    return { isInstallment: true, installmentCurrent: current, installmentTotal: total, installmentGroup };
  }

  return null;
}
