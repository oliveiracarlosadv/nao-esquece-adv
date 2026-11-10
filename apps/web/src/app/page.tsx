'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Archive, BellRing, CalendarClock, FileDown, Landmark, Radar, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ensureDemoUser } from '@/lib/demo';
import { LogoMark } from '@/components/Logo';
import { PublicShell } from '@/components/PublicShell';
import { InstallButton } from '@/components/InstallApp';
import { Button } from '@/components/ui';

const FEATURES = [
  { icon: Radar, title: 'Busca automática a cada hora', text: 'DJEN (todos os tribunais integrados ao CNJ), DataJud, diários oficiais municipais e PNCP.' },
  { icon: CalendarClock, title: 'Prazo calculado sozinho', text: 'Dias úteis, feriados nacionais, recesso de 20/12 a 20/01 e feriados locais.' },
  { icon: Sparkles, title: 'Dados extraídos do texto', text: 'Processo, partes, comarca, vara, tribunal, órgão e tipo da publicação.' },
  { icon: BellRing, title: 'Avisos na hora', text: 'Notificação no sistema e no computador, resumo por e-mail e WhatsApp.' },
  { icon: FileDown, title: 'Exporte como quiser', text: 'PDF, Excel ou CSV, filtrando por vara, processo, tribunal ou período.' },
  { icon: Landmark, title: 'Licitações públicas', text: 'Editais do Portal Nacional de Contratações Públicas pelos seus termos.' },
  { icon: Archive, title: 'Backup em um clique', text: 'Crie, exporte e importe backups — com senha, se quiser.' },
  { icon: ShieldCheck, title: 'Privacidade (LGPD)', text: 'Tudo fica no seu computador. Nenhum servidor guarda seus dados.' },
];

export default function Home() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const demo = async () => {
    setBusy(true);
    await ensureDemoUser();
    await refresh();
    router.push('/painel/');
  };

  return (
    <PublicShell wide>
      <section className="mx-auto max-w-3xl py-10 text-center sm:py-16">
        <LogoMark size={64} className="mx-auto" />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Nenhuma intimação passa despercebida.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-soft">
          O NÃO ESQUECE ADV procura suas intimações, citações, publicações e licitações nas fontes oficiais, calcula os prazos e mostra tudo em um painel único.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {user ? (
            <Link href="/painel/"><Button variant="primary" className="w-full px-6 sm:w-auto">Abrir meu painel</Button></Link>
          ) : (
            <>
              <Link href="/cadastro/"><Button variant="primary" className="w-full px-6 sm:w-auto">Começar agora</Button></Link>
              <Button onClick={demo} disabled={busy} className="px-6">{busy ? 'Preparando…' : 'Ver demonstração'}</Button>
            </>
          )}
          <InstallButton className="px-6" />
        </div>
        <p className="mt-4 text-xs text-faint">100% gratuito e completo · Funciona sem instalar · Dados salvos só no seu navegador</p>
      </section>

      <section className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="bg-surface p-6">
            <Icon size={20} className="text-brand-600" strokeWidth={1.8} />
            <h2 className="mt-4 font-semibold text-ink">{title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-soft">{text}</p>
          </div>
        ))}
      </section>
    </PublicShell>
  );
}
