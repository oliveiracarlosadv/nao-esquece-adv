'use client';
/**
 * Contas locais. As contas ficam no IndexedDB deste navegador; a sessão expira em 12 horas.
 * O primeiro usuário cadastrado vira administrador.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as OTPAuth from 'otpauth';
import { audit, db, ensureSeed, nowIso, uid, type User } from './db';
import { hashPassword, verifyPassword } from './crypto';

const SESSION_KEY = 'nea.session';
const SESSION_HOURS = 12;

type Session = { userId: string; expiresAt: number };

type AuthCtx = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string, totp?: string) => Promise<'ok' | 'totp'>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

export type RegisterInput = Pick<User, 'name' | 'cpf' | 'oab' | 'oabUf' | 'email' | 'phone' | 'planId'> & { password: string; logo?: string; avatar?: string };

const Ctx = createContext<AuthCtx | null>(null);

function readSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as Session | null;
    return s && s.expiresAt > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function totpFor(user: Pick<User, 'email'>, secret: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({ issuer: 'Não Esquece Adv', label: user.email, algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
}

export function checkTotp(user: Pick<User, 'email'>, secret: string, code: string): boolean {
  return totpFor(user, secret).validate({ token: code.replace(/\D/g, ''), window: 1 }) !== null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const s = readSession();
    const u = s ? await db.users.get(s.userId) : undefined;
    setUser(u && u.active ? u : null);
  }, []);

  useEffect(() => {
    ensureSeed().then(refresh).finally(() => setReady(true));
  }, [refresh]);

  const start = (u: User) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: u.id, expiresAt: Date.now() + SESSION_HOURS * 3600_000 }));
    setUser(u);
  };

  const login: AuthCtx['login'] = async (email, password, totp) => {
    const u = await db.users.where('email').equals(email.trim().toLowerCase()).first();
    if (!u || !(await verifyPassword(password, u.passwordHash, u.passwordSalt))) {
      await audit('login.falha', email);
      throw new Error('E-mail ou senha incorretos.');
    }
    if (!u.active) throw new Error('Conta desativada pelo administrador.');
    if (u.totpSecret) {
      if (!totp) return 'totp';
      if (!checkTotp(u, u.totpSecret, totp)) throw new Error('Código de verificação inválido.');
    }
    start(u);
    await audit('login', undefined, u.id);
    return 'ok';
  };

  const register: AuthCtx['register'] = async ({ password, ...data }) => {
    const email = data.email.trim().toLowerCase();
    if (await db.users.where('email').equals(email).first()) throw new Error('Já existe uma conta com este e-mail neste computador.');
    const { hash, salt } = await hashPassword(password);
    const first = (await db.users.count()) === 0;
    const u: User = { ...data, email, id: uid('u_'), role: first ? 'admin' : 'usuario', passwordHash: hash, passwordSalt: salt, active: true, createdAt: nowIso() };
    await db.users.add(u);
    await audit('cadastro', u.email, u.id);
    start(u);
  };

  const logout = () => {
    if (user) audit('logout', undefined, user.id);
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, ready, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}
