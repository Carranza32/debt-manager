import React from 'react';
import { createClient } from '@/lib/supabase/server';
import AsesorClient from '@/components/asesor-client';

export const dynamic = 'force-dynamic';

export default async function AsesorPage() {
  const supabase = await createClient();

  // Fetch recommendations history
  const { data: recommendationsData, error } = await supabase
    .from('ai_recommendations')
    .select('*')
    .order('created_at', { ascending: false });

  const recommendations = recommendationsData || [];

  return <AsesorClient initialRecommendations={recommendations} />;
}
