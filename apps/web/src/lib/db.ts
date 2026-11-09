/**
 * Banco de dados local (IndexedDB, via Dexie).
 * Tudo fica no navegador deste computador. Nada é enviado a servidores.
 */
import Dexie, { type Table } from 'dexie';
import type { PublicationType } from './extract';

export type Role = 'admin' | 'usuario';

export type User = {
  id: string;
  email: string;
  name: string;
  cpf: string;
  oab: string;
  oabUf: string;
  phone: string;
  role: Role;
  /** Campo legado (versões com planos). O app é gratuito e completo. */
  planId?: string;
  passwordHash: string;
  passwordSalt: string;
  totpSecret?: string;
  logo?: string; // data URL
  avatar?: string; // data URL
  active: boolean;
  createdAt: string;
};

export type TermKind = 'parte' | 'processo' | 'cpf' | 'cnpj' | 'licitacao' | 'termo';

export type Term = {
  id: string;
  userId: string;
  kind: TermKind;
  value: string;
  label?: string;
  active: boolean;
  createdAt: string;
};

export type Deadline = {
  days: number;
  corridos: boolean;
  basis: 'extraido' | 'presumido' | 'manual';
  publishedAt: string;
  startAt: string;
  endAt: string;
};

export type Publication = {
  id: string;
  userId: string;
  source: string; // id da fonte
  origin: string; // nome legível da fonte (ex.: DJEN)
  availableAt: string; // disponibilização (AAAA-MM-DD)
  publishedAt: string; // publicação (AAAA-MM-DD)
  processNumber?: string;
  parties: string[];
  lawyers: string[];
  court?: string; // tribunal
  vara?: string;
  comarca?: string;
  organ?: string; // órgão emissor
  type: PublicationType;
  sourceType?: string;
  text: string;
  link?: string;
  matchedBy: string[];
  deadline?: Deadline;
  read: boolean;
  favorite: boolean;
  note?: string;
  createdAt: string;
};

export type WorkspaceItem = {
  id: string;
  userId: string;
  kind: 'consulta' | 'painel' | 'processo';
  name: string;
  filters?: Filters;
  processNumber?: string;
  note?: string;
  createdAt: string;
};

export type Filters = {
  q?: string;
  processNumber?: string;
  party?: string;
  court?: string;
  vara?: string;
  comarca?: string;
  from?: string;
  to?: string;
  read?: 'todos' | 'lidos' | 'nao-lidos';
  type?: string;
  origin?: string;
  favorites?: boolean;
};

export type AppNotification = {
  id: string;
  userId: string;
  kind: 'intimacao' | 'publicacao' | 'prazo' | 'licitacao' | 'sistema';
  title: string;
  body: string;
  publicationId?: string;
  read: boolean;
  createdAt: string;
};

export type RunLog = {
  id: string;
  userId: string;
  source: string;
  query: string;
  startedAt: string;
  finishedAt?: string;
  status: 'ok' | 'erro' | 'ignorado';
  found: number;
  created: number;
  error?: string;
};

export type AuditLog = { id: string; at: string; userId?: string; action: string; detail?: string };

/** Legado: tabela mantida só para abrir bancos e backups antigos. */
export type Plan = { id: string; name: string; price: number; maxTerms: number; features: string[]; active: boolean };

export type Snapshot = { id: string; createdAt: string; label: string; size: number; data: string };

export type Setting = { key: string; value: unknown };

export type StoredFile = { name: string; type: string; content: string; updatedAt: string };

class NeaDB extends Dexie {
  users!: Table<User, string>;
  terms!: Table<Term, string>;
  publications!: Table<Publication, string>;
  workspace!: Table<WorkspaceItem, string>;
  notifications!: Table<AppNotification, string>;
  runs!: Table<RunLog, string>;
  audit!: Table<AuditLog, string>;
  plans!: Table<Plan, string>;
  snapshots!: Table<Snapshot, string>;
  settings!: Table<Setting, string>;
  files!: Table<StoredFile, string>;

  constructor() {
    super('nao-esquece-adv');
    this.version(1).stores({
      users: 'id, &email, role',
      terms: 'id, userId, kind',
      publications: 'id, userId, availableAt, processNumber, read, [userId+read]',
      workspace: 'id, userId, kind',
      notifications: 'id, userId, read, createdAt',
      runs: 'id, userId, startedAt, source',
      audit: 'id, at, userId',
      plans: 'id',
      snapshots: 'id, createdAt',
      settings: 'key',
      files: 'name',
    });
  }
}

export const db = new NeaDB();

/** Tabelas incluídas no backup (snapshots ficam de fora para o arquivo não crescer sem limite). */
export const BACKUP_TABLES = ['users', 'terms', 'publications', 'workspace', 'notifications', 'runs', 'audit', 'settings', 'files'] as const;

export function uid(prefix = ''): string {
  return prefix + (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
}

export function nowIso(): string {
  return new Date().toISOString();
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export async function audit(action: string, detail?: string, userId?: string): Promise<void> {
  await db.audit.add({ id: uid('a_'), at: nowIso(), userId, action, detail });
}

/** O app é gratuito e completo (versão full): não há planos nem limites. Remove planos de versões antigas. */
export async function ensureSeed(): Promise<void> {
  if ((await db.plans.count()) > 0) await db.plans.clear();
}
