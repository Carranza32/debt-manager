'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { actualizarDeuda, eliminarDeuda } from '@/app/actions/debts';
import { Debt } from '@/types/debt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertCircle, Trash2 } from 'lucide-react';

const debtFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio.'),
  tipo: z.enum(['tarjeta_credito', 'prestamo_personal', 'prestamo_auto', 'prestamo_hipotecario', 'otro']),
  monto: z.coerce.number().positive('El monto de la deude debe ser mayor a 0.'),
  tasa_interes_anual: z.coerce.number().nonnegative('La tasa de interés no puede ser negativa.'),
  fecha_corte: z.coerce.number().min(1).max(31).nullable().or(z.literal('')),
  fecha_pago: z.coerce.number().min(1).max(31).nullable().or(z.literal('')),
  pago_minimo: z.coerce.number().nonnegative('El pago mínimo no puede ser negativo.').default(0),
  activa: z.boolean().default(true),
});

type DebtFormValues = z.infer<typeof debtFormSchema>;

interface EditarDeudaClientProps {
  debt: Debt;
}

export default function EditarDeudaClient({ debt }: EditarDeudaClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      nombre: debt.nombre,
      tipo: debt.tipo,
      monto: debt.saldo_actual, // Use current saldo as the primary value
      tasa_interes_anual: debt.tasa_interes_anual,
      fecha_corte: debt.fecha_corte || null,
      fecha_pago: debt.fecha_pago || null,
      pago_minimo: debt.pago_minimo || 0,
      activa: debt.activa,
    },
  });

  const selectedTipo = watch('tipo');
  const cutoffVal = watch('fecha_corte');
  const paymentVal = watch('fecha_pago');
  const activaVal = watch('activa');

  const onSubmit = (values: DebtFormValues) => {
    // Map single 'monto' to both 'monto_original' and 'saldo_actual'
    const formattedValues = {
      nombre: values.nombre,
      tipo: values.tipo,
      monto_original: Number(values.monto),
      saldo_actual: Number(values.monto),
      tasa_interes_anual: Number(values.tasa_interes_anual || 0),
      fecha_corte: values.fecha_corte === '' || values.fecha_corte === null ? null : Number(values.fecha_corte),
      fecha_pago: values.fecha_pago === '' || values.fecha_pago === null ? null : Number(values.fecha_pago),
      pago_minimo: Number(values.pago_minimo || 0),
      activa: values.activa,
    };

    startTransition(async () => {
      try {
        await actualizarDeuda(debt.id, formattedValues);
        toast.success('Deuda actualizada correctamente');
        router.push(`/deudas/${debt.id}`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al actualizar la deuda');
      }
    });
  };

  const handleDelete = () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta deuda? Esta acción cambiará el estado de la deuda a inactiva.')) {
      return;
    }

    startTransition(async () => {
      try {
        await eliminarDeuda(debt.id);
        toast.success('Deuda marcada como inactiva');
        router.push('/deudas');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al eliminar la deuda');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link href={`/deudas/${debt.id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-bold">
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a detalles
        </Link>
        <Button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          variant="ghost"
          className="text-red-500 hover:text-red-400 hover:bg-red-500/10 text-xs flex gap-1.5 items-center cursor-pointer rounded-xl h-9"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar Deuda
        </Button>
      </div>

      <div className="glass-card text-card-foreground shadow-xl rounded-[20px]">
        <div className="p-6 pb-2">
          <h3 className="text-xl font-bold text-foreground">Editar Deuda: {debt.nombre}</h3>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Modifica los detalles esenciales del crédito seleccionado.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 pt-2 space-y-4">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label htmlFor="nombre" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Nombre de la Deuda</Label>
              <Input
                id="nombre"
                placeholder="Ej: Tarjeta Visa Oro"
                disabled={isPending}
                className="border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm"
                {...register('nombre')}
              />
              {errors.nombre && <p className="text-xs text-red-400 font-bold">{errors.nombre.message}</p>}
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label htmlFor="tipo" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Tipo de Crédito</Label>
              <Select 
                disabled={isPending}
                value={selectedTipo}
                onValueChange={(val) => setValue('tipo', val as any, { shouldValidate: true })}
              >
                <SelectTrigger className="border border-input bg-background text-foreground rounded-xl h-10 px-3">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent className="border border-zinc-200 dark:border-zinc-850 bg-card text-foreground rounded-xl">
                  <SelectItem value="tarjeta_credito" className="cursor-pointer text-xs">Tarjeta de Crédito</SelectItem>
                  <SelectItem value="prestamo_personal" className="cursor-pointer text-xs">Préstamo Personal</SelectItem>
                  <SelectItem value="prestamo_auto" className="cursor-pointer text-xs">Crédito Vehicular</SelectItem>
                  <SelectItem value="prestamo_hipotecario" className="cursor-pointer text-xs">Crédito Hipotecario</SelectItem>
                  <SelectItem value="otro" className="cursor-pointer text-xs">Otro tipo de deuda</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo && <p className="text-xs text-red-400 font-bold">{errors.tipo.message}</p>}
            </div>

            {/* Monto de la Deuda */}
            <div className="space-y-1.5">
              <Label htmlFor="monto" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Monto de la Deuda</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-bold">$</span>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  disabled={isPending}
                  className="pl-7 border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm font-bold"
                  {...register('monto')}
                />
              </div>
              {errors.monto && <p className="text-xs text-red-400 font-bold">{errors.monto.message}</p>}
            </div>

            {/* Tasa Interes & Pago Mínimo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tasa_interes_anual" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Tasa Interés Anual (%)</Label>
                <Input
                  id="tasa_interes_anual"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  disabled={isPending}
                  className="border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm"
                  {...register('tasa_interes_anual')}
                />
                {errors.tasa_interes_anual && <p className="text-xs text-red-400 font-bold">{errors.tasa_interes_anual.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pago_minimo" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Pago Mínimo Sugerido</Label>
                <Input
                  id="pago_minimo"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  disabled={isPending}
                  className="border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm"
                  {...register('pago_minimo')}
                />
                {errors.pago_minimo && <p className="text-xs text-red-400 font-bold">{errors.pago_minimo.message}</p>}
              </div>
            </div>

            {/* Fechas de corte y de pago */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fecha_corte" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Día de Corte (1-31)</Label>
                <Input
                  id="fecha_corte"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ej: 15"
                  disabled={isPending}
                  defaultValue={debt.fecha_corte || ''}
                  className="border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm"
                  onChange={(e) => {
                    const val = e.target.value;
                    setValue('fecha_corte', val === '' ? '' : Number(val), { shouldValidate: true });
                  }}
                />
                {errors.fecha_corte && <p className="text-xs text-red-400 font-bold">{errors.fecha_corte.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fecha_pago" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Día de Pago (1-31)</Label>
                <Input
                  id="fecha_pago"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ej: 5"
                  disabled={isPending}
                  defaultValue={debt.fecha_pago || ''}
                  className="border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm"
                  onChange={(e) => {
                    const val = e.target.value;
                    setValue('fecha_pago', val === '' ? '' : Number(val), { shouldValidate: true });
                  }}
                />
                {errors.fecha_pago && <p className="text-xs text-red-400 font-bold">{errors.fecha_pago.message}</p>}
              </div>
            </div>

            {/* Activa Switch */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="activa" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Deuda Activa</Label>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Determina si la deuda entra en los cálculos y proyecciones.</p>
              </div>
              <input
                id="activa"
                type="checkbox"
                checked={activaVal}
                onChange={(e) => setValue('activa', e.target.checked, { shouldValidate: true })}
                disabled={isPending}
                className="h-4 w-4 rounded border-border bg-background focus:ring-primary accent-primary"
              />
            </div>

            {/* Warnings on day 31 */}
            {(cutoffVal === 31 || paymentVal === 31) && (
              <div className="text-xs bg-amber-500/5 border border-amber-500/25 p-3.5 rounded-xl text-amber-700 dark:text-amber-300 flex gap-2 items-start mt-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-semibold">
                  Has puesto día 31 en una de las fechas. Ten en cuenta que algunos meses no tienen día 31, por lo que el sistema ajustará automáticamente el cobro al último día del mes en esos casos.
                </p>
              </div>
            )}
          </div>
          <div className="p-6 pt-2 border-t border-border flex justify-end gap-2 bg-zinc-100/5 dark:bg-zinc-950/15 rounded-b-[20px]">
            <Link href={`/deudas/${debt.id}`} passHref>
              <Button type="button" variant="ghost" disabled={isPending} className="text-muted-foreground hover:text-foreground cursor-pointer rounded-xl">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary text-primary-foreground hover:opacity-90 font-semibold cursor-pointer rounded-xl px-5 h-10 transition-all"
            >
              {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
