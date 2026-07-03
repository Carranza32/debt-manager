import React from 'react';
import { createClient } from '@/lib/supabase/server';
import DebtsListClient from '@/components/debts-list-client';
import { Debt } from '@/types/debt';

export const dynamic = 'force-dynamic';

export default async function DeudasPage() {
  const supabase = await createClient();

  const { data: debtsData } = await supabase
    .from('debts')
    .select('*')
    .order('created_at', { ascending: false });

  const debts: Debt[] = (debtsData || []) as Debt[];

  return <DebtsListClient debts={debts} />;
}
