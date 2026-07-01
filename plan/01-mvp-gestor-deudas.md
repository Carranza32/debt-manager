# Módulo 01 — MVP: Gestor de Deudas

Depende de: Módulo 00 completo.

## Objetivo

CRUD de deudas, registro de pagos, dashboard con totales y progreso, y algoritmo de priorización (avalancha / bola de nieve). Esta es la parte que da valor inmediato y debe sentirse usable desde el primer día.

## 1. Estructura de rutas (App Router)

```
src/app/
  (auth)/
    login/page.tsx
    registro/page.tsx
  (dashboard)/
    layout.tsx          -> layout con navegación inferior (mobile-first)
    page.tsx             -> Dashboard principal
    deudas/
      page.tsx            -> Lista de deudas
      nueva/page.tsx       -> Formulario crear deuda
      [id]/page.tsx        -> Detalle de deuda + historial de pagos
      [id]/editar/page.tsx
    configuracion/page.tsx
```

## 2. Tipos TypeScript base

Crear `src/types/debt.ts` con los tipos que reflejan el schema de Supabase (usar `supabase gen types typescript` para generarlos automáticamente y mantenerlos sincronizados, en vez de escribirlos a mano).

## 3. Pantalla: Dashboard (`/`)

Es la pantalla más importante de toda la app. Debe mostrar, en este orden de prioridad visual:

1. **Card grande superior**: deuda total restante (suma de `saldo_actual` de todas las deudas activas), con una barra de progreso comparando contra la suma de `monto_original`.
2. **Resumen rápido**: cuánto has pagado este mes (suma de `payments` del mes actual), cuántos meses estimados te faltan según la estrategia activa.
3. **Lista de deudas priorizadas**: ordenadas según la estrategia activa (avalancha o bola de nieve), cada una como card con: nombre, saldo actual, tasa de interés, badge si la fecha de corte está a menos de 5 días, y botón rápido de "Registrar pago".
4. **Toggle de estrategia**: shadcn `ToggleGroup` con "Avalancha" / "Bola de nieve" que reordena la lista en tiempo real sin recargar.
5. **Botón flotante** (FAB) de "+ Nueva deuda" siempre visible.

## 4. Algoritmo de priorización

Crear `src/lib/debt-strategy.ts` con funciones puras (fáciles de testear):

```typescript
type Strategy = 'avalancha' | 'bola_nieve';

function priorizarDeudas(deudas: Debt[], estrategia: Strategy): Debt[] {
  if (estrategia === 'avalancha') {
    return [...deudas].sort((a, b) => b.tasa_interes_anual - a.tasa_interes_anual);
  }
  // bola_nieve
  return [...deudas].sort((a, b) => a.saldo_actual - b.saldo_actual);
}

function calcularDistribucion(
  deudas: Debt[],
  excedenteMensual: number,
  estrategia: Strategy
): { deudaId: string; montoSugerido: number }[] {
  const priorizadas = priorizarDeudas(deudas, estrategia);
  let restante = excedenteMensual;
  const distribucion = [];

  // Primero cubrir pagos mínimos de todas
  for (const deuda of priorizadas) {
    distribucion.push({ deudaId: deuda.id, montoSugerido: deuda.pago_minimo });
    restante -= deuda.pago_minimo;
  }

  // El excedente restante va completo a la primera deuda priorizada
  if (restante > 0 && priorizadas.length > 0) {
    const idx = distribucion.findIndex(d => d.deudaId === priorizadas[0].id);
    distribucion[idx].montoSugerido += restante;
  }

  return distribucion;
}

function proyectarMesesRestantes(
  saldoActual: number,
  tasaAnual: number,
  pagoMensual: number
): number {
  const tasaMensual = tasaAnual / 100 / 12;
  if (pagoMensual <= saldoActual * tasaMensual) return Infinity; // nunca se paga
  if (tasaMensual === 0) return Math.ceil(saldoActual / pagoMensual);
  const meses = -Math.log(1 - (saldoActual * tasaMensual) / pagoMensual) / Math.log(1 + tasaMensual);
  return Math.ceil(meses);
}
```

Importante: si `proyectarMesesRestantes` devuelve `Infinity`, mostrar una alerta visual clara en el dashboard ("con este pago nunca terminarás de pagar esta deuda") — es información crítica que el usuario necesita ver, no esconder.

## 5. Pantalla: Lista de deudas (`/deudas`)

Tabla o lista de cards (mobile-first, así que cards) con todas las deudas (incluyendo inactivas/pagadas en una sección colapsada abajo). Filtro simple por tipo de deuda.

## 6. Pantalla: Formulario de deuda (`/deudas/nueva` y `/deudas/[id]/editar`)

Usar React Hook Form + Zod. Campos: nombre, tipo (select), monto original, saldo actual, tasa de interés anual, fecha de corte (1-31), fecha de pago (1-31), pago mínimo.

Validaciones clave:
- `saldo_actual` no puede ser mayor a `monto_original` al crear (sí puede pasar después si se generan más intereses, pero alertar si sucede).
- `fecha_corte` y `fecha_pago` entre 1 y 31, con advertencia si el usuario pone 31 ("algunos meses no tienen día 31, se ajustará al último día del mes").

## 7. Pantalla: Detalle de deuda (`/deudas/[id]`)

- Header con nombre, saldo actual grande, tasa de interés.
- Gráfico de línea (Recharts) mostrando evolución del saldo a través del tiempo (se calcula a partir del historial de `payments`).
- Lista de pagos registrados (fecha, monto, nota).
- Botón "Registrar pago" que abre un Dialog simple (monto + fecha + nota opcional). Al confirmar, resta del `saldo_actual` de la deuda vía server action.
- Si `saldo_actual` llega a 0, marcar automáticamente `activa = false` y mostrar un mensaje de celebración simple (sin exagerar, solo un check verde y "¡Deuda liquidada!").

## 8. Pantalla: Configuración (`/configuracion`)

- Ingreso mensual.
- Excedente mensual disponible para deudas (esto alimenta `calcularDistribucion`).
- Selector de estrategia por defecto.
- Aquí también vivirá después el botón de "generar recomendación de IA" (Módulo 05).

## 9. Server Actions necesarias

Crear en `src/app/actions/debts.ts`:
- `crearDeuda(data)`
- `actualizarDeuda(id, data)`
- `eliminarDeuda(id)` (soft delete recomendado: marcar `activa = false` en vez de borrar, para no perder historial)
- `registrarPago(debtId, monto, fecha, nota)` — debe ser transaccional: inserta en `payments` Y actualiza `saldo_actual` en `debts` en la misma operación (usar una función de Postgres/RPC en Supabase para garantizar atomicidad, no dos queries separadas desde el cliente).

Función RPC sugerida en Supabase:

```sql
create or replace function registrar_pago(
  p_debt_id uuid,
  p_monto numeric,
  p_fecha date,
  p_nota text
) returns void as $$
begin
  insert into payments (debt_id, user_id, monto, fecha, nota)
  values (p_debt_id, auth.uid(), p_monto, p_fecha, p_nota);

  update debts
  set saldo_actual = greatest(saldo_actual - p_monto, 0)
  where id = p_debt_id and user_id = auth.uid();

  update debts set activa = false
  where id = p_debt_id and saldo_actual = 0;
end;
$$ language plpgsql security definer;
```

## 10. Checklist de salida de este módulo

- [ ] CRUD completo de deudas funcionando
- [ ] Registro de pagos actualiza saldo correctamente (vía RPC transaccional)
- [ ] Dashboard muestra totales correctos y barra de progreso
- [ ] Toggle avalancha/bola de nieve reordena la lista correctamente
- [ ] Proyección de meses restantes se calcula y se muestra
- [ ] Alerta visible cuando una deuda nunca se pagaría con el pago actual
- [ ] Deuda se marca automáticamente como inactiva al llegar a saldo 0
