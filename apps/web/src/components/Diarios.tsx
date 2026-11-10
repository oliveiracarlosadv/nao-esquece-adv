'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, ExternalLink, KeyRound, Landmark, Pencil } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { audit, db, setSetting, type User } from '@/lib/db';
import { DIARIOS_ESTADUAIS, DOU } from '@/lib/diarios-estaduais';
import { cx } from '@/lib/format';
import { keywordVariants } from '@/lib/sources';
import { useUi } from './Providers';
import { Badge, Button, Card, Select } from './ui';

/** As três palavras-chave principais do monitoramento. */
export function KeywordsCard() {
  const { user } = useAuth();
  if (!user) return null;
  const rows: [string, string][] = [
    ['Nome completo', user.name],
    ['CPF', user.cpf],
    ['Número da OAB', user.oab ? `${user.oab}/${user.oabUf}` : ''],
  ];
  return (
    <Card title="Palavras-chave das buscas" action={<Link href="/perfil/" className="inline-flex items-center gap-1 text-sm text-brand-600"><Pencil size={14} /> Alterar</Link>}>
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-muted px-4 py-3">
            <p className="text-xs text-faint">{k}</p>
            <p className={cx('mt-0.5 font-medium', v ? 'text-ink' : 'text-red-600')}>{v || 'não informado'}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-soft">
        Pesquisadas a cada hora no DJEN (nome e OAB), nos diários oficiais municipais (nome, CPF e OAB, com as variações de escrita) e nos diários estaduais pela busca assistida.
        O DJEN não permite busca por CPF.
      </p>
    </Card>
  );
}

function link(d: { url: string; uf: string }, term: string): string {
  // O Diário Oficial da União aceita a busca direto pelo endereço.
  if (d.uf === 'BR') return `https://www.in.gov.br/consulta/-/buscar/dou?q=${encodeURIComponent(`"${term}"`)}&s=todos&exactDate=all&sortType=0`;
  return d.url;
}

/** Busca assistida nos Diários Oficiais Estaduais, do DF e da União. */
export function DiariosEstaduais() {
  const { user } = useAuth();
  const { toast } = useUi();
  const chosen = useLiveQuery(() => db.settings.get('diarios.estados'), []);
  const lastChecks = useLiveQuery(() => db.settings.get('diarios.ultimaConsulta'), []);
  const [which, setWhich] = useState<'nome' | 'cpf' | 'oab'>('nome');
  if (!user) return null;

  const ALL = DIARIOS_ESTADUAIS.map((d) => d.uf);
  // Padrão: todos os estados marcados. A UF da OAB aparece primeiro.
  const ufs: string[] = (chosen?.value as string[] | undefined) || ALL;
  const checks = (lastChecks?.value as Record<string, string> | undefined) || {};
  const v = keywordVariants(user);
  const term = (which === 'nome' ? v.nome[0] : which === 'cpf' ? v.cpf[0] : v.oab[0]) || '';

  const open = async (d: { uf: string; url: string; nome: string }) => {
    if (!term) return toast('Preencha nome, CPF e OAB no seu perfil.', 'erro');
    try {
      await navigator.clipboard.writeText(term);
    } catch {}
    window.open(link(d, term), '_blank', 'noopener');
    await setSetting('diarios.ultimaConsulta', { ...checks, [d.uf]: new Date().toISOString() });
    await audit('diario.consulta', `${d.uf}: ${which}`, user.id);
    if (d.uf !== 'BR') toast(`“${term}” copiado. Cole (Ctrl/⌘+V) na busca do site.`);
  };

  const toggle = (uf: string) => setSetting('diarios.estados', ufs.includes(uf) ? ufs.filter((x) => x !== uf) : [...ufs, uf]);

  const mine = [DOU, ...DIARIOS_ESTADUAIS.filter((d) => ufs.includes(d.uf)).sort((a, b) => (a.uf === user.oabUf ? -1 : b.uf === user.oabUf ? 1 : 0))];

  return (
    <div className="space-y-6">
      <Card title="Diários oficiais estaduais, do DF e da União" action={<Landmark size={16} className="text-faint" />}>
        <p className="text-sm leading-6 text-soft">
          Os diários estaduais não têm API pública: cada estado usa um site próprio, sem busca automática aberta. Aqui a busca é <strong className="text-ink">assistida</strong>: escolha a
          palavra-chave, clique em <strong className="text-ink">Pesquisar</strong> e o app abre o site oficial com a palavra já copiada. No Diário Oficial da União, a busca abre pronta.
          Os <strong className="text-ink">diários municipais</strong> e as publicações dos tribunais são pesquisados automaticamente.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-soft"><KeyRound size={15} /> Pesquisar por:</span>
          <Select value={which} onChange={(e) => setWhich(e.target.value as typeof which)} className="w-auto">
            <option value="nome">Nome completo</option>
            <option value="cpf">CPF</option>
            <option value="oab">Número da OAB</option>
          </Select>
          <code className="rounded bg-muted px-2 py-1 text-sm text-ink">{term || '—'}</code>
          <Button size="sm" variant="ghost" icon={<Copy size={14} />} onClick={() => term && navigator.clipboard.writeText(term).then(() => toast('Copiado.'))}>Copiar</Button>
        </div>
        <ul className="mt-5 divide-y divide-line">
          {mine.map((d) => (
            <li key={d.uf} className="flex flex-wrap items-center gap-3 py-3">
              <Badge tone={d.uf === 'BR' ? 'brand' : 'neutral'}>{d.uf}</Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{d.nome}</p>
                <p className="text-xs text-faint">{checks[d.uf] ? `Última consulta: ${new Date(checks[d.uf]).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Ainda não consultado'}{!d.verificado && ' · endereço não verificado'}</p>
              </div>
              <Button size="sm" variant="primary" icon={<ExternalLink size={14} />} onClick={() => open(d)}>Pesquisar</Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Estados acompanhados">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="flex-1 text-sm text-soft">Todos vêm marcados por padrão. Desmarque os estados que não quiser ver na lista acima.</p>
          <Button size="sm" onClick={() => setSetting('diarios.estados', ALL)}>Marcar todos</Button>
          <Button size="sm" variant="ghost" onClick={() => setSetting('diarios.estados', [])}>Desmarcar todos</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {DIARIOS_ESTADUAIS.map((d) => (
            <button key={d.uf} onClick={() => toggle(d.uf)} title={d.nome} className={cx('h-9 w-12 rounded-lg border text-sm font-medium', ufs.includes(d.uf) ? 'border-brand-600 bg-brand-600 text-white' : 'border-line text-soft hover:bg-muted')}>
              {d.uf}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

export type { User };
