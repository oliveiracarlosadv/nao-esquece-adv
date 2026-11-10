import { audit, getSetting, setSetting } from './db';
import { TERMOS_VERSAO } from './termos';

export type Aceite = { versao: string; em: string };

export async function termosAceitos(): Promise<boolean> {
  const a = await getSetting<Aceite | null>('termos.aceite', null);
  return a?.versao === TERMOS_VERSAO;
}

export async function aceitarTermos(userId?: string): Promise<void> {
  await setSetting('termos.aceite', { versao: TERMOS_VERSAO, em: new Date().toISOString() });
  await audit('termos.aceitos', `versão ${TERMOS_VERSAO}`, userId);
}
