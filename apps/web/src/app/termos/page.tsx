'use client';
import { marked } from 'marked';
import { useMemo } from 'react';
import { TERMOS_MD } from '@/lib/termos';
import { PublicShell } from '@/components/PublicShell';

export default function Termos() {
  const html = useMemo(() => marked.parse(TERMOS_MD, { async: false }) as string, []);
  return (
    <PublicShell>
      <article className="prose-sobre" dangerouslySetInnerHTML={{ __html: html }} />
    </PublicShell>
  );
}
