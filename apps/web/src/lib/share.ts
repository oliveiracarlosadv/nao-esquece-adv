/**
 * Compartilhar o TEOR de uma publicação, em texto: tipo, processo, partes, tribunal/vara,
 * comarca, datas, fim do prazo e o inteiro teor completo. Sem imagem e sem PDF.
 */
import type { Publication } from './db';
import { shareText } from './notify';

/** Abre o compartilhamento do aparelho. Retorna 'compartilhado' | 'cancelado' | 'sem-suporte'. */
export async function shareTeor(p: Publication): Promise<'compartilhado' | 'cancelado' | 'sem-suporte'> {
  if (!navigator.share) return 'sem-suporte';
  try {
    await navigator.share({ title: `${p.type}${p.processNumber ? ` — ${p.processNumber}` : ''}`, text: shareText(p) });
    return 'compartilhado';
  } catch (e) {
    return (e as Error).name === 'AbortError' ? 'cancelado' : 'sem-suporte';
  }
}

/** Compartilha um arquivo (ex.: PDF da intimação). Sem suporte a arquivos, baixa o arquivo. */
export async function shareFile(blob: Blob, name: string, title: string, text?: string): Promise<'compartilhado' | 'cancelado' | 'baixado'> {
  const file = new File([blob], name, { type: blob.type || 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return 'compartilhado';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelado';
    }
  }
  const { downloadBlob } = await import('./format');
  downloadBlob(blob, name);
  return 'baixado';
}
