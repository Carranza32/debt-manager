# Gestor de Deudas Personal — Plan del Proyecto

PWA personal para gestionar deudas, gastos y recibir recomendaciones de pago priorizadas, con asistencia de IA.

## Stack tecnológico

- **Framework**: Next.js 14+ (App Router) con TypeScript
- **Estilos**: Tailwind CSS + shadcn/ui
- **Base de datos / Backend**: Supabase (Postgres + Auth + Storage + Edge Functions)
- **IA**: Gemini (OCR de tickets + recomendaciones de priorización de deudas)
- **PWA**: next-pwa o Serwist (Service Worker + manifest.json)
- **Gráficos**: Recharts (progreso de deuda, gastos por categoría)
- **Validación de formularios**: Zod + React Hook Form
- **Deploy**: Vercel

## Estructura de módulos

Cada módulo es un archivo independiente, pensado para desarrollarse en orden con vibe coding (Antigravity). No avances al siguiente módulo sin terminar las dependencias del anterior.

| Módulo | Archivo | Fase | Descripción |
|---|---|---|---|
| 00 | `00-setup-y-configuracion.md` | Base | Setup del proyecto, Supabase, schema completo de tablas (MVP + Fase 2), Auth, RLS |
| 01 | `01-mvp-gestor-deudas.md` | MVP | CRUD de deudas, pagos, dashboard, estrategias avalancha/bola de nieve |
| 02 | `02-pwa-configuracion.md` | MVP | Manifest, Service Worker, instalación en iPhone |
| 03 | `03-fase2-gastos-categorias.md` | Fase 2 | Registro de gastos, categorías, presupuestos |
| 04 | `04-fase2-ocr-tickets-gemini.md` | Fase 2 | Captura de foto, OCR con Gemini, extracción de productos |
| 05 | `05-fase2-asesor-ia.md` | Fase 2 | IA que recomienda qué deuda liquidar primero, consejos personalizados |
| 06 | `06-fase3-automatizacion-atajos.md` | Fase 3 (futuro) | Integración con Atajos de iOS / Apple Pay (para después) |

## Orden de construcción recomendado

1. Módulo 00 completo (Supabase + Auth + todas las tablas desde el inicio, aunque no las uses todavía)
2. Módulo 01 (CRUD de deudas + dashboard, sin algoritmo todavía)
3. Módulo 01 — algoritmo de priorización (avalancha / bola de nieve)
4. Módulo 02 (PWA instalable)
5. Módulo 03 (gastos + categorías)
6. Módulo 04 (OCR de tickets)
7. Módulo 05 (asesor IA combinando deudas + gastos)
8. Módulo 06 (cuando todo lo anterior esté estable)

## Principio de diseño

La app debe responder 3 preguntas en menos de 5 segundos al abrirla:
1. ¿Cuánto debo en total?
2. ¿Qué debo pagar ahora / esta semana?
3. ¿Voy mejor o peor que el mes pasado?

Todo lo demás es secundario. Prioriza velocidad de uso sobre cantidad de features visibles en cada pantalla.
