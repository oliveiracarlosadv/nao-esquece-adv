'use client';
/** "Compartilhar o app": convida outros advogados a usar o NÃO ESQUECE ADV. */
import { useState } from 'react';
import { Copy, Mail, MessageCircle, Share2 } from 'lucide-react';
import { cx } from '@/lib/format';
import { mailtoLink, whatsappLink } from '@/lib/notify';
import { useUi } from './Providers';
import { Modal } from './ui';

export const PUBLIC_URL = 'https://oliveiracarlosadv.github.io/nao-esquece-adv/';

function appUrl(): string {
  if (typeof window === 'undefined') return PUBLIC_URL;
  // Em localhost (testes) usa o endereço público; senão, o endereço atual do app.
  return /localhost|127\.0\.0\.1/.test(location.hostname) ? PUBLIC_URL : `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ''}/`;
}

export const INVITE =
  'Conheça o NÃO ESQUECE ADV: monitora intimações, publicações e licitações automaticamente pelo seu nome, CPF e OAB, calcula os prazos e avisa você. Gratuito e completo, e os dados ficam só no seu computador.';

export function ShareAppButton({ className, variant = 'menu' }: { className?: string; variant?: 'menu' | 'button' }) {
  const { toast } = useUi();
  const [open, setOpen] = useState(false);
  const url = appUrl();
  const text = `${INVITE}\n${url}`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'NÃO ESQUECE ADV', text: INVITE, url });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={share}
        className={cx(
          variant === 'menu'
            ? 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#5B6B3A] transition-colors hover:bg-[#B8C39A]/25 dark:text-[#C9D3AE]'
            : 'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-muted',
          className,
        )}
      >
        <Share2 size={18} strokeWidth={1.8} />
        <span>Compartilhar o app</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Compartilhar o NÃO ESQUECE ADV">
        <div className="space-y-4 text-sm">
          <p className="text-soft">Indique o app a outros advogados:</p>
          <p className="rounded-lg bg-muted p-3 text-ink">{INVITE}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <a className="flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2.5 hover:bg-muted" target="_blank" rel="noreferrer" href={whatsappLink(text)}>
              <MessageCircle size={16} /> WhatsApp
            </a>
            <a className="flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2.5 hover:bg-muted" href={mailtoLink('', 'Conheça o NÃO ESQUECE ADV', text)}>
              <Mail size={16} /> E-mail
            </a>
            <button className="flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2.5 hover:bg-muted" onClick={() => navigator.clipboard.writeText(text).then(() => toast('Link copiado.'))}>
              <Copy size={16} /> Copiar link
            </button>
          </div>
          <p className="break-all text-xs text-faint">{url}</p>
        </div>
      </Modal>
    </>
  );
}
