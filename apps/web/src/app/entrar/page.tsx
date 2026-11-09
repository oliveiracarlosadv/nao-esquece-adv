'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Upload } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { NeedsPassword, readBackupFile, restore } from '@/lib/backup';
import { Logo } from '@/components/Logo';
import { useUi } from '@/components/Providers';
import { Button, Field, Input } from '@/components/ui';

export default function Entrar() {
  const { login, user, ready } = useAuth();
  const { toast } = useUi();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needTotp, setNeedTotp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && user) router.replace('/painel/');
  }, [ready, user, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await login(email, password, needTotp ? totp : undefined);
      if (r === 'totp') setNeedTotp(true);
      else router.replace('/painel/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.');
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
        const pwd = prompt('Este backup é protegido. Digite a senha do backup:') || '';
        data = await readBackupFile(file, pwd);
      }
      await restore(data, 'mesclar');
      toast('Backup importado. Agora entre com seu e-mail e senha.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível importar.', 'erro');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center"><Logo slogan /></Link>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-ink">{needTotp ? 'Verificação em duas etapas' : 'Entrar'}</h1>
          {!needTotp ? (
            <>
              <Field label="E-mail"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus /></Field>
              <Field label="Senha"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></Field>
            </>
          ) : (
            <Field label="Código do aplicativo autenticador"><Input value={totp} onChange={(e) => setTotp(e.target.value)} inputMode="numeric" maxLength={6} autoFocus placeholder="000000" /></Field>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button variant="primary" className="w-full" disabled={busy}>{busy ? 'Entrando…' : needTotp ? 'Verificar' : 'Entrar'}</Button>
          <p className="text-center text-sm text-soft">Não tem conta? <Link href="/cadastro/" className="font-medium text-brand-600">Cadastre-se</Link></p>
        </form>
        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 text-sm text-soft hover:text-ink">
          <Upload size={15} /> Trocou de computador? Importar backup
          <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => importBackup(e.target.files?.[0])} />
        </label>
        <p className="mt-6 text-center text-xs leading-5 text-faint">As contas ficam salvas apenas neste navegador. Para usar em outro computador, exporte um backup.</p>
      </div>
    </div>
  );
}
