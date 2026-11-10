'use client';
/**
 * "Exportar em PDF" — usado em toda leitura de publicação (intimação, citação, sentença,
 * notificação, despacho, decisão, acórdão…). Gera o PDF completo e oferece:
 *   • Salvar PDF
 *   • Compartilhar (WhatsApp, e-mail, Mensagens, AirDrop e outros apps)
 * O PDF é gerado assim que a janela abre: no iPhone o compartilhamento precisa sair logo após o toque.
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, Download, FileDown, Share2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { audit, type Publication } from '@/lib/db';
import { publicationPdf } from '@/lib/export';
import { downloadBlob, fmtDate } from '@/lib/format';
import { shareFile } from '@/lib/share';
import { useUi } from './Providers';
import { Button, Modal, Spinner } from './ui';

export function PdfExportModal({ p, onClose }: { p: Publication | null; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useUi();
  const [doc, setDoc] = useState<{ blob: Blob; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    setDoc(null);
    setDone(null);
    if (!p || !user) return;
    let alive = true;
    publicationPdf(p, user)
      .then((r) => alive && setDoc(r))
      .catch(() => alive && toast('Não foi possível gerar o PDF.', 'erro'));
    return () => {
      alive = false;
    };
  }, [p?.id, p?.deadline?.endAt, user?.name, user?.oab]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p || !user) return null;
  const title = `${p.type}${p.processNumber ? ` — ${p.processNumber}` : ''}`;

  const save = async () => {
    if (!doc) return;
    downloadBlob(doc.blob, doc.name);
    setDone('PDF salvo na pasta de downloads.');
    await audit('pdf.salvo', p.processNumber || p.type, user.id);
  };

  const share = async () => {
    if (!doc) return;
    setBusy(true);
    try {
      const r = await shareFile(doc.blob, doc.name, title, `${title} — NÃO ESQUECE ADV`);
      if (r === 'compartilhado') setDone('PDF compartilhado.');
      if (r === 'baixado') setDone('Este navegador não compartilha arquivos: o PDF foi salvo na pasta de downloads. Envie-o pelo app que preferir.');
      if (r !== 'cancelado') await audit('pdf.compartilhado', `${r}: ${p.processNumber || p.type}`, user.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Exportar em PDF">
      <div className="space-y-4 text-sm">
        <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
          <FileDown className="mt-0.5 shrink-0 text-[#C0573E]" size={22} />
          <div className="min-w-0">
            <p className="font-medium text-ink">{title}</p>
            <p className="text-xs text-soft">
              Disponibilização {fmtDate(p.availableAt)} · Publicação {fmtDate(p.publishedAt)}
              {p.deadline ? ` · Fim do prazo ${fmtDate(p.deadline.endAt)}` : ''}
            </p>
            <p className="mt-1 text-xs text-faint">Seus dados, processo, datas, prazo e inteiro teor · Times New Roman 12, justificado.</p>
          </div>
        </div>

        {!doc ? (
          <p className="flex items-center gap-2 text-soft"><Spinner /> Preparando o PDF…</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button className="h-12" icon={<Download size={18} />} onClick={save}>Salvar PDF</Button>
            <Button className="h-12" variant="primary" icon={<Share2 size={18} />} onClick={share} disabled={busy}>Compartilhar</Button>
          </div>
        )}
        <p className="text-xs text-faint">Compartilhar abre a lista do aparelho: WhatsApp, e-mail, Mensagens, AirDrop, Drive e outros apps.</p>
        {done && <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={16} /> {done}</p>}
      </div>
    </Modal>
  );
}

/** Botão padrão "Exportar em PDF". */
export function PdfExportButton({ p, size = 'sm', variant = 'primary', className }: { p: Publication; size?: 'sm' | 'md'; variant?: 'primary' | 'secondary'; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} variant={variant} icon={<FileDown size={size === 'sm' ? 15 : 17} />} onClick={() => setOpen(true)} className={className}>
        Exportar em PDF
      </Button>
      {open && <PdfExportModal p={p} onClose={() => setOpen(false)} />}
    </>
  );
}
