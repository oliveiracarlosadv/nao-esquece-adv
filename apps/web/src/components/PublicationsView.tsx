'use client';
/**
 * Lista de publicações usada em duas telas:
 * - Painel (mode "nao-lidas"): só o que ainda não foi lido.
 * - Intimações lidas (mode "lidas"): tudo o que já foi lido.
 *
 * Rotina de leitura: ao abrir uma publicação (ou marcá-la como lida), ela sai do Painel
 * e passa a aparecer em Intimações lidas. "Marcar como não lida" devolve ao Painel.
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlarmClock, BookmarkPlus, CheckCheck, Download, Filter, Inbox, Mail, RefreshCw, SlidersHorizontal, Undo2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { db, type Filters, type Publication } from '@/lib/db';
import { businessDaysUntil } from '@/lib/deadline';
import { applyFilters, countActive, distinct, sortPublications } from '@/lib/filters';
import { cx, todayIso } from '@/lib/format';
import { useMonitor } from './AppShell';
import { useUi } from './Providers';
import { ExportDialog, FiltersForm, PublicationDrawer, PublicationTable, SaveWorkspaceDialog, ShareDialog, setRead } from './publications';
import { Button, Card, Empty, PageHeader, Spinner, Stat } from './ui';

const PAGE = 50;

export type ViewMode = 'nao-lidas' | 'lidas';

export function PublicationsView({ mode }: { mode: ViewMode }) {
  const { user } = useAuth();
  const { toast } = useUi();
  const params = useSearchParams();
  const { running, runNow } = useMonitor();
  const [filters, setFilters] = useState<Filters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [shareP, setShareP] = useState<Publication | null>(null);
  const [exporting, setExporting] = useState<Publication[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const lidas = mode === 'lidas';

  // Busca global (topo), consultas salvas e links de notificação chegam pela URL.
  useEffect(() => {
    const q = params.get('q') || undefined;
    const campo = params.get('campo');
    const saved = params.get('filtros');
    const abrir = params.get('abrir');
    if (abrir) setOpenId(abrir);
    if (saved) {
      try {
        const { read: _r, ...f } = JSON.parse(saved) as Filters;
        setFilters(f);
        return;
      } catch {}
    }
    if (campo === 'parte') setFilters({ party: q });
    else if (campo === 'processo') setFilters({ processNumber: q });
    else setFilters(q ? { q } : {});
  }, [params]);

  useEffect(() => setSelected(new Set()), [mode]);

  const all = useLiveQuery(() => (user ? db.publications.where('userId').equals(user.id).toArray() : []), [user?.id]);
  const base = useMemo(() => (all || []).filter((p) => p.read === lidas), [all, lidas]);
  const rows = useMemo(() => {
    const list = applyFilters(base, filters);
    return lidas ? [...list].sort((a, b) => b.availableAt.localeCompare(a.availableAt)) : sortPublications(list);
  }, [base, filters, lidas]);
  // Resultados da mesma busca na outra lista (ex.: buscou algo que já foi lido).
  const otherMatches = useMemo(() => {
    if (!filters.q && !filters.party && !filters.processNumber) return 0;
    return applyFilters((all || []).filter((p) => p.read !== lidas), filters).length;
  }, [all, filters, lidas]);
  const open = useMemo(() => (openId ? (all || []).find((p) => p.id === openId) || null : null), [all, openId]);

  // Rotina de leitura: abrir uma publicação não lida a marca como lida (vai para "Intimações lidas").
  useEffect(() => {
    if (open && !open.read) {
      setRead([open.id], true);
      toast('Lida. Ela agora fica em “Intimações lidas”.');
    }
  }, [open?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !all) return <div className="py-20 text-center text-soft"><Spinner /></div>;

  const today = todayIso();
  const unreadCount = all.length - all.filter((p) => p.read).length;
  const readCount = all.length - unreadCount;
  const urgent = base.filter((p) => p.deadline && (() => { const d = businessDaysUntil(p.deadline!.endAt, today); return d >= 0 && d <= 3; })()).length;
  const todayCount = base.filter((p) => p.availableAt === today || p.createdAt.slice(0, 10) === today).length;
  const active = countActive(filters);
  const selectedRows = rows.filter((r) => selected.has(r.id));
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v).map(([k, v]) => [k === 'q' ? 'q' : 'filtros', k === 'q' ? String(v) : JSON.stringify(filters)])).toString();

  const moveSelected = async (read: boolean) => {
    await setRead([...selected], read);
    toast(read ? `${selected.size} movida(s) para Intimações lidas.` : `${selected.size} devolvida(s) ao Painel.`);
    setSelected(new Set());
  };

  return (
    <>
      <PageHeader
        title={lidas ? 'Intimações lidas' : 'Publicações não lidas'}
        subtitle={lidas ? 'Tudo o que você já leu. Use “Marcar como não lida” para devolver ao Painel.' : 'Ao ler uma publicação, ela sai daqui e vai para Intimações lidas.'}
        actions={
          <>
            {!lidas && (
              <Button icon={running ? <Spinner /> : <RefreshCw size={16} />} onClick={runNow} disabled={running}>
                {running ? 'Buscando…' : 'Buscar agora'}
              </Button>
            )}
            <Button icon={<BookmarkPlus size={16} />} onClick={() => setSaving(true)}>
              Salvar consulta
            </Button>
            <Button variant="primary" icon={<Download size={16} />} onClick={() => setExporting(selectedRows)}>
              Exportar
            </Button>
          </>
        }
      />

      {!lidas && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Não lidas" value={unreadCount} tone="brand" icon={<Mail size={16} />} />
          <Stat label="Prazos em até 3 dias úteis" value={urgent} tone={urgent ? 'red' : undefined} icon={<AlarmClock size={16} />} />
          <Stat label="Novas hoje" value={todayCount} icon={<Inbox size={16} />} />
          <Stat label="Lidas" value={readCount} icon={<CheckCheck size={16} />} />
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="-m-5">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <div className="flex rounded-lg bg-muted p-0.5 text-[13px] font-medium">
              <Link href="/painel/" className={cx('rounded-md px-3 py-1.5', !lidas ? 'bg-surface text-ink shadow-sm' : 'text-soft hover:text-ink')}>
                Não lidas <span className="text-faint">{unreadCount}</span>
              </Link>
              <Link href="/lidas/" className={cx('rounded-md px-3 py-1.5', lidas ? 'bg-surface text-ink shadow-sm' : 'text-soft hover:text-ink')}>
                Lidas <span className="text-faint">{readCount}</span>
              </Link>
            </div>
            <Button size="sm" variant={showFilters || active ? 'primary' : 'secondary'} icon={<SlidersHorizontal size={15} />} onClick={() => setShowFilters((s) => !s)}>
              Filtros{active ? ` (${active})` : ''}
            </Button>
            {filters.q && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-soft">
                <Filter size={12} /> “{filters.q}”
                <button onClick={() => setFilters({ ...filters, q: undefined })} aria-label="Limpar busca"><X size={12} /></button>
              </span>
            )}
            {(active > 0 || filters.q) && (
              <Button size="sm" variant="ghost" onClick={() => setFilters({})}>
                Limpar
              </Button>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-soft">
              {selected.size > 0 ? (
                <>
                  <span>{selected.size} selecionada(s)</span>
                  {lidas ? (
                    <Button size="sm" icon={<Undo2 size={14} />} onClick={() => moveSelected(false)}>Marcar como não lida</Button>
                  ) : (
                    <Button size="sm" icon={<CheckCheck size={14} />} onClick={() => moveSelected(true)}>Marcar como lida</Button>
                  )}
                </>
              ) : (
                <span>{rows.length} resultado(s)</span>
              )}
            </div>
          </div>
          {showFilters && (
            <div className="border-b border-line bg-app/60 px-4 py-4">
              <FiltersForm value={filters} onChange={setFilters} courts={distinct(base, 'court')} origins={distinct(base, 'origin')} hideRead />
            </div>
          )}
          {otherMatches > 0 && (
            <div className="border-b border-line bg-brand-50/50 px-4 py-2.5 text-sm text-soft dark:bg-brand-600/10">
              Também há {otherMatches} resultado(s) em{' '}
              <Link href={`${lidas ? '/painel/' : '/lidas/'}?${qs}`} className="font-medium text-brand-600">
                {lidas ? 'não lidas' : 'Intimações lidas'}
              </Link>
              .
            </div>
          )}

          {rows.length === 0 ? (
            lidas ? (
              <Empty icon={<CheckCheck size={36} strokeWidth={1.4} />} title={base.length ? 'Nenhuma lida com esses filtros' : 'Nenhuma intimação lida ainda'} text="Quando você abrir uma publicação no Painel, ela vem para cá." />
            ) : (
              <Empty
                icon={<Inbox size={36} strokeWidth={1.4} />}
                title={base.length ? 'Nenhuma não lida com esses filtros' : all.length ? 'Tudo lido!' : 'Nenhuma publicação ainda'}
                text={base.length ? 'Ajuste ou limpe os filtros.' : all.length ? 'Nenhuma intimação pendente. As lidas estão em “Intimações lidas”.' : 'Cadastre seus processos e partes em Monitoramento. A busca automática roda a cada hora.'}
                action={!all.length && <Button variant="primary" onClick={runNow} disabled={running}>Buscar agora</Button>}
              />
            )
          ) : (
            <>
              <PublicationTable rows={rows.slice(0, limit)} selected={selected} onSelect={setSelected} onOpen={(p) => setOpenId(p.id)} onShare={setShareP} onExportOne={(p) => setExporting([p])} />
              {rows.length > limit && (
                <div className="border-t border-line p-3 text-center">
                  <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + PAGE)}>
                    Mostrar mais ({rows.length - limit} restantes)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {open && <PublicationDrawer p={open} user={user} onClose={() => setOpenId(null)} onShare={setShareP} />}
      <ShareDialog p={shareP} onClose={() => setShareP(null)} />
      {exporting && <ExportDialog open onClose={() => setExporting(null)} all={all} current={{ ...filters, read: lidas ? 'lidos' : 'nao-lidos' }} selected={exporting} user={user} />}
      <SaveWorkspaceDialog open={saving} onClose={() => setSaving(false)} filters={{ ...filters, read: lidas ? 'lidos' : 'nao-lidos' }} user={user} />
    </>
  );
}
