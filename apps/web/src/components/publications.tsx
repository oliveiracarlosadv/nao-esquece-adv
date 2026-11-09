'use client';
import { useMemo, useState } from 'react';
import {
  Check, Copy, Download, ExternalLink, Eye, EyeOff, FileSpreadsheet, FileText, Mail, MessageCircle, Share2, Star, Table2,
} from 'lucide-react';
import { businessDaysUntil, computeDeadline } from '@/lib/deadline';
import { audit, db, type Filters, type Publication, type User } from '@/lib/db';
import { exportCsv, exportPdf, exportXlsx } from '@/lib/export';
import { applyFilters } from '@/lib/filters';
import { cx, fmtDate, todayIso } from '@/lib/format';
import { mailtoLink, shareText, whatsappLink } from '@/lib/notify';
import { PUBLICATION_TYPES } from '@/lib/extract';
import { useUi } from './Providers';
import { Badge, Button, Drawer, Field, IconButton, Input, Modal, Select, Textarea, Toggle } from './ui';

/* ---------------------------------------------------------------- Prazo */

export function DeadlineBadge({ p }: { p: Publication }) {
  if (!p.deadline) return <span className="text-faint">—</span>;
  const left = businessDaysUntil(p.deadline.endAt, todayIso());
  const tone = left < 0 ? 'neutral' : left <= 2 ? 'red' : left <= 5 ? 'amber' : 'green';
  const label = left < 0 ? 'vencido' : left === 0 ? 'hoje' : `${left} d úteis`;
  return (
    <div className="leading-tight">
      <div className={cx('font-medium', left < 0 ? 'text-faint line-through' : 'text-ink')}>{fmtDate(p.deadline.endAt)}</div>
      <Badge tone={tone} className="mt-0.5">
        {label}
        {p.deadline.basis === 'presumido' && ' · presumido'}
      </Badge>
    </div>
  );
}

/* ---------------------------------------------------------------- Ações */

export async function setRead(ids: string[], read: boolean) {
  await db.publications.where('id').anyOf(ids).modify({ read });
}

export async function toggleFavorite(p: Publication) {
  await db.publications.update(p.id, { favorite: !p.favorite });
}

export async function share(p: Publication, toast: (t: string) => void) {
  const text = shareText(p);
  if (navigator.share) {
    try {
      await navigator.share({ title: `${p.type} — ${p.processNumber || ''}`, text });
      return;
    } catch {
      /* cancelado: cai para copiar */
    }
  }
  await navigator.clipboard.writeText(text);
  toast('Resumo copiado para a área de transferência.');
}

/* ---------------------------------------------------------------- Tabela */

type TableProps = {
  rows: Publication[];
  selected: Set<string>;
  onSelect: (s: Set<string>) => void;
  onOpen: (p: Publication) => void;
  onShare: (p: Publication) => void;
  onExportOne: (p: Publication) => void;
};

export function PublicationTable({ rows, selected, onSelect, onOpen, onShare, onExportOne }: TableProps) {
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    onSelect(s);
  };

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1100px] text-left text-[13px]">
          <thead className="border-b border-line text-xs font-medium uppercase tracking-wide text-faint">
            <tr>
              <th className="w-28 whitespace-nowrap px-4 py-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={allSelected} onChange={() => onSelect(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} className="accent-brand-600" aria-label="Selecionar todos" />
                  Status
                </label>
              </th>
              <th className="px-3 py-3">Data</th>
              <th className="px-3 py-3">Processo</th>
              <th className="px-3 py-3">Partes</th>
              <th className="px-3 py-3">Tribunal / Vara</th>
              <th className="px-3 py-3">Comarca</th>
              <th className="px-3 py-3">Fim do prazo</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Origem</th>
              <th className="px-3 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => (
              <tr key={p.id} className={cx('group align-top transition-colors hover:bg-muted/60', !p.read && 'bg-brand-50/40 dark:bg-brand-600/[0.06]')}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="accent-brand-600" aria-label="Selecionar" />
                    <button onClick={() => setRead([p.id], !p.read)} title={p.read ? 'Marcar como não lida (volta ao Painel)' : 'Marcar como lida (vai para Lidas)'} className="flex items-center gap-1.5">
                      <span className={cx('h-2.5 w-2.5 rounded-full', p.read ? 'border border-faint' : 'bg-brand-600')} />
                      <span className={cx('whitespace-nowrap text-xs', p.read ? 'text-faint' : 'font-medium text-brand-700 dark:text-brand-100')}>{p.read ? 'Lida' : 'Não lida'}</span>
                    </button>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3.5">
                  <div className="text-ink">{fmtDate(p.publishedAt)}</div>
                  <div className="text-xs text-faint">disp. {fmtDate(p.availableAt)}</div>
                </td>
                <td className="px-3 py-3.5">
                  <button onClick={() => onOpen(p)} className={cx('whitespace-nowrap font-mono text-[12.5px] hover:text-brand-600', p.read ? 'text-soft' : 'font-semibold text-ink')}>
                    {p.processNumber || '—'}
                  </button>
                </td>
                <td className="max-w-[240px] px-3 py-3.5">
                  <div className={cx('line-clamp-2', p.read ? 'text-soft' : 'text-ink')}>{p.parties.join(' × ') || '—'}</div>
                </td>
                <td className="max-w-[220px] px-3 py-3.5">
                  <div className="font-medium text-ink">{p.court || '—'}</div>
                  <div className="line-clamp-1 text-xs text-soft">{p.vara}</div>
                </td>
                <td className="px-3 py-3.5 text-soft">{p.comarca || '—'}</td>
                <td className="whitespace-nowrap px-3 py-3.5">
                  <DeadlineBadge p={p} />
                </td>
                <td className="px-3 py-3.5">
                  <Badge tone={p.type === 'Licitação' ? 'amber' : p.type === 'Citação' || p.type === 'Intimação' ? 'brand' : 'neutral'}>{p.type}</Badge>
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-xs text-soft">{p.origin}</td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-0.5">
                    <IconButton label="Visualizar" onClick={() => onOpen(p)}>
                      <Eye size={16} />
                    </IconButton>
                    <IconButton label={p.read ? 'Marcar como não lida (volta ao Painel)' : 'Marcar como lida (vai para Lidas)'} onClick={() => setRead([p.id], !p.read)}>
                      {p.read ? <EyeOff size={16} /> : <Check size={16} />}
                    </IconButton>
                    <IconButton label={p.favorite ? 'Remover dos salvos' : 'Salvar'} onClick={() => toggleFavorite(p)}>
                      <Star size={16} className={p.favorite ? 'fill-alert text-alert' : ''} />
                    </IconButton>
                    <IconButton label="Exportar" onClick={() => onExportOne(p)}>
                      <Download size={16} />
                    </IconButton>
                    <IconButton label="Compartilhar" onClick={() => onShare(p)}>
                      <Share2 size={16} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Smartphone */}
      <ul className="divide-y divide-line md:hidden">
        {rows.map((p) => (
          <li key={p.id} className={cx('px-4 py-4', !p.read && 'bg-brand-50/40 dark:bg-brand-600/[0.06]')}>
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="mt-1 accent-brand-600" aria-label="Selecionar" />
              <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(p)}>
                <div className="flex items-center gap-2">
                  {!p.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                  <Badge tone={p.type === 'Licitação' ? 'amber' : 'brand'}>{p.type}</Badge>
                  <span className="text-xs text-faint">
                    {p.court} · {fmtDate(p.publishedAt)}
                  </span>
                </div>
                <p className={cx('mt-1.5 font-mono text-[13px]', p.read ? 'text-soft' : 'font-semibold text-ink')}>{p.processNumber || p.organ}</p>
                <p className="mt-0.5 line-clamp-1 text-sm text-soft">{p.parties.join(' × ')}</p>
                {p.deadline && (
                  <div className="mt-2">
                    <DeadlineBadge p={p} />
                  </div>
                )}
              </button>
              <div className="flex flex-col">
                <IconButton label="Salvar" onClick={() => toggleFavorite(p)}>
                  <Star size={16} className={p.favorite ? 'fill-alert text-alert' : ''} />
                </IconButton>
                <IconButton label="Compartilhar" onClick={() => onShare(p)}>
                  <Share2 size={16} />
                </IconButton>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------------------------------------------------------------- Filtros */

export function FiltersForm({ value, onChange, courts, origins, hideRead }: { value: Filters; onChange: (f: Filters) => void; courts: string[]; origins: string[]; hideRead?: boolean }) {
  const set = (k: keyof Filters, v: string | boolean) => onChange({ ...value, [k]: v || undefined });
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <Field label="Número do processo">
        <Input value={value.processNumber || ''} onChange={(e) => set('processNumber', e.target.value)} placeholder="0000000-00.0000.0.00.0000" />
      </Field>
      <Field label="Nome da parte">
        <Input value={value.party || ''} onChange={(e) => set('party', e.target.value)} />
      </Field>
      <Field label="Tribunal">
        <Select value={value.court || ''} onChange={(e) => set('court', e.target.value)}>
          <option value="">Todos</option>
          {courts.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Field>
      <Field label="Vara">
        <Input value={value.vara || ''} onChange={(e) => set('vara', e.target.value)} />
      </Field>
      <Field label="Comarca">
        <Input value={value.comarca || ''} onChange={(e) => set('comarca', e.target.value)} />
      </Field>
      {!hideRead && (
        <Field label="Situação">
          <Select value={value.read || 'todos'} onChange={(e) => set('read', e.target.value)}>
            <option value="todos">Lidas e não lidas</option>
            <option value="nao-lidos">Apenas não lidas</option>
            <option value="lidos">Apenas lidas</option>
          </Select>
        </Field>
      )}
      <Field label="Data inicial">
        <Input type="date" value={value.from || ''} onChange={(e) => set('from', e.target.value)} />
      </Field>
      <Field label="Data final">
        <Input type="date" value={value.to || ''} onChange={(e) => set('to', e.target.value)} />
      </Field>
      <Field label="Tipo de publicação">
        <Select value={value.type || ''} onChange={(e) => set('type', e.target.value)}>
          <option value="">Todos</option>
          {PUBLICATION_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </Field>
      <Field label="Origem">
        <Select value={value.origin || ''} onChange={(e) => set('origin', e.target.value)}>
          <option value="">Todas</option>
          {origins.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
      </Field>
      <div className="flex items-end pb-1 sm:col-span-2">
        <Toggle checked={!!value.favorites} onChange={(v) => set('favorites', v)} label="Somente salvas (favoritas)" />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Visualizar */

export function PublicationDrawer({ p, onClose, user, onShare }: { p: Publication | null; onClose: () => void; user: User; onShare: (p: Publication) => void }) {
  const { toast } = useUi();
  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState('');
  const [corridos, setCorridos] = useState(false);
  const [note, setNote] = useState('');

  if (!p) return null;

  const saveDeadline = async () => {
    const n = Number(days);
    if (!n) return;
    const r = computeDeadline(p.availableAt, n, { corridos });
    await db.publications.update(p.id, { deadline: { days: n, corridos, basis: 'manual', ...r } });
    await audit('prazo.manual', `${p.processNumber}: ${n} dias`, user.id);
    setEditing(false);
    toast('Prazo atualizado.');
  };

  const pin = async () => {
    if (!p.processNumber) return;
    const exists = await db.workspace.where('userId').equals(user.id).filter((w) => w.kind === 'processo' && w.processNumber === p.processNumber).first();
    if (exists) return toast('Processo já está fixado.');
    await db.workspace.add({ id: crypto.randomUUID(), userId: user.id, kind: 'processo', name: p.parties.join(' × ') || p.processNumber, processNumber: p.processNumber, createdAt: new Date().toISOString() });
    toast('Processo fixado na área de trabalho.');
  };

  const info: [string, React.ReactNode][] = [
    ['Processo', <span key="n" className="font-mono">{p.processNumber || '—'}</span>],
    ['Tipo', p.type + (p.sourceType ? ` (${p.sourceType})` : '')],
    ['Disponibilização', fmtDate(p.availableAt)],
    ['Publicação', fmtDate(p.publishedAt)],
    ['Tribunal', p.court || '—'],
    ['Vara / Órgão julgador', p.vara || '—'],
    ['Comarca', p.comarca || '—'],
    ['Órgão emissor', p.organ || '—'],
    ['Origem', p.origin],
    ['Encontrado por', p.matchedBy.join('; ')],
  ];

  return (
    <Drawer
      open
      onClose={onClose}
      title={`${p.type}${p.court ? ` · ${p.court}` : ''}`}
      footer={
        <>
          <Button size="sm" variant="primary" icon={p.read ? <EyeOff size={15} /> : <Check size={15} />} onClick={() => setRead([p.id], !p.read)}>
            {p.read ? 'Marcar como não lida (volta ao Painel)' : 'Marcar como lida (vai para Lidas)'}
          </Button>
          <Button size="sm" icon={<Star size={15} className={p.favorite ? 'fill-alert text-alert' : ''} />} onClick={() => toggleFavorite(p)}>
            {p.favorite ? 'Salvo' : 'Salvar'}
          </Button>
          <Button size="sm" icon={<Share2 size={15} />} onClick={() => onShare(p)}>
            Compartilhar
          </Button>
          <Button size="sm" icon={<FileText size={15} />} onClick={() => exportPdf([p], user, `${p.type} — ${p.processNumber || ''}`)}>
            PDF
          </Button>
          {p.processNumber && (
            <Button size="sm" variant="ghost" onClick={pin}>
              Fixar processo
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-line p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-faint">Fim do prazo</p>
              <div className="mt-1 text-lg">
                <DeadlineBadge p={p} />
              </div>
              {p.deadline && (
                <p className="mt-2 text-xs text-soft">
                  {p.deadline.days} dias {p.deadline.corridos ? 'corridos' : 'úteis'} · início em {fmtDate(p.deadline.startAt)} ·{' '}
                  {p.deadline.basis === 'extraido' ? 'prazo identificado no texto' : p.deadline.basis === 'presumido' ? 'prazo presumido (confira!)' : 'prazo informado manualmente'}
                </p>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => { setEditing((e) => !e); setDays(String(p.deadline?.days || '')); setCorridos(!!p.deadline?.corridos); }}>
              Ajustar
            </Button>
          </div>
          {editing && (
            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
              <Field label="Dias">
                <Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className="w-24" />
              </Field>
              <Field label="Contagem">
                <Select value={corridos ? 'c' : 'u'} onChange={(e) => setCorridos(e.target.value === 'c')}>
                  <option value="u">Dias úteis (CPC)</option>
                  <option value="c">Dias corridos</option>
                </Select>
              </Field>
              <Button size="sm" variant="primary" onClick={saveDeadline}>
                Recalcular
              </Button>
            </div>
          )}
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {info.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-faint">{k}</dt>
              <dd className="mt-0.5 text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        {p.parties.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-faint">Partes</p>
            <div className="flex flex-wrap gap-1.5">
              {p.parties.map((x) => (
                <Badge key={x}>{x}</Badge>
              ))}
            </div>
          </div>
        )}
        {p.lawyers.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-faint">Advogados</p>
            <p className="text-sm text-soft">{p.lawyers.join('; ')}</p>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-faint">Inteiro teor</p>
            <div className="flex gap-1">
              <IconButton label="Copiar texto" onClick={() => navigator.clipboard.writeText(p.text).then(() => toast('Texto copiado.'))}>
                <Copy size={15} />
              </IconButton>
              {p.link && (
                <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-soft hover:bg-muted" title="Abrir na fonte">
                  <ExternalLink size={15} />
                </a>
              )}
            </div>
          </div>
          <div className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-[14px] leading-7 text-ink">{p.text}</div>
        </div>

        <Field label="Anotação interna">
          <Textarea rows={3} defaultValue={p.note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (p.note || '') && db.publications.update(p.id, { note })} placeholder="Visível só para você" />
        </Field>
      </div>
    </Drawer>
  );
}

/* ---------------------------------------------------------------- Compartilhar */

export function ShareDialog({ p, onClose }: { p: Publication | null; onClose: () => void }) {
  const { toast } = useUi();
  const [to, setTo] = useState('');
  if (!p) return null;
  const text = shareText(p);
  return (
    <Modal open onClose={onClose} title="Compartilhar publicação">
      <div className="space-y-4">
        <Field label="E-mail ou WhatsApp do destinatário (opcional)">
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="nome@escritorio.com.br ou (91) 9..." />
        </Field>
        <div className="grid gap-2 sm:grid-cols-3">
          <a className="flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm hover:bg-muted" href={mailtoLink(to.includes('@') ? to : '', `${p.type} — ${p.processNumber || ''}`, text)}>
            <Mail size={16} /> E-mail
          </a>
          <a className="flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm hover:bg-muted" target="_blank" rel="noreferrer" href={whatsappLink(text, to.includes('@') ? '' : to)}>
            <MessageCircle size={16} /> WhatsApp
          </a>
          <button className="flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm hover:bg-muted" onClick={() => share(p, toast)}>
            <Copy size={16} /> Copiar / outros
          </button>
        </div>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs text-soft">{text}</pre>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- Exportar */

export function ExportDialog({ open, onClose, all, current, selected, user }: { open: boolean; onClose: () => void; all: Publication[]; current: Filters; selected: Publication[]; user: User }) {
  const [scope, setScope] = useState<'atual' | 'selecionados' | 'personalizado'>(selected.length ? 'selecionados' : 'atual');
  const [f, setF] = useState<Filters>({});
  const [busy, setBusy] = useState(false);
  const { toast } = useUi();

  const list = useMemo(() => {
    if (scope === 'selecionados') return selected;
    if (scope === 'atual') return applyFilters(all, current);
    return applyFilters(all, f);
  }, [scope, selected, all, current, f]);

  const run = async (kind: 'pdf' | 'xlsx' | 'csv') => {
    if (!list.length) return toast('Nada para exportar com esses filtros.', 'erro');
    setBusy(true);
    try {
      if (kind === 'csv') exportCsv(list);
      if (kind === 'xlsx') await exportXlsx(list);
      if (kind === 'pdf') await exportPdf(list, user);
      await audit('exportacao', `${kind}: ${list.length} registros`, user.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Exportar publicações"
      wide
      footer={
        <>
          <span className="mr-auto self-center text-sm text-soft">{list.length} registro(s)</span>
          <Button icon={<FileText size={16} />} disabled={busy} onClick={() => run('pdf')}>PDF</Button>
          <Button icon={<FileSpreadsheet size={16} />} disabled={busy} onClick={() => run('xlsx')}>Excel</Button>
          <Button icon={<Table2 size={16} />} disabled={busy} variant="primary" onClick={() => run('csv')}>CSV</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {([
            ['atual', 'Resultado atual do painel'],
            ['selecionados', `Selecionados (${selected.length})`],
            ['personalizado', 'Filtros de exportação'],
          ] as const).map(([id, label]) => (
            <button key={id} disabled={id === 'selecionados' && !selected.length} onClick={() => setScope(id)} className={cx('rounded-lg border px-3 py-2.5 text-sm disabled:opacity-40', scope === id ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-100' : 'border-line hover:bg-muted')}>
              {label}
            </button>
          ))}
        </div>
        {scope === 'personalizado' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Por vara"><Input value={f.vara || ''} onChange={(e) => setF({ ...f, vara: e.target.value || undefined })} /></Field>
            <Field label="Por processo"><Input value={f.processNumber || ''} onChange={(e) => setF({ ...f, processNumber: e.target.value || undefined })} /></Field>
            <Field label="Por tribunal"><Input value={f.court || ''} onChange={(e) => setF({ ...f, court: e.target.value || undefined })} /></Field>
            <Field label="Situação">
              <Select value={f.read || 'todos'} onChange={(e) => setF({ ...f, read: e.target.value as Filters['read'] })}>
                <option value="todos">Lidos e não lidos</option>
                <option value="lidos">Apenas lidos</option>
                <option value="nao-lidos">Apenas não lidos</option>
              </Select>
            </Field>
            <Field label="Período — de"><Input type="date" value={f.from || ''} onChange={(e) => setF({ ...f, from: e.target.value || undefined })} /></Field>
            <Field label="Período — até"><Input type="date" value={f.to || ''} onChange={(e) => setF({ ...f, to: e.target.value || undefined })} /></Field>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- Salvar na área de trabalho */

export function SaveWorkspaceDialog({ open, onClose, filters, user }: { open: boolean; onClose: () => void; filters: Filters; user: User }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'consulta' | 'painel'>('consulta');
  const { toast } = useUi();
  const save = async () => {
    if (!name.trim()) return;
    await db.workspace.add({ id: crypto.randomUUID(), userId: user.id, kind, name: name.trim(), filters, createdAt: new Date().toISOString() });
    toast(kind === 'painel' ? 'Painel criado na área de trabalho.' : 'Consulta salva na área de trabalho.');
    setName('');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Salvar na área de trabalho" footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar</Button></>}>
      <div className="space-y-4">
        <Field label="Nome">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Prazos da semana — TJPA" onKeyDown={(e) => e.key === 'Enter' && save()} />
        </Field>
        <Field label="Salvar como">
          <Select value={kind} onChange={(e) => setKind(e.target.value as 'consulta' | 'painel')}>
            <option value="consulta">Consulta salva (filtros + busca)</option>
            <option value="painel">Painel personalizado (aparece com contadores)</option>
          </Select>
        </Field>
        <p className="text-xs text-soft">Os filtros atuais do painel serão guardados: {Object.keys(filters).filter((k) => filters[k as keyof Filters]).join(', ') || 'nenhum filtro'}.</p>
      </div>
    </Modal>
  );
}
