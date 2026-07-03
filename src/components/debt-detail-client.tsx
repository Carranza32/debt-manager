'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { registrarPago, actualizarDeuda, eliminarDeuda } from '@/app/actions/debts';
import { Debt, Payment } from '@/types/debt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Plus, 
  Sparkles,
  Percent,
  CheckCircle,
  FileText,
  Clock,
  Settings
} from 'lucide-react';

interface DebtDetailClientProps {
  debt: Debt;
  payments: Payment[];
}

export default function DebtDetailClient({ debt, payments }: DebtDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');

  // Edit Debt states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(debt.nombre);
  const [editTipo, setEditTipo] = useState(debt.tipo);
  const [editMontoOriginal, setEditMontoOriginal] = useState(String(debt.monto_original));
  const [editSaldoActual, setEditSaldoActual] = useState(String(debt.saldo_actual));
  const [editTasa, setEditTasa] = useState(String(debt.tasa_interes_anual));
  const [editPagoMinimo, setEditPagoMinimo] = useState(String(debt.pago_minimo));
  const [editCorte, setEditCorte] = useState(debt.fecha_corte !== null ? String(debt.fecha_corte) : '');
  const [editPago, setEditPago] = useState(debt.fecha_pago !== null ? String(debt.fecha_pago) : '');
  const [editActiva, setEditActiva] = useState(debt.activa);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('editar') === 'true' || params.get('edit') === 'true') {
        setIsEditOpen(true);
        const url = new URL(window.location.href);
        url.searchParams.delete('editar');
        url.searchParams.delete('edit');
        window.history.replaceState({}, '', url.pathname);
      }
    }
  }, []);

  const isLiquidated = debt.saldo_actual <= 0 || !debt.activa;

  // Build chart data by backtracking from current balance
  const getChartData = () => {
    if (payments.length === 0) {
      return [
        { fecha: 'Inicio', saldo: Number(debt.monto_original) },
        { fecha: 'Hoy', saldo: Number(debt.saldo_actual) },
      ];
    }

    // Sort payments oldest first to backtrack chronologically
    const sortedPayments = [...payments].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    const dataPoints: { fecha: string; saldo: number }[] = [];
    let currentBalance = Number(debt.saldo_actual);

    // End point is today's balance
    dataPoints.push({
      fecha: 'Hoy',
      saldo: currentBalance,
    });

    // Walk backwards through payments to reconstruct balances
    for (let i = payments.length - 1; i >= 0; i--) {
      const p = payments[i];
      currentBalance += Number(p.monto);
      const dateLabel = new Date(p.fecha).toLocaleDateString('es-SV', {
        month: 'short',
        day: 'numeric',
      });
      dataPoints.push({
        fecha: dateLabel,
        saldo: currentBalance,
      });
    }

    // Reverse to display oldest first
    return dataPoints.reverse();
  };

  const chartData = getChartData();

  const handleOpenPayment = () => {
    setIsPaymentOpen(true);
    setPaymentAmount('');
    setPaymentNote('');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Por favor, ingresa un monto válido.');
      return;
    }

    startTransition(async () => {
      try {
        await registrarPago(
          debt.id,
          Number(paymentAmount),
          paymentDate,
          paymentNote || null
        );
        toast.success('Pago registrado correctamente');
        setIsPaymentOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al registrar el pago');
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editMontoOriginal || Number(editMontoOriginal) <= 0) {
      toast.error('Por favor, ingresa los datos mínimos.');
      return;
    }
    startTransition(async () => {
      try {
        await actualizarDeuda(debt.id, {
          nombre: editName,
          tipo: editTipo as any,
          monto_original: Number(editMontoOriginal),
          saldo_actual: Number(editSaldoActual),
          tasa_interes_anual: Number(editTasa || 0),
          fecha_corte: editCorte === '' ? null : Number(editCorte),
          fecha_pago: editPago === '' ? null : Number(editPago),
          pago_minimo: Number(editPagoMinimo || 0),
          activa: editActiva,
        });
        toast.success('Deuda actualizada correctamente');
        setIsEditOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al actualizar la deuda');
      }
    });
  };

  const handleDeleteDebt = () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta deuda? Esta acción no se puede deshacer.')) {
      return;
    }
    startTransition(async () => {
      try {
        await eliminarDeuda(debt.id);
        toast.success('Deuda eliminada correctamente');
        router.push('/deudas');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al eliminar la deuda');
      }
    });
  };
  return (
    <div className="space-y-8">
      {/* Back button & edit button */}
      <div className="flex items-center justify-between">
        <Link href="/deudas" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-bold">
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a deudas
        </Link>
        <Button 
          onClick={() => setIsEditOpen(true)}
          variant="outline" 
          size="sm" 
          className="border border-zinc-200 bg-white text-slate-700 text-xs cursor-pointer rounded-xl h-8 px-4 flex items-center justify-center gap-1.5"
        >
          <Settings className="h-3.5 w-3.5 text-slate-500" />
          Editar Deuda
        </Button>
      </div>

      {/* Celebration banner if liquidated */}
      {isLiquidated && (
        <div className="glass-card border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-250 rounded-[20px]">
          <div className="p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-emerald-955 dark:text-emerald-550 flex items-center justify-center sm:justify-start gap-1.5">
                ¡Deuda Liquidada!
                <CheckCircle className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              </h2>
              <p className="text-xs text-emerald-700/90 dark:text-emerald-300/80 leading-relaxed font-medium">
                Felicidades por saldar esta cuenta. Cada deuda eliminada es un paso gigante hacia tu libertad financiera total. ¡Sigue así!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Header */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="glass-card text-card-foreground shadow-sm md:col-span-2 rounded-[20px]">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Saldo Pendiente</p>
                <h2 className="text-3xl font-black text-foreground mt-1.5">
                  ${debt.saldo_actual.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                </h2>
                <p className="text-xs text-muted-foreground font-bold mt-1">
                  Originalmente: ${debt.monto_original.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Badge className="bg-primary/10 text-primary border border-primary/20 py-1 px-3 text-[10px] rounded-full font-bold uppercase tracking-wider">
                {debt.tipo.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        <div className="glass-card text-card-foreground shadow-sm rounded-[20px]">
          <div className="p-6 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Tasa Interés Anual</p>
                <p className="text-xl font-extrabold text-foreground mt-1">{debt.tasa_interes_anual}%</p>
              </div>
              <Percent className="h-5 w-5 text-primary" />
            </div>
            
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Pago mínimo</p>
                <p className="text-sm font-bold text-foreground mt-0.5">${debt.pago_minimo}</p>
              </div>
              {!isLiquidated && (
                <Button 
                  onClick={handleOpenPayment}
                  size="sm" 
                  className="bg-primary text-primary-foreground hover:opacity-90 font-bold cursor-pointer rounded-xl h-8 px-4"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Pagar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Amortization */}
      {payments.length > 0 && (
        <div className="glass-card text-card-foreground shadow-sm rounded-[20px]">
          <div className="p-6 pb-2">
            <h3 className="text-base font-bold text-foreground">Evolución del Saldo</h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Amortización reconstruida a través del historial de abonos.</p>
          </div>
          <div className="p-6 h-64 pt-2">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" opacity={0.5} />
                  <XAxis 
                    dataKey="fecha" 
                    stroke="currentColor"
                    className="text-zinc-400 dark:text-zinc-650"
                    fontSize={10} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="currentColor"
                    className="text-zinc-400 dark:text-zinc-650"
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '1rem', backdropFilter: 'blur(10px)', color: 'var(--foreground)' }}
                    labelStyle={{ color: 'var(--muted-foreground)', fontWeight: 'bold', fontSize: '10px' }}
                    itemStyle={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Saldo']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="saldo" 
                    stroke="var(--primary)" 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                    dot={{ r: 4, stroke: 'var(--primary)', strokeWidth: 2, fill: 'var(--background)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full bg-zinc-100 dark:bg-zinc-950/20 animate-pulse rounded-2xl" />
            )}
          </div>
        </div>
      )}

      {/* Payments History */}
      <div className="glass-card text-card-foreground shadow-sm rounded-[20px]">
        <div className="p-6 pb-3">
          <h3 className="text-base font-bold text-foreground">Historial de Pagos</h3>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Historial completo de abonos registrados.</p>
        </div>
        <div className="p-6 pt-0">
          {payments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Clock className="h-8 w-8 text-zinc-350 dark:text-zinc-700 mx-auto mb-2" />
              <p className="text-xs font-medium">No hay abonos registrados para esta deuda.</p>
            </div>
          ) : (
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                {payments.map(p => (
                  <li key={p.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          Abono registrado
                        </p>
                        {p.nota && (
                          <p className="text-xs text-muted-foreground truncate font-medium">
                            {p.nota}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-bold">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          {new Date(p.fecha).toLocaleDateString('es-SV', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="inline-flex items-center text-sm font-bold text-emerald-600 dark:text-emerald-450 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 px-2.5 py-0.5 rounded-full font-sans">
                          -${Number(p.monto).toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Frosted Payment modal */}
      <div className={`modal ${isPaymentOpen ? 'modal-open' : ''}`} role="dialog">
        <div className="modal-box bg-white/70 backdrop-blur-md border border-white/40 shadow-2xl p-6 rounded-2xl max-w-sm">
          <h3 className="text-lg font-bold text-gray-950">Registrar Pago</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Registra un abono para reducir el saldo restante de la deuda.
          </p>
          <form onSubmit={handlePaymentSubmit} className="mt-5 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="monto" className="text-xs font-bold text-gray-700">Monto del Abono</label>
              <input
                id="monto"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={isPending}
                className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none input-ios-focus w-full transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fecha" className="text-xs font-bold text-gray-700">Fecha de Pago</label>
              <input
                id="fecha"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={isPending}
                className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none input-ios-focus w-full transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nota" className="text-xs font-bold text-gray-700">Nota (Opcional)</label>
              <input
                id="nota"
                type="text"
                placeholder="Ej: Pago extra de mes"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                disabled={isPending}
                className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none input-ios-focus w-full transition-all"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                disabled={isPending}
                className="flex-1 h-10 rounded-xl border border-gray-250/50 bg-white/30 text-sm font-semibold text-slate-700 hover:bg-white/60 hover:text-slate-900 transition-all cursor-pointer btn-elastic"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 hover:opacity-95 text-white text-sm font-semibold transition-all cursor-pointer border-none btn-elastic active:scale-95"
              >
                {isPending ? 'Guardando...' : 'Guardar Pago'}
              </button>
            </div>
          </form>
        </div>
        <div className="modal-backdrop" onClick={() => setIsPaymentOpen(false)}>
          <button type="button" className="cursor-default">close</button>
        </div>
      </div>

      {/* ── Frosted Edit Debt modal ─────────────────────────────────────────── */}
      <div className={`modal ${isEditOpen ? 'modal-open' : ''}`} role="dialog">
        <div className="modal-box bg-white/70 backdrop-blur-md border border-white/40 shadow-2xl p-6 rounded-2xl max-w-md">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-950">Editar Deuda: {debt.nombre}</h3>
            <button
              type="button"
              onClick={handleDeleteDebt}
              disabled={isPending}
              className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors cursor-pointer select-none bg-red-50 hover:bg-red-100/50 px-3 py-1 rounded-xl"
            >
              Eliminar Deuda
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Modifica los detalles esenciales del crédito seleccionado.
          </p>

          <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit_nombre" className="text-xs font-bold text-gray-700">
                Nombre de la Deuda
              </label>
              <input
                id="edit_nombre"
                type="text"
                required
                value={editName}
                onChange={e => setEditName(e.target.value)}
                disabled={isPending}
                className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit_tipo" className="text-xs font-bold text-gray-700">
                Tipo de Crédito
              </label>
              <select
                id="edit_tipo"
                value={editTipo}
                onChange={e => setEditTipo(e.target.value as any)}
                disabled={isPending}
                className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all cursor-pointer font-medium"
              >
                <option value="tarjeta_credito">Tarjeta de Crédito</option>
                <option value="prestamo_personal">Préstamo Personal</option>
                <option value="prestamo_auto">Crédito Vehicular</option>
                <option value="prestamo_hipotecario">Crédito Hipotecario</option>
                <option value="otro">Otro tipo de deuda</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit_monto" className="text-xs font-bold text-gray-700 font-bold">
                  Monto Original
                </label>
                <input
                  id="edit_monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editMontoOriginal}
                  onChange={e => setEditMontoOriginal(e.target.value)}
                  disabled={isPending}
                  className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit_saldo" className="text-xs font-bold text-gray-700 font-bold">
                  Saldo Actual
                </label>
                <input
                  id="edit_saldo"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editSaldoActual}
                  onChange={e => setEditSaldoActual(e.target.value)}
                  disabled={isPending}
                  className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit_tasa" className="text-xs font-bold text-gray-700">
                  Tasa Interés Anual (%)
                </label>
                <input
                  id="edit_tasa"
                  type="number"
                  step="0.01"
                  value={editTasa}
                  onChange={e => setEditTasa(e.target.value)}
                  disabled={isPending}
                  className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit_minimo" className="text-xs font-bold text-gray-700">
                  Pago Mínimo
                </label>
                <input
                  id="edit_minimo"
                  type="number"
                  step="0.01"
                  value={editPagoMinimo}
                  onChange={e => setEditPagoMinimo(e.target.value)}
                  disabled={isPending}
                  className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit_corte" className="text-xs font-bold text-gray-700">
                  Día de Corte (1-31)
                </label>
                <input
                  id="edit_corte"
                  type="number"
                  min="1"
                  max="31"
                  value={editCorte}
                  onChange={e => setEditCorte(e.target.value)}
                  disabled={isPending}
                  className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit_pago" className="text-xs font-bold text-gray-700">
                  Día de Pago (1-31)
                </label>
                <input
                  id="edit_pago"
                  type="number"
                  min="1"
                  max="31"
                  value={editPago}
                  onChange={e => setEditPago(e.target.value)}
                  disabled={isPending}
                  className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1.5 select-none">
              <input
                id="edit_activa"
                type="checkbox"
                checked={editActiva}
                onChange={e => setEditActiva(e.target.checked)}
                disabled={isPending}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="edit_activa" className="text-xs font-bold text-gray-700 cursor-pointer">
                Deuda Activa (entra en cálculos y proyecciones)
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                disabled={isPending}
                className="flex-1 h-10 rounded-xl border border-gray-250/50 bg-white/30 text-sm font-semibold text-slate-700 hover:bg-white/60 hover:text-slate-900 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 hover:opacity-95 text-white text-sm font-semibold transition-all cursor-pointer border-none"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>

        <div className="modal-backdrop" onClick={() => setIsEditOpen(false)}>
          <button type="button" className="cursor-default">close</button>
        </div>
    </div>
  </div>
);
}
