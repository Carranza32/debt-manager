# Módulo 06 — Fase 3 (futuro): Automatización con Atajos de iOS

Depende de: Módulo 03 (gastos) estable y en uso real por al menos unas semanas.

No construir todavía — dejar documentado para cuando el MVP y la Fase 2 estén sólidos y en uso diario real.

## Objetivo

Registrar gastos automáticamente cuando se hace un pago con Apple Pay, usando la automatización nativa de Atajos de iOS ("Cuando se haga un pago con Apple Pay"), sin necesidad de abrir la app ni teclear nada manualmente.

## 1. Cómo funciona la automatización de Atajos

Desde iOS 17, la app Atajos permite crear una automatización personal disparada por "Pago con Apple Pay realizado", que entrega como variables mágicas el nombre del comercio y el monto de la transacción. Esto NO es una API pública de Apple Wallet — es una automatización a nivel de sistema operativo, configurada directamente por el usuario en su propio dispositivo.

## 2. Endpoint necesario

API Route en Next.js: `POST /api/gastos/webhook`

Recibe:
```json
{
  "comercio": "string",
  "monto": "number"
}
```

Autenticado con un token secreto simple (Bearer token guardado como variable de texto dentro del propio atajo, validado contra una variable de entorno en el servidor) — no es necesario un sistema de auth completo para este endpoint, ya que solo lo llama el propio atajo del usuario.

## 3. Configuración del Atajo (lado de iOS, no requiere código)

1. Abrir Atajos → Automatización → Crear automatización personal.
2. Disparador: "Pago con Apple Pay".
3. Acción: "Obtener contenido de URL", método POST, URL del endpoint, header `Authorization: Bearer {token}`, body JSON con las variables mágicas de comercio y monto.
4. Desactivar "Preguntar antes de ejecutar" para que sea completamente silencioso.

## 4. Categorización automática

El gasto que entra por este canal (`fuente = 'atajo_wallet'`) debe pasar por el mismo sistema de categorización aprendida por comercio del Módulo 04 — si el comercio ya fue usado antes, se le asigna la categoría correspondiente automáticamente; si es nuevo, queda en "Sin categorizar" hasta que el usuario lo revise manualmente en la app (no bloquear el registro del gasto esperando esa categorización).

## 5. Consideraciones

- Esto solo captura pagos hechos específicamente con Apple Pay, no todas las formas de gasto (efectivo, transferencias, tarjeta física sin Apple Pay quedan fuera).
- Es un complemento a la captura manual y al OCR, no un reemplazo — el usuario seguirá necesitando las otras vías para gastos que no pasan por Apple Pay.
- Revisar periódicamente que la automatización siga activa (iOS a veces las desactiva tras actualizaciones del sistema).

## 6. Checklist de salida de este módulo (cuando se construya)

- [ ] Endpoint webhook funcionando y autenticado con token
- [ ] Atajo configurado y probado con una transacción real
- [ ] Gastos entrantes por este canal se categorizan automáticamente cuando el comercio ya es conocido
- [ ] Gastos sin categorizar son visibles y fáciles de revisar en la app
