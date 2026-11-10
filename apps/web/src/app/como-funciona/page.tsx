'use client';
import Link from 'next/link';
import { AlarmClock, Archive, Bell, CheckCheck, FileSearch, HardDrive, KeyRound, Landmark, MonitorDown, Share2, ShieldAlert } from 'lucide-react';
import { RESPONSABILIDADE_RESUMO } from '@/lib/termos';
import { PublicShell } from '@/components/PublicShell';

const PASSOS = [
  { icon: KeyRound, t: 'Você informa suas palavras-chave', d: 'Nome completo, CPF e número da OAB. Opcionalmente, processos, partes e termos de licitação.' },
  { icon: FileSearch, t: 'O app pesquisa sozinho, a cada hora', d: 'No DJEN (intimações de todos os tribunais integrados ao CNJ), nos diários oficiais municipais, no DataJud e no PNCP (licitações). Nos diários estaduais, do DF e da União, a busca é assistida: o app abre o site oficial com a palavra-chave pronta.' },
  { icon: AlarmClock, t: 'Lê a publicação e estima o prazo', d: 'Identifica processo, partes, tribunal, vara, comarca e tipo, e calcula o fim do prazo em dias úteis (feriados e recesso de 20/12 a 20/01). Quando o texto não informa o prazo, ele aparece como “presumido”.' },
  { icon: Bell, t: 'Avisa você', d: 'Notificação no app e no computador; resumo por e-mail e WhatsApp.' },
  { icon: CheckCheck, t: 'Você lê e organiza', d: 'O Painel mostra só o que não foi lido. Ao abrir uma publicação (ou clicar no número do processo), ela vai para “Intimações lidas”. Há filtros, busca, exportação em PDF/Excel/CSV e compartilhamento da tela inteira.' },
  { icon: HardDrive, t: 'Tudo fica no seu computador', d: 'Não há login nem servidor: os dados ficam nos arquivos do navegador. Faça backup mensal em Backup → Exportar arquivo.' },
  { icon: MonitorDown, t: 'Instale como aplicativo', d: 'Use “Salvar na área de trabalho” para ter o ícone no computador ou no celular.' },
  { icon: Share2, t: 'Indique a colegas', d: 'O botão “Compartilhar o app” envia o convite por WhatsApp, e-mail ou outros apps.' },
];

export default function ComoFunciona() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Como funciona</h1>
      <p className="mt-2 text-soft">O NÃO ESQUECE ADV procura suas publicações nas fontes oficiais e organiza tudo em um só lugar.</p>

      <ol className="mt-8 space-y-5">
        {PASSOS.map(({ icon: Icon, t, d }, i) => (
          <li key={t} className="flex gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B8C39A]/30 text-[#5B6B3A] dark:text-[#C9D3AE]">
              <Icon size={20} />
            </span>
            <div>
              <p className="font-semibold text-ink">{i + 1}. {t}</p>
              <p className="mt-0.5 text-sm leading-6 text-soft">{d}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-10 rounded-2xl border border-amber-500/40 bg-amber-50 p-5 dark:bg-amber-500/10">
        <p className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200"><ShieldAlert size={18} /> Responsabilidade</p>
        <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100">{RESPONSABILIDADE_RESUMO}</p>
        <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100">Ao aceitar os Termos de uso, o usuário concorda com isso.</p>
        <Link href="/termos/" className="mt-3 inline-block text-sm font-medium text-amber-900 underline dark:text-amber-200">Ler os Termos de uso completos</Link>
      </section>

      <section className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
        <Link href="/backup/" className="flex items-center gap-2 rounded-xl border border-line p-4 hover:bg-muted"><Archive size={18} /> Fazer backup agora</Link>
        <Link href="/monitoramento/" className="flex items-center gap-2 rounded-xl border border-line p-4 hover:bg-muted"><Landmark size={18} /> Ver fontes e diários oficiais</Link>
      </section>
    </PublicShell>
  );
}
