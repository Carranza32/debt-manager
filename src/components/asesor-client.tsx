'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Loader2, 
  AlertTriangle, 
  HelpCircle, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  ArrowRight,
  Bookmark,
  CheckCircle,
  Lightbulb,
  ChevronRight
} from 'lucide-react';

interface AsesorClientProps {
  initialRecommendations: any[];
}

export default function AsesorClient({ initialRecommendations }: AsesorClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [history, setHistory] = useState<any[]>(initialRecommendations);
  
  // Set default active advice to the most recent one if available
  const [activeAdvice, setActiveAdvice] = useState<any | null>(
    initialRecommendations.length > 0 ? initialRecommendations[0] : null
  );

  const handleGenerate = () => {
    startTransition(async () => {
      const toastId = toast.loading('Gemini está analizando tus finanzas... Esto puede tardar unos segundos.');
      try {
        const response = await fetch('/api/asesor/generar', {
          method: 'POST',
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Error al generar recomendación');
        }

        const data = await response.json();
        toast.success('Diagnóstico financiero generado con éxito ✨', { id: toastId });

        // Add to local history list
        const newRecord = {
          id: Math.random().toString(), // temp ID for local state
          tipo: 'priorizacion_deuda',
          contenido: data,
          created_at: new Date().toISOString(),
        };

        setHistory([newRecord, ...history]);
        setActiveAdvice(newRecord);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al procesar la solicitud', { id: toastId });
      }
    });
  };

  const selectActiveFromHistory = (advice: any) => {
    setActiveAdvice(advice);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const content = activeAdvice?.contenido;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 font-sans">
            <Sparkles className="h-7 w-7 text-primary" />
            Asesor Financiero IA
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Recomendaciones empáticas y estrategias accionables generadas por Gemini para liquidar tus deudas.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isPending}
          className="bg-primary text-primary-foreground hover:opacity-90 font-semibold cursor-pointer shadow-lg w-full sm:w-auto flex items-center justify-center gap-2 h-10 rounded-xl px-5 transition-all"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generar Recomendación
            </>
          )}
        </Button>
      </div>

      {activeAdvice ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main advice content column */}
          <div className="md:col-span-2 space-y-6">
            {/* Reasoning Card */}
            <div className="glass-card text-card-foreground shadow-xl overflow-hidden relative rounded-[20px]">
              <div className="absolute top-0 right-0 -z-10 h-32 w-32 rounded-full bg-primary/5 blur-xl" />
              <div className="p-6 pb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Bookmark className="h-3.5 w-3.5" />
                  Estrategia Recomendada — {new Date(activeAdvice.created_at).toLocaleDateString('es-SV', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-1">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">Atacar Primero</span>
                    <h2 className="text-2xl font-extrabold text-foreground mt-0.5">
                      {content.deuda_prioritaria || 'Sin deudas pendientes'}
                    </h2>
                  </div>
                  <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs py-1 px-3 rounded-full font-bold">
                    Máxima Prioridad
                  </Badge>
                </div>
              </div>
              <div className="p-6 pt-0 space-y-4">
                <p className="text-sm text-foreground leading-relaxed font-medium">
                  {content.razonamiento}
                </p>

                {/* Warnings / Alerts */}
                {content.alertas && content.alertas.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-border">
                    {content.alertas.map((alerta: string, idx: number) => (
                      <div key={idx} className="text-xs bg-red-500/5 border border-red-500/25 p-3.5 rounded-xl text-red-700 dark:text-red-305 flex gap-2.5 items-start font-medium">
                        <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground">Alerta de Riesgo Financiero</p>
                          <p className="text-muted-foreground">{alerta}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {content.resumen_general && (
                <div className="border-t border-border bg-zinc-100/5 dark:bg-zinc-950/20 py-3.5 px-6 rounded-b-[20px]">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-450 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    {content.resumen_general}
                  </p>
                </div>
              )}
            </div>

            {/* Actionable Tips */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Consejos de Recorte de Gastos
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {content.consejos && content.consejos.map((c: any, idx: number) => (
                  <div key={idx} className="glass-card text-card-foreground shadow-sm flex flex-col justify-between rounded-[20px]">
                    <div className="p-6 pb-2">
                      <h3 className="text-sm font-extrabold text-foreground capitalize">{c.titulo}</h3>
                    </div>
                    <div className="p-6 pt-0 pb-3 flex-1">
                      <p className="text-xs text-muted-foreground leading-relaxed font-semibold">{c.detalle}</p>
                    </div>
                    <div className="border-t border-border bg-zinc-100/5 dark:bg-zinc-950/15 py-2.5 px-6 rounded-b-[20px]">
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-450 font-bold flex items-center gap-1.5 w-full justify-between">
                        <span className="text-muted-foreground uppercase">Impacto</span>
                        <span className="bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-sans">{c.impacto_estimado}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Historical List sidebar */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-foreground">Historial de Diagnósticos</h2>
            {history.length <= 1 ? (
              <div className="glass-card text-card-foreground p-5 text-center text-muted-foreground text-xs rounded-[20px] font-semibold">
                Solo posees el diagnóstico actual. Haz clic en "Generar Recomendación" para crear nuevos análisis cuando tu situación varíe.
              </div>
            ) : (
              <div className="grid gap-2.5 max-h-[480px] overflow-y-auto pr-1">
                {history.map((adv) => {
                  const isActive = activeAdvice?.id === adv.id;
                  return (
                    <button
                      key={adv.id}
                      onClick={() => selectActiveFromHistory(adv)}
                      className={`text-left p-3.5 rounded-xl border transition-all w-full flex items-center justify-between cursor-pointer ${
                        isActive 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border bg-background hover:bg-zinc-150 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                          Prioridad: {adv.contenido?.deuda_prioritaria || 'Liquidada'}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-bold">
                          <Calendar className="h-3 w-3" />
                          {new Date(adv.created_at).toLocaleDateString('es-SV', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-450 shrink-0 ml-2" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* EMPTY STATE VIEW */
        <div className="glass-card text-card-foreground py-16 text-center text-zinc-550 max-w-xl mx-auto mt-6 rounded-[20px]">
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-650">
              <Sparkles className="h-7 w-7 text-primary animate-pulse" />
            </div>
            <div className="space-y-1.5 px-6">
              <h2 className="text-lg font-bold text-foreground">¿Cómo salir de deudas rápido?</h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed font-semibold">
                Haz clic en el botón superior para analizar tu panorama de deudas e ingreso. Gemini construirá una guía de consejos específicos para acelerar tu libertad financiera.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
