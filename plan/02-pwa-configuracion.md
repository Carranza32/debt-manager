# Módulo 02 — Configuración PWA (instalable en iPhone)

Depende de: Módulo 01 (al menos el dashboard funcionando).

## Objetivo

Que la app se pueda instalar a la pantalla de inicio del iPhone vía Safari y funcione de forma confiable como una app casi-nativa, incluyendo acceso a cámara para el módulo de OCR de tickets (Fase 2).

## 1. Librería recomendada

Usar **Serwist** (sucesor mantenido de next-pwa, compatible con Next.js App Router):

```bash
npm install @serwist/next
```

Configurar en `next.config.ts` envolviendo la config con `withSerwist`, apuntando a un archivo `src/app/sw.ts` como entrada del Service Worker.

## 2. Manifest

Crear `src/app/manifest.ts` (Next.js App Router soporta manifest como route handler):

```typescript
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mis Deudas',
    short_name: 'Deudas',
    description: 'Gestor personal de deudas y gastos',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

## 3. Meta tags específicos de iOS

iOS no respeta completamente el manifest estándar, así que hay que agregar meta tags adicionales en `src/app/layout.tsx`:

```typescript
export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mis Deudas',
  },
  // viewport con viewport-fit=cover para manejar el notch correctamente
};
```

Incluir también un `apple-touch-icon.png` (180x180) en `public/`, ya que iOS lo usa específicamente para el ícono de pantalla de inicio en vez del manifest.

## 4. Service Worker — estrategia de caché

Para el MVP, mantenerlo simple:
- Cache-first para assets estáticos (JS, CSS, fuentes, íconos).
- Network-first para llamadas a Supabase (los datos de deudas siempre deben ser frescos; no queremos mostrar saldos desactualizados).
- No cachear rutas de API ni mutaciones.

## 5. Consideraciones específicas de iOS Safari

- **Notificaciones push**: solo funcionan desde iOS 16.4+, y únicamente si la app ya fue agregada a la pantalla de inicio (no funcionan abriendo solo desde Safari). Si se implementan después (recordatorios de fecha de corte), avisar al usuario que debe instalarla primero.
- **Storage**: no depender de `localStorage` ni IndexedDB para datos críticos — iOS puede purgarlos si la app no se abre en un tiempo. Supabase como fuente de verdad ya cubre esto, pero evitar cualquier estado importante que solo viva en el cliente.
- **Cámara**: usar `<input type="file" accept="image/*" capture="environment">` para el módulo de OCR (Fase 2) — esto abre la cámara nativa directamente sin pedir permisos especiales de `getUserMedia`, y es lo más confiable en iOS Safari/PWA.

## 6. Checklist de salida de este módulo

- [ ] App instalable desde Safari ("Agregar a pantalla de inicio")
- [ ] Ícono correcto al instalar (apple-touch-icon)
- [ ] Abre en modo standalone (sin barra de Safari) al iniciar desde el ícono
- [ ] Funciona offline al menos para ver el último estado cacheado del dashboard
- [ ] Verificado en un iPhone real, no solo en simulador/desktop
