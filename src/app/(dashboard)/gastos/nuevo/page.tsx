'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NuevoGastoPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/gastos?nuevo=true');
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <span className="loading loading-spinner text-indigo-600"></span>
    </div>
  );
}
