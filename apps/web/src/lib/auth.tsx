'use client';
/**
 * Perfil local, sem login.
 * O app guarda um único perfil de advogado no navegador deste computador. Não há e-mail/senha:
 * quem usa o computador usa o app. Na primeira abertura o usuário lê o aviso de armazenamento
 * local e de backup mensal e preenche os dados usados nas buscas (nome completo, CPF e OAB).
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { audit, db, ensureSeed, nowIso, uid, type User } from './db';

type AuthCtx = {
  user: User | null;
  ready: boolean;
  register: (data: RegisterInput) => Promise<User>;
  refresh: () => Promise<void>;
};

export type RegisterInput = Pick<User, 'name' | 'cpf' | 'oab' | 'oabUf' | 'email' | 'phone'> & { logo?: string; avatar?: string };

const Ctx = createContext<AuthCtx | null>(null);

/** O perfil ativo: o primeiro administrador ativo (bancos antigos podem ter vários usuários). */
export async function currentProfile(): Promise<User | undefined> {
  const all = await db.users.toArray();
  const active = all.filter((u) => u.active);
  return active.find((u) => u.role === 'admin') || active[0];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    setUser((await currentProfile()) || null);
  }, []);

  useEffect(() => {
    ensureSeed().then(refresh).finally(() => setReady(true));
  }, [refresh]);

  const register: AuthCtx['register'] = async (data) => {
    const u: User = { ...data, email: data.email.trim().toLowerCase(), id: uid('u_'), role: 'admin', active: true, createdAt: nowIso() };
    await db.users.add(u);
    await audit('perfil.criado', u.name, u.id);
    setUser(u);
    return u;
  };

  return <Ctx.Provider value={{ user, ready, register, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}
