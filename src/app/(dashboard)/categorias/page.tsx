import React from 'react';
import { obtenerCategorias } from '@/app/actions/categories';
import CategoriasClient from '@/components/categorias-client';

export const dynamic = 'force-dynamic';

export default async function CategoriasPage() {
  const categories = await obtenerCategorias();

  return <CategoriasClient categories={categories} />;
}
