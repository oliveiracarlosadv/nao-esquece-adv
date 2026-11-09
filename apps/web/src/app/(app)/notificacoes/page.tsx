'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, BellRing, CheckCheck, Gavel, Landmark, Mail, MessageCircle, Timer, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { db, setSetting } from '@/lib/db';
import { cx, fmtDateTime } from '@/lib/format';
import { DEFAULT_NOTIFY, getNotifyPrefs, mailtoLink, requestPushPermission, whatsappLink, type NotifyPrefs } from '@/lib/notify';
import { useUi } from '@/components/Providers';
import { Badge, Button, Card, Empty, Field, IconButton, Input, PageHeader, Toggle } from '@/components/ui';

const ICONS = { intimacao: Gavel, publicacao: Bell, prazo: Timer, licitacao: Landmark, sistema: BellRing } as const;

export default function Notificacoes() {
  const { user } = useAuth();
  const { toast } = useUi();
  const list = useLiveQuery(() => (user ? db.notifications.where('userId').equals(user.id).reverse().sortBy('createdAt') : []), [user?.id]);
  const [prefs, setPrefs] = useState<NotifyPrefs>(DEFAULT_NOTIFY);
  const [perm, setPerm] = useState<string>('default');

  useEffect(() => {
    getNotifyPrefs().then(setPrefs);
    if ('Notification' in window) setPerm(Notification.permission);
  }, []);

  if (!user || !list) return null;
  const unread = list.filter((n) => !n.read);

  const save = async (p: NotifyPrefs) => {
    setPrefs(p);
    await setSetting('notify', p);
  };

  const summary = unread.map((n) => `• ${n.title}: ${n.body}`).join('\n') || 'Sem novidades.';

  return (
    <>
      <PageHeader
        title="Notificações"
        subtitle="Avisos de novas intimações, publicações, prazos e licitações."
        actions={
          unread.length > 0 && (
            <Button icon={<CheckCheck size={16} />} onClick={() => db.notifications.where('userId').equals(user.id).modify({ read: true })}>
              Marcar todas como lidas
            </Button>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="min-w-0 overflow-hidden">
          <div className="-m-5">
            {list.length === 0 ? (
              <Empty icon={<Bell size={32} strokeWidth={1.4} />} title="Nenhuma notificação" text="Quando o monitoramento encontrar algo novo, aparece aqui." />
            ) : (
              <ul className="divide-y divide-line">
                {list.slice(0, 300).map((n) => {
                  const Icon = ICONS[n.kind] || Bell;
                  return (
                    <li key={n.id} className={cx('flex items-start gap-3 px-5 py-3.5', !n.read && 'bg-brand-50/40 dark:bg-brand-600/[0.06]')}>
                      <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', n.kind === 'licitacao' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15' : 'bg-brand-50 text-brand-600 dark:bg-brand-600/15')}>
                        <Icon size={16} />
                      </span>
                      <Link href={n.publicationId ? `/painel/?q=${encodeURIComponent(n.body.split(' — ')[0])}` : '#'} onClick={() => db.notifications.update(n.id, { read: true })} className="min-w-0 flex-1">
                        <p className={cx('text-sm', n.read ? 'text-soft' : 'font-semibold text-ink')}>{n.title}</p>
                        <p className="truncate text-sm text-soft">{n.body}</p>
                        <p className="mt-0.5 text-xs text-faint">{fmtDateTime(n.createdAt)}</p>
                      </Link>
                      <IconButton label="Excluir" onClick={() => db.notifications.delete(n.id)}><Trash2 size={15} /></IconButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Canais">
            <div className="divide-y divide-line">
              <div className="pb-3">
                <Toggle checked label="No sistema" description="Sempre ativo (sino no topo)." onChange={() => undefined} />
              </div>
              <div className="py-3">
                <Toggle checked={prefs.push} onChange={(v) => save({ ...prefs, push: v })} label="Push (notificação do computador)" description={perm === 'granted' ? 'Permitido neste navegador.' : perm === 'denied' ? 'Bloqueado nas configurações do navegador.' : 'Precisa de permissão.'} />
                {perm !== 'granted' && perm !== 'denied' && (
                  <Button size="sm" className="mt-2" onClick={async () => setPerm(await requestPushPermission())}>Permitir notificações</Button>
                )}
              </div>
              <div className="space-y-2 py-3">
                <Toggle checked={prefs.email} onChange={(v) => save({ ...prefs, email: v })} label="E-mail" description="Abre seu programa de e-mail com o resumo pronto." />
                {prefs.email && (
                  <>
                    <Field label="Enviar para"><Input value={prefs.emailTo} onChange={(e) => save({ ...prefs, emailTo: e.target.value })} placeholder={user.email} /></Field>
                    <a className="inline-flex items-center gap-2 text-sm text-brand-600" href={mailtoLink(prefs.emailTo || user.email, `Não Esquece Adv — ${unread.length} novidade(s)`, summary)}><Mail size={15} /> Enviar resumo agora</a>
                  </>
                )}
              </div>
              <div className="space-y-2 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">WhatsApp</span>
                  <Badge>Integração futura</Badge>
                </div>
                <p className="text-xs text-soft">Envio automático virá com a API oficial do WhatsApp Business. Por enquanto, envie o resumo manualmente:</p>
                <a className="inline-flex items-center gap-2 text-sm text-brand-600" target="_blank" rel="noreferrer" href={whatsappLink(`Não Esquece Adv — novidades:\n${summary}`, user.phone)}><MessageCircle size={15} /> Enviar resumo pelo WhatsApp</a>
              </div>
            </div>
          </Card>
          <Card title="Avisar quando houver">
            {([
              ['intimacao', 'Nova intimação ou citação'],
              ['publicacao', 'Nova publicação'],
              ['prazo', 'Novo prazo'],
              ['licitacao', 'Nova licitação relacionada'],
            ] as const).map(([k, label]) => (
              <Toggle key={k} checked={prefs.kinds[k] !== false} onChange={(v) => save({ ...prefs, kinds: { ...prefs.kinds, [k]: v } })} label={label} />
            ))}
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => toast('Preferências salvas automaticamente.')}>Salvo</Button>
          </Card>
        </div>
      </div>
    </>
  );
}
