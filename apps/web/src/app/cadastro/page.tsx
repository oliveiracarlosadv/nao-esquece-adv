'use client';
/**
 * Primeira abertura do app (sem login):
 * 1. Aviso: os dados ficam nos arquivos do navegador deste computador; backup mensal recomendado.
 * 2. Dados do advogado — nome completo, CPF e OAB são as palavras-chave das buscas.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Archive, HardDrive, Scale, ShieldCheck, Upload } from 'lucide-react';
import { useAuth, type RegisterInput } from '@/lib/auth';
import { NeedsPassword, readBackupFile, restore } from '@/lib/backup';
import { aceitarTermos } from '@/lib/aceite';
import { setSetting } from '@/lib/db';
import { RESPONSABILIDADE_RESUMO } from '@/lib/termos';
import { isValidCpf, maskCpf, maskPhone, readFileAsDataUrl, UFS } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { useUi } from '@/components/Providers';
import { Button, Field, Input, Select } from '@/components/ui';

export default function PrimeirosPassos() {
  const { register, user, ready, refresh } = useAuth();
  const { toast } = useUi();
  const router = useRouter();
  const [step, setStep] = useState<'aviso' | 'dados'>('aviso');
  const [ciente, setCiente] = useState(false);
  const [f, setF] = useState<RegisterInput>({ name: '', cpf: '', oab: '', oabUf: 'PA', email: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace('/painel/');
  }, [ready, user, router]);

  const set = <K extends keyof RegisterInput>(k: K, v: RegisterInput[K]) => setF({ ...f, [k]: v });

  const accept = async () => {
    await setSetting('aviso.armazenamento', new Date().toISOString());
    await aceitarTermos();
    setStep('dados');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidCpf(f.cpf)) return setError('CPF inválido.');
    if (!f.oab.trim()) return setError('Informe o número da OAB.');
    setBusy(true);
    try {
      await register(f);
      router.replace('/painel/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setBusy(false);
    }
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      let data;
      try {
        data = await readBackupFile(file);
      } catch (e) {
        if (!(e instanceof NeedsPassword)) throw e;
        data = await readBackupFile(file, prompt('Este backup é protegido. Digite a senha do backup:') || '');
      }
      await restore(data, 'substituir');
      await setSetting('aviso.armazenamento', new Date().toISOString());
      await aceitarTermos();
      await refresh();
      toast('Backup restaurado.');
      router.replace('/painel/');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível importar.', 'erro');
    }
  };

  const img = async (k: 'logo' | 'avatar', file?: File) => file && set(k, await readFileAsDataUrl(file));

  return (
    <div className="min-h-screen bg-app px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-8 flex justify-center"><Logo slogan /></Link>

        {step === 'aviso' ? (
          <div className="space-y-6 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
            <h1 className="text-xl font-semibold text-ink">Antes de começar: aviso e Termos de uso</h1>
            <ul className="space-y-4 text-[15px] leading-7 text-soft">
              <li className="flex gap-3">
                <HardDrive className="mt-1 shrink-0 text-brand-600" size={20} />
                <span>
                  <strong className="text-ink">Suas informações ficam salvas nos arquivos do navegador deste computador.</strong> Nada é enviado para servidores: não há login nem
                  conta na nuvem. As buscas nas fontes públicas enviam apenas as palavras pesquisadas.
                </span>
              </li>
              <li className="flex gap-3">
                <Archive className="mt-1 shrink-0 text-amber-500" size={20} />
                <span>
                  <strong className="text-ink">Recomenda-se fazer backup mensal.</strong> Se o navegador for limpo, reinstalado ou o computador for trocado, os dados só voltam com um
                  backup. Use o menu <strong className="text-ink">Backup → Exportar arquivo</strong> e guarde o arquivo em local seguro (pendrive ou nuvem). O app vai lembrar você todo mês.
                </span>
              </li>
              <li className="flex gap-3">
                <Scale className="mt-1 shrink-0 text-red-500" size={20} />
                <span>
                  <strong className="text-ink">Responsabilidade:</strong> {RESPONSABILIDADE_RESUMO}
                </span>
              </li>
              <li className="flex gap-3">
                <Archive className="mt-1 shrink-0 text-amber-500" size={20} />
                <span><strong className="text-ink">Feriados:</strong> consulte sempre os feriados nacionais, estaduais e municipais e as suspensões de expediente do tribunal. Cadastre os feriados locais em Monitoramento → Configurações.</span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-1 shrink-0 text-emerald-500" size={20} />
                <span>Quem usar este computador e este navegador terá acesso ao app. Proteja o computador com senha.</span>
              </li>
            </ul>
            <label className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-ink">
              <input type="checkbox" checked={ciente} onChange={(e) => setCiente(e.target.checked)} className="mt-1 accent-brand-600" />
              <span>
                Li e aceito os{' '}
                <Link href="/termos/" target="_blank" className="font-medium text-brand-600 underline">Termos de uso</Link>. Assumo plena responsabilidade pelo gerenciamento das minhas
                intimações e prazos e concordo que meus dados sejam guardados neste computador e usados apenas para pesquisar publicações nas fontes públicas (LGPD).
              </span>
            </label>
            <Button variant="primary" className="w-full" disabled={!ciente} onClick={accept}>Aceito, continuar</Button>
            <label className={`flex items-center justify-center gap-2 text-sm text-soft ${ciente ? 'cursor-pointer hover:text-ink' : 'cursor-not-allowed opacity-50'}`} title={ciente ? '' : 'Aceite os Termos de uso primeiro'}>
              <Upload size={15} /> Já usa o app em outro computador? Restaurar um backup
              <input type="file" accept=".json,application/json" className="hidden" disabled={!ciente} onChange={(e) => importBackup(e.target.files?.[0])} />
            </label>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-6 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
            <div>
              <h1 className="text-xl font-semibold text-ink">Seus dados</h1>
              <p className="mt-1 text-sm text-soft">
                As palavras-chave das buscas automáticas são o seu <strong className="text-ink">nome completo</strong>, <strong className="text-ink">CPF</strong> e{' '}
                <strong className="text-ink">número da OAB</strong>.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo *" className="sm:col-span-2" hint="Exatamente como aparece nas publicações."><Input value={f.name} onChange={(e) => set('name', e.target.value)} required autoFocus /></Field>
              <Field label="CPF *"><Input value={f.cpf} onChange={(e) => set('cpf', maskCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" required /></Field>
              <Field label="Número da OAB *"><Input value={f.oab} onChange={(e) => set('oab', e.target.value.replace(/[^\dA-Za-z]/g, ''))} required /></Field>
              <Field label="Estado da OAB *"><Select value={f.oabUf} onChange={(e) => set('oabUf', e.target.value)}>{UFS.map((u) => <option key={u}>{u}</option>)}</Select></Field>
              <Field label="Telefone"><Input value={f.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} inputMode="tel" placeholder="(91) 90000-0000" /></Field>
              <Field label="E-mail" className="sm:col-span-2" hint="Usado só para o resumo de notificações por e-mail."><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" /></Field>
              <Field label="Foto (opcional)"><Input type="file" accept="image/*" className="py-2" onChange={(e) => img('avatar', e.target.files?.[0])} /></Field>
              <Field label="Logomarca (opcional)"><Input type="file" accept="image/*" className="py-2" onChange={(e) => img('logo', e.target.files?.[0])} /></Field>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" onClick={() => setStep('aviso')}>Voltar</Button>
              <Button variant="primary" className="flex-1" disabled={busy}>{busy ? 'Salvando…' : 'Começar a monitorar'}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
