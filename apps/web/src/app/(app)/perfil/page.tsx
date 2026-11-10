'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ImagePlus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { audit, db } from '@/lib/db';
import { isValidCpf, maskCpf, maskPhone, readFileAsDataUrl, UFS } from '@/lib/format';
import { useUi } from '@/components/Providers';
import { Button, Card, Field, Input, PageHeader, Select } from '@/components/ui';

export default function Perfil() {
  const { user, refresh } = useAuth();
  const { toast } = useUi();
  const [form, setForm] = useState(user);
  useEffect(() => setForm(user), [user]);
  if (!user || !form) return null;

  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (form.cpf && !isValidCpf(form.cpf)) return toast('CPF inválido.', 'erro');
    await db.users.update(user.id, { name: form.name, email: form.email.trim().toLowerCase(), cpf: form.cpf, oab: form.oab, oabUf: form.oabUf, phone: form.phone, logo: form.logo, avatar: form.avatar });
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
              <Field label="E-mail" hint="Usado no resumo de notificações por e-mail."><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Versão"><Input value="Completa (gratuita, sem limites)" disabled /></Field>
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
          <Card title="Palavras-chave das buscas">
            <p className="text-sm leading-6 text-soft">O monitoramento automático procura por:</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between gap-3 rounded-lg bg-muted px-3 py-2"><span className="text-soft">Nome completo</span><span className="text-right font-medium text-ink">{user.name || '—'}</span></li>
              <li className="flex justify-between gap-3 rounded-lg bg-muted px-3 py-2"><span className="text-soft">CPF</span><span className="font-medium text-ink">{user.cpf || '—'}</span></li>
              <li className="flex justify-between gap-3 rounded-lg bg-muted px-3 py-2"><span className="text-soft">OAB</span><span className="font-medium text-ink">{user.oab ? `${user.oab}/${user.oabUf}` : '—'}</span></li>
            </ul>
            <p className="mt-3 text-xs text-faint">Altere ao lado e salve. Sem login: os dados ficam só neste computador.</p>
          </Card>
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

