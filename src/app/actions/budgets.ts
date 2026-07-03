'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { obtenerGastos } from './expenses';
import { obtenerCategorias } from './categories';

export async function definirPresupuesto(categoriaId: string, monto: number, mes: number, anio: number) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No autorizado');
  }

  // Upsert the budget
  const { error } = await supabase
    .from('budgets')
    .upsert({
      user_id: user.id,
      categoria_id: categoriaId,
      monto_limite: monto,
      mes,
      anio,
    }, {
      onConflict: 'categoria_id,mes,anio',
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/gastos');
  revalidatePath('/');
}

export async function obtenerProgresoPresupuestos(mes: number, anio: number) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No autorizado');
  }

  // Fetch categories
  const categories = await obtenerCategorias();

  // Fetch budgets for this month/year
  const { data: budgets, error: budgetError } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', user.id)
    .eq('mes', mes)
    .eq('anio', anio);

  if (budgetError) {
    throw new Error(budgetError.message);
  }

  // Fetch expenses for this month/year
  const expenses = await obtenerGastos(mes, anio);

  // Map progress
  return categories.map(cat => {
    const budget = budgets?.find(b => b.categoria_id === cat.id);
    const categoryExpenses = expenses?.filter(e => e.categoria_id === cat.id) || [];
    const totalGasto = categoryExpenses.reduce((sum, e) => sum + Number(e.monto), 0);

    return {
      categoria: cat,
      monto_limite: budget ? Number(budget.monto_limite) : 0,
      total_gastado: totalGasto,
      excedido: budget ? totalGasto > Number(budget.monto_limite) : false,
      porcentaje: budget && Number(budget.monto_limite) > 0 
        ? Math.round((totalGasto / Number(budget.monto_limite)) * 100) 
        : 0,
    };
  });
}
