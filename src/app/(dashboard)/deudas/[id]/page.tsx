import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DebtDetailClient from '@/components/debt-detail-client';
import { Debt, Payment } from '@/types/debt';

interface DebtDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function DebtDetailPage({ params }: DebtDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch debt details
  const { data: debtData, error: debtError } = await supabase
    .from('debts')
    .select('*')
    .eq('id', id)
    .single();

  if (debtError || !debtData) {
    notFound();
  }

  // Fetch payments for this debt
  const { data: paymentsData } = await supabase
    .from('payments')
    .select('*')
    .eq('debt_id', id)
    .order('fecha', { ascending: false });

  const debt: Debt = debtData as Debt;
  const payments: Payment[] = (paymentsData || []) as Payment[];

  return <DebtDetailClient debt={debt} payments={payments} />;
}
