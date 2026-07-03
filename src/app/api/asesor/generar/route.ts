import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { priorizarDeudas } from '@/lib/debt-strategy';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const advisorResponseSchema = z.object({
  deuda_prioritaria: z.string().nullable().default(null),
  razonamiento: z.string(),
  alertas: z.array(z.string()).default([]),
  consejos: z.array(z.object({
    titulo: z.string(),
    detalle: z.string(),
    impacto_estimado: z.string(),
  })).default([]),
  resumen_general: z.string(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ error: 'La API Key de Gemini no está configurada' }, { status: 500 });
    }

    // 1. Fetch user active debts
    const { data: debtsData, error: debtsError } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .eq('activa', true);

    if (debtsError) {
      return Response.json({ error: `Error al obtener deudas: ${debtsError.message}` }, { status: 500 });
    }

    // 2. Fetch user settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError) {
      return Response.json({ error: `Error al obtener ajustes: ${settingsError.message}` }, { status: 500 });
    }

    const strategy = settingsData?.estrategia || 'avalancha';
    const ingreso = Number(settingsData?.ingreso_mensual || 0);
    const excedente = Number(settingsData?.excedente_mensual || 0);

    // 3. Apply math prioritization algorithm
    const prioritizedDebts = priorizarDeudas(debtsData || [], strategy);

    // 4. Fetch monthly expenses grouped by category
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .gte('fecha', startOfMonth)
      .lte('fecha', endOfMonth);

    if (expensesError) {
      return Response.json({ error: `Error al obtener gastos: ${expensesError.message}` }, { status: 500 });
    }

    const expensesByCategory: Record<string, number> = {};
    expensesData?.forEach(exp => {
      const catName = exp.categories?.nombre || 'Otros';
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + Number(exp.monto);
    });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
Eres un asesor financiero personal empático, inteligente y directo. Analiza estos datos financieros reales del usuario y genera recomendaciones concretas y accionables en español, sin tecnicismos innecesarios.

DEUDAS ACTIVAS (YA PRIORIZADAS BAJO LA ESTRATEGIA: ${strategy.toUpperCase()}):
${JSON.stringify(prioritizedDebts.map(d => ({ nombre: d.nombre, saldo_actual: d.saldo_actual, tasa_interes_anual: d.tasa_interes_anual, pago_minimo: d.pago_minimo })), null, 2)}

PERFIL FINANCIERO:
- Ingreso Neto Mensual: $${ingreso}
- Excedente Mensual Declarado para Deudas: $${excedente}

GASTOS DEL MES CORRIENTE POR CATEGORÍA:
${JSON.stringify(expensesByCategory, null, 2)}

Devuelve ÚNICAMENTE un JSON con esta estructura exacta, sin texto adicional ni formateo markdown (sin backticks de bloque \`\`\`json):

{
  "deuda_prioritaria": "nombre exacto de la deuda que encabeza la priorización",
  "razonamiento": "explicación breve de 2-3 oraciones, en español natural, mencionando números reales de por qué esta deuda es la prioridad y cómo impacta su tasa de interés o saldo en su salud financiera global",
  "alertas": ["array de alertas (máximo 2) si alguna deuda tiene un pago mínimo que no cubre intereses o está en peligro de desborde. Si no hay alertas críticas, dejar vacío []"],
  "consejos": [
    { "titulo": "título corto de 3-4 palabras", "detalle": "consejo accionable basado en sus gastos mensuales reales (ej. reducir gastos en X comercio/categoría) y cómo ese dinero extra podría acelerar el pago de sus deudas", "impacto_estimado": "ej: 'Liberarías $45/mes adicionales' o 'Liquidaría la deuda 3 meses antes'" }
  ],
  "resumen_general": "Una frase de 1 oración motivadora pero realista sobre el progreso general del usuario"
}

Pautas importantes:
1. El total de consejos debe ser de 2 a 3. Deben ser específicos basados en los gastos por categoría que te proveo.
2. Si no hay gastos registrados todavía, sugiere definir presupuestos o recortar gastos genéricos estimando un ahorro razonable.
3. Devuelve únicamente el string de JSON parseable.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Clean markdown blocks
    const clean = text.replace(/```json|```/g, '').trim();
    
    let parsedJson;
    try {
      parsedJson = JSON.parse(clean);
    } catch (parseError) {
      console.error('Error parsing Gemini text response as JSON:', text);
      return Response.json({ error: 'Gemini no retornó un JSON válido', text }, { status: 500 });
    }

    // Validate with Zod
    const validatedData = advisorResponseSchema.parse(parsedJson);

    // 5. Save in database history
    const { error: insertError } = await supabase
      .from('ai_recommendations')
      .insert({
        user_id: user.id,
        tipo: 'priorizacion_deuda',
        contenido: validatedData,
      });

    if (insertError) {
      console.error('Error saving recommendation in DB:', insertError);
    }

    return Response.json(validatedData);
  } catch (error: any) {
    console.error('Asesor API Error:', error);
    return Response.json({ error: error.message || 'Error interno del servidor' }, { status: 550 });
  }
}
