/**
 * Central de notificações.
 * - No sistema: tabela `notifications` (sino no topo).
 * - Push: notificação do sistema operacional via Notification API / Service Worker.
 * - E-mail: abre o programa de e-mail do PC com o resumo pronto (sem servidor).
 * - WhatsApp: link de compartilhamento (envio automático é integração futura).
 */
import type { Publication } from './db';
import { getSetting } from './db';
import { fmtDate } from './format';

export type NotifyPrefs = { push: boolean; email: boolean; emailTo: string; whatsapp: boolean; whatsappTo: string; kinds: Record<string, boolean> };

export const DEFAULT_NOTIFY: NotifyPrefs = {
  push: true,
  email: false,
  emailTo: '',
  whatsapp: false,
  whatsappTo: '',
  kinds: { intimacao: true, publicacao: true, prazo: true, licitacao: true },
};

export async function getNotifyPrefs(): Promise<NotifyPrefs> {
  return { ...DEFAULT_NOTIFY, ...(await getSetting<Partial<NotifyPrefs>>('notify', {})) };
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

export function summarize(pubs: Publication[]): string {
  return pubs
    .slice(0, 20)
    .map((p) => `• ${p.type} — ${p.processNumber || p.organ || ''} (${p.court || p.origin})${p.deadline ? ` — prazo: ${fmtDate(p.deadline.endAt)}` : ''}`)
    .join('\n');
}

export async function notifyNew(pubs: Publication[]): Promise<void> {
  const prefs = await getNotifyPrefs();
  if (!prefs.push || !('Notification' in window) || Notification.permission !== 'granted') return;
  const title = pubs.length === 1 ? `Nova ${pubs[0].type.toLowerCase()}` : `${pubs.length} novas publicações`;
  const body = summarize(pubs).slice(0, 300);
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.svg`, tag: 'nea-novas' });
    else new Notification(title, { body });
  } catch {
    new Notification(title, { body });
  }
}

export function shareText(p: Publication): string {
  return [
    `NÃO ESQUECE ADV — ${p.type}`,
    p.processNumber && `Processo: ${p.processNumber}`,
    p.parties.length && `Partes: ${p.parties.join(', ')}`,
    `Tribunal/Vara: ${[p.court, p.vara].filter(Boolean).join(' / ')}`,
    p.comarca && `Comarca: ${p.comarca}`,
    `Disponibilização: ${fmtDate(p.availableAt)} · Publicação: ${fmtDate(p.publishedAt)}`,
    p.deadline && `Fim do prazo: ${fmtDate(p.deadline.endAt)} (${p.deadline.days} dias ${p.deadline.corridos ? 'corridos' : 'úteis'})`,
    p.link && `Link: ${p.link}`,
    '',
    p.text.slice(0, 1500),
  ]
    .filter(Boolean)
    .join('\n');
}

export function mailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.slice(0, 1800))}`;
}

export function whatsappLink(text: string, phone?: string): string {
  const p = (phone || '').replace(/\D/g, '');
  return `https://wa.me/${p ? (p.startsWith('55') ? p : `55${p}`) : ''}?text=${encodeURIComponent(text.slice(0, 1800))}`;
}
