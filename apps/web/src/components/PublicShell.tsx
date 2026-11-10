'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Logo } from './Logo';
import { ShareAppButton } from './ShareApp';
import { useUi } from './Providers';

export function PublicShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const { theme, toggleTheme } = useUi();
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-app">
      <header className="border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/"><Logo /></Link>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <ShareAppButton variant="menu" className="!w-auto !px-2 sm:!px-3 [&>span]:hidden sm:[&>span]:inline" />
            <Link href="/como-funciona/" className="hidden rounded-lg px-3 py-2 text-soft hover:bg-muted hover:text-ink sm:block">Como funciona</Link>
            <Link href="/sobre/" className="rounded-lg px-3 py-2 text-soft hover:bg-muted hover:text-ink">Sobre</Link>
            {user ? (
              <Link href="/painel/" className="rounded-lg bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700">Abrir painel</Link>
            ) : (
              <Link href="/cadastro/" className="rounded-lg px-3 py-2 font-medium text-ink hover:bg-muted">Começar</Link>
            )}
            <button onClick={toggleTheme} aria-label="Alternar tema" className="flex h-9 w-9 items-center justify-center rounded-lg text-soft hover:bg-muted hover:text-ink">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </nav>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-10 sm:px-6 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>{children}</main>
      <footer className="border-t border-line py-6 text-center text-xs text-faint">
        NÃO ESQUECE ADV · Nenhuma intimação passa despercebida. · Seus dados ficam no seu computador. ·{' '}
        <Link href="/termos/" className="underline">Termos de uso</Link> · <Link href="/como-funciona/" className="underline">Como funciona</Link>
      </footer>
    </div>
  );
}
