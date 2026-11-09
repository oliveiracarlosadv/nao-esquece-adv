/**
 * Página "Sobre": conteúdo carregado automaticamente de uma pasta de arquivos.
 *
 * 1. Pasta padrão do projeto: `conteudo/sobre/` (copiada para o app no build).
 * 2. Pasta escolhida pelo administrador no computador (Painel Administrativo → Sobre).
 *    Os arquivos são lidos e guardados no navegador; com Chrome/Edge a pasta é relida sozinha.
 *
 * Formatos aceitos: .md, .txt, .html e imagens (.jpg, .png, .svg, .webp) referenciadas nos textos.
 */
import { marked } from 'marked';
import { db, getSetting, setSetting, type StoredFile } from './db';
import generated from '@/generated/sobre.json';

export type SobreDoc = { name: string; html: string };

const TEXT_RE = /\.(md|markdown|txt|html?)$/i;
const IMG_RE = /\.(jpe?g|png|svg|webp|gif)$/i;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Remove scripts e atributos de evento do HTML (o conteúdo vem de arquivos do próprio escritório). */
function sanitize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

export function renderFile(name: string, content: string, resolve: (src: string) => string): string {
  let html: string;
  if (/\.html?$/i.test(name)) html = content;
  else if (/\.txt$/i.test(name)) html = content.split(/\n\s*\n/).map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
  else html = marked.parse(content, { async: false }) as string;
  html = html.replace(/(<img[^>]*\ssrc=")([^"]+)(")/gi, (_m, a, src, b) => `${a}${/^(https?:|data:)/.test(src) ? src : resolve(src)}${b}`);
  return sanitize(html);
}

function build(files: { name: string; content: string }[], resolve: (src: string) => string): SobreDoc[] {
  return files
    .filter((f) => TEXT_RE.test(f.name) && !/^leia-?me/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }))
    .map((f) => ({ name: f.name, html: renderFile(f.name, f.content, resolve) }));
}

/** Conteúdo padrão que veio da pasta `conteudo/sobre` no build. */
export function defaultDocs(): SobreDoc[] {
  const base = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/conteudo-sobre/`;
  return build(generated.files, (src) => base + src.replace(/^\.?\//, ''));
}

/** Conteúdo da pasta escolhida no painel administrativo (guardado no navegador). */
export async function customDocs(): Promise<SobreDoc[] | null> {
  const files = await db.files.toArray();
  if (!files.some((f) => TEXT_RE.test(f.name))) return null;
  const images = new Map(files.filter((f) => IMG_RE.test(f.name)).map((f) => [f.name.toLowerCase(), f.content]));
  return build(files, (src) => images.get(src.replace(/^\.?\//, '').toLowerCase()) || src);
}

async function readFile(file: File): Promise<StoredFile> {
  const content = IMG_RE.test(file.name)
    ? await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); })
    : await file.text();
  return { name: file.name, type: file.type, content, updatedAt: new Date().toISOString() };
}

export async function importFiles(list: File[], folderName: string): Promise<number> {
  const accepted = list.filter((f) => TEXT_RE.test(f.name) || IMG_RE.test(f.name));
  const rows = await Promise.all(accepted.map(readFile));
  await db.transaction('rw', db.files, async () => {
    await db.files.clear();
    await db.files.bulkPut(rows);
  });
  await setSetting('sobre.folder', { name: folderName, syncedAt: new Date().toISOString(), count: rows.length });
  return rows.length;
}

type DirHandle = FileSystemDirectoryHandle & {
  values(): AsyncIterable<FileSystemHandle>;
  queryPermission?(o: { mode: 'read' }): Promise<PermissionState>;
  requestPermission?(o: { mode: 'read' }): Promise<PermissionState>;
};

export function canPickFolder(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

async function readDir(handle: DirHandle): Promise<File[]> {
  const out: File[] = [];
  for await (const entry of handle.values()) if (entry.kind === 'file') out.push(await (entry as FileSystemFileHandle).getFile());
  return out;
}

export async function pickFolder(): Promise<number> {
  const handle = (await (window as unknown as { showDirectoryPicker: (o?: object) => Promise<DirHandle> }).showDirectoryPicker({ mode: 'read' }));
  await setSetting('sobre.handle', handle);
  return importFiles(await readDir(handle), handle.name);
}

/** Relê a pasta configurada, se o navegador ainda tiver permissão. Retorna true se atualizou. */
export async function resyncFolder(ask = false): Promise<boolean> {
  const handle = await getSetting<DirHandle | null>('sobre.handle', null);
  if (!handle?.queryPermission) return false;
  let perm = await handle.queryPermission({ mode: 'read' });
  if (perm !== 'granted' && ask && handle.requestPermission) perm = await handle.requestPermission({ mode: 'read' });
  if (perm !== 'granted') return false;
  await importFiles(await readDir(handle), handle.name);
  return true;
}

export async function clearFolder(): Promise<void> {
  await db.files.clear();
  await db.settings.bulkDelete(['sobre.folder', 'sobre.handle']);
}
