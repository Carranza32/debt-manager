'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const DEFAULT_CATEGORIES = [
  { nombre: 'Supermercado', icono: 'ShoppingCart', color: '#10b981', es_default: true },
  { nombre: 'Comida/Restaurantes', icono: 'Utensils', color: '#f59e0b', es_default: true },
  { nombre: 'Transporte', icono: 'Car', color: '#3b82f6', es_default: true },
  { nombre: 'Servicios', icono: 'Zap', color: '#eab308', es_default: true },
  { nombre: 'Entretenimiento', icono: 'Film', color: '#ec4899', es_default: true },
  { nombre: 'Salud', icono: 'HeartPulse', color: '#ef4444', es_default: true },
  { nombre: 'Ropa', icono: 'Shirt', color: '#a855f7', es_default: true },
  { nombre: 'Otros', icono: 'HelpCircle', color: '#71717a', es_default: true },
];

export async function obtenerCategorias() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No autorizado');
  }

  // Fetch categories for the user
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .order('es_default', { ascending: false })
    .order('nombre', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // If user has 0 categories, auto-seed defaults
  if (categories.length === 0) {
    const seedData = DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      user_id: user.id,
    }));

    const { error: seedError } = await supabase
      .from('categories')
      .insert(seedData);

    if (seedError) {
      throw new Error(`Error en auto-seed de categorías: ${seedError.message}`);
    }

    // Fetch again after seeding
    const { data: seededCategories, error: reFetchError } = await supabase
      .from('categories')
      .select('*')
      .order('es_default', { ascending: false })
      .order('nombre', { ascending: true });

    if (reFetchError) {
      throw new Error(reFetchError.message);
    }

    return seededCategories;
  }

  return categories;
}

export async function crearCategoria(nombre: string, icono: string, color: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No autorizado');
  }

  const { error } = await supabase.from('categories').insert({
    user_id: user.id,
    nombre,
    icono,
    color,
    es_default: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/categorias');
  revalidatePath('/gastos');
}

export async function actualizarCategoria(id: string, nombre: string, icono: string, color: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No autorizado');
  }

  // Double check if it's default to prevent modifying status, though we allow changing custom fields
  const { error } = await supabase
    .from('categories')
    .update({ nombre, icono, color })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/categorias');
  revalidatePath('/gastos');
}

export async function eliminarCategoria(id: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No autorizado');
  }

  // Get the category first to check es_default
  const { data: category, error: fetchError } = await supabase
    .from('categories')
    .select('es_default')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !category) {
    throw new Error('Categoría no encontrada');
  }

  if (category.es_default) {
    throw new Error('No puedes eliminar una categoría por defecto.');
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/categorias');
  revalidatePath('/gastos');
}
