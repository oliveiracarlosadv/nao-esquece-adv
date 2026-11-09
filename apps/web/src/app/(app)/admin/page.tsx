'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, FolderOpen, Plus, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { hashPassword } from '@/lib/crypto';
import { audit, db, getSetting, nowIso, setSetting, uid, type Plan, type User } from '@/lib/db';
import { exportCsv } from '@/lib/export';
import { fmtDateTime } from '@/lib/format';
import { getMonitorSettings, type MonitorSettings } from '@/lib/monitor';
import { canPickFolder, clearFolder, importFiles, pickFolder, resyncFolder } from '@/lib/sobre';
import { SOURCES } from '@/lib/sources';
import { useUi } from '@/components/Providers';
import { Badge, Button, Card, Empty, Field, IconButton, Input, Modal, PageHeader, Select, Spinner, Tabs, Toggle } from '@/components/ui';

type Tab = 'usuarios' | 'planos' | 'logos' | 'fontes' | 'logs' | 'historico' | 'relatorios' | 'sobre';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('usuarios');
  if (!user) return null;
  if (user.role !== 'admin') return <Card><Empty title="Acesso restrito" text="Apenas administradores acessam esta área." /></Card>;
  return (
    <>
      <PageHeader title="Administração" subtitle="Gestão de usuários, planos, fontes, registros e conteúdo institucional." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'usuarios', label: 'Usuários e assinaturas' },
          { id: 'planos', label: 'Planos' },
          { id: 'logos', label: 'Logomarcas' },
          { id: 'fontes', label: 'Bases e APIs' },
          { id: 'logs', label: 'Logs de pesquisas' },
          { id: 'historico', label: 'Auditoria' },
          { id: 'relatorios', label: 'Relatórios' },
          { id: 'sobre', label: 'Página Sobre' },
        ]}
      />
      {tab === 'usuarios' && <Users me={user} />}
      {tab === 'planos' && <Plans />}
      {tab === 'logos' && <Logos />}
      {tab === 'fontes' && <Sources />}
      {tab === 'logs' && <Logs />}
      {tab === 'historico' && <AuditTab />}
      {tab === 'relatorios' && <Reports />}
      {tab === 'sobre' && <SobreAdmin />}
    </>
  );
}

function Users({ me }: { me: User }) {
  const { toast } = useUi();
  const users = useLiveQuery(() => db.users.toArray(), []);
  const plans = useLiveQuery(() => db.plans.toCollection().sortBy('price'), []);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'usuario', planId: 'essencial', oab: '', oabUf: 'PA' });

  const create = async () => {
    if (!f.name || !f.email || f.password.length < 8) return toast('Preencha nome, e-mail e senha (mín. 8).', 'erro');
    if (await db.users.where('email').equals(f.email.toLowerCase()).first()) return toast('E-mail já cadastrado.', 'erro');
    const { hash, salt } = await hashPassword(f.password);
    await db.users.add({ id: uid('u_'), name: f.name, email: f.email.toLowerCase(), cpf: '', oab: f.oab, oabUf: f.oabUf, phone: '', role: f.role as User['role'], planId: f.planId, passwordHash: hash, passwordSalt: salt, active: true, createdAt: nowIso() });
    await audit('admin.usuario.criado', f.email, me.id);
    setOpen(false);
    toast('Usuário criado.');
  };

  const update = async (u: User, patch: Partial<User>) => {
    if (u.id === me.id && (patch.role === 'usuario' || patch.active === false)) return toast('Você não pode remover seu próprio acesso.', 'erro');
    await db.users.update(u.id, patch);
    await audit('admin.usuario.alterado', `${u.email}: ${JSON.stringify(patch)}`, me.id);
  };

  return (
    <Card title={`Usuários (${users?.length || 0})`} action={<Button size="sm" icon={<UserPlus size={15} />} onClick={() => setOpen(true)}>Novo usuário</Button>} className="overflow-hidden">
      <div className="-m-5 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-faint">
            <tr><th className="px-5 py-3">Nome</th><th className="px-3 py-3">OAB</th><th className="px-3 py-3">Perfil</th><th className="px-3 py-3">Plano</th><th className="px-3 py-3">2FA</th><th className="px-3 py-3">Ativo</th><th className="px-3 py-3">Desde</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users?.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-3"><p className="font-medium text-ink">{u.name}</p><p className="text-xs text-faint">{u.email}</p></td>
                <td className="px-3 py-3 text-soft">{u.oab ? `${u.oab}/${u.oabUf}` : '—'}</td>
                <td className="px-3 py-3">
                  <Select value={u.role} onChange={(e) => update(u, { role: e.target.value as User['role'] })} className="h-8 w-36 text-xs"><option value="admin">Administrador</option><option value="usuario">Advogado</option></Select>
                </td>
                <td className="px-3 py-3">
                  <Select value={u.planId} onChange={(e) => update(u, { planId: e.target.value })} className="h-8 w-36 text-xs">{plans?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
                </td>
                <td className="px-3 py-3">{u.totpSecret ? <Badge tone="green">Sim</Badge> : <Badge>Não</Badge>}</td>
                <td className="px-3 py-3"><Toggle checked={u.active} onChange={(v) => update(u, { active: v })} label="" /></td>
                <td className="px-3 py-3 text-xs text-soft">{fmtDateTime(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo usuário" footer={<><Button onClick={() => setOpen(false)}>Cancelar</Button><Button variant="primary" onClick={create}>Criar</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="E-mail"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Senha inicial"><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></Field>
          <Field label="OAB"><Input value={f.oab} onChange={(e) => setF({ ...f, oab: e.target.value })} /></Field>
          <Field label="UF"><Input value={f.oabUf} maxLength={2} onChange={(e) => setF({ ...f, oabUf: e.target.value.toUpperCase() })} /></Field>
          <Field label="Perfil"><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="usuario">Advogado</option><option value="admin">Administrador</option></Select></Field>
          <Field label="Plano"><Select value={f.planId} onChange={(e) => setF({ ...f, planId: e.target.value })}>{plans?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        </div>
      </Modal>
    </Card>
  );
}

function Plans() {
  const plans = useLiveQuery(() => db.plans.toCollection().sortBy('price'), []);
  const save = (p: Plan, patch: Partial<Plan>) => db.plans.update(p.id, patch);
  const add = () => db.plans.add({ id: uid('p_'), name: 'Novo plano', price: 0, maxTerms: 10, features: [], active: false });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {plans?.map((p) => (
          <Card key={p.id}>
            <div className="space-y-3">
              <Field label="Nome"><Input defaultValue={p.name} onBlur={(e) => save(p, { name: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço (R$/mês)"><Input type="number" step="0.01" defaultValue={p.price} onBlur={(e) => save(p, { price: Number(e.target.value) })} /></Field>
                <Field label="Limite de termos"><Input type="number" defaultValue={p.maxTerms} onBlur={(e) => save(p, { maxTerms: Number(e.target.value) })} /></Field>
              </div>
              <Field label="Recursos (separados por vírgula)"><Input defaultValue={p.features.join(', ')} onBlur={(e) => save(p, { features: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field>
              <div className="flex items-center justify-between">
                <Toggle checked={p.active} onChange={(v) => save(p, { active: v })} label="Disponível" />
                <IconButton label="Excluir plano" onClick={() => db.plans.delete(p.id)}><Trash2 size={15} /></IconButton>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Button icon={<Plus size={16} />} onClick={add}>Novo plano</Button>
      <p className="text-xs text-faint">A cobrança de assinaturas exige um provedor de pagamento (integração futura). Aqui o plano define limites de uso.</p>
    </div>
  );
}

function Logos() {
  const users = useLiveQuery(() => db.users.toArray(), []);
  const [appLogo, setAppLogo] = useState<string | null>(null);
  useEffect(() => { getSetting<string | null>('app.reportLogo', null).then(setAppLogo); }, []);
  const pick = async (file?: File) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = async () => { setAppLogo(String(r.result)); await setSetting('app.reportLogo', String(r.result)); };
    r.readAsDataURL(file);
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card title="Logomarca padrão dos relatórios">
        <div className="flex flex-col items-center gap-4 text-center">
          {appLogo ? <img src={appLogo} alt="" className="h-20 object-contain" /> : <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.svg`} alt="" className="h-20" />}
          <label className="cursor-pointer text-sm font-medium text-brand-600">Enviar logomarca<input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} /></label>
          {appLogo && <button className="text-xs text-soft" onClick={async () => { setAppLogo(null); await setSetting('app.reportLogo', null); }}>Restaurar padrão</button>}
        </div>
      </Card>
      <Card title="Logomarcas dos usuários">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {users?.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-lg border border-line p-3">
              {u.logo ? <img src={u.logo} alt="" className="h-12 w-12 rounded object-contain" /> : <span className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs text-faint">sem logo</span>}
              <div className="min-w-0 flex-1 text-sm"><p className="truncate font-medium text-ink">{u.name}</p>{u.logo && <button className="text-xs text-soft hover:text-red-600" onClick={() => db.users.update(u.id, { logo: undefined })}>Remover</button>}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Sources() {
  const [s, setS] = useState<MonitorSettings | null>(null);
  const [status, setStatus] = useState<string>('');
  useEffect(() => { getMonitorSettings().then(setS); }, []);
  if (!s) return <Spinner />;
  const toggle = async (id: string, v: boolean) => { const n = { ...s, sources: { ...s.sources, [id]: v } }; setS(n); await setSetting('monitor', n); };
  const ping = async () => {
    if (!s.connectorUrl) return setStatus('Conector não configurado.');
    try { const r = await fetch(`${s.connectorUrl.replace(/\/$/, '')}/status`); setStatus(r.ok ? 'Conector local respondendo.' : `Erro ${r.status}`); } catch { setStatus('Conector local fora do ar.'); }
  };
  return (
    <Card title="Bases monitoradas e APIs conectadas" action={<Button size="sm" onClick={ping}>Testar conector</Button>} className="overflow-hidden">
      {status && <p className="mb-3 text-sm text-soft">{status}</p>}
      <div className="-mx-5 -mb-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-y border-line text-xs uppercase tracking-wide text-faint"><tr><th className="px-5 py-3">Fonte</th><th className="px-3 py-3">Cobertura</th><th className="px-3 py-3">Situação</th><th className="px-3 py-3">Ativa</th></tr></thead>
          <tbody className="divide-y divide-line">
            {SOURCES.map((x) => (
              <tr key={x.id}>
                <td className="px-5 py-3"><p className="font-medium text-ink">{x.name}</p>{x.url && <a href={x.url} target="_blank" rel="noreferrer" className="text-xs text-brand-600">{x.url}</a>}</td>
                <td className="px-3 py-3 text-xs text-soft">{x.coverage.join(', ')}</td>
                <td className="px-3 py-3">{x.status === 'ativo' ? <Badge tone="green">Integrada</Badge> : <Badge>Planejada</Badge>}{x.needsConnector && <Badge className="ml-1">conector</Badge>}</td>
                <td className="px-3 py-3">{x.status === 'ativo' ? <Toggle checked={!!s.sources[x.id]} onChange={(v) => toggle(x.id, v)} label="" /> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Logs() {
  const runs = useLiveQuery(() => db.runs.orderBy('startedAt').reverse().limit(500).toArray(), []);
  const users = useLiveQuery(() => db.users.toArray(), []);
  const name = (id: string) => users?.find((u) => u.id === id)?.name || '—';
  if (!runs?.length) return <Card><Empty title="Nenhuma pesquisa registrada" /></Card>;
  return (
    <Card className="overflow-hidden" title="Logs de pesquisas (últimas 500)" action={<Button size="sm" variant="ghost" onClick={() => db.runs.clear()}>Limpar</Button>}>
      <div className="-m-5 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-faint"><tr><th className="px-5 py-3">Início</th><th className="px-3 py-3">Usuário</th><th className="px-3 py-3">Fonte</th><th className="px-3 py-3">Termo</th><th className="px-3 py-3">Duração</th><th className="px-3 py-3">Resultado</th></tr></thead>
          <tbody className="divide-y divide-line">
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-5 py-2.5 text-soft">{fmtDateTime(r.startedAt)}</td>
                <td className="px-3 py-2.5">{name(r.userId)}</td>
                <td className="px-3 py-2.5">{r.source}</td>
                <td className="px-3 py-2.5 text-soft">{r.query}</td>
                <td className="px-3 py-2.5 text-soft">{r.finishedAt ? `${((new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()) / 1000).toFixed(1)}s` : '…'}</td>
                <td className="px-3 py-2.5">{r.status === 'erro' ? <span className="text-red-600 dark:text-red-400">{r.error}</span> : r.found}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AuditTab() {
  const rows = useLiveQuery(() => db.audit.orderBy('at').reverse().limit(500).toArray(), []);
  const users = useLiveQuery(() => db.users.toArray(), []);
  const name = (id?: string) => users?.find((u) => u.id === id)?.name || '—';
  return (
    <Card title="Histórico de consultas e auditoria" className="overflow-hidden">
      <div className="-m-5 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-faint"><tr><th className="px-5 py-3">Quando</th><th className="px-3 py-3">Usuário</th><th className="px-3 py-3">Ação</th><th className="px-3 py-3">Detalhe</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows?.map((a) => (
              <tr key={a.id}><td className="whitespace-nowrap px-5 py-2.5 text-soft">{fmtDateTime(a.at)}</td><td className="px-3 py-2.5">{name(a.userId)}</td><td className="px-3 py-2.5"><Badge>{a.action}</Badge></td><td className="px-3 py-2.5 text-soft">{a.detail}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Reports() {
  const pubs = useLiveQuery(() => db.publications.toArray(), []);
  const groups = useMemo(() => {
    const by = (k: 'court' | 'type' | 'origin') => {
      const m = new Map<string, { total: number; unread: number }>();
      for (const p of pubs || []) { const key = p[k] || '—'; const g = m.get(key) || { total: 0, unread: 0 }; g.total++; if (!p.read) g.unread++; m.set(key, g); }
      return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
    };
    return [['Por tribunal', by('court')], ['Por tipo', by('type')], ['Por origem', by('origin')]] as const;
  }, [pubs]);
  if (!pubs) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button icon={<Download size={16} />} onClick={() => exportCsv(pubs)}>Exportar base completa (CSV)</Button></div>
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map(([title, rows]) => {
          const max = Math.max(1, ...rows.map(([, g]) => g.total));
          return (
            <Card key={title} title={title}>
              <ul className="space-y-2.5">
                {rows.slice(0, 12).map(([k, g]) => (
                  <li key={k} className="text-sm">
                    <div className="flex justify-between"><span className="truncate text-ink">{k}</span><span className="text-soft">{g.total} · {g.unread} não lidas</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${(g.total / max) * 100}%` }} /></div>
                  </li>
                ))}
                {!rows.length && <li className="text-sm text-faint">Sem dados.</li>}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SobreAdmin() {
  const { toast } = useUi();
  const info = useLiveQuery(() => db.settings.get('sobre.folder'), []);
  const files = useLiveQuery(() => db.files.toArray(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const folder = info?.value as { name: string; syncedAt: string; count: number } | undefined;

  const choose = async () => {
    try {
      if (canPickFolder()) toast(`${await pickFolder()} arquivo(s) carregado(s).`);
      else inputRef.current?.click();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast('Não foi possível ler a pasta.', 'erro');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card title="Pasta de conteúdo">
        <div className="space-y-4 text-sm">
          <p className="text-soft">A página “Sobre o NÃO ESQUECE ADV” é montada automaticamente com os arquivos de uma pasta: textos <code>.md</code>, <code>.txt</code> ou <code>.html</code> (em ordem alfabética) e as imagens citadas neles.</p>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-faint">Pasta configurada</p>
            <p className="font-medium text-ink">{folder ? folder.name : 'Padrão do sistema (conteudo/sobre)'}</p>
            {folder && <p className="text-xs text-soft">{folder.count} arquivo(s) · lida em {fmtDateTime(folder.syncedAt)}</p>}
          </div>
          <input ref={inputRef} type="file" multiple className="hidden" {...({ webkitdirectory: '' } as object)} onChange={async (e) => { const l = [...(e.target.files || [])]; if (l.length) toast(`${await importFiles(l, l[0].webkitRelativePath.split('/')[0] || 'pasta')} arquivo(s) carregado(s).`); e.target.value = ''; }} />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={<FolderOpen size={16} />} onClick={choose}>Escolher pasta</Button>
            {folder && <Button icon={<RefreshCw size={16} />} onClick={async () => toast((await resyncFolder(true)) ? 'Pasta relida.' : 'Escolha a pasta novamente para reler.')}>Reler pasta</Button>}
            {folder && <Button variant="ghost" onClick={() => clearFolder()}>Usar padrão</Button>}
          </div>
          <p className="text-xs text-faint">No Chrome e no Edge, a pasta é relida automaticamente sempre que a página Sobre é aberta.</p>
        </div>
      </Card>
      <Card title="Arquivos carregados">
        {!files?.length ? <p className="text-sm text-faint">Usando o conteúdo padrão.</p> : (
          <ul className="-my-2 divide-y divide-line text-sm">
            {files.map((f) => <li key={f.name} className="flex justify-between py-2"><span className="text-ink">{f.name}</span><span className="text-xs text-faint">{f.type || 'texto'}</span></li>)}
          </ul>
        )}
      </Card>
    </div>
  );
}
