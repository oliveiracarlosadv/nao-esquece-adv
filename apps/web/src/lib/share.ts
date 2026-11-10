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
