'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bookmark, LayoutDashboard, Pin, Search, Star, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { db, nowIso, uid, type Filters, type Publication } from '@/lib/db';
import { maskCnj } from '@/lib/extract';
import { applyFilters } from '@/lib/filters';
import { fmtDate } from '@/lib/format';
import { DeadlineBadge, PublicationDrawer, ShareDialog } from '@/components/publications';
import { Badge, Button, Card, Empty, IconButton, Input, PageHeader } from '@/components/ui';

const link = (f?: Filters) => `/painel/?filtros=${encodeURIComponent(JSON.stringify(f || {}))}`;

export default function AreaDeTrabalho() {
  const { user } = useAuth();
  const items = useLiveQuery(() => (user ? db.workspace.where('userId').equals(user.id).toArray() : []), [user?.id]);
  const pubs = useLiveQuery(() => (user ? db.publications.where('userId').equals(user.id).toArray() : []), [user?.id]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [shareP, setShareP] = useState<Publication | null>(null);
  const [pinValue, setPinValue] = useState('');
  const open = useMemo(() => pubs?.find((p) => p.id === openId) || null, [pubs, openId]);

  if (!user || !items || !pubs) return null;
  const panels = items.filter((i) => i.kind === 'painel');
  const searches = items.filter((i) => i.kind === 'consulta');
  const pinned = items.filter((i) => i.kind === 'processo');
  const favorites = pubs.filter((p) => p.favorite).sort((a, b) => b.availableAt.localeCompare(a.availableAt));

  const pin = async () => {
    if (!pinValue.trim()) return;
    await db.workspace.add({ id: uid('w_'), userId: user.id, kind: 'processo', name: maskCnj(pinValue), processNumber: maskCnj(pinValue), createdAt: nowIso() });
    setPinValue('');
  };

  return (
    <>
      <PageHeader title="Área de trabalho" subtitle="Seus painéis, consultas, processos fixados e publicações salvas." />

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-soft"><LayoutDashboard size={16} /> Painéis personalizados</h2>
        {panels.length === 0 ? (
          <p className="text-sm text-faint">Crie um painel no Painel principal com “Salvar na área de trabalho” → Painel personalizado.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {panels.map((p) => {
              const list = applyFilters(pubs, p.filters || {});
              const unread = list.filter((x) => !x.read).length;
              return (
                <div key={p.id} className="group relative rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand-500">
                  <Link href={link(p.filters)} className="absolute inset-0" aria-label={`Abrir ${p.name}`} />
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-ink">{p.name}</p>
                    <IconButton label="Excluir painel" className="relative z-10 opacity-0 group-hover:opacity-100" onClick={() => db.workspace.delete(p.id)}><Trash2 size={15} /></IconButton>
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{list.length}</p>
                  <p className="text-xs text-soft">{unread} não lida(s)</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Consultas e filtros salvos" action={<Search size={16} className="text-faint" />}>
          {searches.length === 0 ? (
            <p className="text-sm text-faint">Nenhuma consulta salva.</p>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {searches.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <Link href={link(s.filters)} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink hover:text-brand-600">{s.name}</p>
                    <p className="truncate text-xs text-faint">{Object.entries(s.filters || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'sem filtros'}</p>
                  </Link>
                  <Badge>{applyFilters(pubs, s.filters || {}).length}</Badge>
                  <IconButton label="Excluir" onClick={() => db.workspace.delete(s.id)}><Trash2 size={15} /></IconButton>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Processos fixados" action={<Pin size={16} className="text-faint" />}>
          <div className="mb-4 flex gap-2">
            <Input value={pinValue} onChange={(e) => setPinValue(e.target.value)} placeholder="Número do processo" onKeyDown={(e) => e.key === 'Enter' && pin()} />
            <Button onClick={pin}>Fixar</Button>
          </div>
          {pinned.length === 0 ? (
            <p className="text-sm text-faint">Fixe os processos importantes para acompanhar de perto.</p>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {pinned.map((w) => {
                const related = pubs.filter((p) => p.processNumber && w.processNumber && p.processNumber.replace(/\D/g, '') === w.processNumber.replace(/\D/g, ''));
                const latest = related.sort((a, b) => b.availableAt.localeCompare(a.availableAt))[0];
                return (
                  <li key={w.id} className="flex items-center gap-3 py-2.5">
                    <Link href={link({ processNumber: w.processNumber })} className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[13px] font-medium text-ink hover:text-brand-600">{w.processNumber}</p>
                      <p className="truncate text-xs text-faint">{w.name !== w.processNumber ? `${w.name} · ` : ''}{related.length} publicação(ões){latest ? ` · última em ${fmtDate(latest.availableAt)}` : ''}</p>
                    </Link>
                    <IconButton label="Desafixar" onClick={() => db.workspace.delete(w.id)}><Trash2 size={15} /></IconButton>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card title={`Publicações salvas (${favorites.length})`} action={<Star size={16} className="text-faint" />} className="mt-6">
        {favorites.length === 0 ? (
          <Empty icon={<Bookmark size={30} strokeWidth={1.4} />} title="Nenhuma publicação salva" text="Use a estrela no painel para guardar publicações importantes." />
        ) : (
          <ul className="-my-2 divide-y divide-line">
            {favorites.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(p.id)}>
                  <p className="text-sm font-medium text-ink"><Badge tone="brand" className="mr-2">{p.type}</Badge><span className="font-mono">{p.processNumber || p.organ}</span></p>
                  <p className="mt-1 truncate text-xs text-soft">{p.court} · {p.parties.join(' × ')}</p>
                </button>
                <DeadlineBadge p={p} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      {open && <PublicationDrawer p={open} user={user} onClose={() => setOpenId(null)} onShare={setShareP} />}
      <ShareDialog p={shareP} onClose={() => setShareP(null)} />
    </>
  );
}
