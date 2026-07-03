'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { eliminarGasto, crearGasto, crearGastoConItems } from '@/app/actions/expenses';
import { definirPresupuesto } from '@/app/actions/budgets';
import { UserSettings } from '@/types/debt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import SelectorTicket from '@/components/selector-ticket';


import { 
  Plus, 
  Search, 
  Calendar, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  Receipt,
  PieChartIcon,
  PiggyBank,
  ChevronRight,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  Check
} from 'lucide-react';
import CategoryIcon from '@/components/category-icon';

interface GastosClientProps {
  initialExpenses: any[];
  prevExpenses: any[];
  categories: any[];
  budgetProgress: any[];
  settings: UserSettings;
  currentMonth: number;
  currentYear: number;
  frequentMerchants?: string[];
  merchantCategoriesMap?: Record<string, string>;
}

export default function GastosClient({
  initialExpenses,
  prevExpenses,
  categories,
  budgetProgress,
  settings,
  currentMonth,
  currentYear,
  frequentMerchants = [],
  merchantCategoriesMap = {},
}: GastosClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Tabs state
  const [activeTab, setActiveTab] = useState<'historial' | 'analisis' | 'presupuestos'>('analisis');

  // Budget dialog state
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState<any | null>(null);
  const [budgetLimit, setBudgetLimit] = useState('');

  // Add Expense Modal States
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseComercio, setExpenseComercio] = useState('');
  const [expenseMonto, setExpenseMonto] = useState('');
  const [expenseFecha, setExpenseFecha] = useState(new Date().toISOString().split('T')[0]);
  const [expenseCategory, setExpenseCategory] = useState<string | null>(null);
  const [expenseNota, setExpenseNota] = useState('');
  const [showNote, setShowNote] = useState(false);

  // OCR States for inline modal
  const [ocrData, setOcrData] = useState<any | null>(null);
  const [ocrImageUrl, setOcrImageUrl] = useState<string | null>(null);
  const [ocrComercio, setOcrComercio] = useState('');
  const [ocrMonto, setOcrMonto] = useState('');
  const [ocrFecha, setOcrFecha] = useState('');
  const [ocrProductos, setOcrProductos] = useState<any[]>([]);

  const handleOcrSuccess = (data: any, imageUrl: string) => {
    setOcrData(data);
    setOcrImageUrl(imageUrl);
    setOcrComercio(data.comercio || '');
    setOcrMonto(data.monto_total ? String(data.monto_total) : '');
    setOcrFecha(data.fecha || new Date().toISOString().split('T')[0]);
    setOcrProductos(data.productos || []);

    // Autoselect category based on merchant mapping
    if (data.comercio) {
      const cleanMerchant = data.comercio.trim().toLowerCase();
      const matchedCatId = merchantCategoriesMap[cleanMerchant];
      if (matchedCatId) {
        setExpenseCategory(matchedCatId);
      } else {
        setExpenseCategory(null);
      }
    }
  };

  const handleOcrComercioChange = (val: string) => {
    setOcrComercio(val);
    const cleanMerchant = val.trim().toLowerCase();
    const matchedCatId = merchantCategoriesMap[cleanMerchant];
    if (matchedCatId) {
      setExpenseCategory(matchedCatId);
    }
  };

  const handleProductChange = (index: number, field: string, value: any) => {
    const updated = [...ocrProductos];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    if (field === 'cantidad' || field === 'precio_unitario') {
      const q = Number(updated[index].cantidad || 0);
      const p = Number(updated[index].precio_unitario || 0);
      updated[index].precio_total = Number((q * p).toFixed(2));
    }

    setOcrProductos(updated);

    const totalSum = updated.reduce((sum, item) => sum + Number(item.precio_total || 0), 0);
    if (totalSum > 0) {
      setOcrMonto(String(totalSum.toFixed(2)));
    }
  };

  const handleRemoveProduct = (index: number) => {
    const updated = ocrProductos.filter((_, idx) => idx !== index);
    setOcrProductos(updated);

    const totalSum = updated.reduce((sum, item) => sum + Number(item.precio_total || 0), 0);
    setOcrMonto(String(totalSum.toFixed(2)));
  };

  const handleAddProduct = () => {
    setOcrProductos([
      ...ocrProductos,
      { nombre: '', cantidad: 1, precio_unitario: 0, precio_total: 0 }
    ]);
  };

  const handleConfirmOcr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ocrComercio.trim()) {
      toast.error('El nombre del comercio es obligatorio.');
      return;
    }
    if (!ocrMonto || Number(ocrMonto) <= 0) {
      toast.error('El monto total debe ser mayor a 0.');
      return;
    }
    if (!expenseCategory) {
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
            categoria_id: expenseCategory,
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
        setIsAddExpenseOpen(false);
        // Clear
        setOcrData(null);
        setOcrImageUrl(null);
        setExpenseCategory(null);
        setOcrProductos([]);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al guardar el ticket');
      }
    });
  };

  const handleComercioChange = (val: string) => {
    setExpenseComercio(val);
    const cleanMerchant = val.trim().toLowerCase();
    const matchedCatId = merchantCategoriesMap[cleanMerchant];
    if (matchedCatId) {
      setExpenseCategory(matchedCatId);
    }
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseComercio || !expenseMonto || Number(expenseMonto) <= 0) {
      toast.error('Por favor, ingresa los datos esenciales del gasto.');
      return;
    }
    if (!expenseCategory) {
      toast.error('Por favor, selecciona una categoría.');
      return;
    }

    startTransition(async () => {
      try {
        await crearGasto({
          comercio: expenseComercio,
          monto: Number(expenseMonto),
          fecha: expenseFecha,
          categoria_id: expenseCategory,
          nota: expenseNota || null,
          fuente: 'manual',
        });
        
        toast.success('Gasto registrado con éxito');
        setIsAddExpenseOpen(false);
        // Reset
        setExpenseComercio('');
        setExpenseMonto('');
        setExpenseFecha(new Date().toISOString().split('T')[0]);
        setExpenseCategory(null);
        setExpenseNota('');
        setShowNote(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al guardar el gasto');
      }
    });
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('nuevo') === 'true' || params.get('add-expense') === 'true') {
        setIsAddExpenseOpen(true);
        const url = new URL(window.location.href);
        url.searchParams.delete('nuevo');
        url.searchParams.delete('add-expense');
        window.history.replaceState({}, '', url.pathname);
      }
    }
  }, []);

  const totalGastoMes = initialExpenses.reduce((sum, e) => sum + Number(e.monto), 0);
  const ingreso = Number(settings.ingreso_mensual || 0);
  const excedenteReal = ingreso - totalGastoMes;
  const excedenteTeorico = Number(settings.excedente_mensual || 0);

  // Group current expenses by date
  const getFilteredExpenses = () => {
    return initialExpenses.filter(e => {
      const matchSearch = e.comercio.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (e.nota && e.nota.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = selectedCategoryFilter === 'all' || e.categoria_id === selectedCategoryFilter;
      return matchSearch && matchCat;
    });
  };

  const filteredExpenses = getFilteredExpenses();

  const groupExpensesByDate = (list: any[]) => {
    const groups: Record<string, any[]> = {};
    list.forEach(e => {
      const dateStr = new Date(e.fecha).toLocaleDateString('es-SV', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      // Capitalize first letter
      const capitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
      groups[capitalized] = groups[capitalized] || [];
      groups[capitalized].push(e);
    });
    return groups;
  };

  const groupedExpenses = groupExpensesByDate(filteredExpenses);

  // Chart aggregation
  const getPieChartData = () => {
    const dataMap: Record<string, { value: number; color: string }> = {};
    initialExpenses.forEach(e => {
      if (e.categoria_id && e.categories) {
        const catName = e.categories.nombre;
        const color = e.categories.color || '#8b5cf6';
        dataMap[catName] = dataMap[catName] || { value: 0, color };
        dataMap[catName].value += Number(e.monto);
      }
    });

    return Object.keys(dataMap).map(name => ({
      name,
      value: Number(dataMap[name].value.toFixed(2)),
      color: dataMap[name].color,
    }));
  };

  const pieChartData = getPieChartData();

  // Top 5 Merchants
  const getTopMerchants = () => {
    const merchants: Record<string, number> = {};
    initialExpenses.forEach(e => {
      const name = e.comercio.trim();
      merchants[name] = (merchants[name] || 0) + Number(e.monto);
    });

    return Object.keys(merchants)
      .map(name => ({ name, total: merchants[name] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };

  const topMerchants = getTopMerchants();

  // MoM analytics
  const getMoMComparison = () => {
    return categories.map(cat => {
      const currSum = initialExpenses
        .filter(e => e.categoria_id === cat.id)
        .reduce((sum, e) => sum + Number(e.monto), 0);

      const prevSum = prevExpenses
        .filter(e => e.categoria_id === cat.id)
        .reduce((sum, e) => sum + Number(e.monto), 0);

      return {
        id: cat.id,
        nombre: cat.nombre,
        color: cat.color,
        icono: cat.icono,
        currSum,
        prevSum,
        diff: currSum - prevSum,
      };
    }).filter(item => item.currSum > 0 || item.prevSum > 0);
  };

  const momComparison = getMoMComparison();

  // Handlers
  const handleDeleteExpense = (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
      return;
    }

    startTransition(async () => {
      try {
        await eliminarGasto(id);
        toast.success('Gasto eliminado');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al eliminar el gasto');
      }
    });
  };

  const handleOpenBudget = (prog: any) => {
    setSelectedBudgetCategory(prog.categoria);
    setBudgetLimit(prog.monto_limite > 0 ? String(prog.monto_limite) : '');
    setIsBudgetOpen(true);
  };

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBudgetCategory || !budgetLimit || Number(budgetLimit) < 0) {
      toast.error('Por favor, ingresa un monto límite válido.');
      return;
    }

    startTransition(async () => {
      try {
        await definirPresupuesto(
          selectedBudgetCategory.id,
          Number(budgetLimit),
          currentMonth,
          currentYear
        );
        toast.success(`Presupuesto de ${selectedBudgetCategory.nombre} configurado`);
        setIsBudgetOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al configurar presupuesto');
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-sans">Gastos</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Controla tus egresos del mes actual y mantente dentro del presupuesto.
          </p>
        </div>
        <Button 
          onClick={() => setIsAddExpenseOpen(true)}
          className="bg-blue-600 text-white hover:bg-blue-700 hover:opacity-95 font-bold shadow-md w-full sm:w-auto rounded-xl px-5 h-10 transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Registrar Gasto
        </Button>
      </div>

      {/* Wide Pill Tab Switcher */}
      <div className="bg-gray-100 p-1.5 rounded-full flex gap-1 items-center border border-gray-200/50 w-full sm:w-auto overflow-x-auto select-none max-w-md mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('analisis')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap min-w-[110px] flex items-center justify-center gap-1.5 ${
            activeTab === 'analisis'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 bg-transparent'
          }`}
        >
          <PieChartIcon className="h-3.5 w-3.5" />
          Análisis
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('historial')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap min-w-[110px] flex items-center justify-center gap-1.5 ${
            activeTab === 'historial'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 bg-transparent'
          }`}
        >
          <Receipt className="h-3.5 w-3.5" />
          Historial
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('presupuestos')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap min-w-[110px] flex items-center justify-center gap-1.5 ${
            activeTab === 'presupuestos'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 bg-transparent'
          }`}
        >
          <PiggyBank className="h-3.5 w-3.5" />
          Presupuestos
        </button>
      </div>

      {/* ================= TAB HISTORIAL ================= */}
      {activeTab === 'historial' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por comercio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background py-2 pl-10 pr-4 text-xs text-foreground placeholder-zinc-450 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-all"
              />
            </div>
            {/* Category Select */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="border border-input bg-background text-xs py-2 px-4 rounded-xl text-foreground focus:border-primary focus:ring-primary max-w-full sm:w-52 cursor-pointer font-semibold h-10"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>

          {/* Expenses Grouped List */}
          {Object.keys(groupedExpenses).length === 0 ? (
            <div className="glass-card text-center py-16 rounded-[20px]">
              <div className="space-y-3 flex flex-col items-center justify-center">
                <Receipt className="h-10 w-10 text-zinc-400 dark:text-zinc-700" />
                <p className="text-xs font-semibold text-muted-foreground">No se encontraron gastos registrados en este período.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedExpenses).map(dateGroup => (
                <div key={dateGroup} className="space-y-2.5">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 px-2">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {dateGroup}
                  </h3>
                  <div className="grid gap-2">
                    {groupedExpenses[dateGroup].map(e => (
                      <div key={e.id} className="glass-card hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm rounded-[20px]">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              style={{
                                backgroundColor: e.categories ? `${e.categories.color}15` : '#27272a15',
                                color: e.categories ? e.categories.color : '#a1a1aa',
                              }}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 shadow-sm"
                            >
                              <CategoryIcon name={e.categories?.icono || 'HelpCircle'} className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{e.comercio}</p>
                              {e.nota ? (
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">{e.nota}</p>
                              ) : (
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">{e.categories?.nombre || 'Sin categoría'}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-foreground shrink-0 bg-zinc-100/50 dark:bg-zinc-950/50 border border-zinc-200/50 dark:border-zinc-800/50 px-2.5 py-0.5 rounded-full font-sans">
                              -${Number(e.monto).toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteExpense(e.id)}
                              disabled={isPending}
                              className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full shrink-0 cursor-pointer animate-none"
                              title="Eliminar gasto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB ANALISIS ================= */}
      {activeTab === 'analisis' && (
        <div className="space-y-6">
          {/* Main overview figures */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Total Spent */}
            <div className="glass-card text-card-foreground shadow-sm rounded-[20px]">
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gastado este Mes</p>
                <h2 className="text-3xl font-black text-foreground mt-2">
                  ${totalGastoMes.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                </h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase mt-2">
                  Basado en {initialExpenses.length} recibos.
                </p>
              </div>
            </div>

            {/* Excedente Real */}
            <div className="glass-card text-card-foreground shadow-sm md:col-span-2 rounded-[20px]">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Excedente Real Disponible</p>
                    <h2 className={`text-3xl font-black mt-2 ${excedenteReal >= excedenteTeorico ? 'text-emerald-600 dark:text-emerald-450' : 'text-amber-600 dark:text-amber-450'}`}>
                      ${excedenteReal.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 font-semibold">
                      <Info className="h-4 w-4 shrink-0 text-primary" />
                      <span>Ingreso mensual (${ingreso}) menos gastos reales.</span>
                    </p>
                  </div>
                  <div className="border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-6 space-y-1 shrink-0 w-full sm:w-auto">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Meta de Excedente</p>
                    <p className="text-base font-bold text-foreground">${excedenteTeorico.toLocaleString('es-SV', { minimumFractionDigits: 2 })}</p>
                    {excedenteReal < excedenteTeorico && (
                      <p className="text-[9px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-wider">Por debajo de la meta</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Pie Chart Card */}
            <div className="glass-card text-card-foreground shadow-sm flex flex-col justify-between rounded-[20px]">
              <div className="p-6 pb-2">
                <h3 className="text-base font-bold text-foreground">Gasto por Categoría</h3>
                <p className="text-xs text-muted-foreground">Distribución de egresos del mes actual.</p>
              </div>
              <div className="p-6 h-56 pb-6 flex items-center justify-center">
                {pieChartData.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-semibold">No hay datos suficientes para graficar.</p>
                ) : mounted ? (
                  <div className="relative h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                           data={pieChartData}
                           cx="50%"
                           cy="50%"
                           innerRadius={65}
                           outerRadius={85}
                           paddingAngle={4}
                           dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '1rem', backdropFilter: 'blur(10px)', color: 'var(--foreground)' }}
                          itemStyle={{ color: 'var(--foreground)', fontSize: '11px', fontWeight: 'bold' }}
                          formatter={(value) => [`$${Number(value).toFixed(2)}`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Inner Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold">Total</span>
                      <span className="text-lg font-black text-foreground">${totalGastoMes.toFixed(0)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full bg-zinc-100 dark:bg-zinc-950/20 animate-pulse rounded-2xl" />
                )}
              </div>
            </div>

            {/* Top 5 Shops */}
            <div className="glass-card text-card-foreground shadow-sm rounded-[20px]">
              <div className="p-6 pb-2">
                <h3 className="text-base font-bold text-foreground">Top 5 Comercios</h3>
                <p className="text-xs text-muted-foreground">Establecimientos donde más has consumido este mes.</p>
              </div>
              <div className="p-6 pt-2">
                {topMerchants.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center font-medium">No hay comercios frecuentes.</p>
                ) : (
                  <ul className="divide-y divide-zinc-200/40 dark:divide-zinc-800/40">
                    {topMerchants.map((m, idx) => (
                      <li key={m.name} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] text-muted-foreground font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-foreground truncate">{m.name}</span>
                        </div>
                        <span className="text-xs font-black text-foreground">
                          ${m.total.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Month over Month category list */}
          <div className="glass-card text-card-foreground shadow-sm rounded-[20px]">
            <div className="p-6 pb-2">
              <h3 className="text-base font-bold text-foreground">Comparativa de Gastos (Mes anterior vs actual)</h3>
              <p className="text-xs text-muted-foreground">Identifica variaciones de consumo por rubro.</p>
            </div>
            <div className="p-6 pt-2">
              {momComparison.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center font-medium">No hay gastos históricos suficientes.</p>
              ) : (
                <div className="flow-root">
                  <ul className="divide-y divide-zinc-200/40 dark:divide-zinc-800/40">
                    {momComparison.map(item => {
                      const isUp = item.diff > 0;
                      return (
                        <li key={item.id} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              style={{ backgroundColor: `${item.color}15`, color: item.color }}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 shadow-sm"
                            >
                              <CategoryIcon name={item.icono} className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground truncate">{item.nombre}</p>
                              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                Anterior: ${item.prevSum.toFixed(2)} | Actual: ${item.currSum.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-2.5 shrink-0">
                            <span className="text-xs font-black text-foreground">
                              ${Math.abs(item.diff).toFixed(2)}
                            </span>
                            {item.diff !== 0 && (
                              <Badge className={`py-0.5 px-2 text-[9px] flex gap-0.5 items-center font-bold rounded-full border uppercase tracking-wider ${
                                isUp 
                                  ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-605 border-emerald-500/20'
                              }`}>
                                {isUp ? (
                                  <>
                                    <TrendingUp className="h-2.5 w-2.5" />
                                    Subió
                                  </>
                                ) : (
                                  <>
                                    <TrendingDown className="h-2.5 w-2.5" />
                                    Bajó
                                  </>
                                )}
                              </Badge>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB PRESUPUESTOS ================= */}
      {activeTab === 'presupuestos' && (
        <div className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-2">
            {budgetProgress.map(prog => {
              const hasLimit = prog.monto_limite > 0;
              const isDanger = prog.porcentaje >= 90;
              return (
                <div key={prog.categoria.id} className="glass-card text-card-foreground shadow-sm rounded-[20px]">
                  <div className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          style={{ backgroundColor: `${prog.categoria.color}15`, color: prog.categoria.color }}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 shadow-sm"
                        >
                          <CategoryIcon name={prog.categoria.icono} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{prog.categoria.nombre}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                            {hasLimit 
                              ? `Límite: $${prog.monto_limite}` 
                              : 'Sin límite establecido'}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenBudget(prog)}
                        className="text-[10px] text-muted-foreground hover:text-foreground border border-border bg-secondary hover:bg-zinc-200 dark:hover:bg-zinc-800 px-3 py-1 rounded-xl h-7 font-bold cursor-pointer"
                      >
                        {hasLimit ? 'Editar' : 'Definir'}
                      </Button>
                    </div>

                    {hasLimit ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-muted-foreground">Gastado: ${prog.total_gastado.toFixed(2)}</span>
                          <span className={`${isDanger ? 'text-red-500' : 'text-primary'}`}>
                            {prog.porcentaje}%
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(prog.porcentaje, 100)} 
                          className={`h-2.5 rounded-full overflow-hidden ${
                            isDanger ? 'bg-red-550/20 text-red-500' : 'bg-primary/20 text-primary'
                          }`}
                        />
                        {isDanger && (
                          <div className="flex gap-1 items-center text-[9px] text-red-605 dark:text-red-400 font-bold uppercase tracking-wider mt-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-550 shrink-0" />
                            <span>¡Advertencia! Has superado el 90% del presupuesto.</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground/60 italic py-1 font-medium">
                        Define un tope para evitar gastos innecesarios.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Budget Set Dialog */}
      <Dialog open={isBudgetOpen} onOpenChange={setIsBudgetOpen}>
        <DialogContent className="glass-card max-w-sm rounded-[20px] shadow-2xl p-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-bold text-foreground">Definir Presupuesto</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Establece un límite de gasto mensual para {selectedBudgetCategory?.nombre}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBudgetSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="limite" className="text-zinc-700 dark:text-zinc-300">Límite Mensual ($)</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-550 font-bold">$</span>
                  <Input
                    id="limite"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                    disabled={isPending}
                    className="pl-8 border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm font-bold"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsBudgetOpen(false)}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground cursor-pointer rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 text-white hover:bg-blue-700 hover:opacity-95 font-bold shadow-md cursor-pointer rounded-xl px-5 h-10 transition-all border-none"
              >
                {isPending ? 'Estableciendo...' : 'Guardar Límite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Expense Frosted modal ─────────────────────────────────────────── */}
      <div className={`modal ${isAddExpenseOpen ? 'modal-open' : ''}`} role="dialog">
        <div className="modal-box bg-white/70 backdrop-blur-md border border-white/40 shadow-2xl p-6 rounded-2xl max-w-lg overflow-y-auto max-h-[90vh]">
          {ocrData ? (
            /* OCR EDIT/PREVIEW PANEL */
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/50">
                <h3 className="text-base font-bold text-gray-950 flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
                  Revisión de Ticket por IA
                </h3>
                <Badge className={`capitalize py-0.5 px-2.5 text-[9px] font-bold border rounded-full ${
                  ocrData.confianza === 'alta' 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : ocrData.confianza === 'media'
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    : 'bg-red-500/10 text-red-600 border-red-500/20'
                }`}>
                  Confianza: {ocrData.confianza}
                </Badge>
              </div>

              {ocrImageUrl && (
                <div className="flex items-center gap-3 bg-white/45 p-2.5 rounded-xl border border-gray-200/30">
                  <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
                    <FileText className="h-6 w-6 text-zinc-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Archivo Adjunto</p>
                    <a href={ocrImageUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-0.5 block font-bold truncate">
                      Ver imagen original del ticket
                    </a>
                  </div>
                </div>
              )}

              {ocrData.confianza === 'baja' && (
                <div className="text-[11px] bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-xl text-amber-700 flex gap-2.5 items-start font-medium">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900">Confianza del escaneo baja</p>
                    <p className="mt-0.5 text-amber-655">
                      La imagen podría estar borrosa o el ticket tiene un formato inusual. Por favor, revisa todos los montos con detenimiento.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleConfirmOcr} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 border-b border-gray-200/50 pb-4">
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label htmlFor="ocr_comercio" className="text-xs font-bold text-gray-700">Comercio</label>
                    <input
                      id="ocr_comercio"
                      type="text"
                      required
                      value={ocrComercio}
                      onChange={e => handleOcrComercioChange(e.target.value)}
                      disabled={isPending}
                      className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none w-full font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label htmlFor="ocr_monto" className="text-xs font-bold text-gray-700">Monto Total</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input
                        id="ocr_monto"
                        type="number"
                        step="0.01"
                        required
                        value={ocrMonto}
                        onChange={e => setOcrMonto(e.target.value)}
                        disabled={isPending}
                        className="pl-8 h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none w-full font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label htmlFor="ocr_fecha" className="text-xs font-bold text-gray-700">Fecha</label>
                    <input
                      id="ocr_fecha"
                      type="date"
                      required
                      value={ocrFecha}
                      onChange={e => setOcrFecha(e.target.value)}
                      disabled={isPending}
                      className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none w-full font-medium"
                    />
                  </div>
                </div>

                {/* Categorías Selector */}
                <div className="flex flex-col gap-2 border-b border-gray-200/50 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Categoría del Gasto</span>
                    {expenseCategory && (
                      <span className="text-[10px] text-blue-650 font-bold flex items-center gap-0.5">
                        <Check className="h-3.5 w-3.5" />
                        Asociación automática
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                    {categories.map((cat) => {
                      const isSelected = expenseCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setExpenseCategory(cat.id)}
                          disabled={isPending}
                          style={{
                            borderColor: isSelected ? cat.color : 'rgba(209, 213, 219, 0.4)',
                            backgroundColor: isSelected ? `${cat.color}20` : 'rgba(255, 255, 255, 0.3)',
                          }}
                          className="flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all hover:bg-white/50 cursor-pointer select-none"
                        >
                          <div
                            style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5"
                          >
                            <CategoryIcon name={cat.icono} className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-gray-900 truncate">{cat.nombre}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Product breakdowns */}
                <div className="flex flex-col gap-2 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Desglose de Artículos (Opcional)</span>
                    <button
                      type="button"
                      onClick={handleAddProduct}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer bg-blue-50/50 hover:bg-blue-100/50 px-2.5 py-1 rounded-lg"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar item
                    </button>
                  </div>

                  {ocrProductos.length === 0 ? (
                    <div className="text-center py-4 border border-dashed border-gray-200 rounded-xl bg-white/30 text-xs text-slate-400 font-semibold">
                      No se leyeron artículos individuales.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1 border border-gray-250/30 p-2.5 rounded-xl bg-white/20">
                      {ocrProductos.map((p, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={p.nombre || ''}
                            onChange={(e) => handleProductChange(idx, 'nombre', e.target.value)}
                            placeholder="Nombre producto"
                            disabled={isPending}
                            className="h-9 flex-1 min-w-0 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-xs text-gray-900 focus:outline-none"
                          />
                          <input
                            type="number"
                            value={p.cantidad || 1}
                            onChange={(e) => handleProductChange(idx, 'cantidad', Number(e.target.value))}
                            placeholder="Cant"
                            disabled={isPending}
                            className="h-9 w-12 rounded-xl border border-gray-250/50 bg-white/40 px-2 text-xs text-gray-900 focus:outline-none text-center font-bold"
                          />
                          <div className="relative w-20 shrink-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-455 font-bold text-[10px]">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={p.precio_total || 0}
                              onChange={(e) => handleProductChange(idx, 'precio_total', Number(e.target.value))}
                              placeholder="Total"
                              disabled={isPending}
                              className="pl-4 h-9 w-full rounded-xl border border-gray-250/50 bg-white/40 px-3 text-xs text-gray-900 focus:outline-none text-right font-bold"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(idx)}
                            disabled={isPending}
                            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200/50">
                  <button
                    type="button"
                    onClick={() => {
                      setOcrData(null);
                      setOcrImageUrl(null);
                    }}
                    disabled={isPending}
                    className="flex-1 h-10 rounded-xl border border-gray-250/50 bg-white/30 text-sm font-semibold text-slate-700 hover:bg-white/60 hover:text-slate-900 transition-all cursor-pointer"
                  >
                    Volver y Re-escanear
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 hover:opacity-95 text-white text-sm font-semibold transition-all cursor-pointer border-none"
                  >
                    {isPending ? 'Guardando...' : 'Guardar en Gastos'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* MANUAL INPUT FORM + TICKET UPLOADER TRIGGER */
            <>
              <h3 className="text-base font-bold text-gray-950">Registrar Gasto</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ingresa los detalles del egreso o escanea la foto del ticket para análisis de IA.
              </p>

              <div className="mt-4">
                <SelectorTicket onSuccess={handleOcrSuccess} />
              </div>

              <div className="flex items-center justify-between my-4">
                <span className="w-full border-b border-gray-200/40" />
                <span className="text-[9px] text-slate-455 font-bold uppercase tracking-wider px-3 shrink-0">O ingresar manualmente</span>
                <span className="w-full border-b border-gray-200/40" />
              </div>

              <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
                {/* Monto */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="exp_monto" className="text-xs font-bold text-gray-700">Monto</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-bold">$</span>
                    <input
                      id="exp_monto"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={expenseMonto}
                      onChange={e => setExpenseMonto(e.target.value)}
                      disabled={isPending}
                      className="pl-8 h-10 rounded-xl border border-gray-250/50 bg-white/40 pr-3 text-sm text-gray-900 focus:outline-none input-ios-focus w-full transition-all font-bold text-lg"
                    />
                  </div>
                </div>

                {/* Comercio Autocomplete */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="exp_comercio" className="text-xs font-bold text-gray-700">Comercio / Lugar</label>
                  <input
                    id="exp_comercio"
                    type="text"
                    list="modal-merchants"
                    required
                    placeholder="Ej: Super Selectos"
                    value={expenseComercio}
                    onChange={e => handleComercioChange(e.target.value)}
                    disabled={isPending}
                    className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none input-ios-focus w-full transition-all"
                  />
                  <datalist id="modal-merchants">
                    {frequentMerchants.map((merchant) => (
                      <option key={merchant} value={merchant} />
                    ))}
                  </datalist>
                </div>

                {/* Categorías (Chips Grid) */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-gray-700">Categoría</span>
                  <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                    {categories.map((cat) => {
                      const isSelected = expenseCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setExpenseCategory(cat.id)}
                          disabled={isPending}
                          style={{
                            borderColor: isSelected ? cat.color : 'rgba(209, 213, 219, 0.4)',
                            backgroundColor: isSelected ? `${cat.color}20` : 'rgba(255, 255, 255, 0.3)',
                          }}
                          className="flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all hover:bg-white/50 cursor-pointer select-none btn-elastic active:scale-95"
                        >
                          <div
                            style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5"
                          >
                            <CategoryIcon name={cat.icono} className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-gray-900 truncate">{cat.nombre}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fecha */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="exp_fecha" className="text-xs font-bold text-gray-700">Fecha de Gasto</label>
                  <input
                    id="exp_fecha"
                    type="date"
                    required
                    value={expenseFecha}
                    onChange={e => setExpenseFecha(e.target.value)}
                    disabled={isPending}
                    className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none input-ios-focus w-full transition-all"
                  />
                </div>

                {/* Nota colapsable */}
                <div className="space-y-2 pt-2 border-t border-gray-200/50">
                  <button
                    type="button"
                    onClick={() => setShowNote(!showNote)}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer font-bold select-none btn-elastic"
                  >
                    {showNote ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {showNote ? 'Ocultar nota' : 'Agregar nota (Opcional)'}
                  </button>
                  
                  {showNote && (
                    <div className="space-y-1.5">
                      <input
                        id="exp_nota"
                        type="text"
                        placeholder="Ej: Compras para almuerzo de la semana"
                        value={expenseNota}
                        onChange={e => setExpenseNota(e.target.value)}
                        disabled={isPending}
                        className="h-10 rounded-xl border border-gray-250/50 bg-white/40 px-3 text-sm text-gray-900 focus:outline-none input-ios-focus w-full transition-all"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddExpenseOpen(false)}
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
                    Registrar Gasto
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="modal-backdrop" onClick={() => setIsAddExpenseOpen(false)}>
          <button type="button" className="cursor-default">close</button>
        </div>
      </div>
    </div>
  );
}
