import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { obtenerProgresoPresupuestos } from '@/app/actions/budgets';
import DashboardClient from '@/components/dashboard-client';
import { Debt, Payment, UserSettings } from '@/types/debt';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const mes = now.getMonth() + 1;
  const anio = now.getFullYear();

  // Fetch debts
  const { data: debtsData } = await supabase
    .from('debts')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch user settings
  const { data: settingsData } = await supabase
    .from('user_settings')
    .select('*')
    .maybeSingle();

  // Get current user id
  const { data: { user } } = await supabase.auth.getUser();

  const debts: Debt[] = (debtsData || []) as Debt[];

  const userSettings: UserSettings = (settingsData || {
    user_id: user?.id || '',
    ingreso_mensual: null,
    excedente_mensual: null,
    estrategia: 'avalancha',
    updated_at: new Date().toISOString(),
  }) as UserSettings;

  // Fetch payments for the current month
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  const formattedFirstDay = firstDayOfMonth.toISOString().split('T')[0];

  const { data: paymentsData } = await supabase
    .from('payments')
    .select('*')
    .gte('fecha', formattedFirstDay);

  const currentMonthPayments: Payment[] = (paymentsData || []) as Payment[];

  // Fetch budget progress for alert banner on main dashboard
  let budgetProgress: any[] = [];
  try {
    budgetProgress = await obtenerProgresoPresupuestos(mes, anio);
  } catch (err) {
    console.error('Error fetching budget progress on dashboard:', err);
  }

  return (
    <DashboardClient
      initialDebts={debts}
      settings={userSettings}
      currentMonthPayments={currentMonthPayments}
      budgetProgress={budgetProgress}
    />
  );
}
