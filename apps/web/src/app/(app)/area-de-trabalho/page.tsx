'use client';
// Endereço antigo: a tela agora se chama "Meus painéis".
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Redirect() {
  const router = useRouter();
  useEffect(() => router.replace('/meus-paineis/'), [router]);
  return null;
}
