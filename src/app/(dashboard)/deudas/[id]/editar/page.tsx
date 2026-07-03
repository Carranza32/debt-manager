'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditarDeudaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  useEffect(() => {
    if (id) {
      router.replace(`/deudas/${id}?editar=true`);
    }
  }, [id, router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <span className="loading loading-spinner text-blue-600"></span>
    </div>
  );
}
