import React from 'react';
import { createClient } from '@/lib/supabase/server';
import ConfiguracionClient from '@/components/configuracion-client';
import { UserSettings } from '@/types/debt';

export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
  const supabase = await createClient();

  const { data: settingsData } = await supabase
    .from('user_settings')
    .select('*')
    .maybeSingle();

  const { data: { user } } = await supabase.auth.getUser();

  const settings: UserSettings = (settingsData || {
    user_id: user?.id || '',
    ingreso_mensual: null,
    excedente_mensual: null,
    estrategia: 'avalancha',
    updated_at: new Date().toISOString(),
  }) as UserSettings;

  return <ConfiguracionClient settings={settings} email={user?.email || ''} />;
}
