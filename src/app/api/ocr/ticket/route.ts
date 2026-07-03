import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const ocrResponseSchema = z.object({
  comercio: z.string().nullable().default(null),
  fecha: z.string().nullable().default(null),
  monto_total: z.number().nullable().default(null),
  productos: z.array(z.object({
    nombre: z.string(),
    cantidad: z.number().default(1),
    precio_unitario: z.number().nullable().default(null),
    precio_total: z.number().nullable().default(null),
  })).default([]),
  confianza: z.enum(['alta', 'media', 'baja']).default('media'),
});

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return Response.json({ error: 'La imagen base64 es obligatoria' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ error: 'La API Key de Gemini no está configurada' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
Analiza esta imagen de un ticket de compra y devuelve ÚNICAMENTE un JSON con esta estructura exacta, sin texto adicional ni formateo markdown (sin backticks de bloque \`\`\`json):

{
  "comercio": "nombre del comercio tal como aparece en el ticket",
  "fecha": "YYYY-MM-DD o null si no es legible",
  "monto_total": numero,
  "productos": [
    { "nombre": "nombre del producto", "cantidad": numero, "precio_unitario": numero, "precio_total": numero }
  ],
  "confianza": "alta | media | baja"
}

Pautas:
1. Si no puedes leer algún campo con certeza, usa null en ese campo específico pero no inventes valores.
2. Los montos son en dólares (USD), formato salvadoreño.
3. Devuelve solo el string de JSON parseable.
`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
    ]);

    const text = result.response.text();
    
    // Clean markdown code blocks if any
    const clean = text.replace(/```json|```/g, '').trim();
    
    let parsedJson;
    try {
      parsedJson = JSON.parse(clean);
    } catch (parseError) {
      console.error('Error parsing Gemini text response as JSON:', text);
      return Response.json({ error: 'Gemini no retornó un JSON válido', text }, { status: 500 });
    }

    // Validate with Zod to ensure shape safety
    const validatedData = ocrResponseSchema.parse(parsedJson);

    return Response.json(validatedData);
  } catch (error: any) {
    console.error('OCR Ticket Error:', error);
    return Response.json({ error: error.message || 'Error interno del servidor' }, { status: 550 });
  }
}
