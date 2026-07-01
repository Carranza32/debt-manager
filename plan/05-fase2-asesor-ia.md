# Módulo 05 — Fase 2: Asesor de IA (priorización y consejos)

Depende de: Módulo 01 (deudas), Módulo 03 (gastos), idealmente Módulo 04 (OCR) para tener datos de gasto más ricos.

## Objetivo

Que Gemini analice el panorama financiero completo del usuario (deudas + ingreso + gastos reales) y genere recomendaciones en lenguaje natural: qué deuda liquidar primero y por qué, dónde recortar gasto, y consejos accionables — no solo el cálculo matemático frío del Módulo 01, sino una explicación contextualizada.

## 1. Diferencia con el algoritmo del Módulo 01

El Módulo 01 ya calcula matemáticamente la priorización (avalancha/bola de nieve) sin IA — eso debe seguir funcionando siempre, instantáneo y sin costo de API, como base confiable. Este módulo AGREGA una capa de razonamiento sobre ese cálculo: explica el "por qué" en español natural, detecta patrones que el algoritmo simple no ve (ej. "tu deuda de tarjeta crece más rápido que lo que estás abonando, estás retrocediendo"), y conecta los datos de gastos con las deudas (ej. "si recortas $40 en restaurantes, liquidas la tarjeta BAC 2 meses antes").

## 2. Pantalla: Asesor (`/asesor` o sección dentro del dashboard)

- Botón "Generar recomendación" (no automático en cada carga, para controlar costo de API — generar bajo demanda o máximo 1 vez por semana automáticamente).
- Card de recomendación principal: cuál deuda atacar primero y resumen del razonamiento (2-3 líneas, no un ensayo).
- Lista de 3-5 consejos accionables concretos, no genéricos (debe usar montos y nombres reales de comercios/deudas del usuario, no "intenta gastar menos").
- Historial de recomendaciones anteriores (tabla `ai_recommendations` ya existe desde Módulo 00), para ver si el usuario está siguiendo el consejo a través del tiempo.

## 3. API Route: `/api/asesor/generar`

```typescript
// src/app/api/asesor/generar/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  // 1. Obtener datos del usuario autenticado desde Supabase (server-side)
  const deudas = await obtenerDeudasActivas(userId);
  const gastosUltimoMes = await obtenerGastosPorCategoria(userId, mesActual);
  const settings = await obtenerConfiguracion(userId);
  const priorizacionCalculada = priorizarDeudas(deudas, settings.estrategia);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
Eres un asesor financiero personal. Analiza estos datos reales del usuario y genera recomendaciones concretas y accionables en español, sin tecnicismos innecesarios. NO inventes datos que no te doy.

DEUDAS ACTIVAS:
${JSON.stringify(deudas, null, 2)}

PRIORIZACIÓN YA CALCULADA (estrategia: ${settings.estrategia}):
${JSON.stringify(priorizacionCalculada, null, 2)}

INGRESO MENSUAL: $${settings.ingreso_mensual}
EXCEDENTE DISPONIBLE: $${settings.excedente_mensual}

GASTOS DEL ÚLTIMO MES POR CATEGORÍA:
${JSON.stringify(gastosUltimoMes, null, 2)}

Devuelve ÚNICAMENTE un JSON con esta estructura, sin texto adicional:

{
  "deuda_prioritaria": "nombre exacto de la deuda",
  "razonamiento": "explicación breve de 2-3 oraciones, en español natural, mencionando números reales",
  "alertas": ["array de alertas si alguna deuda está creciendo más rápido de lo que se abona, máximo 2"],
  "consejos": [
    { "titulo": "string corto", "detalle": "explicación accionable con montos reales", "impacto_estimado": "ej. 'liberarías $40/mes' o 'adelantarías el pago 2 meses'" }
  ],
  "resumen_general": "1 oración motivadora pero realista sobre el progreso general"
}
`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());

  // Guardar en historial
  await guardarRecomendacion(userId, 'priorizacion_deuda', parsed);

  return Response.json(parsed);
}
```

## 4. Principios para los prompts (importante)

- **Nunca dejar que la IA invente cifras**: el prompt siempre debe incluir los datos reales calculados de antemano (el algoritmo del Módulo 01 ya hizo la matemática dura); la IA solo explica y da contexto, no recalcula montos desde cero. Esto evita alucinaciones numéricas que podrían llevar a una mala decisión financiera.
- **Tono realista, no de coach motivacional exagerado**: el usuario está manejando deudas, es un tema serio. Los consejos deben sonar como los de un asesor financiero competente, no como frases genéricas de superación.
- **Validar siempre con Zod** antes de mostrar la respuesta, igual que en el Módulo 04.
- **Limitar frecuencia de generación**: ya sea con un botón manual o un cron semanal (Supabase Edge Function con `pg_cron`), para controlar costo de API y evitar fatiga de notificaciones.

## 5. Conexión con resumen mensual (opcional, expansión natural)

Reutilizar el mismo patrón para generar un resumen automático a fin de mes (`tipo: 'resumen_mensual'` en `ai_recommendations`): cuánto se pagó en deudas, cuánto se gastó por categoría, comparación con el mes anterior, y una proyección actualizada de cuándo se sale de cada deuda si se mantiene el ritmo actual.

## 6. Checklist de salida de este módulo

- [ ] El algoritmo matemático del Módulo 01 sigue siendo la fuente de verdad (la IA no reemplaza el cálculo, lo explica)
- [ ] Recomendación se genera bajo demanda o con frecuencia controlada (no en cada carga de página)
- [ ] JSON de respuesta validado con Zod antes de mostrarse
- [ ] Consejos incluyen montos y nombres reales del usuario, no genéricos
- [ ] Alertas de "deuda creciendo más rápido de lo que se paga" funcionan correctamente
- [ ] Historial de recomendaciones se guarda y se puede consultar
