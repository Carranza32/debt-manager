# Módulo 04 — Fase 2: OCR de Tickets con Gemini

Depende de: Módulo 03 (gastos y categorías) y Módulo 02 (PWA con acceso a cámara).

## Objetivo

Tomar foto a un ticket de compra y que Gemini extraiga automáticamente el comercio, el monto total, y opcionalmente la lista de productos individuales, precargando el formulario de gasto para que el usuario solo confirme en vez de teclear todo.

## 1. Flujo completo

1. Usuario toca "Escanear ticket" desde `/gastos/nuevo`.
2. Se abre la cámara nativa vía `<input type="file" accept="image/*" capture="environment">`.
3. La imagen se sube a Supabase Storage (bucket `tickets`, path `{user_id}/{timestamp}.jpg`).
4. Se llama a un API Route de Next.js que manda la imagen a Gemini con un prompt estructurado.
5. Gemini regresa JSON con comercio, monto total, fecha (si es legible), y lista de productos.
6. El formulario de gasto se precarga con esos datos — el usuario revisa y confirma (nunca se guarda automáticamente sin confirmación, el OCR puede fallar).
7. Al confirmar, se guarda el gasto en `expenses` con `fuente = 'ocr_ticket'` y `ticket_imagen_url` apuntando a la imagen, y los productos individuales en `expense_items`.

## 2. API Route: `/api/ocr/ticket`

```typescript
// src/app/api/ocr/ticket/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const { imageBase64 } = await req.json();

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
Analiza esta imagen de un ticket de compra y devuelve ÚNICAMENTE un JSON con esta estructura exacta, sin texto adicional ni markdown:

{
  "comercio": "nombre del comercio tal como aparece en el ticket",
  "fecha": "YYYY-MM-DD o null si no es legible",
  "monto_total": numero,
  "productos": [
    { "nombre": "string", "cantidad": numero, "precio_unitario": numero, "precio_total": numero }
  ],
  "confianza": "alta | media | baja"
}

Si no puedes leer algún campo con certeza, usa null en ese campo específico pero no inventes valores.
Los montos son en dólares (USD), formato salvadoreño.
`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
  ]);

  const text = result.response.text();
  // Limpiar posibles backticks de markdown antes de parsear
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  return Response.json(parsed);
}
```

Nota: validar siempre la respuesta con un schema de Zod antes de usarla en el formulario, ya que el modelo puede ocasionalmente devolver un campo faltante o mal tipado.

## 3. Pantalla: Confirmación de ticket escaneado

Después del OCR, mostrar una pantalla intermedia (no ir directo al formulario normal) con:

- La foto del ticket como referencia visual arriba.
- Comercio y monto total precargados, editables.
- Indicador de "confianza" del modelo (si es "baja", resaltar en amarillo para que el usuario revise con más cuidado).
- Lista de productos detectados, cada uno editable o eliminable, con opción de "agregar producto" manual si faltó alguno.
- Selector de categoría (el usuario la asigna, Gemini no la decide — ver nota abajo sobre por qué).
- Botón "Confirmar y guardar".

## 4. Categorización automática por comercio (mejora incremental)

En vez de pedirle a Gemini que adivine la categoría en cada ticket (poco confiable y gasta tokens), mantener una tabla simple de mapeo aprendido: cuando el usuario asigna manualmente una categoría a un comercio (ej. "Super Selectos" → Supermercado), guardar esa asociación. La próxima vez que aparezca ese comercio, precargar automáticamente esa categoría. Esto se puede resolver con una query simple sobre `expenses` (categoría más frecuente para ese comercio) sin necesitar IA ni tabla nueva.

## 5. Manejo de errores y casos límite

- Imagen borrosa o no es un ticket: Gemini debe devolver `confianza: "baja"` y campos en `null` cuando no esté seguro — el prompt ya lo contempla. Si el JSON no parsea o `monto_total` es null, mostrar el formulario manual normal en vez de fallar silenciosamente.
- Tickets muy largos (supermercado con 40 productos): considerar un límite de tokens de salida o avisar si la lista parece truncada.
- Costo de API: Gemini Flash es económico, pero igual vale la pena cachear que no se reprocese la misma imagen dos veces (verificar si ya existe un `expense` con esa `ticket_imagen_url` antes de llamar al modelo de nuevo).

## 6. Checklist de salida de este módulo

- [ ] Captura de foto funciona desde iPhone (cámara nativa vía input file)
- [ ] Imagen se sube correctamente a Supabase Storage
- [ ] Gemini devuelve JSON parseable consistentemente (probar con al menos 10 tickets reales distintos)
- [ ] Validación con Zod antes de precargar el formulario
- [ ] Usuario puede editar/corregir antes de guardar (nunca se guarda automático)
- [ ] Categorización por comercio se sugiere automáticamente después del primer uso
- [ ] Productos individuales se guardan en `expense_items` correctamente
