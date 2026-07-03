'use client';

import React, { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { crearGasto, crearGastoConItems } from '@/app/actions/expenses';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  Trash2, 
  Sparkles, 
  Check,
  FileText
} from 'lucide-react';
import CategoryIcon from '@/components/category-icon';
import SelectorTicket from '@/components/selector-ticket';

const expenseFormSchema = z.object({
  comercio: z.string().min(1, 'El comercio es obligatorio.'),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0.'),
  fecha: z.string().min(1, 'La fecha es obligatoria.'),
  categoria_id: z.string().nullable().or(z.literal('')),
  nota: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface NuevoGastoClientProps {
  categories: any[];
  frequentMerchants: string[];
  merchantCategoriesMap?: Record<string, string>;
}

export default function NuevoGastoClient({ 
  categories, 
  frequentMerchants,
  merchantCategoriesMap = {}
}: NuevoGastoClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showNote, setShowNote] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // OCR state
  const [ocrData, setOcrData] = useState<any | null>(null);
  const [ocrImageUrl, setOcrImageUrl] = useState<string | null>(null);
  const [ocrComercio, setOcrComercio] = useState('');
  const [ocrMonto, setOcrMonto] = useState('');
  const [ocrFecha, setOcrFecha] = useState('');
  const [ocrProductos, setOcrProductos] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      comercio: '',
      monto: '' as any,
      fecha: new Date().toISOString().split('T')[0],
      categoria_id: null,
      nota: '',
    },
  });

  const selectCategory = (id: string) => {
    setSelectedCategory(id);
    setValue('categoria_id', id, { shouldValidate: true });
  };

  const onSubmit = (values: any) => {
    if (!selectedCategory) {
      toast.error('Por favor, selecciona una categoría.');
      return;
    }

    startTransition(async () => {
      try {
        await crearGasto({
          comercio: values.comercio,
          monto: Number(values.monto),
          fecha: values.fecha,
          categoria_id: selectedCategory,
          nota: values.nota || null,
          fuente: 'manual',
        });
        
        toast.success('Gasto registrado con éxito');
        
        // Reset form
        reset({
          comercio: '',
          monto: '' as any,
          fecha: new Date().toISOString().split('T')[0],
          categoria_id: null,
          nota: '',
        });
        setSelectedCategory(null);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al guardar el gasto');
      }
    });
  };

  // OCR success handler
  const handleOcrSuccess = (data: any, imageUrl: string) => {
    setOcrData(data);
    setOcrImageUrl(imageUrl);
    setOcrComercio(data.comercio || '');
    setOcrMonto(data.monto_total ? String(data.monto_total) : '');
    setOcrFecha(data.fecha || new Date().toISOString().split('T')[0]);
    setOcrProductos(data.productos || []);

    // Try auto-selecting category based on merchant mapping
    if (data.comercio) {
      const cleanMerchant = data.comercio.trim().toLowerCase();
      const matchedCatId = merchantCategoriesMap[cleanMerchant];
      if (matchedCatId) {
        setSelectedCategory(matchedCatId);
      } else {
        setSelectedCategory(null);
      }
    }
  };

  // Trigger category prediction when editing merchant name in OCR mode
  const handleOcrComercioChange = (val: string) => {
    setOcrComercio(val);
    const cleanMerchant = val.trim().toLowerCase();
    const matchedCatId = merchantCategoriesMap[cleanMerchant];
    if (matchedCatId) {
      setSelectedCategory(matchedCatId);
    }
  };

  // OCR products helpers
  const handleProductChange = (index: number, field: string, value: any) => {
    const updated = [...ocrProductos];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    // If quantity or unit price changes, update total
    if (field === 'cantidad' || field === 'precio_unitario') {
      const q = Number(updated[index].cantidad || 0);
      const p = Number(updated[index].precio_unitario || 0);
      updated[index].precio_total = Number((q * p).toFixed(2));
    }

    setOcrProductos(updated);

    // Recalculate total sum
    const totalSum = updated.reduce((sum, item) => sum + Number(item.precio_total || 0), 0);
    if (totalSum > 0) {
      setOcrMonto(String(totalSum.toFixed(2)));
    }
  };

  const handleRemoveProduct = (index: number) => {
    const updated = ocrProductos.filter((_, idx) => idx !== index);
    setOcrProductos(updated);

    // Recalculate total sum
    const totalSum = updated.reduce((sum, item) => sum + Number(item.precio_total || 0), 0);
    setOcrMonto(String(totalSum.toFixed(2)));
  };

  const handleAddProduct = () => {
    setOcrProductos([
      ...ocrProductos,
      { nombre: '', cantidad: 1, precio_unitario: 0, precio_total: 0 }
    ]);
  };

  const handleConfirmOcr = () => {
    if (!ocrComercio.trim()) {
      toast.error('El nombre del comercio es obligatorio.');
      return;
    }
    if (!ocrMonto || Number(ocrMonto) <= 0) {
      toast.error('El monto total debe ser mayor a 0.');
      return;
    }
    if (!selectedCategory) {
      toast.error('Por favor, selecciona una categoría.');
      return;
    }

    startTransition(async () => {
      try {
        await crearGastoConItems(
          {
            comercio: ocrComercio,
            monto: Number(ocrMonto),
            fecha: ocrFecha,
            categoria_id: selectedCategory,
            ticket_imagen_url: ocrImageUrl,
            nota: 'Procesado con OCR de IA',
            fuente: 'ocr_ticket',
          },
          ocrProductos.map(p => ({
            nombre: p.nombre || 'Producto',
            cantidad: Number(p.cantidad || 1),
            precio_unitario: p.precio_unitario ? Number(p.precio_unitario) : null,
            precio_total: p.precio_total ? Number(p.precio_total) : null,
          }))
        );

        toast.success('Ticket guardado correctamente ✨');
        // Clear OCR state and return to manual
        setOcrData(null);
        setOcrImageUrl(null);
        setSelectedCategory(null);
        router.push('/gastos');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al guardar el ticket');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/gastos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-bold">
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a gastos
        </Link>
      </div>

      {/* OCR MODE PREVIEW PANEL */}
      {ocrData ? (
        <div className="glass-card text-card-foreground shadow-2xl relative rounded-[20px]">
          <div className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                Revisión de Ticket por IA
              </h3>
              <Badge className={`capitalize py-0.5 px-2.5 text-[10px] font-bold border rounded-full ${
                ocrData.confianza === 'alta' 
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : ocrData.confianza === 'media'
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  : 'bg-red-500/10 text-red-600 border-red-500/20'
              }`}>
                Confianza: {ocrData.confianza}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Verifica y corrige la información leída antes de registrar el gasto.
            </p>
          </div>
          
          <div className="p-6 pt-2 space-y-5">
            {/* Visual Mini ticket reference */}
            {ocrImageUrl && (
              <div className="flex items-center gap-3 bg-zinc-100/50 dark:bg-zinc-950/40 p-2.5 rounded-xl border border-border">
                <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-border bg-card flex items-center justify-center">
                  <FileText className="h-6 w-6 text-zinc-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Archivo Adjunto</p>
                  <p className="text-xs text-foreground truncate mt-0.5 font-bold">Ticket almacenado en Storage</p>
                  <a href={ocrImageUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline mt-0.5 block font-bold">
                    Ver imagen original
                  </a>
                </div>
              </div>
            )}

            {/* Confidence Alert */}
            {ocrData.confianza === 'baja' && (
              <div className="text-xs bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-xl text-amber-700 dark:text-amber-300 flex gap-2.5 items-start font-medium">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900 dark:text-white">Confianza del escaneo baja</p>
                  <p className="mt-0.5 text-amber-600/80 dark:text-amber-400/85">
                    La imagen podría estar borrosa o el ticket tiene un formato inusual. Por favor, revisa todos los montos y nombres de producto con detenimiento.
                  </p>
                </div>
              </div>
            )}

            {/* Basic Info (Comercio, Total, Fecha) */}
            <div className="space-y-3.5 border-b border-border pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label htmlFor="ocr-comercio" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Comercio</Label>
                  <Input
                    id="ocr-comercio"
                    value={ocrComercio}
                    onChange={(e) => handleOcrComercioChange(e.target.value)}
                    disabled={isPending}
                    className="border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm font-bold"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="ocr-monto" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Monto Total</Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-bold">$</span>
                    <Input
                      id="ocr-monto"
                      type="number"
                      step="0.01"
                      value={ocrMonto}
                      onChange={(e) => setOcrMonto(e.target.value)}
                      disabled={isPending}
                      className="pl-8 border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="ocr-fecha" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Fecha</Label>
                  <Input
                    id="ocr-fecha"
                    type="date"
                    value={ocrFecha}
                    onChange={(e) => setOcrFecha(e.target.value)}
                    disabled={isPending}
                    className="border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Category selection */}
            <div className="space-y-2.5 border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Categoría del Gasto</Label>
                {selectedCategory && (
                  <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
                    <Check className="h-3.5 w-3.5" />
                    Asociación automática
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      disabled={isPending}
                      style={{
                        borderColor: isSelected ? cat.color : 'var(--border)',
                        backgroundColor: isSelected ? `${cat.color}15` : 'transparent',
                      }}
                      className="flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all hover:bg-zinc-150 dark:hover:bg-zinc-800/35 cursor-pointer"
                    >
                      <div
                        style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5"
                      >
                        <CategoryIcon name={cat.icono} className="h-4 w-4" />
                      </div>
                      <span className="font-semibold text-foreground truncate">{cat.nombre}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products / Items list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Desglose de Artículos (Opcional)</Label>
                <Button
                  type="button"
                  onClick={handleAddProduct}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary hover:text-primary hover:bg-primary/5 h-7 py-0 px-2 rounded-xl cursor-pointer"
                >
                  <Plus className="mr-0.5 h-3.5 w-3.5" />
                  Agregar item
                </Button>
              </div>

              {ocrProductos.length === 0 ? (
                <div className="text-center py-4 border border-border rounded-xl bg-zinc-100/30 dark:bg-zinc-950/15 text-xs text-muted-foreground font-semibold">
                  No se leyeron artículos individuales.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 border border-border p-2.5 rounded-xl bg-zinc-100/20 dark:bg-zinc-950/10">
                  {ocrProductos.map((p, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      {/* Name */}
                      <Input
                        value={p.nombre}
                        onChange={(e) => handleProductChange(idx, 'nombre', e.target.value)}
                        placeholder="Nombre producto"
                        disabled={isPending}
                        className="text-xs border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 flex-1 min-w-0"
                      />
                      {/* Qty */}
                      <Input
                        type="number"
                        value={p.cantidad}
                        onChange={(e) => handleProductChange(idx, 'cantidad', Number(e.target.value))}
                        placeholder="Cant"
                        disabled={isPending}
                        className="text-xs border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 w-12 text-center"
                      />
                      {/* Total */}
                      <div className="relative w-20 shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px] font-bold">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={p.precio_total}
                          onChange={(e) => handleProductChange(idx, 'precio_total', Number(e.target.value))}
                          placeholder="Total"
                          disabled={isPending}
                          className="pl-5 text-xs border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-right font-bold"
                        />
                      </div>
                      {/* Trash */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProduct(idx)}
                        disabled={isPending}
                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 pt-2 border-t border-border flex justify-between bg-zinc-100/5 dark:bg-zinc-950/15 rounded-b-[20px]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOcrData(null);
                setOcrImageUrl(null);
              }}
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground cursor-pointer rounded-xl"
            >
              Cancelar y volver
            </Button>
            <Button
              type="button"
              onClick={handleConfirmOcr}
              disabled={isPending}
              className="bg-primary text-primary-foreground hover:opacity-90 font-semibold cursor-pointer rounded-xl px-5 h-10 transition-all"
            >
              {isPending ? 'Guardando...' : 'Guardar en Gastos'}
            </Button>
          </div>
        </div>
      ) : (
        /* MANUAL INPUT FORM */
        <div className="glass-card text-card-foreground shadow-xl rounded-[20px]">
          <div className="p-6 pb-2">
            <h3 className="text-xl font-bold text-foreground">Nuevo Gasto</h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Registra tu egreso manual o escanea una foto de tu ticket.
            </p>
          </div>
          <div className="p-6 pt-2 space-y-4">
            {/* Camera/OCR upload element */}
            <SelectorTicket onSuccess={handleOcrSuccess} />

            <div className="flex items-center justify-between my-2">
              <span className="w-full border-b border-border" />
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-3 shrink-0">O ingresar manualmente</span>
              <span className="w-full border-b border-border" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
              {/* Monto */}
              <div className="space-y-1.5">
                <Label htmlFor="monto" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Monto</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-lg font-bold">$</span>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    disabled={isPending}
                    className="pl-8 text-xl font-bold border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2"
                    {...register('monto')}
                  />
                </div>
                {errors.monto && <p className="text-xs text-red-400 font-bold">{errors.monto.message}</p>}
              </div>

              {/* Comercio con Datalist Autocomplete */}
              <div className="space-y-1.5">
                <Label htmlFor="comercio" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Comercio / Lugar</Label>
                <Input
                  id="comercio"
                  list="merchants"
                  placeholder="Ej: Super Selectos"
                  disabled={isPending}
                  className="border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm"
                  {...register('comercio')}
                />
                <datalist id="merchants">
                  {frequentMerchants.map((merchant) => (
                    <option key={merchant} value={merchant} />
                  ))}
                </datalist>
                {errors.comercio && <p className="text-xs text-red-400 font-bold">{errors.comercio.message}</p>}
              </div>

              {/* Categorías (Chips Grid) */}
              <div className="space-y-2.5">
                <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Categoría</Label>
                <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => selectCategory(cat.id)}
                        disabled={isPending}
                        style={{
                          borderColor: isSelected ? cat.color : 'var(--border)',
                          backgroundColor: isSelected ? `${cat.color}15` : 'transparent',
                        }}
                        className="flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all hover:bg-zinc-150 dark:hover:bg-zinc-800/35 cursor-pointer animate-none"
                      >
                        <div
                          style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5"
                        >
                          <CategoryIcon name={cat.icono} className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-foreground truncate">{cat.nombre}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.categoria_id && <p className="text-xs text-red-400 font-bold">Selecciona una categoría</p>}
              </div>

              {/* Fecha */}
              <div className="space-y-1.5">
                <Label htmlFor="fecha" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Fecha de Gasto</Label>
                <Input
                  id="fecha"
                  type="date"
                  disabled={isPending}
                  className="border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm"
                  {...register('fecha')}
                />
                {errors.fecha && <p className="text-xs text-red-400 font-bold">{errors.fecha.message}</p>}
              </div>

              {/* Nota colapsable */}
              <div className="space-y-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowNote(!showNote)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer font-bold"
                >
                  {showNote ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showNote ? 'Ocultar nota' : 'Agregar nota (Opcional)'}
                </button>
                
                {showNote && (
                  <div className="space-y-1.5">
                    <Input
                      id="nota"
                      placeholder="Ej: Compras para almuerzo de la semana"
                      disabled={isPending}
                      className="border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm"
                      {...register('nota')}
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 flex justify-end gap-2 bg-zinc-950/5 rounded-b-[20px]">
                <Link href="/gastos" passHref>
                  <Button type="button" variant="ghost" disabled={isPending} className="text-muted-foreground hover:text-foreground cursor-pointer rounded-xl">
                    Ver Gastos
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-primary text-primary-foreground hover:opacity-90 font-semibold cursor-pointer rounded-xl px-5 h-10 transition-all"
                >
                  {isPending ? 'Guardando...' : 'Registrar Gasto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
