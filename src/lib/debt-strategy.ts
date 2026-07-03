import { Debt, StrategyType } from '@/types/debt';

/**
 * Orders active debts based on the selected payoff strategy:
 * - 'avalancha' (Avalanche): Sort by interest rate descending (mathematically optimal).
 * - 'bola_nieve' (Snowball): Sort by current balance ascending (psychologically motivating).
 */
export function priorizarDeudas(deudas: Debt[], estrategia: StrategyType): Debt[] {
  const activas = deudas.filter(d => d.activa && d.saldo_actual > 0);
  if (estrategia === 'avalancha') {
    return [...activas].sort((a, b) => b.tasa_interes_anual - a.tasa_interes_anual);
  }
  // bola_nieve
  return [...activas].sort((a, b) => a.saldo_actual - b.saldo_actual);
}

/**
 * Calculates how a monthly payment surplus should be distributed:
 * 1. Pay the minimum payment on all active debts.
 * 2. Route the remaining surplus to the top priority debt.
 */
export function calcularDistribucion(
  deudas: Debt[],
  excedenteMensual: number,
  estrategia: StrategyType
): { debtId: string; montoSugerido: number }[] {
  const priorizadas = priorizarDeudas(deudas, estrategia);
  let restante = excedenteMensual;
  
  const distribucion = priorizadas.map(deuda => {
    const minPago = deuda.pago_minimo || 0;
    return { debtId: deuda.id, montoSugerido: minPago };
  });

  // Calculate remaining extra money after paying minimums
  const sumaMinimos = priorizadas.reduce((acc, d) => acc + (d.pago_minimo || 0), 0);
  restante = Math.max(0, excedenteMensual - sumaMinimos);

  // The extra money goes to the highest prioritized debt
  if (restante > 0 && priorizadas.length > 0) {
    const topId = priorizadas[0].id;
    const idx = distribucion.findIndex(d => d.debtId === topId);
    if (idx !== -1) {
      distribucion[idx].montoSugerido += restante;
    }
  }

  return distribucion;
}

/**
 * Projects the number of months needed to pay off a single debt
 * given a monthly payment amount and annual interest rate.
 * Returns Infinity if the payment is less than or equal to the monthly interest generated.
 */
export function proyectarMesesRestantes(
  saldoActual: number,
  tasaAnual: number,
  pagoMensual: number
): number {
  if (saldoActual <= 0) return 0;
  if (pagoMensual <= 0) return Infinity;

  const tasaMensual = tasaAnual / 100 / 12;

  // If the payment is not enough to cover the monthly interest, the debt will grow indefinitely
  if (tasaMensual > 0 && pagoMensual <= saldoActual * tasaMensual) {
    return Infinity;
  }

  if (tasaMensual === 0) {
    return Math.ceil(saldoActual / pagoMensual);
  }

  const meses = -Math.log(1 - (saldoActual * tasaMensual) / pagoMensual) / Math.log(1 + tasaMensual);
  return Math.ceil(meses);
}

/**
 * Simulates a monthly payment schedule for all debts to find out
 * after how many months the user will become completely debt-free.
 */
export function simularPlanDeuda(
  deudas: Debt[],
  excedenteMensual: number,
  estrategia: StrategyType
): number {
  const activasOriginales = deudas.filter(d => d.activa && d.saldo_actual > 0);
  if (activasOriginales.length === 0) return 0;

  // If the total monthly budget (surplus + minimums) is 0, we can never pay them off
  const totalMensual = excedenteMensual;
  if (totalMensual <= 0) return Infinity;

  let copiaDeudas = activasOriginales.map(d => ({
    id: d.id,
    saldo_actual: d.saldo_actual,
    tasa_interes_anual: d.tasa_interes_anual,
    pago_minimo: d.pago_minimo || 0,
    activa: d.activa
  }));

  let meses = 0;
  const maxMeses = 360; // 30 years ceiling

  while (copiaDeudas.some(d => d.saldo_actual > 0) && meses < maxMeses) {
    meses++;

    // 1. Accrue monthly interest
    for (const d of copiaDeudas) {
      if (d.saldo_actual > 0) {
        const tasaMensual = d.tasa_interes_anual / 100 / 12;
        d.saldo_actual += d.saldo_actual * tasaMensual;
      }
    }

    let dineroDisponible = totalMensual;

    // 2. Make minimum payments
    for (const d of copiaDeudas) {
      if (d.saldo_actual > 0) {
        const pago = Math.min(d.pago_minimo, d.saldo_actual);
        d.saldo_actual -= pago;
        dineroDisponible -= pago;
      }
    }

    // If we run out of money just paying minimums, the projection is in trouble
    if (dineroDisponible < 0) {
      // It means the minimum payments exceed the available monthly budget
      // Return Infinity because the budget is not enough even for minimums
      return Infinity;
    }

    // 3. Distribute the remaining surplus to prioritized debts
    if (dineroDisponible > 0) {
      const priorizadas = copiaDeudas
        .filter(d => d.saldo_actual > 0)
        .sort((a, b) => {
          if (estrategia === 'avalancha') {
            return b.tasa_interes_anual - a.tasa_interes_anual;
          }
          return a.saldo_actual - b.saldo_actual;
        });

      for (const p of priorizadas) {
        const d = copiaDeudas.find(x => x.id === p.id)!;
        const pagoExtra = Math.min(dineroDisponible, d.saldo_actual);
        d.saldo_actual -= pagoExtra;
        dineroDisponible -= pagoExtra;
        if (dineroDisponible <= 0) break;
      }
    }
  }

  return meses >= maxMeses ? Infinity : meses;
}

