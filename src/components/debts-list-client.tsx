'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { crearDeuda, registrarPago } from '@/app/actions/debts';
import { Debt, DebtType } from '@/types/debt';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { 
  Plus, 
  Search, 
  CreditCard as CardIcon, 
  FileText, 
  Car, 
  Home as HomeIcon, 
  CircleDot, 
  ChevronRight,
  AlertCircle,
  Calendar
} from 'lucide-react';

const DEBT_TYPES: Record<DebtType, { label: string; icon: any; color: string }> = {
  tarjeta_credito: { label: 'Tarjeta de Crédito', icon: CardIcon, color: 'text-pink-600 bg-pink-500/10 border-pink-500/20 dark:text-pink-400' },
  prestamo_personal: { label: 'Préstamo Personal', icon: FileText, color: 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400' },
  prestamo_auto: { label: 'Crédito Vehicular', icon: Car, color: 'text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-400' },
  prestamo_hipotecario: { label: 'Crédito Hipotecario', icon: HomeIcon, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400' },
  otro: { label: 'Otro', icon: CircleDot, color: 'text-purple-600 bg-purple-500/10 border-purple-500/20 dark:text-purple-400' },
};

interface DebtsListClientProps {
  debts: Debt[];
}

export default function DebtsListClient({ debts }: DebtsListClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Quick Payment modal states
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForPayment || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Por favor, ingresa un monto de pago válido.');
      return;
    }

    startTransition(async () => {
      try {
        await registrarPago(
          selectedDebtForPayment.id,
          Number(paymentAmount),
          paymentDate,
          paymentNote || null
        );
        toast.success('Pago registrado correctamente');
        setSelectedDebtForPayment(null);
        setPaymentAmount('');
        setPaymentNote('');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al registrar el pago');
      }
    });
  };

  // Add Debt Modal States
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtTipo, setNewDebtTipo] = useState('tarjeta_credito');
  const [newDebtMonto, setNewDebtMonto] = useState('');
  const [newDebtTasa, setNewDebtTasa] = useState('');
  const [newDebtMinimo, setNewDebtMinimo] = useState('');
  const [newDebtCorte, setNewDebtCorte] = useState('');
  const [newDebtPago, setNewDebtPago] = useState('');

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


  // Filter logic
  const filteredDebts = debts.filter(debt => {
    // Status filter
    if (statusFilter === 'active' && (!debt.activa || debt.saldo_actual <= 0)) return false;
    if (statusFilter === 'inactive' && debt.activa && debt.saldo_actual > 0) return false;

    // Type filter
    if (typeFilter !== 'all' && debt.tipo !== typeFilter) return false;

    // Search filter
    if (searchTerm && !debt.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return false;

    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-sans">Mis Deudas</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Administra tus créditos y revisa su estado actual.
          </p>
        </div>
        <Button 
          onClick={() => setIsAddDebtOpen(true)}
          className="bg-blue-600 text-white hover:bg-blue-700 hover:opacity-95 font-bold shadow-md cursor-pointer rounded-xl px-5 h-10 transition-all flex items-center gap-1.5 border-none btn-elastic active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Nueva Deuda
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between glass-card p-4 rounded-[20px] shadow-sm">
        {/* Status Tabs */}
        <div className="bg-gray-100 p-1.5 rounded-full flex gap-1 items-center border border-gray-200/50 w-full md:w-auto overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap min-w-[100px] btn-elastic active:scale-95 ${
              statusFilter === 'active'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 bg-transparent'
            }`}
          >
            Activas
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap min-w-[100px] btn-elastic active:scale-95 ${
              statusFilter === 'inactive'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 bg-transparent'
            }`}
          >
            Liquidadas
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap min-w-[100px] btn-elastic active:scale-95 ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 bg-transparent'
            }`}
          >
            Todas
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 rounded-xl border border-input bg-background py-2 pl-10 pr-4 text-xs text-foreground placeholder-zinc-450 focus:outline-none input-ios-focus transition-all"
            />
          </div>

          {/* Type Select */}
          <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || 'all')}>
            <SelectTrigger className="border border-input bg-background text-xs w-full sm:w-48 text-foreground rounded-xl h-10 px-3 input-ios-focus">
              <SelectValue placeholder="Tipo de deuda" />
            </SelectTrigger>
            <SelectContent className="border border-zinc-200 dark:border-zinc-850 bg-card text-foreground rounded-xl">
              <SelectItem value="all" className="text-xs cursor-pointer">Todos los tipos</SelectItem>
              <SelectItem value="tarjeta_credito" className="text-xs cursor-pointer">Tarjeta de Crédito</SelectItem>
              <SelectItem value="prestamo_personal" className="text-xs cursor-pointer">Préstamo Personal</SelectItem>
              <SelectItem value="prestamo_auto" className="text-xs cursor-pointer">Crédito Vehicular</SelectItem>
              <SelectItem value="prestamo_hipotecario" className="text-xs cursor-pointer">Crédito Hipotecario</SelectItem>
              <SelectItem value="otro" className="text-xs cursor-pointer">Otro tipo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDebts.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <AlertCircle className="h-8 w-8 text-zinc-400 dark:text-zinc-650 mx-auto mb-3" />
            <p className="text-sm font-bold text-foreground">No se encontraron deudas</p>
            <p className="text-xs text-muted-foreground mt-1">Intenta ajustando los filtros o el buscador.</p>
          </div>
        ) : (
          filteredDebts.map(debt => {
            const typeInfo = DEBT_TYPES[debt.tipo] || DEBT_TYPES.otro;
            const Icon = typeInfo.icon;
            
            // Calculate repayment progress percentage
            const percentagePaid = debt.monto_original > 0 
              ? Math.max(0, Math.min(100, Math.round(((debt.monto_original - debt.saldo_actual) / debt.monto_original) * 100))) 
              : 0;

            const isDebtLiquidated = debt.saldo_actual <= 0 || !debt.activa;

            return (
              <div 
                key={debt.id} 
                className="bg-white/80 backdrop-blur-md border border-white/50 shadow-md hover:shadow-xl hover:scale-[1.01] transition-all duration-300 group relative overflow-hidden flex flex-col justify-between rounded-2xl"
              >
                <div className="p-6 space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${typeInfo.color}`}>
                      <Icon className="h-3 w-3" />
                      {typeInfo.label}
                    </span>
                    {isDebtLiquidated ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider">
                        Liquidada
                      </Badge>
                    ) : debt.fecha_pago ? (
                      <span className="inline-flex items-center gap-1 text-[9px] text-slate-500 font-bold bg-slate-100/50 px-2 py-0.5 rounded-md border border-slate-200/40">
                        <Calendar className="h-2.5 w-2.5 text-slate-400" />
                        Pago: Día {debt.fecha_pago}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <Link href={`/deudas/${debt.id}`} className="text-lg font-black text-slate-900 hover:text-blue-600 transition-colors block truncate font-sans">
                      {debt.nombre}
                    </Link>
                    <p className="text-xs text-slate-455 font-bold">Tasa de interés: {debt.tasa_interes_anual}%</p>
                  </div>

                  {/* Horizontal visual progress bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-700">
                      <span>Progreso de Pago</span>
                      <span className="text-blue-600 font-extrabold">{percentagePaid}%</span>
                    </div>
                    <div className="w-full bg-gray-200/40 rounded-full h-2 overflow-hidden border border-gray-200/10">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentagePaid}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Pagado: ${(debt.monto_original - debt.saldo_actual).toLocaleString('es-SV', { minimumFractionDigits: 2 })}</span>
                      <span>Restante: ${debt.saldo_actual.toLocaleString('es-SV', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-zinc-200/50 pt-3">
                    <div>
                      <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Saldo actual</p>
                      <p className="text-base font-black text-slate-900 mt-0.5">
                        ${debt.saldo_actual.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Monto original</p>
                      <p className="text-sm font-semibold text-slate-500 mt-0.5">
                        ${debt.monto_original.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-200/40 bg-slate-50/20 px-6 py-4 flex items-center justify-between gap-2">
                  <div className="flex gap-3">
                    <Link href={`/deudas/${debt.id}?editar=true`} className="text-xs font-bold text-slate-500 hover:text-slate-950 transition-colors select-none">
                      Editar
                    </Link>
                    <Link href={`/deudas/${debt.id}`} className="text-xs font-bold text-slate-500 hover:text-slate-950 transition-colors select-none">
                      Detalles
                    </Link>
                  </div>
                  {!isDebtLiquidated && (
                    <button
                      type="button"
                      onClick={() => setSelectedDebtForPayment(debt)}
                      className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all border-none select-none"
                    >
                      Abonar Pago
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Add Debt modal ─────────────────────────────────────────── */}
      <div className={`modal ${isAddDebtOpen ? 'modal-open' : ''}`} role="dialog">
        <div className="modal-box bg-white/70 backdrop-blur-md border border-white/40 shadow-2xl p-6 rounded-2xl">
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

      {/* ── Frosted Quick Payment modal ─────────────────────────────────────────── */}
      <div className={`modal ${selectedDebtForPayment ? 'modal-open' : ''}`} role="dialog">
        <div className="modal-box bg-white/70 backdrop-blur-md border border-white/40 shadow-2xl p-6 rounded-2xl max-w-sm">
          <h3 className="text-lg font-bold text-gray-950">Registrar Pago a Deuda</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Registra un abono para reducir el saldo restante de <strong>{selectedDebtForPayment?.nombre}</strong>.
          </p>
          <form onSubmit={handlePaymentSubmit} className="mt-5 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal_pay_monto" className="text-xs font-bold text-gray-700">Monto del Abono</label>
              <input
                id="modal_pay_monto"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={isPending}
                className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal_pay_fecha" className="text-xs font-bold text-gray-700">Fecha de Pago</label>
              <input
                id="modal_pay_fecha"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={isPending}
                className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal_pay_nota" className="text-xs font-bold text-gray-700">Nota (Opcional)</label>
              <input
                id="modal_pay_nota"
                type="text"
                placeholder="Ej: Abono quincenal"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                disabled={isPending}
                className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDebtForPayment(null)}
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
                Confirmar
              </button>
            </div>
          </form>
        </div>
        <div className="modal-backdrop" onClick={() => setSelectedDebtForPayment(null)}>
          <button type="button" className="cursor-default">close</button>
        </div>
      </div>
    </div>
  );
}
