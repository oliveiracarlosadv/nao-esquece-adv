'use client';
// O app não tem mais login: este endereço antigo leva ao painel (ou aos primeiros passos).
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Entrar() {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready) router.replace(user ? '/painel/' : '/cadastro/');
  }, [ready, user, router]);
  return null;
}
