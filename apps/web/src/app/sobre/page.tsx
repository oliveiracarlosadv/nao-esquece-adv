'use client';
import { useEffect, useState } from 'react';
import { customDocs, defaultDocs, resyncFolder, type SobreDoc } from '@/lib/sobre';
import { PublicShell } from '@/components/PublicShell';

export default function Sobre() {
  const [docs, setDocs] = useState<SobreDoc[]>(() => defaultDocs());

  useEffect(() => {
    (async () => {
      await resyncFolder().catch(() => false); // relê a pasta configurada, se houver permissão
      const custom = await customDocs();
      if (custom) setDocs(custom);
    })();
  }, []);

  return (
    <PublicShell>
      <article className="prose-sobre">
        {docs.map((d, i) => (
          <section key={d.name} className={i ? 'mt-12 border-t border-line pt-10' : ''} dangerouslySetInnerHTML={{ __html: d.html }} />
        ))}
        {!docs.length && <p>Conteúdo institucional ainda não configurado.</p>}
      </article>
    </PublicShell>
  );
}
