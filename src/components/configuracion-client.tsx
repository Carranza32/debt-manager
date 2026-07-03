'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { guardarConfiguracion } from '@/app/actions/debts';
import { UserSettings } from '@/types/debt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  Award, 
  Lock,
  User,
  Tags
} from 'lucide-react';

const settingsFormSchema = z.object({
  ingreso_mensual: z.coerce.number().nonnegative('El ingreso mensual no puede ser negativo.').nullable().or(z.literal('')),
  excedente_mensual: z.coerce.number().nonnegative('El excedente mensual no puede ser negativo.').nullable().or(z.literal('')),
  estrategia: z.enum(['avalancha', 'bola_nieve']),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

interface ConfiguracionClientProps {
  settings: UserSettings;
  email: string;
}

export default function ConfiguracionClient({ settings, email }: ConfiguracionClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      ingreso_mensual: settings.ingreso_mensual || '',
      excedente_mensual: settings.excedente_mensual || '',
      estrategia: settings.estrategia || 'avalancha',
    },
  });

  const selectedEstrategia = watch('estrategia');

  const onSubmit = (values: SettingsFormValues) => {
    const formattedValues = {
      ingreso_mensual: values.ingreso_mensual === '' || values.ingreso_mensual === null ? null : Number(values.ingreso_mensual),
      excedente_mensual: values.excedente_mensual === '' || values.excedente_mensual === null ? null : Number(values.excedente_mensual),
      estrategia: values.estrategia,
    };

    startTransition(async () => {
      try {
        await guardarConfiguracion(formattedValues);
        toast.success('Configuración guardada correctamente');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al guardar la configuración');
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-sans">Configuración</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Personaliza tu perfil financiero y tu estrategia de pagos.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="space-y-6 md:col-span-1">
          {/* User Card */}
          <div className="glass-card text-card-foreground shadow-sm rounded-[20px]">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">
                <User className="h-7 w-7 text-slate-650" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Usuario Activo</p>
                <p className="text-xs font-bold text-foreground mt-1 break-all">{email}</p>
              </div>
              <div className="text-[10px] text-slate-500 font-bold uppercase flex justify-center items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-blue-600" />
                <span>Conexión RLS activa</span>
              </div>
            </div>
          </div>

          {/* Manage Categories Card */}
          <div className="glass-card text-card-foreground shadow-sm rounded-[20px]">
            <div className="p-6 pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 font-sans">
                <Tags className="h-4 w-4 text-blue-600" />
                Categorías de Gastos
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1 font-semibold">
                Gestiona las categorías personalizadas de tus consumos.
              </p>
            </div>
            <div className="p-6 pt-0">
              <Link href="/categorias" passHref>
                <Button type="button" className="w-full text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/60 font-bold cursor-pointer rounded-xl h-9 btn-elastic active:scale-95">
                  Gestionar Categorías
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-card text-card-foreground shadow-sm md:col-span-2 rounded-[20px]">
          <div className="p-6">
            <h3 className="text-lg font-bold text-foreground font-sans">Perfil Financiero</h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Define tus montos e ingresos para que la IA y las fórmulas calculen las mejores opciones de pago.
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6 pt-0 space-y-5">
              {/* Ingreso Mensual */}
              <div className="space-y-1.5">
                <Label htmlFor="ingreso_mensual" className="text-zinc-700 font-bold text-xs">Ingreso Neto Mensual</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    id="ingreso_mensual"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={isPending}
                    className="pl-10 h-10 rounded-xl border border-gray-250/50 bg-white/40 pr-3 text-sm text-gray-900 focus:outline-none input-ios-focus w-full transition-all font-medium"
                    {...register('ingreso_mensual')}
                  />
                </div>
                {errors.ingreso_mensual && <p className="text-xs text-red-400 font-bold">{errors.ingreso_mensual.message}</p>}
              </div>

              {/* Excedente Mensual */}
              <div className="space-y-1.5">
                <Label htmlFor="excedente_mensual" className="text-zinc-700 font-bold text-xs">Excedente Mensual Sugerido</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    id="excedente_mensual"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={isPending}
                    className="pl-10 h-10 rounded-xl border border-gray-250/50 bg-white/40 pr-3 text-sm text-gray-900 focus:outline-none input-ios-focus w-full transition-all font-bold"
                    {...register('excedente_mensual')}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal font-bold uppercase tracking-wide">
                  Es el dinero extra (sobre tus gastos fijos) que estás dispuesto a usar exclusivamente para amortizar deudas cada mes.
                </p>
                {errors.excedente_mensual && <p className="text-xs text-red-400 font-bold">{errors.excedente_mensual.message}</p>}
              </div>

              {/* Estrategia Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="estrategia" className="text-zinc-700 font-bold text-xs">Estrategia de Amortización</Label>
                <select 
                  id="estrategia"
                  disabled={isPending}
                  value={selectedEstrategia}
                  onChange={(e) => setValue('estrategia', e.target.value as any, { shouldValidate: true })}
                  className="w-full h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none input-ios-focus transition-all cursor-pointer font-medium"
                >
                  <option value="avalancha">Método Avalancha</option>
                  <option value="bola_nieve">Método Bola de Nieve</option>
                </select>
                {errors.estrategia && <p className="text-xs text-red-400 font-bold">{errors.estrategia.message}</p>}
              </div>

              {/* Explanatory cards */}
              <div className="pt-2">
                {selectedEstrategia === 'avalancha' ? (
                  <div className="text-xs bg-blue-500/5 border border-blue-200/30 p-4 rounded-xl text-blue-700 flex gap-2.5 items-start leading-relaxed">
                    <TrendingUp className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Estrategia Avalancha activa</p>
                      <p className="mt-1 text-slate-550 font-medium">
                        Prioriza las deudas con la **tasa de interés más alta**. Matemáticamente, esta estrategia te ahorra la mayor cantidad de dinero en intereses y reduce el tiempo total de pago.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs bg-emerald-550/5 border border-emerald-550/30 p-4 rounded-xl text-emerald-700 flex gap-2.5 items-start leading-relaxed">
                    <Award className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Estrategia Bola de Nieve activa</p>
                      <p className="mt-1 text-slate-550 font-medium">
                        Prioriza las deudas con el **saldo actual más bajo**. Esta estrategia ofrece victorias psicológicas rápidas al liquidar cuentas completas temprano, lo que te ayuda a mantener la motivación.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 pt-2 border-t border-border flex justify-end">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md cursor-pointer border-none rounded-xl px-5 h-10 transition-all btn-elastic active:scale-95"
              >
                {isPending ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
