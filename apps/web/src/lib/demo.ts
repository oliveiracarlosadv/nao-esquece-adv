/**
 * Dados de exemplo (fictícios) para conhecer o app sem cadastrar nada.
 */
import { db, nowIso, uid, type Publication, type Term, type User } from './db';
import { hashPassword, randomB64 } from './crypto';
import { daysAgoIso } from './format';
import { classify, extractComarca, extractDeadline, extractVara, presumedDeadline } from './extract';
import { withDeadline } from './monitor';

type Seed = { d: number; court: string; origin: string; source: string; num?: string; parties: string[]; text: string; sourceType: string; organ: string };

const SEEDS: Seed[] = [
  { d: 0, court: 'TJPA', origin: 'DJEN', source: 'djen', num: '0801234-56.2025.8.14.0301', parties: ['MARIA DE NAZARÉ SOUZA', 'BANCO EXEMPLO S.A.'], sourceType: 'Intimação', organ: '5ª Vara Cível e Empresarial de Belém', text: 'Processo nº 0801234-56.2025.8.14.0301\nComarca de Belém - 5ª Vara Cível e Empresarial de Belém\nAutor: Maria de Nazaré Souza\nRéu: Banco Exemplo S.A.\nAdvogado: Carlos Exemplo (OAB: 12345/PA)\n\nDESPACHO. Intime-se a parte autora para, no prazo de 15 (quinze) dias, manifestar-se sobre a contestação e documentos juntados.' },
  { d: 0, court: 'TRT8', origin: 'DJEN', source: 'djen', num: '0000456-12.2025.5.08.0005', parties: ['JOSÉ RIBAMAR LIMA', 'CONSTRUTORA AMAZÔNIA LTDA'], sourceType: 'Intimação', organ: '5ª Vara do Trabalho de Belém', text: 'Processo nº 0000456-12.2025.5.08.0005\n5ª Vara do Trabalho de Belém\nReclamante: José Ribamar Lima\nReclamado: Construtora Amazônia Ltda\n\nFica a parte reclamante intimada da sentença de ID 1234. Prazo de 8 (oito) dias para eventual recurso ordinário.' },
  { d: 1, court: 'TJPA', origin: 'DJEN', source: 'djen', num: '0805555-10.2024.8.14.0006', parties: ['ANA CLÁUDIA FERREIRA', 'MUNICÍPIO DE ANANINDEUA'], sourceType: 'Citação', organ: '2ª Vara da Fazenda Pública de Ananindeua', text: 'Processo nº 0805555-10.2024.8.14.0006\nComarca de Ananindeua - 2ª Vara da Fazenda Pública\nRequerente: Ana Cláudia Ferreira\nRequerido: Município de Ananindeua\n\nCITAÇÃO. Fica o requerido citado para apresentar contestação.' },
  { d: 2, court: 'TRF1', origin: 'DJEN', source: 'djen', num: '1009876-33.2025.4.01.3900', parties: ['RAIMUNDO NONATO CASTRO', 'INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS'], sourceType: 'Intimação', organ: '8ª Vara Federal de Juizado Especial Cível da SJPA', text: 'Processo nº 1009876-33.2025.4.01.3900\n8ª Vara Federal de Juizado Especial Cível da SJPA\nAutor: Raimundo Nonato Castro\nRéu: Instituto Nacional do Seguro Social - INSS\n\nIntimação das partes acerca do laudo pericial. Prazo de 5 (cinco) dias.' },
  { d: 3, court: 'TJPA', origin: 'DataJud', source: 'datajud', num: '0801234-56.2025.8.14.0301', parties: [], sourceType: 'Conclusos para despacho', organ: '5ª Vara Cível e Empresarial de Belém', text: 'Conclusos para despacho\nClasse: Procedimento Comum Cível\nÓrgão julgador: 5ª Vara Cível e Empresarial de Belém' },
  { d: 3, court: 'STJ', origin: 'DJEN', source: 'djen', num: '2345678-90.2025.3.00.0000', parties: ['EMPRESA NORTE COMÉRCIO LTDA', 'FAZENDA NACIONAL'], sourceType: 'Acórdão', organ: 'Segunda Turma', text: 'AgInt no REsp 2345678/PA\nSegunda Turma\nAgravante: Empresa Norte Comércio Ltda\nAgravado: Fazenda Nacional\n\nEMENTA. PROCESSUAL CIVIL. AGRAVO INTERNO. Agravo interno não provido.' },
  { d: 4, court: 'DOM PA', origin: 'Diário Oficial Municipal', source: 'querido-diario', parties: [], sourceType: 'Diário Oficial Municipal', organ: 'Prefeitura de Marituba/PA', text: 'PORTARIA Nº 210/2026 — Nomeia o advogado Carlos Exemplo, OAB/PA 12345, para compor a comissão processante do PAD nº 15/2026. Os interessados ficam notificados para, no prazo de 10 (dez) dias, apresentar defesa.' },
  { d: 5, court: 'Licitação PA', origin: 'PNCP', source: 'pncp', parties: ['MUNICÍPIO DE CASTANHAL'], sourceType: 'Pregão Eletrônico', organ: 'Município de Castanhal', text: 'Pregão Eletrônico nº 45/2026\n\nContratação de serviços de assessoria e consultoria jurídica especializada em direito administrativo e tributário.' },
  { d: 6, court: 'TRE-PA', origin: 'DJEN', source: 'djen', num: '0600123-45.2026.6.14.0029', parties: ['COLIGAÇÃO UNIDOS PELO PARÁ', 'MINISTÉRIO PÚBLICO ELEITORAL'], sourceType: 'Intimação', organ: '29ª Zona Eleitoral', text: 'Processo nº 0600123-45.2026.6.14.0029\n29ª Zona Eleitoral de Belém\nRecorrente: Coligação Unidos pelo Pará\n\nIntimação para apresentar contrarrazões no prazo de 3 (três) dias.' },
  { d: 8, court: 'TJSP', origin: 'DJEN', source: 'djen', num: '1023456-78.2025.8.26.0100', parties: ['LOGÍSTICA RÁPIDA EIRELI', 'TRANSPORTES SUL LTDA'], sourceType: 'Sentença', organ: '12ª Vara Cível do Foro Central', text: 'Processo nº 1023456-78.2025.8.26.0100\nComarca de São Paulo - 12ª Vara Cível do Foro Central\nAutor: Logística Rápida Eireli\nRéu: Transportes Sul Ltda\n\nSENTENÇA. Ante o exposto, JULGO PROCEDENTE o pedido.' },
  { d: 10, court: 'TJPA', origin: 'DJEN', source: 'djen', num: '0812222-01.2023.8.14.0401', parties: ['MINISTÉRIO PÚBLICO DO ESTADO DO PARÁ', 'FULANO DE TAL'], sourceType: 'Pauta', organ: '1ª Turma de Direito Penal', text: 'Processo nº 0812222-01.2023.8.14.0401\n1ª Turma de Direito Penal\nApelante: Fulano de Tal\nApelado: Ministério Público do Estado do Pará\n\nIncluído em pauta de julgamento da sessão virtual.' },
  { d: 14, court: 'TJPA', origin: 'DJEN', source: 'djen', num: '0801234-56.2025.8.14.0301', parties: ['MARIA DE NAZARÉ SOUZA', 'BANCO EXEMPLO S.A.'], sourceType: 'Intimação', organ: '5ª Vara Cível e Empresarial de Belém', text: 'Processo nº 0801234-56.2025.8.14.0301\nComarca de Belém - 5ª Vara Cível e Empresarial de Belém\n\nDECISÃO. Defiro a tutela de urgência. Intimem-se.' },
];

export async function loadDemoData(user: User): Promise<number> {
  const pubs: Publication[] = SEEDS.map((s, i) => {
    const availableAt = daysAgoIso(s.d);
    const type = s.source === 'pncp' ? 'Licitação' : s.source === 'datajud' ? 'Andamento' : classify(s.sourceType, s.text);
    const found = extractDeadline(s.text);
    const days = found?.days ?? presumedDeadline(type);
    const deadline = days
      ? withDeadline({ availableAt, deadlineHint: { days, corridos: found?.corridos ?? false, basis: found ? 'extraido' : 'presumido' } } as never, [])
      : undefined;
    return {
      id: `${user.id}:demo:${i}`,
      userId: user.id,
      source: s.source,
      origin: s.origin,
      availableAt,
      publishedAt: deadline?.publishedAt || availableAt,
      processNumber: s.num,
      parties: s.parties,
      lawyers: s.source === 'djen' ? [`${user.name.toUpperCase()} (OAB ${user.oab}/${user.oabUf})`] : [],
      court: s.court,
      vara: extractVara(s.text) || s.organ,
      comarca: extractComarca(s.text) || (s.source === 'pncp' ? 'Castanhal' : s.source === 'querido-diario' ? 'Marituba' : undefined),
      organ: s.organ,
      type,
      sourceType: s.sourceType,
      text: s.text,
      link: s.source === 'pncp' ? 'https://pncp.gov.br/app/editais' : s.source === 'djen' ? 'https://comunica.pje.jus.br' : undefined,
      matchedBy: [s.source === 'pncp' ? 'Licitação: assessoria jurídica' : `OAB ${user.oab}/${user.oabUf}`],
      deadline,
      read: s.d > 5,
      favorite: i === 0,
      createdAt: nowIso(),
    };
  });
  await db.publications.bulkPut(pubs);

  const terms: Term[] = [
    { id: uid('t_'), userId: user.id, kind: 'processo', value: '0801234-56.2025.8.14.0301', label: 'Maria x Banco Exemplo', active: true, createdAt: nowIso() },
    { id: uid('t_'), userId: user.id, kind: 'parte', value: 'Construtora Amazônia Ltda', active: true, createdAt: nowIso() },
    { id: uid('t_'), userId: user.id, kind: 'licitacao', value: 'assessoria jurídica', active: true, createdAt: nowIso() },
  ];
  await db.terms.bulkPut(terms);
  await db.workspace.bulkPut([
    { id: uid('w_'), userId: user.id, kind: 'processo', name: 'Maria x Banco Exemplo', processNumber: '0801234-56.2025.8.14.0301', note: 'Cliente prioritária', createdAt: nowIso() },
    { id: uid('w_'), userId: user.id, kind: 'consulta', name: 'Não lidas do TJPA', filters: { court: 'TJPA', read: 'nao-lidos' }, createdAt: nowIso() },
    { id: uid('w_'), userId: user.id, kind: 'painel', name: 'Licitações', filters: { type: 'Licitação' }, createdAt: nowIso() },
  ]);
  await db.notifications.bulkAdd(
    pubs.filter((p) => !p.read).slice(0, 5).map((p) => ({
      id: uid('n_'), userId: user.id, kind: p.type === 'Licitação' ? 'licitacao' : 'intimacao', title: `Nova ${p.type.toLowerCase()} · ${p.court}`,
      body: `${p.processNumber || p.organ}${p.deadline ? ` — prazo até ${p.deadline.endAt.split('-').reverse().join('/')}` : ''}`, publicationId: p.id, read: false, createdAt: nowIso(),
    })),
  );
  return pubs.length;
}

/** Cria (ou reaproveita) a conta de demonstração e devolve o id. */
export async function ensureDemoUser(): Promise<User> {
  const email = 'demo@naoesqueceadv.local';
  const existing = await db.users.where('email').equals(email).first();
  if (existing) return existing;
  const { hash, salt } = await hashPassword(randomB64(24));
  const first = (await db.users.count()) === 0;
  const user: User = {
    id: uid('u_'), email, name: 'Carlos Exemplo', cpf: '000.000.000-00', oab: '12345', oabUf: 'PA', phone: '(91) 90000-0000',
    role: first ? 'admin' : 'usuario', passwordHash: hash, passwordSalt: salt, active: true, createdAt: nowIso(),
  };
  await db.users.add(user);
  await loadDemoData(user);
  return user;
}

