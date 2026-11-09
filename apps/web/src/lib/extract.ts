/**
 * Extração automática de dados do texto de publicações.
 * Funções puras, sem dependências, para poderem ser testadas isoladamente.
 */

export const PUBLICATION_TYPES = [
  'Intimação',
  'Citação',
  'Notificação',
  'Sentença',
  'Decisão',
  'Despacho',
  'Acórdão',
  'Pauta',
  'Edital',
  'Andamento',
  'Licitação',
  'Aviso público',
  'Menção',
] as const;
export type PublicationType = (typeof PUBLICATION_TYPES)[number];

const CNJ_RE = /\b(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})\b/;

/** Formata 20 dígitos no padrão CNJ NNNNNNN-DD.AAAA.J.TR.OOOO. */
export function maskCnj(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 20) return value.trim();
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}

export function extractProcessNumber(text: string): string | undefined {
  const m = text.match(CNJ_RE);
  return m ? maskCnj(m.slice(1).join('')) : undefined;
}

const NUMBER_WORDS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8,
  nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15,
  dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, sessenta: 60, noventa: 90,
};

export type ExtractedDeadline = { days: number; corridos: boolean };

/** Procura menções a prazo no texto ("prazo de 15 (quinze) dias", "em 48 horas", "no prazo de cinco dias"). */
export function extractDeadline(text: string): ExtractedDeadline | undefined {
  const t = text.replace(/\s+/g, ' ');
  const numeric = t.match(/prazo\s+(?:legal\s+|comum\s+|sucessivo\s+|improrrog[áa]vel\s+)?(?:de\s+|em\s+)?(\d{1,3})\s*(?:\([^)]{1,30}\)\s*)?(dias?|horas)(\s+(?:[úu]teis|corridos))?/i)
    || t.match(/(?:em|no prazo de|dentro de)\s+(\d{1,3})\s*(?:\([^)]{1,30}\)\s*)?(dias?|horas)(\s+(?:[úu]teis|corridos))?/i);
  if (numeric) {
    const n = Number(numeric[1]);
    const days = /hora/i.test(numeric[2]) ? Math.max(1, Math.ceil(n / 24)) : n;
    if (days > 0 && days <= 365) return { days, corridos: /corridos/i.test(numeric[3] || '') };
  }
  const words = t.match(/prazo\s+(?:legal\s+|comum\s+)?(?:de\s+)?([a-zçêú]+)(?:\s+e\s+([a-zçêú]+))?\s+dias(\s+(?:[úu]teis|corridos))?/i);
  if (words) {
    const a = NUMBER_WORDS[words[1].toLowerCase()];
    const b = words[2] ? NUMBER_WORDS[words[2].toLowerCase()] : 0;
    if (a) return { days: a + (b || 0), corridos: /corridos/i.test(words[3] || '') };
  }
  return undefined;
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/[\s,.;:–-]+$/, '').trim();
}

export function extractComarca(text: string): string | undefined {
  const m = text.match(/Comarca\s+de\s+([A-ZÀ-Ýa-zà-ÿ'. ]{2,60}?)(?=\s*(?:[-–,/\n\r]|\s+-|$|\s+Vara|\s+\d))/);
  return m ? clean(m[1]) : undefined;
}

export function extractVara(text: string): string | undefined {
  const m = text.match(/((?:\d{1,2}[ªº°]?\s*)?(?:Vara|Juizado|Turma Recursal|C[âa]mara|Turma|Se[çc][ãa]o)\b[^\n\r,;]{0,80})/i);
  if (!m) return undefined;
  return clean(m[1].split(/\s+(?:da|do)\s+Comarca/i)[0]);
}

const PARTY_LABELS = [
  'Autor', 'Autora', 'Réu', 'Ré', 'Requerente', 'Requerido', 'Requerida', 'Recorrente', 'Recorrido', 'Recorrida',
  'Exequente', 'Executado', 'Executada', 'Reclamante', 'Reclamado', 'Reclamada', 'Apelante', 'Apelado', 'Apelada',
  'Agravante', 'Agravado', 'Agravada', 'Impetrante', 'Impetrado', 'Embargante', 'Embargado', 'Interessado', 'Polo Ativo', 'Polo Passivo',
];

export function extractParties(text: string): string[] {
  const out = new Set<string>();
  const re = new RegExp(`(?:^|\\n|\\r|\\.\\s)\\s*(?:${PARTY_LABELS.join('|')})(?:\\(s\\)|\\(a\\)|\\(es\\))?\\s*:\\s*([^\\n\\r]{2,120})`, 'gi');
  for (const m of text.matchAll(re)) {
    const name = clean(m[1].split(/\s+(?:Advogad|OAB|ADVOGAD)/)[0]);
    if (name && name.length > 2) out.add(name.toUpperCase());
  }
  return [...out].slice(0, 10);
}

/** Classifica a publicação em uma categoria a partir do tipo informado pela fonte e do texto. */
export function classify(sourceType: string | undefined, text: string): PublicationType {
  const s = `${sourceType || ''} ${text.slice(0, 600)}`.toLowerCase();
  if (/licita|preg[ãa]o|concorr[êe]ncia|dispensa de licita|tomada de pre[çc]os|edital de contrata/.test(s)) return 'Licitação';
  if (/cita[çc][ãa]o|fica(m)? citad|cite-se/.test(s)) return 'Citação';
  if (/notifica[çc][ãa]o|notifique-se/.test(s)) return 'Notificação';
  if (/ac[óo]rd[ãa]o|ementa/.test(s)) return 'Acórdão';
  if (/senten[çc]a|julgo (im)?procedente/.test(s)) return 'Sentença';
  if (/pauta de julgamento|inclu[ií]do em pauta|sess[ãa]o de julgamento/.test(s)) return 'Pauta';
  if (/edital/.test(s)) return 'Edital';
  if (/decis[ãa]o|defiro|indefiro/.test(s)) return 'Decisão';
  if (/despacho/.test(s)) return 'Despacho';
  if (/intima[çc][ãa]o|intime-se|fica(m)? intimad/.test(s)) return 'Intimação';
  return 'Menção';
}

/** Prazo presumido quando o texto não informa: 5 dias (CPC art. 218, §3º) para atos que exigem manifestação. */
export function presumedDeadline(type: PublicationType): number | undefined {
  if (type === 'Citação') return 15;
  if (['Intimação', 'Notificação', 'Decisão', 'Despacho'].includes(type)) return 5;
  if (type === 'Sentença') return 15;
  if (type === 'Acórdão') return 15;
  return undefined;
}

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
