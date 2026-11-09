'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import QRCode from 'qrcode';
import * as OTPAuth from 'otpauth';
import { ImagePlus, KeyRound, ShieldCheck } from 'lucide-react';
import { checkTotp, totpFor, useAuth } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { audit, db } from '@/lib/db';
import { isValidCpf, maskCpf, maskPhone, readFileAsDataUrl, UFS } from '@/lib/format';
import { useUi } from '@/components/Providers';
import { Badge, Button, Card, Field, Input, PageHeader, Select } from '@/components/ui';

export default function Perfil() {
  const { user, refresh } = useAuth();
  const { toast } = useUi();
  const plans = useLiveQuery(() => db.plans.filter((p) => p.active).sortBy('price'), []);
  const [form, setForm] = useState(user);
  useEffect(() => setForm(user), [user]);
  if (!user || !form) return null;

  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (form.cpf && !isValidCpf(form.cpf)) return toast('CPF inválido.', 'erro');
    await db.users.update(user.id, { name: form.name, cpf: form.cpf, oab: form.oab, oabUf: form.oabUf, phone: form.phone, planId: form.planId, logo: form.logo, avatar: form.avatar });
    await audit('perfil.atualizado', undefined, user.id);
    await refresh();
    toast('Perfil atualizado.');
  };

  const upload = async (k: 'logo' | 'avatar', f?: File) => {
    if (!f) return;
    if (f.size > 1.5 * 1024 * 1024) return toast('Imagem muito grande (máx. 1,5 MB).', 'erro');
    setForm({ ...form, [k]: await readFileAsDataUrl(f) });
  };

  return (
    <>
      <PageHeader title="Meu perfil" subtitle="Seus dados são usados nas buscas automáticas (nome, CPF e OAB)." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <form onSubmit={save}>
          <Card title="Dados do advogado">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo" className="sm:col-span-2"><Input value={form.name} onChange={(e) => set('name', e.target.value)} required /></Field>
              <Field label="CPF"><Input value={form.cpf} onChange={(e) => set('cpf', maskCpf(e.target.value))} inputMode="numeric" /></Field>
              <Field label="Telefone"><Input value={form.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} inputMode="tel" /></Field>
              <Field label="Número da OAB"><Input value={form.oab} onChange={(e) => set('oab', e.target.value.replace(/[^\dA-Za-z]/g, ''))} /></Field>
              <Field label="Estado da OAB">
                <Select value={form.oabUf} onChange={(e) => set('oabUf', e.target.value)}>
                  {UFS.map((u) => <option key={u}>{u}</option>)}
                </Select>
              </Field>
              <Field label="E-mail" hint="O e-mail é o login e não pode ser alterado."><Input value={form.email} disabled /></Field>
              <Field label="Plano de assinatura">
                <Select value={form.planId} onChange={(e) => set('planId', e.target.value)}>
                  {plans?.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.price ? `R$ ${p.price.toFixed(2).replace('.', ',')}/mês` : 'gratuito'}</option>)}
                </Select>
              </Field>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <ImagePick label="Foto de perfil" value={form.avatar} round onPick={(f) => upload('avatar', f)} onClear={() => setForm({ ...form, avatar: undefined })} />
              <ImagePick label="Logomarca do escritório" value={form.logo} onPick={(f) => upload('logo', f)} onClear={() => setForm({ ...form, logo: undefined })} />
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="primary">Salvar alterações</Button>
            </div>
          </Card>
        </form>
        <div className="space-y-6">
          <PasswordCard />
          <TwoFactorCard />
        </div>
      </div>
    </>
  );
}

function ImagePick({ label, value, round, onPick, onClear }: { label: string; value?: string; round?: boolean; onPick: (f?: File) => void; onClear: () => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-soft">{label}</p>
      <div className="flex items-center gap-4 rounded-xl border border-dashed border-line p-4">
        {value ? <img src={value} alt="" className={`h-16 w-16 object-contain ${round ? 'rounded-full object-cover' : 'rounded-lg'}`} /> : <span className={`flex h-16 w-16 items-center justify-center bg-muted text-faint ${round ? 'rounded-full' : 'rounded-lg'}`}><ImagePlus size={20} /></span>}
        <div className="space-y-1 text-sm">
          <label className="cursor-pointer font-medium text-brand-600">
            Enviar imagem
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
          </label>
          {value && <button type="button" className="block text-xs text-soft hover:text-ink" onClick={onClear}>Remover</button>}
        </div>
      </div>
    </div>
  );
}

function PasswordCard() {
  const { user } = useAuth();
  const { toast } = useUi();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [conf, setConf] = useState('');
  if (!user) return null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!(await verifyPassword(cur, user.passwordHash, user.passwordSalt))) return toast('Senha atual incorreta.', 'erro');
    if (next.length < 8) return toast('A nova senha precisa de pelo menos 8 caracteres.', 'erro');
    if (next !== conf) return toast('As senhas não conferem.', 'erro');
    const { hash, salt } = await hashPassword(next);
    await db.users.update(user.id, { passwordHash: hash, passwordSalt: salt });
    await audit('senha.alterada', undefined, user.id);
    setCur(''); setNext(''); setConf('');
    toast('Senha alterada.');
  };
  return (
    <Card title="Alterar senha" action={<KeyRound size={16} className="text-faint" />}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Senha atual"><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
        <Field label="Nova senha"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
        <Field label="Confirmar nova senha"><Input type="password" value={conf} onChange={(e) => setConf(e.target.value)} autoComplete="new-password" /></Field>
        <Button className="w-full">Alterar senha</Button>
      </form>
    </Card>
  );
}

function TwoFactorCard() {
  const { user, refresh } = useAuth();
  const { toast } = useUi();
  const [secret, setSecret] = useState<string | null>(null);
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  if (!user) return null;

  const begin = async () => {
    const s = new OTPAuth.Secret({ size: 20 }).base32;
    setSecret(s);
    setQr(await QRCode.toDataURL(totpFor(user, s).toString(), { margin: 1, width: 180 }));
  };
  const confirm2fa = async () => {
    if (!secret || !checkTotp(user, secret, code)) return toast('Código inválido. Tente de novo.', 'erro');
    await db.users.update(user.id, { totpSecret: secret });
    await audit('2fa.ativado', undefined, user.id);
    setSecret(null); setCode('');
    await refresh();
    toast('Autenticação em dois fatores ativada.');
  };
  const disable = async () => {
    if (!confirm('Desativar a autenticação em dois fatores?')) return;
    await db.users.update(user.id, { totpSecret: undefined });
    await audit('2fa.desativado', undefined, user.id);
    await refresh();
  };

  return (
    <Card title="Autenticação em dois fatores" action={user.totpSecret ? <Badge tone="green">Ativa</Badge> : <ShieldCheck size={16} className="text-faint" />}>
      {user.totpSecret ? (
        <div className="space-y-3 text-sm text-soft">
          <p>Ao entrar, será pedido o código do seu aplicativo autenticador.</p>
          <Button size="sm" onClick={disable}>Desativar</Button>
        </div>
      ) : secret ? (
        <div className="space-y-3 text-sm">
          <p className="text-soft">Leia o QR code com Google Authenticator, Microsoft Authenticator ou similar e digite o código.</p>
          {qr && <img src={qr} alt="QR code 2FA" className="mx-auto rounded-lg bg-white p-2" />}
          <p className="break-all text-center font-mono text-xs text-faint">{secret}</p>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" inputMode="numeric" maxLength={6} />
          <Button variant="primary" className="w-full" onClick={confirm2fa}>Confirmar e ativar</Button>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-soft">
          <p>Proteja o acesso com um código temporário do celular.</p>
          <Button size="sm" variant="primary" onClick={begin}>Ativar 2FA</Button>
        </div>
      )}
    </Card>
  );
}
