'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlarmClock, BookmarkPlus, CheckCheck, Download, Filter, Inbox, Mail, RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { db, type Filters, type Publication } from '@/lib/db';
import { businessDaysUntil } from '@/lib/deadline';
import { applyFilters, countActive, distinct, sortPublications } from '@/lib/filters';
import { todayIso } from '@/lib/format';
import { useMonitor } from '@/components/AppShell';
import { ExportDialog, FiltersForm, PublicationDrawer, PublicationTable, SaveWorkspaceDialog, ShareDialog, setRead } from '@/components/publications';
import { Button, Card, Empty, PageHeader, Spinner, Stat } from '@/components/ui';

const PAGE = 50;

function Painel() {
  const { user } = useAuth();
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

  // Busca global (topo) e consultas salvas chegam pela URL.
  useEffect(() => {
    const q = params.get('q') || undefined;
    const campo = params.get('campo');
    const saved = params.get('filtros');
    if (saved) {
      try {
        setFilters(JSON.parse(saved));
        return;
      } catch {}
    }
    if (campo === 'parte') setFilters((f) => ({ ...f, q: undefined, party: q }));
    else if (campo === 'processo') setFilters((f) => ({ ...f, q: undefined, processNumber: q }));
    else setFilters((f) => ({ ...f, q }));
  }, [params]);

  const all = useLiveQuery(() => (user ? db.publications.where('userId').equals(user.id).toArray() : []), [user?.id]);
  const rows = useMemo(() => sortPublications(applyFilters(all || [], filters)), [all, filters]);
  const open = useMemo(() => (openId ? (all || []).find((p) => p.id === openId) || null : null), [all, openId]);

  useEffect(() => {
    if (open && !open.read) setRead([open.id], true);
  }, [open?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !all) return <div className="py-20 text-center text-soft"><Spinner /></div>;

  const today = todayIso();
  const unread = all.filter((p) => !p.read).length;
  const urgent = all.filter((p) => p.deadline && (() => { const d = businessDaysUntil(p.deadline!.endAt, today); return d >= 0 && d <= 3; })()).length;
  const todayCount = all.filter((p) => p.availableAt === today || p.createdAt.slice(0, 10) === today).length;
  const active = countActive(filters);
  const selectedRows = rows.filter((r) => selected.has(r.id));

  return (
    <>
      <PageHeader
        title="Publicações"
        subtitle="Tudo o que foi encontrado nas fontes monitoradas, em um só lugar."
        actions={
          <>
            <Button icon={running ? <Spinner /> : <RefreshCw size={16} />} onClick={runNow} disabled={running}>
              {running ? 'Buscando…' : 'Buscar agora'}
            </Button>
            <Button icon={<BookmarkPlus size={16} />} onClick={() => setSaving(true)}>
              Salvar na área de trabalho
            </Button>
            <Button variant="primary" icon={<Download size={16} />} onClick={() => setExporting(selectedRows)}>
              Exportar
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Não lidas" value={unread} tone="brand" icon={<Mail size={16} />} />
        <Stat label="Prazos em até 3 dias úteis" value={urgent} tone={urgent ? 'red' : undefined} icon={<AlarmClock size={16} />} />
        <Stat label="Novas hoje" value={todayCount} icon={<Inbox size={16} />} />
        <Stat label="Total monitorado" value={all.length} icon={<CheckCheck size={16} />} />
      </div>

      <Card className="overflow-hidden" >
        <div className="-m-5">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <Button size="sm" variant={showFilters || active ? 'primary' : 'secondary'} icon={<SlidersHorizontal size={15} />} onClick={() => setShowFilters((s) => !s)}>
              Filtros{active ? ` (${active})` : ''}
            </Button>
            {(['todos', 'nao-lidos', 'lidos'] as const).map((r) => (
              <Button key={r} size="sm" variant={(filters.read || 'todos') === r ? 'secondary' : 'ghost'} className={(filters.read || 'todos') === r ? 'bg-muted' : ''} onClick={() => setFilters({ ...filters, read: r })}>
                {r === 'todos' ? 'Todas' : r === 'lidos' ? 'Lidas' : 'Não lidas'}
              </Button>
            ))}
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
            <div className="ml-auto flex items-center gap-2 text-xs text-soft">
              {selected.size > 0 && (
                <>
                  <span>{selected.size} selecionada(s)</span>
                  <Button size="sm" onClick={() => setRead([...selected], true)}>Marcar como lido</Button>
                  <Button size="sm" onClick={() => setRead([...selected], false)}>Marcar como não lido</Button>
                </>
              )}
              {!selected.size && <span>{rows.length} resultado(s)</span>}
            </div>
          </div>
          {showFilters && (
            <div className="border-b border-line bg-app/60 px-4 py-4">
              <FiltersForm value={filters} onChange={setFilters} courts={distinct(all, 'court')} origins={distinct(all, 'origin')} />
            </div>
          )}

          {rows.length === 0 ? (
            <Empty
              icon={<Inbox size={36} strokeWidth={1.4} />}
              title={all.length ? 'Nenhuma publicação com esses filtros' : 'Nenhuma publicação ainda'}
              text={all.length ? 'Ajuste ou limpe os filtros.' : 'Cadastre seus processos e partes em Monitoramento. A busca automática roda a cada hora.'}
              action={!all.length && <Button variant="primary" onClick={runNow} disabled={running}>Buscar agora</Button>}
            />
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
      {exporting && <ExportDialog open onClose={() => setExporting(null)} all={all} current={filters} selected={exporting} user={user} />}
      <SaveWorkspaceDialog open={saving} onClose={() => setSaving(false)} filters={filters} user={user} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Painel />
    </Suspense>
  );
}
