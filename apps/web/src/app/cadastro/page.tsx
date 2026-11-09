'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth, type RegisterInput } from '@/lib/auth';
import { db } from '@/lib/db';
import { cx, isValidCpf, maskCpf, maskPhone, readFileAsDataUrl, UFS } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { Button, Field, Input, Select } from '@/components/ui';

export default function Cadastro() {
  const { register } = useAuth();
  const router = useRouter();
  const plans = useLiveQuery(() => db.plans.filter((p) => p.active).sortBy('price'), []);
  const [f, setF] = useState<RegisterInput>({ name: '', cpf: '', oab: '', oabUf: 'PA', email: '', phone: '', planId: 'essencial', password: '' });
  const [confirm, setConfirm] = useState('');
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof RegisterInput>(k: K, v: RegisterInput[K]) => setF({ ...f, [k]: v });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (f.cpf && !isValidCpf(f.cpf)) return setError('CPF inválido.');
    if (f.password.length < 8) return setError('A senha precisa de pelo menos 8 caracteres.');
    if (f.password !== confirm) return setError('As senhas não conferem.');
    if (!accept) return setError('É preciso concordar com o tratamento dos dados.');
    setBusy(true);
    try {
      await register(f);
      router.replace('/monitoramento/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no cadastro.');
    } finally {
      setBusy(false);
    }
  };

  const img = async (k: 'logo' | 'avatar', file?: File) => file && set(k, await readFileAsDataUrl(file));

  return (
    <div className="min-h-screen bg-app px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-8 flex justify-center"><Logo slogan /></Link>
        <form onSubmit={submit} className="space-y-6 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <div>
            <h1 className="text-xl font-semibold text-ink">Criar conta</h1>
            <p className="mt-1 text-sm text-soft">Nome, CPF e OAB serão usados nas buscas automáticas.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" className="sm:col-span-2"><Input value={f.name} onChange={(e) => set('name', e.target.value)} required autoFocus /></Field>
            <Field label="CPF"><Input value={f.cpf} onChange={(e) => set('cpf', maskCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" /></Field>
            <Field label="Telefone"><Input value={f.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} inputMode="tel" placeholder="(91) 90000-0000" /></Field>
            <Field label="Número da OAB"><Input value={f.oab} onChange={(e) => set('oab', e.target.value.replace(/[^\dA-Za-z]/g, ''))} required /></Field>
            <Field label="Estado da OAB"><Select value={f.oabUf} onChange={(e) => set('oabUf', e.target.value)}>{UFS.map((u) => <option key={u}>{u}</option>)}</Select></Field>
            <Field label="E-mail" className="sm:col-span-2"><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" required /></Field>
            <Field label="Senha" hint="Mínimo de 8 caracteres."><Input type="password" value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" required /></Field>
            <Field label="Confirmar senha"><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></Field>
            <Field label="Foto de perfil (opcional)"><Input type="file" accept="image/*" className="py-2" onChange={(e) => img('avatar', e.target.files?.[0])} /></Field>
            <Field label="Logomarca (opcional)"><Input type="file" accept="image/*" className="py-2" onChange={(e) => img('logo', e.target.files?.[0])} /></Field>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-soft">Plano de assinatura</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {plans?.map((p) => (
                <button type="button" key={p.id} onClick={() => set('planId', p.id)} className={cx('rounded-xl border p-4 text-left transition-colors', f.planId === p.id ? 'border-brand-600 ring-2 ring-brand-500/20' : 'border-line hover:bg-muted')}>
                  <p className="font-semibold text-ink">{p.name}</p>
                  <p className="text-sm text-soft">{p.price ? `R$ ${p.price.toFixed(2).replace('.', ',')}/mês` : 'Gratuito'}</p>
                  <ul className="mt-2 space-y-0.5 text-xs text-faint">{p.features.map((x) => <li key={x}>· {x}</li>)}</ul>
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-soft">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1 accent-brand-600" />
            <span>Concordo que meus dados sejam guardados neste computador e usados apenas para pesquisar publicações nas fontes públicas (LGPD, art. 7º).</span>
          </label>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button variant="primary" className="w-full" disabled={busy}>{busy ? 'Criando…' : 'Criar conta'}</Button>
          <p className="text-center text-sm text-soft">Já tem conta? <Link href="/entrar/" className="font-medium text-brand-600">Entrar</Link></p>
        </form>
      </div>
    </div>
  );
}
