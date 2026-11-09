/**
 * Backup dos dados locais.
 * - Ponto de restauração: cópia guardada dentro do próprio navegador.
 * - Exportar: baixa um arquivo .json (opcionalmente criptografado com senha).
 * - Importar: restaura um arquivo exportado (substituindo ou mesclando).
 */
import { BACKUP_TABLES, db, nowIso, uid } from './db';
import { decryptText, encryptText, type EncryptedPayload } from './crypto';
import { downloadBlob } from './format';

export const BACKUP_FORMAT = 'nao-esquece-adv-backup';
export const BACKUP_VERSION = 1;

type TableName = (typeof BACKUP_TABLES)[number];
export type BackupData = { format: typeof BACKUP_FORMAT; version: number; createdAt: string; app: string; tables: Record<TableName, unknown[]> };
type BackupFile = BackupData | { format: typeof BACKUP_FORMAT; version: number; createdAt: string; encrypted: EncryptedPayload };

export async function collect(): Promise<BackupData> {
  const tables = {} as Record<TableName, unknown[]>;
  for (const name of BACKUP_TABLES) tables[name] = await db.table(name).toArray();
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: nowIso(), app: 'NÃO ESQUECE ADV', tables };
}

export async function counts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const name of BACKUP_TABLES) out[name] = await db.table(name).count();
  return out;
}

/* ---------------------------------------------------------- Pontos de restauração */

export async function createSnapshot(label = 'Ponto de restauração'): Promise<void> {
  const data = JSON.stringify(await collect());
  await db.snapshots.add({ id: uid('s_'), createdAt: nowIso(), label, size: data.length, data });
  // Mantém os 15 mais recentes
  const all = await db.snapshots.orderBy('createdAt').reverse().toArray();
  for (const s of all.slice(15)) await db.snapshots.delete(s.id);
}

export async function restoreSnapshot(id: string): Promise<void> {
  const snap = await db.snapshots.get(id);
  if (!snap) throw new Error('Ponto de restauração não encontrado.');
  await restore(JSON.parse(snap.data) as BackupData, 'substituir');
}

/* ---------------------------------------------------------- Arquivo */

export async function exportBackup(password?: string): Promise<string> {
  const data = await collect();
  const stamp = data.createdAt.slice(0, 16).replace(/[:T]/g, '-');
  let file: BackupFile = data;
  if (password) file = { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: data.createdAt, encrypted: await encryptText(JSON.stringify(data), password) };
  const name = `nao-esquece-adv_backup_${stamp}${password ? '_protegido' : ''}.json`;
  downloadBlob(new Blob([JSON.stringify(file)], { type: 'application/json' }), name);
  return name;
}

export async function readBackupFile(file: File, password?: string): Promise<BackupData> {
  const parsed = JSON.parse(await file.text()) as BackupFile;
  if (parsed?.format !== BACKUP_FORMAT) throw new Error('Este arquivo não é um backup do NÃO ESQUECE ADV.');
  if ('encrypted' in parsed) {
    if (!password) throw new NeedsPassword();
    try {
      return JSON.parse(await decryptText(parsed.encrypted, password)) as BackupData;
    } catch {
      throw new Error('Senha do backup incorreta.');
    }
  }
  return parsed;
}

export class NeedsPassword extends Error {
  constructor() {
    super('Este backup é protegido por senha.');
  }
}

export async function restore(data: BackupData, mode: 'substituir' | 'mesclar'): Promise<void> {
  if (data.version > BACKUP_VERSION) throw new Error('Backup criado por uma versão mais nova do app.');
  const tables = BACKUP_TABLES.map((n) => db.table(n));
  await db.transaction('rw', tables, async () => {
    for (const name of BACKUP_TABLES) {
      const rows = data.tables[name] || [];
      if (mode === 'substituir') await db.table(name).clear();
      if (rows.length) await db.table(name).bulkPut(rows);
    }
  });
}

/** Lembrete: dias desde o último backup exportado. */
export async function daysSinceLastExport(): Promise<number | null> {
  const row = await db.settings.get('backup.lastExport');
  if (!row) return null;
  return Math.floor((Date.now() - new Date(String(row.value)).getTime()) / 86400000);
}
