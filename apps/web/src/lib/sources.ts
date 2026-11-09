/**
 * Conectores das fontes públicas monitoradas.
 *
 * Cada conector recebe o advogado e os termos cadastrados e devolve publicações já normalizadas.
 * As chamadas saem direto do navegador. Se uma fonte bloquear a chamada (CORS), o app usa o
 * "conector local" opcional (conector-local/server.mjs), que roda no próprio PC.
 */
import type { Publication, Term, User } from './db';
import { classify, extractComarca, extractDeadline, extractParties, extractProcessNumber, extractVara, maskCnj, presumedDeadline } from './extract';

export type SourceInfo = {
  id: string;
  name: string;
  description: string;
  coverage: string[];
  searchBy: string[];
  status: 'ativo' | 'planejado';
  needsConnector?: boolean;
  url: string;
};

export const SOURCES: SourceInfo[] = [
  {
    id: 'djen',
    name: 'DJEN — Diário de Justiça Eletrônico Nacional (CNJ)',
    description: 'Intimações, citações e comunicações processuais de todos os tribunais integrados à Plataforma de Comunicações Processuais do CNJ.',
    coverage: ['Tribunais de Justiça (estaduais)', 'Tribunais Regionais Federais', 'Justiça do Trabalho (TRTs e TST)', 'Justiça Eleitoral (TREs e TSE)', 'Justiça Militar', 'Tribunais Superiores integrados', 'CNJ'],
    searchBy: ['Número da OAB + UF', 'Nome do advogado', 'Nome das partes', 'Número do processo'],
    status: 'ativo',
    url: 'https://comunica.pje.jus.br',
  },
  {
    id: 'datajud',
    name: 'DataJud — API Pública do CNJ',
    description: 'Andamentos (movimentações) dos processos cadastrados, em todos os ramos da Justiça.',
    coverage: ['Justiça Estadual', 'Justiça Federal', 'Justiça do Trabalho', 'Justiça Eleitoral', 'Justiça Militar', 'STJ, TST, TSE, STM'],
    searchBy: ['Número do processo'],
    status: 'ativo',
    needsConnector: true,
    url: 'https://datajud-wiki.cnj.jus.br/api-publica/',
  },
  {
    id: 'querido-diario',
    name: 'Querido Diário — Diários Oficiais Municipais',
    description: 'Busca textual em diários oficiais de municípios brasileiros (Open Knowledge Brasil).',
    coverage: ['Diários Oficiais Municipais'],
    searchBy: ['Nome do advogado', 'OAB', 'CPF', 'Partes', 'Processos', 'Termos livres'],
    status: 'ativo',
    url: 'https://queridodiario.ok.org.br',
  },
  {
    id: 'pncp',
    name: 'PNCP — Portal Nacional de Contratações Públicas',
    description: 'Editais e avisos de licitação de União, estados e municípios (Lei 14.133/2021).',
    coverage: ['Portais de licitações', 'Compras governamentais'],
    searchBy: ['Termos de licitação', 'Partes', 'CNPJ'],
    status: 'ativo',
    needsConnector: true,
    url: 'https://pncp.gov.br',
  },
  {
    id: 'dou',
    name: 'Diário Oficial da União (INLABS)',
    description: 'Exige credenciais gratuitas da Imprensa Nacional. Será feito via conector local.',
    coverage: ['Diário Oficial da União'],
    searchBy: ['Todos os termos'],
    status: 'planejado',
    needsConnector: true,
    url: 'https://inlabs.in.gov.br',
  },
  {
    id: 'doe',
    name: 'Diários Oficiais Estaduais e do DF',
    description: 'Cada estado publica em formato próprio, sem API nacional. Conectores por estado em desenvolvimento.',
    coverage: ['Diários Oficiais Estaduais', 'Diário Oficial do Distrito Federal'],
    searchBy: ['Todos os termos'],
    status: 'planejado',
    url: '',
  },
];

export type MonitorContext = {
  user: User;
  terms: Term[];
  since: string; // AAAA-MM-DD
  until: string;
  connectorUrl?: string;
  datajudKey: string;
  extraHolidays: string[];
  log: (query: string, fn: () => Promise<number>) => Promise<void>;
};

export type FoundPublication = Omit<Publication, 'userId' | 'read' | 'favorite' | 'createdAt' | 'deadline'> & {
  deadlineHint?: { days: number; corridos: boolean; basis: 'extraido' | 'presumido' };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch com fallback para o conector local quando a fonte bloqueia o navegador. */
export async function fetchJson<T>(url: string, init: RequestInit = {}, connectorUrl?: string): Promise<T> {
  try {
    const res = await fetch(url, { ...init, mode: 'cors' });
    if (!res.ok) throw new HttpError(res.status, `${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof HttpError || !connectorUrl) throw err;
    const res = await fetch(`${connectorUrl.replace(/\/$/, '')}/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, method: init.method || 'GET', headers: init.headers || {}, body: init.body }),
    });
    if (!res.ok) throw new HttpError(res.status, `Conector local: ${res.status}`);
    return (await res.json()) as T;
  }
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function hint(type: ReturnType<typeof classify>, text: string): FoundPublication['deadlineHint'] {
  const found = extractDeadline(text);
  if (found) return { ...found, basis: 'extraido' };
  const days = presumedDeadline(type);
  return days ? { days, corridos: false, basis: 'presumido' } : undefined;
}

/* ------------------------------------------------------------------ DJEN */

type DjenItem = {
  id: number;
  data_disponibilizacao: string;
  siglaTribunal: string;
  tipoComunicacao: string;
  nomeOrgao: string;
  texto: string;
  numero_processo: string;
  numeroprocessocommascara?: string;
  link: string | null;
  tipoDocumento?: string;
  nomeClasse?: string;
  meiocompleto?: string;
  destinatarios?: { nome: string; polo?: string }[];
  destinatarioadvogados?: { advogado: { nome: string; numero_oab: string; uf_oab: string } }[];
};

export function mapDjen(item: DjenItem, matched: string): FoundPublication {
  const text = (item.texto || '').replace(/\r/g, '');
  const sourceType = [item.tipoComunicacao, item.tipoDocumento].filter(Boolean).join(' · ');
  const type = classify(sourceType, text);
  const parties = (item.destinatarios || [])
    .map((d) => d.nome)
    .filter((n) => !/^JU[IÍ]Z|^JUÍZO|VARA|TRIBUNAL/i.test(n));
  return {
    id: `djen:${item.id}`,
    source: 'djen',
    origin: 'DJEN',
    availableAt: item.data_disponibilizacao,
    publishedAt: '',
    processNumber: item.numeroprocessocommascara || maskCnj(item.numero_processo || '') || extractProcessNumber(text),
    parties: parties.length ? parties : extractParties(text),
    lawyers: (item.destinatarioadvogados || []).map((a) => `${a.advogado.nome} (OAB ${a.advogado.numero_oab}/${a.advogado.uf_oab})`),
    court: item.siglaTribunal,
    vara: extractVara(text) || item.nomeOrgao,
    comarca: extractComarca(text),
    organ: item.nomeOrgao,
    type,
    sourceType: [sourceType, item.nomeClasse].filter(Boolean).join(' · '),
    text,
    link: item.link || `https://comunica.pje.jus.br/consulta?numeroProcesso=${item.numero_processo}`,
    matchedBy: [matched],
    deadlineHint: hint(type, text),
  };
}

async function djen(ctx: MonitorContext): Promise<FoundPublication[]> {
  const out = new Map<string, FoundPublication>();
  const queries: { label: string; params: Record<string, string> }[] = [];
  if (ctx.user.oab && ctx.user.oabUf) queries.push({ label: `OAB ${ctx.user.oab}/${ctx.user.oabUf}`, params: { numeroOab: ctx.user.oab.replace(/\D/g, ''), ufOab: ctx.user.oabUf } });
  if (ctx.user.name) queries.push({ label: `Advogado: ${ctx.user.name}`, params: { nomeAdvogado: ctx.user.name } });
  for (const t of ctx.terms) {
    if (t.kind === 'parte') queries.push({ label: `Parte: ${t.value}`, params: { nomeParte: t.value } });
    if (t.kind === 'processo') queries.push({ label: `Processo: ${t.value}`, params: { numeroProcesso: t.value.replace(/\D/g, '') } });
  }

  for (const q of queries) {
    await ctx.log(q.label, async () => {
      let found = 0;
      for (let page = 1; page <= 10; page++) {
        const params = new URLSearchParams({ ...q.params, dataDisponibilizacaoInicio: ctx.since, dataDisponibilizacaoFim: ctx.until, itensPorPagina: '100', pagina: String(page) });
        const data = await fetchJson<{ count: number; items: DjenItem[] }>(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?${params}`, {}, ctx.connectorUrl);
        for (const item of data.items || []) {
          const pub = mapDjen(item, q.label);
          const prev = out.get(pub.id);
          if (prev) prev.matchedBy = [...new Set([...prev.matchedBy, q.label])];
          else out.set(pub.id, pub);
        }
        found += data.items?.length || 0;
        if (!data.items || data.items.length < 100) break;
        await sleep(800);
      }
      return found;
    });
    await sleep(800); // respeita o limite de requisições da API
  }
  return [...out.values()];
}

/* -------------------------------------------------------------- DataJud */

const TJ_BY_TR: Record<string, string> = {
  '01': 'tjac', '02': 'tjal', '03': 'tjap', '04': 'tjam', '05': 'tjba', '06': 'tjce', '07': 'tjdft', '08': 'tjes', '09': 'tjgo',
  '10': 'tjma', '11': 'tjmt', '12': 'tjms', '13': 'tjmg', '14': 'tjpa', '15': 'tjpb', '16': 'tjpr', '17': 'tjpe', '18': 'tjpi',
  '19': 'tjrj', '20': 'tjrn', '21': 'tjrs', '22': 'tjro', '23': 'tjrr', '24': 'tjsc', '25': 'tjse', '26': 'tjsp', '27': 'tjto',
};
const UF_BY_TR: Record<string, string> = Object.fromEntries(Object.entries(TJ_BY_TR).map(([k, v]) => [k, v === 'tjdft' ? 'dft' : v.slice(2)]));

/** Descobre o alias do tribunal no DataJud a partir do número CNJ (segmentos J e TR). */
export function datajudAlias(processNumber: string): string | undefined {
  const d = processNumber.replace(/\D/g, '');
  if (d.length !== 20) return undefined;
  const j = d[13];
  const tr = d.slice(14, 16);
  if (j === '8') return TJ_BY_TR[tr];
  if (j === '4') return `trf${Number(tr)}`;
  if (j === '5') return tr === '00' ? 'tst' : `trt${Number(tr)}`;
  if (j === '6') return tr === '00' ? 'tse' : `tre-${UF_BY_TR[tr]}`;
  if (j === '9') return ({ '13': 'tjmmg', '21': 'tjmrs', '26': 'tjmsp' } as Record<string, string>)[tr];
  if (j === '3') return 'stj';
  if (j === '7') return 'stm';
  return undefined;
}

type DatajudHit = {
  _source: {
    numeroProcesso: string;
    tribunal: string;
    classe?: { nome: string };
    orgaoJulgador?: { nome: string };
    movimentos?: { codigo: number; nome: string; dataHora: string; complementosTabelados?: { nome: string; descricao?: string }[] }[];
  };
};

async function datajud(ctx: MonitorContext): Promise<FoundPublication[]> {
  const out: FoundPublication[] = [];
  for (const t of ctx.terms.filter((x) => x.kind === 'processo')) {
    const alias = datajudAlias(t.value);
    if (!alias) continue;
    await ctx.log(`Processo: ${t.value}`, async () => {
      const data = await fetchJson<{ hits: { hits: DatajudHit[] } }>(
        `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`,
        {
          method: 'POST',
          headers: { Authorization: `APIKey ${ctx.datajudKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ size: 1, query: { match: { numeroProcesso: t.value.replace(/\D/g, '') } } }),
        },
        ctx.connectorUrl,
      );
      let n = 0;
      for (const hit of data.hits?.hits || []) {
        const s = hit._source;
        for (const m of s.movimentos || []) {
          const day = m.dataHora.slice(0, 10);
          if (day < ctx.since) continue;
          const extra = (m.complementosTabelados || []).map((c) => c.nome || c.descricao).filter(Boolean).join(', ');
          const text = `${m.nome}${extra ? ` — ${extra}` : ''}\nClasse: ${s.classe?.nome || '—'}\nÓrgão julgador: ${s.orgaoJulgador?.nome || '—'}`;
          out.push({
            id: `datajud:${s.numeroProcesso}:${m.dataHora}:${m.codigo}`,
            source: 'datajud',
            origin: 'DataJud',
            availableAt: day,
            publishedAt: day,
            processNumber: maskCnj(s.numeroProcesso),
            parties: [],
            lawyers: [],
            court: s.tribunal,
            vara: s.orgaoJulgador?.nome,
            comarca: undefined,
            organ: s.orgaoJulgador?.nome,
            type: 'Andamento',
            sourceType: m.nome,
            text,
            link: undefined,
            matchedBy: [`Processo: ${t.value}`],
          });
          n++;
        }
      }
      return n;
    });
    await sleep(500);
  }
  return out;
}

/* -------------------------------------------------------- Querido Diário */

type Gazette = { territory_id: string; territory_name: string; state_code: string; date: string; url: string; excerpts: string[]; edition?: string };

async function queridoDiario(ctx: MonitorContext): Promise<FoundPublication[]> {
  const terms: string[] = [];
  if (ctx.user.name) terms.push(ctx.user.name);
  if (ctx.user.oab) terms.push(`OAB/${ctx.user.oabUf} ${ctx.user.oab}`);
  if (ctx.user.cpf) terms.push(ctx.user.cpf);
  for (const t of ctx.terms) if (['parte', 'cpf', 'cnpj', 'termo', 'processo'].includes(t.kind)) terms.push(t.value);

  const out: FoundPublication[] = [];
  for (const term of terms) {
    await ctx.log(term, async () => {
      const params = new URLSearchParams({ querystring: `"${term}"`, published_since: ctx.since, published_until: ctx.until, size: '20', excerpt_size: '600', number_of_excerpts: '2' });
      const data = await fetchJson<{ gazettes: Gazette[] }>(`https://api.queridodiario.ok.org.br/gazettes?${params}`, {}, ctx.connectorUrl);
      for (const g of data.gazettes || []) {
        const text = (g.excerpts || []).join('\n…\n').trim() || `Menção a "${term}" no diário oficial.`;
        const type = classify('', text);
        out.push({
          id: `qd:${g.territory_id}:${g.date}:${g.edition || ''}:${term.toLowerCase()}`,
          source: 'querido-diario',
          origin: 'Diário Oficial Municipal',
          availableAt: g.date,
          publishedAt: g.date,
          processNumber: extractProcessNumber(text),
          parties: extractParties(text),
          lawyers: [],
          court: `DOM ${g.state_code}`,
          vara: undefined,
          comarca: g.territory_name,
          organ: `Prefeitura de ${g.territory_name}/${g.state_code}`,
          type: type === 'Menção' ? 'Aviso público' : type,
          sourceType: 'Diário Oficial Municipal',
          text,
          link: g.url,
          matchedBy: [term],
          deadlineHint: extractDeadline(text) ? { ...extractDeadline(text)!, basis: 'extraido' } : undefined,
        });
      }
      return data.gazettes?.length || 0;
    });
    await sleep(400);
  }
  return out;
}

/* ------------------------------------------------------------------ PNCP */

type PncpItem = { id: string; title: string; description: string; orgao_nome: string; municipio_nome?: string; uf?: string; data_publicacao_pncp: string; item_url: string; modalidade_licitacao_nome?: string };

async function pncp(ctx: MonitorContext): Promise<FoundPublication[]> {
  const terms = ctx.terms.filter((t) => ['licitacao', 'cnpj', 'parte'].includes(t.kind)).map((t) => t.value);
  const out: FoundPublication[] = [];
  for (const term of terms) {
    await ctx.log(term, async () => {
      const params = new URLSearchParams({ q: term, tipos_documento: 'edital', ordenacao: '-data', pagina: '1', tam_pagina: '20', status: 'recebendo_proposta' });
      const data = await fetchJson<{ items: PncpItem[] }>(`https://pncp.gov.br/api/search/?${params}`, {}, ctx.connectorUrl);
      let n = 0;
      for (const it of data.items || []) {
        const day = (it.data_publicacao_pncp || '').slice(0, 10);
        if (day && day < ctx.since) continue;
        n++;
        out.push({
          id: `pncp:${it.id}`,
          source: 'pncp',
          origin: 'PNCP',
          availableAt: day,
          publishedAt: day,
          processNumber: undefined,
          parties: [it.orgao_nome],
          lawyers: [],
          court: it.uf ? `Licitação ${it.uf}` : 'Licitação',
          vara: it.modalidade_licitacao_nome,
          comarca: it.municipio_nome,
          organ: it.orgao_nome,
          type: 'Licitação',
          sourceType: it.modalidade_licitacao_nome,
          text: `${it.title}\n\n${it.description}`,
          link: `https://pncp.gov.br/app${it.item_url}`,
          matchedBy: [term],
        });
      }
      return n;
    });
    await sleep(400);
  }
  return out;
}

export const CONNECTORS: Record<string, (ctx: MonitorContext) => Promise<FoundPublication[]>> = {
  djen,
  datajud,
  'querido-diario': queridoDiario,
  pncp,
};
