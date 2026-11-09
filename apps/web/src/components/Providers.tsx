'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';

type Toast = { id: number; text: string; tone: 'ok' | 'erro' };
type UiCtx = { toast: (text: string, tone?: Toast['tone']) => void; theme: 'light' | 'dark'; toggleTheme: () => void };

const Ctx = createContext<UiCtx | null>(null);

export function useUi(): UiCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useUi fora do Providers');
  return c;
}

export function Providers({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    // Service worker: permite abrir o app sem internet e mostrar notificações.
    if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
      navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/sw.js`).catch(() => undefined);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem('nea.theme', next);
      } catch {}
      return next;
    });
  }, []);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ toast, theme, toggleTheme }}>
      <AuthProvider>{children}</AuthProvider>
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto rounded-lg px-4 py-3 text-sm shadow-lg ${t.tone === 'erro' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'}`}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
