'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Archive, Bell, Bookmark, CheckCheck, Info, LayoutList, Menu, Moon, Radar, RefreshCw, Search, Shield, Sun, User as UserIcon, X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { cx, fmtDateTime } from '@/lib/format';
import { isDemo, lastRunAt, runMonitor, startScheduler, type RunResult } from '@/lib/monitor';
import { leaveDemo } from '@/lib/demo';
import { InstallButton } from './InstallApp';
import { Logo } from './Logo';
import { useUi } from './Providers';
import { Spinner } from './ui';

type MonitorCtx = { running: boolean; lastRun: string | null; runNow: () => Promise<RunResult | undefined> };
const MCtx = createContext<MonitorCtx>({ running: false, lastRun: null, runNow: async () => undefined });
export const useMonitor = () => useContext(MCtx);

const NAV = [
  { href: '/painel/', label: 'Painel', icon: LayoutList },
  { href: '/lidas/', label: 'Intimações lidas', icon: CheckCheck },
  { href: '/monitoramento/', label: 'Monitoramento', icon: Radar },
  { href: '/meus-paineis/', label: 'Meus painéis', icon: Bookmark },
  { href: '/notificacoes/', label: 'Notificações', icon: Bell },
  { href: '/backup/', label: 'Backup', icon: Archive },
  { href: '/perfil/', label: 'Meu perfil', icon: UserIcon },
  { href: '/sobre/', label: 'Sobre', icon: Info },
];

const SCOPES = [
  { id: 'tudo', label: 'Tudo' },
  { id: 'parte', label: 'Partes' },
  { id: 'processo', label: 'Processo' },
  { id: 'advogado', label: 'Advogado' },
  { id: 'oab', label: 'OAB' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const { theme, toggleTheme, toast } = useUi();
  const router = useRouter();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('tudo');
  const userRef = useRef(user);
  userRef.current = user;

  const lastExport = useLiveQuery(() => db.settings.get('backup.lastExport'), []);
  const snoozed = useLiveQuery(() => db.settings.get('backup.lembreteAdiado'), []);
  const unread = useLiveQuery(() => (user ? db.notifications.where('userId').equals(user.id).filter((n) => !n.read).count() : 0), [user?.id]) ?? 0;

  useEffect(() => {
    if (ready && !user) router.replace('/cadastro/');
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    lastRunAt(user.id).then(setLastRun);
    return startScheduler(
      () => userRef.current,
      (r) => {
        if (userRef.current) lastRunAt(userRef.current.id).then(setLastRun);
        if (r.created) toast(`${r.created} nova(s) publicação(ões) encontrada(s).`);
      },
    );
  }, [user, toast]);

  useEffect(() => setMenu(false), [pathname]);

  const runNow = useCallback(async () => {
    if (!user) return;
    setRunning(true);
    try {
      const r = await runMonitor(user, 'manual');
      setLastRun(await lastRunAt(user.id));
      if (r.errors.length && !r.found) toast(`Busca concluída com avisos: ${r.errors[0]}`, 'erro');
      else toast(r.created ? `${r.created} nova(s) publicação(ões).` : 'Busca concluída. Nenhuma publicação nova.');
      return r;
    } finally {
      setRunning(false);
    }
  }, [user, toast]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (scope !== 'tudo') params.set('campo', scope);
    router.push(`/painel/?${params}`);
  };

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-soft">
        <Spinner />
      </div>
    );
  }

  const nav = user.role === 'admin' ? [...NAV, { href: '/admin/', label: 'Administração', icon: Shield }] : NAV;

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="px-2 pb-5 pt-2">
        <Link href="/painel/">
          <Logo />
        </Link>
      </div>
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname?.startsWith(href.slice(0, -1));
        return (
          <Link
            key={href}
            href={href}
            className={cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', active ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-100' : 'text-soft hover:bg-muted hover:text-ink')}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span className="flex-1">{label}</span>
            {href === '/notificacoes/' && unread > 0 && <span className="rounded-full bg-alert px-1.5 text-[11px] font-semibold text-white">{unread}</span>}
          </Link>
        );
      })}
      <div className="mt-auto space-y-3 border-t border-line px-2 pt-4">
        <button onClick={runNow} disabled={running} className="flex w-full items-center gap-2 text-left text-xs text-soft hover:text-ink disabled:opacity-60">
          {running ? <Spinner className="h-3 w-3" /> : <RefreshCw size={13} />}
          <span>
            {running ? 'Buscando nas fontes…' : 'Buscar agora'}
            <span className="block text-faint">Última: {lastRun ? fmtDateTime(lastRun) : 'nunca'}</span>
          </span>
        </button>
        <div className="flex items-center gap-2.5">
          {user.avatar ? <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-soft">{user.name.slice(0, 1)}</span>}
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-medium text-ink">{user.name}</p>
            <p className="truncate text-faint">{user.oab ? `OAB ${user.oab}/${user.oabUf}` : user.email}</p>
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <MCtx.Provider value={{ running, lastRun, runNow }}>
      <div className="flex min-h-screen w-full max-w-full overflow-x-clip bg-app">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-surface lg:block">{sidebar}</aside>
        {menu && (
          <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMenu(false)}>
            <aside className="h-full w-72 bg-surface" onClick={(e) => e.stopPropagation()}>
              {sidebar}
            </aside>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b sm:gap-3 border-line bg-surface/85 px-4 backdrop-blur sm:px-6">
            <button className="shrink-0 text-soft lg:hidden" onClick={() => setMenu((m) => !m)} aria-label="Menu">
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
            <form onSubmit={onSearch} className="flex h-10 min-w-0 max-w-xl flex-1 items-center rounded-lg border border-line bg-app focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
              <Search size={17} className="ml-3 shrink-0 text-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar partes, processo, advogado ou OAB" className="min-w-0 flex-1 bg-transparent px-2.5 text-sm text-ink placeholder:text-faint focus:outline-none" aria-label="Busca global" />
              <select value={scope} onChange={(e) => setScope(e.target.value)} className="hidden h-full border-l border-line bg-transparent px-2 text-xs text-soft focus:outline-none sm:block" aria-label="Buscar em">
                {SCOPES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </form>
            <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
              <InstallButton compact className="!h-9 !w-9 !px-0 sm:mr-1 sm:!w-auto sm:!px-4" />
              <button onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-lg text-soft hover:bg-muted hover:text-ink" aria-label="Alternar tema" title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}>
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link href="/notificacoes/" className="relative flex h-9 w-9 items-center justify-center rounded-lg text-soft hover:bg-muted hover:text-ink" aria-label="Notificações">
                <Bell size={18} />
                {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-alert" />}
              </Link>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
            {isDemo(user) && (
              <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-brand-500/30 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:bg-brand-600/15 dark:text-brand-100">
                <span className="flex-1">Você está na <strong>demonstração</strong>, com dados fictícios. As buscas reais ficam desligadas.</span>
                <button
                  className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
                  onClick={async () => {
                    if (!confirm('Sair da demonstração? Os dados fictícios serão apagados.')) return;
                    await leaveDemo();
                    location.href = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/cadastro/`;
                  }}
                >
                  Começar de verdade
                </button>
              </div>
            )}
            {!isDemo(user) && backupDue(user.createdAt, lastExport?.value as string | undefined, snoozed?.value as string | undefined) && (
              <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                <Archive size={18} className="shrink-0" />
                <span className="flex-1">
                  <strong>Hora do backup mensal.</strong> {lastExport ? 'Seu último backup tem mais de 30 dias.' : 'Você ainda não exportou nenhum backup.'} Seus dados ficam só neste navegador.
                </span>
                <Link href="/backup/" className="rounded-lg bg-amber-500 px-3 py-1.5 font-medium text-white hover:bg-amber-600">Fazer backup agora</Link>
                <button className="text-xs underline" onClick={() => db.settings.put({ key: 'backup.lembreteAdiado', value: new Date().toISOString() })}>Lembrar em 3 dias</button>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </MCtx.Provider>
  );
}

/** Backup mensal: avisa quando o último backup exportado (ou o início do uso) tem mais de 30 dias. */
function backupDue(createdAt: string, lastExport?: string, snoozed?: string): boolean {
  const day = 86400000;
  if (snoozed && Date.now() - new Date(snoozed).getTime() < 3 * day) return false;
  const ref = lastExport || createdAt;
  return Date.now() - new Date(ref).getTime() > 30 * day;
}
