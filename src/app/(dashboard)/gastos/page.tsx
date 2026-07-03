import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { obtenerGastos, obtenerComerciosFrecuentes } from '@/app/actions/expenses';
import { obtenerCategorias } from '@/app/actions/categories';
import { obtenerProgresoPresupuestos } from '@/app/actions/budgets';
import GastosClient from '@/components/gastos-client';
import { UserSettings } from '@/types/debt';

export const dynamic = 'force-dynamic';

export default async function GastosPage() {
  const supabase = await createClient();

  const now = new Date();
  const mes = now.getMonth() + 1;
  const anio = now.getFullYear();

  let prevMes = mes - 1;
  let prevAnio = anio;
  if (prevMes === 0) {
    prevMes = 12;
    prevAnio = anio - 1;
  }

  // Fetch current month expenses
  const expenses = await obtenerGastos(mes, anio);
  // Fetch previous month expenses for MoM analytics
  const prevExpenses = await obtenerGastos(prevMes, prevAnio);
  // Fetch categories (will trigger auto-seed if empty)
  const categories = await obtenerCategorias();
  // Fetch budget progress
  const budgetProgress = await obtenerProgresoPresupuestos(mes, anio);

  // Fetch user settings (for monthly income)
  const { data: settingsData } = await supabase
    .from('user_settings')
    .select('*')
    .maybeSingle();

  const settings: UserSettings = (settingsData || {
    user_id: '',
    ingreso_mensual: null,
    excedente_mensual: null,
    estrategia: 'avalancha',
    updated_at: new Date().toISOString(),
  }) as UserSettings;

  // Autocomplete and auto-category mapping support for modal
  const frequentMerchants = await obtenerComerciosFrecuentes();
  const { data: previousExpenses } = await supabase
    .from('expenses')
    .select('comercio, categoria_id')
    .order('created_at', { ascending: false });

  const merchantCategoriesMap: Record<string, string> = {};
  previousExpenses?.forEach(exp => {
    const name = exp.comercio.trim().toLowerCase();
    if (name && exp.categoria_id && !merchantCategoriesMap[name]) {
      merchantCategoriesMap[name] = exp.categoria_id;
    }
  });

  return (
    <GastosClient
      initialExpenses={expenses}
      prevExpenses={prevExpenses}
      categories={categories}
      budgetProgress={budgetProgress}
      settings={settings}
      currentMonth={mes}
      currentYear={anio}
      frequentMerchants={frequentMerchants}
      merchantCategoriesMap={merchantCategoriesMap}
    />
  );
}
