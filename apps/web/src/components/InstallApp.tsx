'use client';
/**
 * "Salvar na área de trabalho": instala o NÃO ESQUECE ADV como web app (atalho/ícone)
 * no computador e no celular.
 *
 * - Chrome, Edge, Opera, Samsung Internet (Windows, Mac, Linux, Android): usa o evento
 *   `beforeinstallprompt` para abrir a janela de instalação do próprio navegador.
 * - Safari (iPhone/iPad e Mac) e Firefox: não permitem instalar por botão; mostramos o passo a passo.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, MonitorDown, Share, SquarePlus } from 'lucide-react';
import { cx } from '@/lib/format';
import { Button, Modal } from './ui';

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

export type Platform = 'ios' | 'mac-safari' | 'android' | 'firefox' | 'chromium' | 'outro';

type InstallCtx = { installed: boolean; canPrompt: boolean; platform: Platform; install: () => Promise<'instalado' | 'instrucoes' | 'cancelado'> };

const Ctx = createContext<InstallCtx>({ installed: false, canPrompt: false, platform: 'outro', install: async () => 'instrucoes' });
export const useInstall = () => useContext(Ctx);

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (iOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return 'mac-safari';
  if (/Chrome|Chromium|Edg\//.test(ua)) return 'chromium';
  return 'outro';
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>('outro');

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());
    const onPrompt = (e: Event) => {
      e.preventDefault(); // guarda o evento para abrir quando o usuário clicar no botão
      setPrompt(e as PromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return 'instrucoes' as const;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    if (outcome === 'accepted') {
      setInstalled(true);
      return 'instalado' as const;
    }
    return 'cancelado' as const;
  }, [prompt]);

  return <Ctx.Provider value={{ installed, canPrompt: !!prompt, platform, install }}>{children}</Ctx.Provider>;
}

const STEPS: Record<Platform, { title: string; steps: string[] }> = {
  ios: {
    title: 'iPhone ou iPad (Safari)',
    steps: ['Toque no botão Compartilhar (quadrado com seta para cima), na barra do Safari.', 'Role e toque em “Adicionar à Tela de Início”.', 'Toque em “Adicionar”. O ícone do NÃO ESQUECE ADV aparece na tela inicial.'],
  },
  'mac-safari': {
    title: 'Mac (Safari)',
    steps: ['No menu do Safari, clique em Arquivo → “Adicionar ao Dock…”.', 'Confirme o nome e clique em “Adicionar”.', 'O app aparece no Dock e na pasta Aplicativos.'],
  },
  android: {
    title: 'Android (Chrome)',
    steps: ['Toque no menu ⋮ do Chrome, no canto superior.', 'Toque em “Instalar app” ou “Adicionar à tela inicial”.', 'Confirme. O ícone aparece na tela inicial e na lista de apps.'],
  },
  chromium: {
    title: 'Computador (Chrome ou Edge)',
    steps: ['Clique no ícone de instalar, no lado direito da barra de endereço (monitor com seta).', 'Ou abra o menu ⋮ → “Transmitir, salvar e compartilhar” → “Instalar página como app” (no Edge: ⋯ → Apps → Instalar este site como app).', 'Clique em “Instalar”. O atalho vai para a área de trabalho, o menu Iniciar ou o Dock.'],
  },
  firefox: {
    title: 'Firefox',
    steps: ['O Firefox para computador não instala web apps.', 'Abra este endereço no Chrome, Edge ou Safari e use “Salvar na área de trabalho” lá.', 'No Firefox para Android: menu ⋮ → “Instalar” ou “Adicionar à tela inicial”.'],
  },
  outro: {
    title: 'Seu navegador',
    steps: ['Procure no menu do navegador a opção “Instalar app”, “Adicionar à tela inicial” ou “Adicionar ao Dock”.', 'Se não encontrar, abra este endereço no Chrome, Edge ou Safari.'],
  },
};

/** Botão "Salvar na área de trabalho". `compact` mostra só o ícone em telas pequenas. */
export function InstallButton({ compact, variant = 'secondary', className }: { compact?: boolean; variant?: 'primary' | 'secondary'; className?: string }) {
  const { installed, canPrompt, platform, install } = useInstall();
  const [help, setHelp] = useState(false);
  const [done, setDone] = useState(false);

  const onClick = async () => {
    if (installed) return setDone(true);
    const r = canPrompt ? await install() : 'instrucoes';
    if (r === 'instrucoes') setHelp(true);
    if (r === 'instalado') setDone(true);
  };

  const info = STEPS[platform];

  return (
    <>
      <Button variant={variant} icon={installed ? <CheckCircle2 size={16} /> : <MonitorDown size={16} />} onClick={onClick} className={cx(compact && 'shrink-0', className)} title="Instala o app como atalho no computador ou no celular">
        <span className={cx(compact && 'hidden sm:inline')}>{installed ? 'App instalado' : 'Salvar na área de trabalho'}</span>
      </Button>

      <Modal open={help} onClose={() => setHelp(false)} title="Salvar na área de trabalho">
        <div className="space-y-5 text-sm">
          <p className="text-soft">Instale o NÃO ESQUECE ADV como aplicativo: ele ganha um ícone próprio, abre em janela própria e continua monitorando enquanto estiver aberto.</p>
          <div>
            <p className="mb-3 font-medium text-ink">{info.title}</p>
            <ol className="space-y-3">
              {info.steps.map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{i + 1}</span>
                  <span className="pt-0.5 text-soft">{s}</span>
                </li>
              ))}
            </ol>
          </div>
          {platform === 'ios' && (
            <p className="flex items-center gap-2 rounded-lg bg-muted p-3 text-xs text-soft">
              <Share size={14} /> Compartilhar → <SquarePlus size={14} /> Adicionar à Tela de Início
            </p>
          )}
          {(platform === 'ios' || platform === 'mac-safari') && (
            <p className="rounded-lg border border-line p-3 text-xs leading-5 text-soft">
              No Safari, o app instalado guarda os dados separado do navegador. Se você já tem dados aqui, faça <strong className="text-ink">Backup → Exportar</strong> antes e <strong className="text-ink">Importar</strong> dentro do app instalado.
            </p>
          )}
        </div>
      </Modal>

      <Modal open={done} onClose={() => setDone(false)} title="App instalado">
        <p className="text-sm text-soft">
          {installed ? 'O NÃO ESQUECE ADV já está instalado neste dispositivo. Procure o ícone na área de trabalho, no menu Iniciar, no Dock ou na tela inicial.' : 'Pronto! O atalho foi criado.'}
        </p>
      </Modal>
    </>
  );
}
