'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { DebtType, StrategyType } from '@/types/debt';

/**
 * Ensures the user is authenticated and returns the user ID and supabase client.
 */
async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('No autorizado. Debes iniciar sesión.');
  }
  return { supabase, userId: user.id };
}

/**
 * Creates a new debt.
 */
export async function crearDeuda(data: {
  nombre: string;
  tipo: DebtType;
  monto_original: number;
  saldo_actual: number;
  tasa_interes_anual: number;
  fecha_corte: number | null;
  fecha_pago: number | null;
  pago_minimo: number;
}) {
  const { supabase, userId } = await getAuthUser();

  const { error } = await supabase.from('debts').insert({
    user_id: userId,
    nombre: data.nombre,
    tipo: data.tipo,
    monto_original: data.monto_original,
    saldo_actual: data.saldo_actual,
    tasa_interes_anual: data.tasa_interes_anual,
    fecha_corte: data.fecha_corte,
    fecha_pago: data.fecha_pago,
    pago_minimo: data.pago_minimo,
    activa: data.saldo_actual > 0,
  });

  if (error) {
    throw new Error(`Error al crear deuda: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/deudas');
}

/**
 * Updates an existing debt.
 */
export async function actualizarDeuda(
  id: string,
  data: {
    nombre: string;
    tipo: DebtType;
    monto_original: number;
    saldo_actual: number;
    tasa_interes_anual: number;
    fecha_corte: number | null;
    fecha_pago: number | null;
    pago_minimo: number;
    activa: boolean;
  }
) {
  const { supabase, userId } = await getAuthUser();

  const { error } = await supabase
    .from('debts')
    .update({
      nombre: data.nombre,
      tipo: data.tipo,
      monto_original: data.monto_original,
      saldo_actual: data.saldo_actual,
      tasa_interes_anual: data.tasa_interes_anual,
      fecha_corte: data.fecha_corte,
      fecha_pago: data.fecha_pago,
      pago_minimo: data.pago_minimo,
      activa: data.saldo_actual > 0 ? data.activa : false,
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Error al actualizar deuda: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/deudas');
  revalidatePath(`/deudas/${id}`);
}

/**
 * Soft deletes a debt by marking it inactive.
 */
export async function eliminarDeuda(id: string) {
  const { supabase, userId } = await getAuthUser();

  const { error } = await supabase
    .from('debts')
    .update({ activa: false })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Error al eliminar deuda: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/deudas');
}

/**
 * Registers a payment using the database RPC transaction function.
 */
export async function registrarPago(
  debtId: string,
  monto: number,
  fecha: string,
  nota: string | null
) {
  const { supabase } = await getAuthUser();

  const { error } = await supabase.rpc('registrar_pago', {
    p_debt_id: debtId,
    p_monto: monto,
    p_fecha: fecha,
    p_nota: nota || '',
  });

  if (error) {
    throw new Error(`Error al registrar pago: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/deudas');
  revalidatePath(`/deudas/${debtId}`);
}

/**
 * Saves user settings (monthly income, monthly surplus, payoff strategy).
 */
export async function guardarConfiguracion(data: {
  ingreso_mensual: number | null;
  excedente_mensual: number | null;
  estrategia: StrategyType;
}) {
  const { supabase, userId } = await getAuthUser();

  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    ingreso_mensual: data.ingreso_mensual,
    excedente_mensual: data.excedente_mensual,
    estrategia: data.estrategia,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Error al guardar configuración: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/configuracion');
}
