'use client';

import React, { useTransition, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { registro } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export default function RegistroPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    startTransition(async () => {
      try {
        await registro(formData);
        toast.success('Cuenta creada. Bienvenido a DeudZero');
        router.push('/');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al crear la cuenta');
      }
    });
  };

  return (
    <div className="flex min-h-screen w-full bg-zinc-50 overflow-hidden relative">
      {/* Dynamic Keyframes for floating liquid-glass blobs */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-slower {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -40px) scale(1.08); }
          66% { transform: translate(-25px, 25px) scale(0.92); }
        }
        @keyframes float-faster {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          40% { transform: translate(-30px, 35px) scale(0.95); }
          70% { transform: translate(25px, -25px) scale(1.05); }
        }
        .animate-float-slower {
          animation: float-slower 25s infinite ease-in-out;
        }
        .animate-float-faster {
          animation: float-faster 18s infinite ease-in-out;
        }
      `}} />

      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
      
      {/* Split Layout: Grid Container */}
      <div className="relative z-10 grid w-full grid-cols-1 md:grid-cols-12">
        
        {/* Left Side: Stunning 3D Banner (Hidden on mobile) */}
        <div className="relative hidden md:flex md:col-span-6 lg:col-span-7 flex-col justify-between p-8 lg:p-12 text-white bg-slate-950 overflow-hidden">
          {/* Visual Asset (using the generated blue 3D image) */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/auth-banner.png"
              alt="DeudZero AI optimization banner"
              fill
              className="object-cover opacity-85"
              priority
            />
            {/* Dark/Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/60" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-950/80" />
          </div>

          {/* Top Branding */}
          <div className="relative z-10 flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="none">
              <path
                d="M12 2C12 2 12.5 8 15 10.5C17.5 13 22 13 22 13C22 13 16 13.5 13.5 16C11 18.5 11 22 11 22C11 22 10.5 16 8 13.5C5.5 11 2 11 2 11C2 11 8 10.5 10.5 8C13 5.5 12 2 12 2Z"
                fill="url(#gemini-spark-auth-reg)"
              />
              <defs>
                <linearGradient id="gemini-spark-auth-reg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="35%" stopColor="#06B6D4" />
                  <stop offset="70%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-xl font-extrabold tracking-tight">DeudZero</span>
          </div>

          {/* Bottom Info / Value Props with Fade-in slide transition */}
          <div 
            className={`relative z-10 max-w-lg space-y-6 mt-auto transition-all duration-1000 delay-300 ease-out transform ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-cyan-400 animate-pulse" />
              Asistente Financiero con IA
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Diseña tu camino hacia el balance cero
            </h1>
            <p className="text-base text-slate-200/90 leading-relaxed font-light">
              Únete a miles de personas que están usando Inteligencia Artificial para eliminar deudas bajo métodos matemáticos como Avalancha o Bola de Nieve.
            </p>

            {/* Micro value props grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="flex gap-2.5 items-start">
                <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Privacidad Total</h4>
                  <p className="text-xs text-slate-300">Tus datos financieros son tuyos</p>
                </div>
              </div>
              <div className="flex gap-2.5 items-start">
                <Sparkles className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">IA Generativa</h4>
                  <p className="text-xs text-slate-300">Asesor de deudas personalizado</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Container */}
        <div className="col-span-12 md:col-span-6 lg:col-span-5 flex items-center justify-center p-6 sm:p-12 md:p-8 lg:p-16 relative">
          
          {/* Animated floating background blur blobs behind the card */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-blue-400/20 blur-3xl animate-float-slower pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-cyan-400/25 blur-3xl animate-float-faster pointer-events-none" />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-sky-300/15 blur-3xl animate-float-slower pointer-events-none" />

          <div className="relative w-full max-w-md space-y-8">
            
            {/* Brand Logo for Mobile */}
            <div className="flex items-center justify-center gap-2 md:hidden">
              <svg viewBox="0 0 24 24" className="h-8 w-8 animate-pulse" fill="none">
                <path
                  d="M12 2C12 2 12.5 8 15 10.5C17.5 13 22 13 22 13C22 13 16 13.5 13.5 16C11 18.5 11 22 11 22C11 22 10.5 16 8 13.5C5.5 11 2 11 2 11C2 11 8 10.5 10.5 8C13 5.5 12 2 12 2Z"
                  fill="url(#gemini-spark-auth-reg-mob)"
                />
                <defs>
                  <linearGradient id="gemini-spark-auth-reg-mob" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="35%" stopColor="#06B6D4" />
                    <stop offset="70%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">DeudZero</span>
            </div>

            {/* Glassmorphic Auth Card with transition-on-mount */}
            <div 
              className={`relative rounded-3xl p-6 sm:p-8 border shadow-md w-full bg-white/75 backdrop-blur-xl transition-all duration-700 ease-out transform ${
                mounted ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
              }`}
              style={{
                borderColor: 'rgba(255, 255, 255, 0.45)',
                boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.98)'
              }}
            >
              <div className="space-y-2 mb-6">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Crear una Cuenta</h2>
                <p className="text-sm text-slate-500 font-light">
                  Regístrate y comienza a tomar decisiones financieras inteligentes.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Email Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
                    Correo Electrónico
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="ejemplo@correo.com"
                      required
                      disabled={isPending}
                      className="pl-10 rounded-xl h-11 border-slate-200/80 bg-slate-50/50 text-slate-900 placeholder:text-slate-400/80 input-ios-focus w-full"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                      disabled={isPending}
                      className="pl-10 rounded-xl h-11 border-slate-200/80 bg-slate-50/50 text-slate-900 placeholder:text-slate-400/80 input-ios-focus w-full"
                    />
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
                    Confirmar Contraseña
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Repite tu contraseña"
                      required
                      disabled={isPending}
                      className="pl-10 rounded-xl h-11 border-slate-200/80 bg-slate-50/50 text-slate-900 placeholder:text-slate-400/80 input-ios-focus w-full"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-blue-600 hover:bg-blue-500 hover:opacity-95 text-white font-semibold h-11 rounded-xl shadow-md btn-elastic transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      'Creando cuenta...'
                    ) : (
                      <>
                        Crear Cuenta
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Footer redirection */}
                <div className="text-center text-sm text-slate-500 pt-4 border-t border-slate-100 mt-6">
                  ¿Ya tienes una cuenta?{' '}
                  <Link
                    href="/login"
                    className="font-semibold text-blue-600 hover:text-blue-500 hover:underline"
                  >
                    Inicia sesión aquí
                  </Link>
                </div>
              </form>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
