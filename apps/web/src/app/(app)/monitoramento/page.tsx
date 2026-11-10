'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CircleCheck, CircleDashed, CircleX, Plus, Radar, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { audit, db, nowIso, setSetting, uid, type TermKind } from '@/lib/db';
import { maskCnj } from '@/lib/extract';
import { cx, fmtDateTime } from '@/lib/format';
import { DEFAULT_MONITOR, getMonitorSettings, type MonitorSettings } from '@/lib/monitor';
import { SOURCES } from '@/lib/sources';
import { useMonitor } from '@/components/AppShell';
import { DiariosEstaduais, KeywordsCard } from '@/components/Diarios';
import { useUi } from '@/components/Providers';
import { Badge, Button, Card, Empty, Field, IconButton, Input, PageHeader, Select, Spinner, Tabs, Textarea, Toggle } from '@/components/ui';

const KINDS: { id: TermKind; label: string; hint: string }[] = [
  { id: 'processo', label: 'Número de processo', hint: 'Formato CNJ. Busca no DJEN e andamentos no DataJud.' },
  { id: 'parte', label: 'Nome de parte', hint: 'Pessoa ou empresa. Busca no DJEN e diários oficiais.' },
  { id: 'cpf', label: 'CPF', hint: 'Menções em diários oficiais.' },
  { id: 'cnpj', label: 'CNPJ', hint: 'Menções em diários oficiais e licitações.' },
  { id: 'licitacao', label: 'Termo de licitação', hint: 'Ex.: "serviços advocatícios". Busca no PNCP.' },
  { id: 'termo', label: 'Termo livre', hint: 'Qualquer expressão nos diários oficiais.' },
];

export default function MonitoramentoPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'termos' | 'diarios' | 'fontes' | 'config' | 'historico'>('termos');
  if (!user) return null;
  return (
    <>
      <PageHeader title="Monitoramento" subtitle="O que é pesquisado, onde e com que frequência." actions={<RunButton />} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'termos', label: 'Palavras-chave' },
          { id: 'diarios', label: 'Diários oficiais' },
          { id: 'fontes', label: 'Fontes consultadas' },
          { id: 'config', label: 'Configurações' },
          { id: 'historico', label: 'Histórico de buscas' },
        ]}
      />
      {tab === 'termos' && (
        <div className="space-y-6">
          <KeywordsCard />
          <Terms userId={user.id} />
        </div>
      )}
      {tab === 'diarios' && <DiariosEstaduais />}
      {tab === 'fontes' && <Sources userId={user.id} />}
      {tab === 'config' && <Config />}
      {tab === 'historico' && <History userId={user.id} />}
    </>
  );
}

function RunButton() {
  const { running, runNow, lastRun } = useMonitor();
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-xs text-soft sm:block">Última busca: {lastRun ? fmtDateTime(lastRun) : 'nunca'}</span>
      <Button variant="primary" icon={running ? <Spinner /> : <RefreshCw size={16} />} disabled={running} onClick={runNow}>
        {running ? 'Buscando…' : 'Buscar agora'}
      </Button>
    </div>
  );
}

function Terms({ userId }: { userId: string }) {
  const { toast } = useUi();
  const terms = useLiveQuery(() => db.terms.where('userId').equals(userId).reverse().sortBy('createdAt'), [userId]);
  const [kind, setKind] = useState<TermKind>('processo');
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [bulk, setBulk] = useState('');

  const add = async (values: string[]) => {
    const list = values.map((v) => v.trim()).filter(Boolean).map((v) => (kind === 'processo' ? maskCnj(v) : v));
    if (!list.length) return;
    await db.terms.bulkAdd(list.map((v) => ({ id: uid('t_'), userId, kind, value: v, label: label.trim() || undefined, active: true, createdAt: nowIso() })));
    await audit('termo.adicionado', `${kind}: ${list.join(', ')}`, userId);
    setValue('');
    setLabel('');
    setBulk('');
    toast(`${list.length} item(ns) adicionado(s) ao monitoramento.`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) add([value]);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card title="Adicionar processos e partes (opcional)">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Tipo" hint={KINDS.find((k) => k.id === kind)?.hint}>
            <Select value={kind} onChange={(e) => setKind(e.target.value as TermKind)}>
              {KINDS.map((k) => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Valor">
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === 'processo' ? '0000000-00.0000.0.00.0000' : ''} required />
          </Field>
          <Field label="Apelido (opcional)">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Cliente Maria" />
          </Field>
          <Button variant="primary" icon={<Plus size={16} />} className="w-full">Adicionar</Button>
        </form>
        <details className="mt-5 border-t border-line pt-4">
          <summary className="cursor-pointer text-sm text-soft">Adicionar vários de uma vez</summary>
          <Textarea rows={5} className="mt-3" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder="Um por linha" />
          <Button size="sm" className="mt-2" onClick={() => add(bulk.split('\n'))}>Adicionar lista</Button>
        </details>
        <p className="mt-5 rounded-lg bg-muted p-3 text-xs leading-5 text-soft">
          Seu nome, CPF e OAB (do perfil) já são monitorados automaticamente. Sem limite de processos ou partes.
        </p>
      </Card>

      <Card title={`Monitorados (${terms?.length || 0})`} className="min-w-0">
        <div className="-m-5">
          {!terms?.length ? (
            <Empty icon={<Radar size={32} strokeWidth={1.4} />} title="Nada cadastrado ainda" text="Adicione processos e partes para ampliar a busca." />
          ) : (
            <ul className="divide-y divide-line">
              {terms.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <Badge tone={t.kind === 'processo' ? 'brand' : t.kind === 'licitacao' ? 'amber' : 'neutral'}>{KINDS.find((k) => k.id === t.kind)?.label}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className={cx('truncate text-sm', t.kind === 'processo' && 'font-mono', t.active ? 'text-ink' : 'text-faint line-through')}>{t.value}</p>
                    {t.label && <p className="truncate text-xs text-soft">{t.label}</p>}
                  </div>
                  <Toggle checked={t.active} onChange={(v) => db.terms.update(t.id, { active: v })} label="" />
                  <IconButton label="Remover" onClick={() => db.terms.delete(t.id)}>
                    <Trash2 size={16} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

function Sources({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<MonitorSettings | null>(null);
  const runs = useLiveQuery(() => db.runs.where('userId').equals(userId).reverse().sortBy('startedAt'), [userId]);
  useEffect(() => {
    getMonitorSettings().then(setSettings);
  }, []);
  if (!settings) return <Spinner />;

  const toggle = async (id: string, v: boolean) => {
    const next = { ...settings, sources: { ...settings.sources, [id]: v } };
    setSettings(next);
    await setSetting('monitor', next);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {SOURCES.map((s) => {
        const last = runs?.find((r) => r.source === s.id);
        const lastErr = last?.status === 'erro';
        return (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {s.status === 'planejado' ? <CircleDashed size={16} className="text-faint" /> : lastErr ? <CircleX size={16} className="text-red-500" /> : <CircleCheck size={16} className="text-emerald-500" />}
                  <h3 className="font-semibold text-ink">{s.name}</h3>
                </div>
                <p className="mt-1.5 text-sm text-soft">{s.description}</p>
              </div>
              {s.status === 'ativo' ? <Toggle checked={!!settings.sources[s.id]} onChange={(v) => toggle(s.id, v)} label="" /> : <Badge tone={s.status === 'assistido' ? 'amber' : 'neutral'}>{s.status === 'assistido' ? 'Busca assistida' : 'Em breve'}</Badge>}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {s.coverage.map((c) => (
                <Badge key={c}>{c}</Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-faint">Pesquisa por: {s.searchBy.join(' · ')}</p>
            {last && (
              <p className={cx('mt-2 text-xs', lastErr ? 'text-red-600 dark:text-red-400' : 'text-soft')}>
                Última consulta {fmtDateTime(last.startedAt)} — {lastErr ? last.error : `${last.found} resultado(s)`}
              </p>
            )}
            {s.needsConnector && s.status === 'ativo' && <p className="mt-2 text-xs text-faint">Pode precisar do conector local (veja Configurações).</p>}
          </Card>
        );
      })}
    </div>
  );
}

function Config() {
  const { toast } = useUi();
  const [s, setS] = useState<MonitorSettings | null>(null);
  const [testing, setTesting] = useState(false);
  useEffect(() => {
    getMonitorSettings().then(setS);
  }, []);
  if (!s) return <Spinner />;

  const save = async () => {
    await setSetting('monitor', s);
    toast('Configurações salvas.');
  };

  const test = async () => {
    setTesting(true);
    try {
      const r = await fetch(`${s.connectorUrl.replace(/\/$/, '')}/status`);
      const j = await r.json();
      toast(j.ok ? `Conector local ativo (v${j.version}).` : 'Conector respondeu com erro.', j.ok ? 'ok' : 'erro');
    } catch {
      toast('Não foi possível falar com o conector local. Ele está rodando?', 'erro');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Busca automática">
        <div className="space-y-4">
          <Toggle checked={s.enabled} onChange={(v) => setS({ ...s, enabled: v })} label="Monitoramento automático" description="Busca em todas as fontes ativas enquanto o app estiver aberto (em qualquer aba ou instalado)." />
          <Field label="Frequência">
            <Select value={s.intervalMinutes} onChange={(e) => setS({ ...s, intervalMinutes: Number(e.target.value) })}>
              <option value={60}>A cada 1 hora (recomendado)</option>
              <option value={120}>A cada 2 horas</option>
              <option value={240}>A cada 4 horas</option>
              <option value={720}>A cada 12 horas</option>
            </Select>
          </Field>
          <Field label="Na primeira busca, olhar quantos dias para trás" hint="Depois disso, só o período desde a última busca.">
            <Input type="number" min={1} max={365} value={s.initialDays} onChange={(e) => setS({ ...s, initialDays: Number(e.target.value) || 30 })} />
          </Field>
          <Field label="Feriados locais (um por linha)" hint="Consulte os feriados nacionais, estaduais e municipais e as suspensões do tribunal e cadastre aqui os locais. AAAA-MM-DD para um dia específico ou MM-DD para todo ano. Ex.: 08-15 (Adesão do Pará).">
            <Textarea rows={3} value={s.extraHolidays.join('\n')} onChange={(e) => setS({ ...s, extraHolidays: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} />
          </Field>
        </div>
      </Card>
      <Card title="Conector local (opcional)">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-soft">
            Algumas fontes públicas não aceitam chamadas diretas do navegador. O conector local é um pequeno programa que roda no seu PC e faz a ponte. Nenhum dado é guardado nele.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-ink">node conector-local/server.mjs</pre>
          <Field label="Endereço do conector">
            <Input value={s.connectorUrl} onChange={(e) => setS({ ...s, connectorUrl: e.target.value })} placeholder="http://127.0.0.1:8787" />
          </Field>
          <Button size="sm" onClick={test} disabled={!s.connectorUrl || testing}>
            {testing ? 'Testando…' : 'Testar conexão'}
          </Button>
          <Field label="Chave pública da API DataJud" hint="Divulgada pelo CNJ. Atualize se o CNJ trocar a chave.">
            <Input value={s.datajudKey} onChange={(e) => setS({ ...s, datajudKey: e.target.value })} />
          </Field>
          <Button size="sm" variant="ghost" onClick={() => setS({ ...s, datajudKey: DEFAULT_MONITOR.datajudKey })}>Restaurar chave padrão</Button>
        </div>
      </Card>
      <div className="lg:col-span-2">
        <Button variant="primary" onClick={save}>Salvar configurações</Button>
      </div>
    </div>
  );
}

function History({ userId }: { userId: string }) {
  const runs = useLiveQuery(() => db.runs.where('userId').equals(userId).reverse().sortBy('startedAt').then((r) => r.slice(0, 200)), [userId]);
  if (!runs?.length) return <Card><Empty title="Nenhuma busca realizada ainda" /></Card>;
  return (
    <Card className="overflow-hidden">
      <div className="-m-5 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-faint">
            <tr><th className="px-5 py-3">Quando</th><th className="px-3 py-3">Fonte</th><th className="px-3 py-3">Pesquisa</th><th className="px-3 py-3">Resultado</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-5 py-2.5 text-soft">{fmtDateTime(r.startedAt)}</td>
                <td className="px-3 py-2.5">{SOURCES.find((s) => s.id === r.source)?.name.split(' — ')[0] || r.source}</td>
                <td className="px-3 py-2.5 text-soft">{r.query}</td>
                <td className="px-3 py-2.5">{r.status === 'erro' ? <span className="text-red-600 dark:text-red-400">{r.error}</span> : `${r.found} encontrado(s)`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
