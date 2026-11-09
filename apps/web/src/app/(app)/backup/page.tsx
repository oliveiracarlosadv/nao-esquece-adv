'use client';
import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArchiveRestore, Download, HardDrive, History, Lock, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { audit, db, setSetting } from '@/lib/db';
import { counts, createSnapshot, exportBackup, NeedsPassword, readBackupFile, restore, restoreSnapshot, type BackupData } from '@/lib/backup';
import { bytes, fmtDateTime } from '@/lib/format';
import { useUi } from '@/components/Providers';
import { Badge, Button, Card, Field, IconButton, Input, Modal, PageHeader, Toggle } from '@/components/ui';

const LABELS: Record<string, string> = {
  users: 'Contas', terms: 'Processos e partes', publications: 'Publicações', workspace: 'Área de trabalho', notifications: 'Notificações',
  runs: 'Histórico de buscas', audit: 'Auditoria', settings: 'Configurações', files: 'Arquivos (Sobre)',
};

export default function BackupPage() {
  const { user, refresh } = useAuth();
  const { toast } = useUi();
  const snapshots = useLiveQuery(() => db.snapshots.orderBy('createdAt').reverse().toArray(), []);
  const lastExport = useLiveQuery(() => db.settings.get('backup.lastExport'), []);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [usage, setUsage] = useState<{ usage?: number; quota?: number }>({});
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [protect, setProtect] = useState(false);
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ file: File; data?: BackupData; needsPwd?: boolean } | null>(null);
  const [importPwd, setImportPwd] = useState('');
  const [mode, setMode] = useState<'substituir' | 'mesclar'>('mesclar');
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    counts().then(setStats);
    navigator.storage?.estimate?.().then(setUsage);
    navigator.storage?.persisted?.().then(setPersisted);
  };
  useEffect(reload, [snapshots?.length]);

  const doExport = async () => {
    if (protect && pwd.length < 6) return toast('A senha do backup precisa ter ao menos 6 caracteres.', 'erro');
    setBusy(true);
    try {
      const name = await exportBackup(protect ? pwd : undefined);
      await setSetting('backup.lastExport', new Date().toISOString());
      await audit('backup.exportado', name, user?.id);
      toast('Backup exportado. Guarde o arquivo em local seguro (pendrive, nuvem).');
    } finally {
      setBusy(false);
    }
  };

  const doSnapshot = async () => {
    await createSnapshot(`Manual — ${new Date().toLocaleString('pt-BR')}`);
    await audit('backup.ponto', undefined, user?.id);
    toast('Ponto de restauração criado neste navegador.');
  };

  const pick = async (file: File) => {
    try {
      const data = await readBackupFile(file);
      setPending({ file, data });
    } catch (e) {
      if (e instanceof NeedsPassword) setPending({ file, needsPwd: true });
      else toast(e instanceof Error ? e.message : 'Arquivo inválido.', 'erro');
    }
  };

  const unlock = async () => {
    if (!pending) return;
    try {
      setPending({ file: pending.file, data: await readBackupFile(pending.file, importPwd) });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao abrir.', 'erro');
    }
  };

  const confirmImport = async () => {
    if (!pending?.data) return;
    setBusy(true);
    try {
      await createSnapshot('Automático — antes de importar');
      await restore(pending.data, mode);
      await audit('backup.importado', `${pending.file.name} (${mode})`, user?.id);
      setPending(null);
      setImportPwd('');
      await refresh();
      reload();
      toast('Backup importado com sucesso.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Falha ao importar.', 'erro');
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async (id: string) => {
    if (!confirm('Restaurar este ponto? Os dados atuais serão substituídos (um ponto automático será criado antes).')) return;
    await createSnapshot('Automático — antes de restaurar');
    await restoreSnapshot(id);
    await refresh();
    reload();
    toast('Dados restaurados.');
  };

  const days = lastExport ? Math.floor((Date.now() - new Date(String(lastExport.value)).getTime()) / 86400000) : null;

  return (
    <>
      <PageHeader title="Backup" subtitle="Seus dados ficam apenas neste computador, no armazenamento do navegador. Faça backups com frequência." />

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
        <HardDrive className="text-brand-600" size={22} />
        <div className="flex-1 text-sm">
          <p className="font-medium text-ink">Armazenamento local {persisted ? <Badge tone="green">protegido</Badge> : <Badge tone="amber">pode ser limpo pelo navegador</Badge>}</p>
          <p className="text-soft">
            Usando {bytes(usage.usage || 0)}{usage.quota ? ` de ${bytes(usage.quota)} disponíveis` : ''}. Último backup exportado: {days === null ? 'nunca' : days === 0 ? 'hoje' : `há ${days} dia(s)`}.
          </p>
        </div>
        {!persisted && (
          <Button size="sm" onClick={async () => { const ok = await navigator.storage?.persist?.(); setPersisted(!!ok); toast(ok ? 'Armazenamento protegido contra limpeza automática.' : 'O navegador não concedeu a proteção. Instale o app ou use backups.', ok ? 'ok' : 'erro'); }}>
            Proteger dados
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Criar backup">
          <p className="mb-4 text-sm text-soft">Cria um ponto de restauração rápido, guardado aqui no navegador. Útil antes de grandes mudanças.</p>
          <Button className="w-full" icon={<History size={16} />} onClick={doSnapshot}>Criar ponto de restauração</Button>
          <p className="mt-3 text-xs text-faint">Não substitui o arquivo exportado: se o navegador for limpo, os pontos também somem.</p>
        </Card>

        <Card title="Exportar backup">
          <p className="mb-4 text-sm text-soft">Baixa um arquivo <code>.json</code> com todos os dados: contas, processos, publicações, área de trabalho e configurações.</p>
          <Toggle checked={protect} onChange={setProtect} label="Proteger com senha" description="Criptografia AES-256. Sem a senha, o arquivo não pode ser aberto." />
          {protect && (
            <Field label="Senha do backup" className="mt-2">
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" />
            </Field>
          )}
          <Button variant="primary" className="mt-4 w-full" icon={protect ? <Lock size={16} /> : <Download size={16} />} onClick={doExport} disabled={busy}>
            Exportar arquivo
          </Button>
        </Card>

        <Card title="Importar backup">
          <p className="mb-4 text-sm text-soft">Restaura um arquivo exportado — neste ou em outro computador. Antes de importar, um ponto de restauração é criado automaticamente.</p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
          <Button className="w-full" icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>Escolher arquivo</Button>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Pontos de restauração">
          {!snapshots?.length ? (
            <p className="text-sm text-faint">Nenhum ponto criado.</p>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {snapshots.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{s.label}</p>
                    <p className="text-xs text-faint">{fmtDateTime(s.createdAt)} · {bytes(s.size)}</p>
                  </div>
                  <Button size="sm" icon={<ArchiveRestore size={14} />} onClick={() => doRestore(s.id)}>Restaurar</Button>
                  <IconButton label="Excluir" onClick={() => db.snapshots.delete(s.id)}><Trash2 size={15} /></IconButton>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="O que está guardado">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 rounded-lg bg-muted px-3 py-2">
                <dt className="text-soft">{LABELS[k] || k}</dt>
                <dd className="font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 flex items-start gap-2 text-xs text-soft"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-500" /> Nenhum desses dados é enviado a servidores. As buscas nas fontes públicas enviam apenas os termos pesquisados.</p>
        </Card>
      </div>

      <Modal
        open={!!pending}
        onClose={() => { setPending(null); setImportPwd(''); }}
        title="Importar backup"
        footer={pending?.data ? <><Button onClick={() => setPending(null)}>Cancelar</Button><Button variant="primary" onClick={confirmImport} disabled={busy}>Importar</Button></> : <Button variant="primary" onClick={unlock}>Abrir</Button>}
      >
        {pending?.needsPwd && !pending.data ? (
          <Field label="Este backup é protegido. Digite a senha:">
            <Input type="password" value={importPwd} onChange={(e) => setImportPwd(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unlock()} autoFocus />
          </Field>
        ) : pending?.data ? (
          <div className="space-y-4 text-sm">
            <p className="text-soft">Arquivo <strong className="text-ink">{pending.file.name}</strong>, criado em {fmtDateTime(pending.data.createdAt)}.</p>
            <ul className="grid grid-cols-2 gap-2">
              {Object.entries(pending.data.tables).map(([k, v]) => (
                <li key={k} className="flex justify-between rounded-lg bg-muted px-3 py-1.5"><span className="text-soft">{LABELS[k] || k}</span><span>{v.length}</span></li>
              ))}
            </ul>
            <div className="space-y-2">
              <label className="flex items-start gap-2"><input type="radio" checked={mode === 'mesclar'} onChange={() => setMode('mesclar')} className="mt-1 accent-brand-600" /> <span><strong className="text-ink">Mesclar</strong> — junta com os dados atuais (itens iguais são atualizados).</span></label>
              <label className="flex items-start gap-2"><input type="radio" checked={mode === 'substituir'} onChange={() => setMode('substituir')} className="mt-1 accent-brand-600" /> <span><strong className="text-ink">Substituir</strong> — apaga os dados atuais e usa só os do arquivo.</span></label>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
