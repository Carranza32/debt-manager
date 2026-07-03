'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  priorizarDeudas,
  simularPlanDeuda,
  proyectarMesesRestantes,
  calcularDistribucion,
} from '@/lib/debt-strategy';
import { registrarPago, crearDeuda } from '@/app/actions/debts';
import { Debt, Payment, UserSettings, StrategyType } from '@/types/debt';
import {
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Percent,
  DollarSign,
  Plus,
  CreditCard,
  Car,
  Home,
  Banknote,
  Percent as PercentIcon
} from 'lucide-react';


interface DashboardClientProps {
  initialDebts: Debt[];
  settings: UserSettings;
  currentMonthPayments: Payment[];
  budgetProgress?: any[];
}

export default function DashboardClient({
  initialDebts,
  settings,
  currentMonthPayments,
  budgetProgress = [],
}: DashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [strategy, setStrategy] = useState<StrategyType>(settings.estrategia || 'avalancha');
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');

  // New debt modal states
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtTipo, setNewDebtTipo] = useState('tarjeta_credito');
  const [newDebtMonto, setNewDebtMonto] = useState('');
  const [newDebtTasa, setNewDebtTasa] = useState('');
  const [newDebtMinimo, setNewDebtMinimo] = useState('');
  const [newDebtCorte, setNewDebtCorte] = useState('');
  const [newDebtPago, setNewDebtPago] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('nueva') === 'true' || params.get('add-debt') === 'true') {
        setIsAddDebtOpen(true);
        const url = new URL(window.location.href);
        url.searchParams.delete('nueva');
        url.searchParams.delete('add-debt');
        window.history.replaceState({}, '', url.pathname);
      }
    }
  }, []);

  const handleAddDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtName || !newDebtMonto || Number(newDebtMonto) <= 0) {
      toast.error('Por favor, ingresa los datos mínimos de la deuda.');
      return;
    }
    const formattedValues = {
      nombre: newDebtName,
      tipo: newDebtTipo as any,
      monto_original: Number(newDebtMonto),
      saldo_actual: Number(newDebtMonto),
      tasa_interes_anual: Number(newDebtTasa || 0),
      fecha_corte: newDebtCorte === '' ? null : Number(newDebtCorte),
      fecha_pago: newDebtPago === '' ? null : Number(newDebtPago),
      pago_minimo: Number(newDebtMinimo || 0),
    };

    startTransition(async () => {
      try {
        await crearDeuda(formattedValues);
        toast.success('Deuda creada correctamente');
        setIsAddDebtOpen(false);
        // Reset form
        setNewDebtName('');
        setNewDebtTipo('tarjeta_credito');
        setNewDebtMonto('');
        setNewDebtTasa('');
        setNewDebtMinimo('');
        setNewDebtCorte('');
        setNewDebtPago('');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al crear la deuda');
      }
    });
  };

  const activeDebts = initialDebts.filter(d => d.activa && d.saldo_actual > 0);
  const inactiveDebts = initialDebts.filter(d => !d.activa || d.saldo_actual <= 0);

  const totalOriginal = activeDebts.reduce((sum, d) => sum + Number(d.monto_original), 0);
  const totalActual = activeDebts.reduce((sum, d) => sum + Number(d.saldo_actual), 0);
  const totalPaidCurrentMonth = currentMonthPayments.reduce((sum, p) => sum + Number(p.monto), 0);
  const percentPaid = totalOriginal > 0
    ? Math.round(((totalOriginal - totalActual) / totalOriginal) * 100)
    : 100;

  const prioritizedDebts = priorizarDeudas(activeDebts, strategy);
  const totalBudget = Number(settings.excedente_mensual || 0);
  const estimatedMonths = simularPlanDeuda(activeDebts, totalBudget, strategy);

  const getDaysUntilCutoff = (day: number | null): number => {
    if (!day) return 999;
    const today = new Date();
    const currentDay = today.getDate();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return day >= currentDay ? day - currentDay : (lastDay - currentDay) + day;
  };

  const getEstimatedCompletionDate = (months: number) => {
    if (months === Infinity || isNaN(months) || months <= 0) return 'Indefinida';
    const date = new Date();
    date.setMonth(date.getMonth() + Math.ceil(months));
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    const formatted = date.toLocaleDateString('es-SV', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const handleOpenPayment = (debtId: string) => {
    setSelectedDebtId(debtId);
    setIsPaymentOpen(true);
    setPaymentAmount('');
    setPaymentNote('');
  };

  const handleClosePayment = () => {
    setIsPaymentOpen(false);
    setSelectedDebtId(null);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtId || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Por favor, ingresa un monto valido.');
      return;
    }
    startTransition(async () => {
      try {
        await registrarPago(selectedDebtId, Number(paymentAmount), paymentDate, paymentNote || null);
        toast.success('Pago registrado con exito');
        handleClosePayment();
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al registrar el pago');
      }
    });
  };

  // Check if any debt has insufficient payment
  const distribution = calcularDistribucion(activeDebts, totalBudget, strategy);
  const insufficientDebts = activeDebts.filter(debt => {
    const suggested = distribution.find(d => d.debtId === debt.id)?.montoSugerido || 0;
    return proyectarMesesRestantes(debt.saldo_actual, debt.tasa_interes_anual, suggested) === Infinity;
  });

  // Category icon + color config per debt type
  const getDebtTypeConfig = (tipo: string) => {
    switch (tipo) {
      case 'tarjeta_credito':
        return { icon: CreditCard, label: 'Tarjeta', bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', accent: '#8B5CF6' };
      case 'prestamo_auto':
        return { icon: Car, label: 'Auto', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', accent: '#3B82F6' };
      case 'prestamo_hipotecario':
        return { icon: Home, label: 'Hipoteca', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', accent: '#10B981' };
      case 'prestamo_personal':
        return { icon: Banknote, label: 'Personal', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', accent: '#F59E0B' };
      default:
        return { icon: DollarSign, label: 'Otro', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', accent: '#94A3B8' };
    }
  };

  const debtColors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B"];
  const debtProgress = activeDebts.map((d, index) => {
    const original = Number(d.monto_original);
    const remaining = Number(d.saldo_actual);
    const paid = Math.max(0, original - remaining);
    const paidPct = original > 0 ? Math.min(100, Math.round((paid / original) * 100)) : 0;
    return {
      name: d.nombre,
      paidPct,
      paid,
      remaining,
      color: debtColors[index % debtColors.length]
    };
  });

  return (
    <div className="space-y-10">

      {/* ── First Row: Stats cards ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1: Deuda Restante */}
        <div className="dash-card p-6 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Deuda Restante
            </p>
            <p className="text-3xl font-black text-gray-950 mt-3 tabular-nums leading-none">
              ${totalActual.toLocaleString('es-SV', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              de ${totalOriginal.toLocaleString('es-SV', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} originales
            </p>
          </div>
          <div className="mt-8">
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gemini rounded-full transition-all duration-500"
                style={{ width: `${percentPaid}%` }}
              />
            </div>
            <p className="text-[11px] font-bold text-blue-600 mt-2">{percentPaid}% pagado</p>
          </div>
        </div>

        {/* Card 2: Pagado Este Mes */}
        <div className="dash-card p-6 relative flex flex-col justify-between">
          <div className="absolute top-6 right-6 h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <TrendingDown className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Pagado este mes
            </p>
            <p className="text-3xl font-black text-gray-950 mt-3 tabular-nums leading-none">
              ${totalPaidCurrentMonth.toLocaleString('es-SV', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="mt-6 bg-gray-50/80 rounded-xl p-3 border border-gray-100">
            <p className="text-xs italic text-slate-650 leading-relaxed font-semibold">
              "Cada pequeno paso cuenta para tu libertad financiera."
            </p>
          </div>
        </div>

        {/* Card 3: Libre de Deudas */}
        <div className="dash-card p-6 relative flex flex-col justify-between">
          <div className="absolute top-6 right-6 h-8 w-8 rounded-lg bg-gray-100 border border-gray-200/50 flex items-center justify-center text-gray-400">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Libre de deudas
            </p>
            <p className="text-3xl font-black text-gray-950 mt-3 leading-none">
              {estimatedMonths === Infinity
                ? '--'
                : estimatedMonths === 0
                ? 'Ya lo estas'
                : `~${estimatedMonths} meses`}
            </p>
          </div>
          <div className="mt-8 pt-2">
            <p className="text-xs text-slate-500 font-semibold">
              Fecha estimada:{' '}
              <span className="text-gray-700 font-bold">
                {estimatedMonths === Infinity ? 'Indefinida' : getEstimatedCompletionDate(estimatedMonths)}
              </span>
            </p>
          </div>
        </div>

      </div>

      {/* ── Second Row: Custom Progress Chart ─────────────────────── */}
      <div className="dash-card p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Distribucion de Deuda</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Progreso individual por deuda</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-bold text-slate-500">Pagado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-200"></span>
              <span className="text-[10px] font-bold text-slate-500">Restante</span>
            </div>
          </div>
        </div>

        {activeDebts.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 font-bold">
            Agrega deudas para ver el progreso de distribucion
          </div>
        ) : (
          <div className="space-y-5">
            {debtProgress.map((dp) => (
              <div key={dp.name}>
                {/* Row header: name + amounts */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: dp.color }}
                    />
                    <span className="text-sm font-bold text-gray-900">{dp.name}</span>
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: dp.color, opacity: 0.9 }}
                    >
                      {dp.paidPct}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-[10px] text-emerald-600 font-bold">
                      ${dp.paid.toLocaleString('es-SV', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} pag.
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      ${dp.remaining.toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} rest.
                    </span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="relative">
                  <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${dp.paidPct}%`,
                        background: `linear-gradient(90deg, #10B981 0%, ${dp.color} 100%)`,
                        boxShadow: `0 2px 10px -2px ${dp.color}88`
                      }}
                    />
                  </div>

                  {/* Milestone markers */}
                  {[25, 50, 75].map((milestone) => (
                    <div
                      key={milestone}
                      className="absolute top-0 h-full flex flex-col items-center pointer-events-none"
                      style={{ left: `${milestone}%` }}
                    >
                      <div className="w-px h-full bg-slate-300/60" />
                    </div>
                  ))}
                </div>

                {/* Milestone labels below track */}
                <div className="relative mt-1.5">
                  {[25, 50, 75, 100].map((milestone) => (
                    <span
                      key={milestone}
                      className="absolute text-[9px] font-bold text-slate-400 -translate-x-1/2"
                      style={{ left: `${milestone}%` }}
                    >
                      {milestone}%
                    </span>
                  ))}
                </div>

                {/* Spacer for labels */}
                <div className="h-4" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Third Row: Prioritized Debts Section ──────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Deudas Priorizadas</h2>

          {activeDebts.length > 0 && (
            <div className="flex items-center bg-gray-100 rounded-full p-1 border border-gray-200/50">
              <button
                type="button"
                onClick={() => setStrategy('avalancha')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer btn-elastic active:scale-95 ${
                  strategy === 'avalancha'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 bg-transparent'
                }`}
              >
                Avalancha
              </button>
              <button
                type="button"
                onClick={() => setStrategy('bola_nieve')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer btn-elastic active:scale-95 ${
                  strategy === 'bola_nieve'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 bg-transparent'
                }`}
              >
                Bola de Nieve
              </button>
            </div>
          )}
        </div>

        {/* Debt rows list */}
        <div className="space-y-3.5">
          {activeDebts.length === 0 ? (
            <div className="dash-card py-16 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Sin deudas activas</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-xs leading-relaxed">
                Agrega tu primera deuda para comenzar a ver tu distribucion y proyecciones.
              </p>
              <button
                type="button"
                onClick={() => setIsAddDebtOpen(true)}
                className="mt-6 flex items-center gap-2 h-9 px-5 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-colors cursor-pointer border-none shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar deuda
              </button>
            </div>
          ) : (
            prioritizedDebts.map((debt, index) => {
              const daysToCutoff = getDaysUntilCutoff(debt.fecha_corte);
              const isCutoffNear = daysToCutoff <= 5;
              const suggestedPayment = distribution.find(d => d.debtId === debt.id)?.montoSugerido || 0;
              const isInsufficient =
                proyectarMesesRestantes(debt.saldo_actual, debt.tasa_interes_anual, suggestedPayment) === Infinity;
              const cfg = getDebtTypeConfig(debt.tipo);
              const IconComp = cfg.icon;
              const paidPct = Number(debt.monto_original) > 0
                ? Math.min(100, Math.round(((Number(debt.monto_original) - Number(debt.saldo_actual)) / Number(debt.monto_original)) * 100))
                : 0;

              return (
                <div
                  key={debt.id}
                  className="bg-white/80 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md hover:scale-[1.005] transition-all duration-200 rounded-[20px] overflow-hidden"
                >
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">

                      {/* Category Icon Badge */}
                      <div className={`h-10 w-10 rounded-2xl ${cfg.bg} ${cfg.border} border flex items-center justify-center shrink-0`}>
                        <IconComp className={`h-5 w-5 ${cfg.text}`} />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/deudas/${debt.id}`}
                            className="text-sm font-bold text-gray-950 hover:text-blue-600 transition-colors truncate cursor-pointer"
                          >
                            {debt.nombre}
                          </Link>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                          {isCutoffNear && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-500 text-[9px] font-bold border border-red-100">
                              Corte en {daysToCutoff}d
                            </span>
                          )}
                          {isInsufficient && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-500 text-[9px] font-bold border border-red-100 shrink-0">
                              Pago insuficiente
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-slate-400 font-medium">{debt.tasa_interes_anual}% interes anual</span>
                          <span className="text-[10px] font-bold text-blue-600">{paidPct}% pagado</span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="mt-2 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${paidPct}%`,
                              background: 'linear-gradient(90deg, #10B981, #2563EB)'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Saldo + priority badge + actions */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Saldo pendiente</p>
                        <p className="text-base font-black text-gray-950 mt-0.5 tabular-nums">
                          ${debt.saldo_actual.toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {suggestedPayment > 0 && (
                          <p className="text-[9px] text-blue-600 font-bold mt-0.5">
                            Abono: ${suggestedPayment.toLocaleString('es-SV', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenPayment(debt.id)}
                          className="h-8 px-4 rounded-xl text-white text-xs font-bold bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer border-none shadow-sm hover:shadow-md btn-elastic active:scale-95"
                        >
                          Pagar
                        </button>
                        <Link
                          href={`/deudas/${debt.id}`}
                          className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-gray-700 hover:bg-gray-50 transition-all shrink-0 cursor-pointer"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Inactive debts collapsed section ──────────────────────── */}
      {inactiveDebts.length > 0 && (
        <div className="border-t border-gray-100 pt-5">
          <details className="group">
            <summary className="list-none flex items-center justify-between text-xs font-bold text-gray-450 hover:text-gray-700 cursor-pointer py-1 transition-colors select-none">
              <span>Deudas liquidadas / inactivas ({inactiveDebts.length})</span>
              <ArrowRight className="h-4 w-4 transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="space-y-3 mt-4">
              {inactiveDebts.map(debt => (
                <div key={debt.id} className="dash-card opacity-50 p-4 flex items-center justify-between bg-gray-50/50">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 line-through">{debt.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Original: ${debt.monto_original} · Tasa: {debt.tasa_interes_anual}%
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-0.5 rounded-full uppercase tracking-wider">
                    Liquidada
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* ── Fourth Row: Warn banner ───────────────────────────────── */}
      {insufficientDebts.length > 0 && (
        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs text-red-950 font-medium leading-relaxed">
              Con tu excedente actual (<span className="font-bold text-red-800">${totalBudget}</span>), el abono sugerido (<span className="font-bold text-red-800">$0</span>) no cubre los intereses mensuales de esta deuda. Aumenta tu presupuesto mensual para evitar cargos adicionales.
            </p>
          </div>
          <Link
            href="/configuracion"
            className="text-xs font-bold text-red-700 hover:text-red-900 underline underline-offset-2 shrink-0 self-end sm:self-center"
          >
            Ajustar Presupuesto
          </Link>
        </div>
      )}

      {/* ── Payment modal ─────────────────────────────────────────── */}
      <div className={`modal ${isPaymentOpen ? 'modal-open' : ''}`} role="dialog">
        <div className="modal-box bg-white/70 backdrop-blur-md border border-white/40 shadow-2xl p-6 rounded-2xl max-w-sm">
          <h3 className="text-base font-bold text-gray-950">Registrar Pago</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Registra un abono para reducir el saldo restante de la deuda.
          </p>

          <form onSubmit={handlePaymentSubmit} className="mt-5 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="monto" className="text-xs font-bold text-gray-700">
                Monto del Abono
              </label>
              <input
                id="monto"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                disabled={isPending}
                className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none input-ios-focus w-full transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="fecha" className="text-xs font-bold text-gray-700">
                Fecha de Pago
              </label>
              <input
                id="fecha"
                type="date"
                required
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                disabled={isPending}
                className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none input-ios-focus w-full transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="nota" className="text-xs font-bold text-gray-700">
                Nota <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                id="nota"
                type="text"
                placeholder="Ej: Pago extra de mes"
                value={paymentNote}
                onChange={e => setPaymentNote(e.target.value)}
                disabled={isPending}
                className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none input-ios-focus w-full transition-all"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleClosePayment}
                disabled={isPending}
                className="flex-1 h-10 rounded-xl border border-gray-250/50 bg-white/30 text-sm font-semibold text-slate-700 hover:bg-white/60 hover:text-slate-900 transition-all cursor-pointer btn-elastic"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 hover:opacity-95 text-white text-sm font-semibold transition-all cursor-pointer border-none btn-elastic"
              >
                {isPending ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </form>
        </div>

        <div className="modal-backdrop" onClick={handleClosePayment}>
          <button type="button" className="cursor-default">close</button>
        </div>
      </div>

      {/* ── Add Debt modal ─────────────────────────────────────────── */}
      <div className={`modal ${isAddDebtOpen ? 'modal-open' : ''}`} role="dialog">
        <div className="modal-box bg-white/70 backdrop-blur-md border border-white/40 shadow-2xl p-6 rounded-2xl max-w-md">
          <h3 className="text-base font-bold text-gray-950">Nueva Deuda</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Ingresa los datos esenciales para registrar tu crédito.
          </p>

          <form onSubmit={handleAddDebtSubmit} className="mt-5 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new_nombre" className="text-xs font-bold text-gray-700">
                Nombre de la Deuda
              </label>
              <input
                id="new_nombre"
                type="text"
                required
                placeholder="Ej: Tarjeta AMEX"
                value={newDebtName}
                onChange={e => setNewDebtName(e.target.value)}
                disabled={isPending}
                className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new_tipo" className="text-xs font-bold text-gray-700">
                Tipo de Crédito
              </label>
              <select
                id="new_tipo"
                value={newDebtTipo}
                onChange={e => setNewDebtTipo(e.target.value)}
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

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new_monto" className="text-xs font-bold text-gray-700">
                Monto de la Deuda
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">$</span>
                <input
                  id="new_monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={newDebtMonto}
                  onChange={e => setNewDebtMonto(e.target.value)}
                  disabled={isPending}
                  className="pl-7 h-10 rounded-xl border border-gray-250/50 bg-white/40 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new_tasa" className="text-xs font-bold text-gray-700">
                  Tasa Interés Anual (%)
                </label>
                <input
                  id="new_tasa"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newDebtTasa}
                  onChange={e => setNewDebtTasa(e.target.value)}
                  disabled={isPending}
                  className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="new_minimo" className="text-xs font-bold text-gray-700">
                  Pago Mínimo
                </label>
                <input
                  id="new_minimo"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newDebtMinimo}
                  onChange={e => setNewDebtMinimo(e.target.value)}
                  disabled={isPending}
                  className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new_corte" className="text-xs font-bold text-gray-700">
                  Día de Corte (1-31)
                </label>
                <input
                  id="new_corte"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ej: 18"
                  value={newDebtCorte}
                  onChange={e => setNewDebtCorte(e.target.value)}
                  disabled={isPending}
                  className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="new_pago" className="text-xs font-bold text-gray-700">
                  Día de Pago (1-31)
                </label>
                <input
                  id="new_pago"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ej: 10"
                  value={newDebtPago}
                  onChange={e => setNewDebtPago(e.target.value)}
                  disabled={isPending}
                  className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddDebtOpen(false)}
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
                {isPending ? 'Guardando...' : 'Crear Deuda'}
              </button>
            </div>
          </form>
        </div>

        <div className="modal-backdrop" onClick={() => setIsAddDebtOpen(false)}>
          <button type="button" className="cursor-default">close</button>
        </div>
      </div>

    </div>
  );
}
