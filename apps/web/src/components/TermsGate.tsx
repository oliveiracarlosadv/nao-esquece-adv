'use client';
/** Pede o aceite dos Termos de uso a quem ainda não aceitou a versão atual (inclui quem já usava o app). */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { aceitarTermos, termosAceitos } from '@/lib/aceite';
import { RESPONSABILIDADE_RESUMO, TERMOS_DATA, TERMOS_VERSAO } from '@/lib/termos';
import { Button } from './ui';

export function TermsGate({ userId }: { userId: string }) {
  const [show, setShow] = useState(false);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    termosAceitos().then((a) => setShow(!a));
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-label="Termos de uso" className="w-full max-w-lg rounded-t-2xl border border-line bg-surface p-6 shadow-xl sm:rounded-2xl">
        <p className="flex items-center gap-2 text-lg font-semibold text-ink"><Scale size={20} /> Termos de uso</p>
        <p className="mt-1 text-xs text-faint">Versão {TERMOS_VERSAO} · {TERMOS_DATA}</p>
        <p className="mt-4 text-sm leading-6 text-soft">{RESPONSABILIDADE_RESUMO}</p>
        <Link href="/termos/" target="_blank" className="mt-2 inline-block text-sm font-medium text-brand-600 underline">Ler os Termos de uso completos</Link>
        <label className="mt-4 flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-ink">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 accent-brand-600" />
          <span>Li e aceito os Termos de uso e assumo plena responsabilidade pelo gerenciamento das minhas intimações e prazos.</span>
        </label>
        <Button variant="primary" className="mt-4 w-full" disabled={!ok} onClick={async () => { await aceitarTermos(userId); setShow(false); }}>Aceito</Button>
      </div>
    </div>
  );
}
