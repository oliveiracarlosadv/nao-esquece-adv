'use client';
import { Suspense } from 'react';
import { PublicationsView } from '@/components/PublicationsView';

export default function Page() {
  return (
    <Suspense>
      <PublicationsView mode="lidas" />
    </Suspense>
  );
}
