'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface GastoData {
  categoria_id: string | null;
  comercio: string;
  monto: number;
  fecha: string;
  fuente?: 'manual' | 'ocr_ticket' | 'atajo_wallet';
  nota?: string | null;
}

export async function crearGasto(data: GastoData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No autorizado');
  }

  const { error } = await supabase.from('expenses').insert({
    user_id: user.id,
    categoria_id: data.categoria_id,
    comercio: data.comercio,
    monto: data.monto,
    fecha: data.fecha,
    fuente: data.fuente || 'manual',
    nota: data.nota || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/gastos');
  revalidatePath('/');
}

export async function actualizarGasto(id: string, data: Partial<GastoData>) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No autorizado');
  }

  const { error } = await supabase
    .from('expenses')
    .update({
      categoria_id: data.categoria_id,
      comercio: data.comercio,
      monto: data.monto,
      fecha: data.fecha,
      fuente: data.fuente,
      nota: data.nota,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/gastos');
  revalidatePath('/');
}

export async function eliminarGasto(id: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No autorizado');
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/gastos');
  revalidatePath('/');
}

export async function obtenerGastos(mes?: number, anio?: number) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No autorizado');
  }

  let query = supabase
    .from('expenses')
    .select('*, categories(*)')
    .eq('user_id', user.id)
    .order('fecha', { ascending: false });

  if (mes !== undefined && anio !== undefined) {
    // Format start and end date
    const start = `${anio}-${String(mes).padStart(2, '0')}-01`;
    // Get last day of month
    const end = new Date(anio, mes, 0).toISOString().split('T')[0];
    query = query.gte('fecha', start).lte('fecha', end);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function obtenerComerciosFrecuentes() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('expenses')
    .select('comercio')
    .eq('user_id', user.id);

  if (error || !data) return [];

  const counts: Record<string, number> = {};
  data.forEach(item => {
    const name = item.comercio.trim();
    if (name) {
      counts[name] = (counts[name] || 0) + 1;
    }
  });

  return Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, 10);
}

interface ItemData {
  nombre: string;
  cantidad: number;
  precio_unitario: number | null;
  precio_total: number | null;
}

export async function crearGastoConItems(
  gastoData: GastoData & { ticket_imagen_url?: string | null },
  items: ItemData[]
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No autorizado');
  }

  // 1. Insert the main expense
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      categoria_id: gastoData.categoria_id,
      comercio: gastoData.comercio,
      monto: gastoData.monto,
      fecha: gastoData.fecha,
      fuente: gastoData.fuente || 'ocr_ticket',
      ticket_imagen_url: gastoData.ticket_imagen_url || null,
      nota: gastoData.nota || null,
    })
    .select('id')
    .single();

  if (expenseError || !expense) {
    throw new Error(expenseError?.message || 'Error al crear el gasto principal');
  }

  // 2. Insert items if present
  if (items && items.length > 0) {
    const itemsToInsert = items.map(item => ({
      expense_id: expense.id,
      producto: item.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      precio_total: item.precio_total,
    }));

    const { error: itemsError } = await supabase
      .from('expense_items')
      .insert(itemsToInsert);

    if (itemsError) {
      // Rollback manual
      await supabase.from('expenses').delete().eq('id', expense.id);
      throw new Error(`Error al guardar los productos del ticket: ${itemsError.message}`);
    }
  }

  revalidatePath('/gastos');
  revalidatePath('/');
}
