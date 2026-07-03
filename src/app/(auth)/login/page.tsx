'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { login } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await login(formData);
        toast.success('Sesión iniciada correctamente');
        router.push('/');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Credenciales inválidas');
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-violet-900/10 via-zinc-950 to-zinc-950 px-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      
      <div className="relative w-full max-w-md">
        {/* Glow behind card */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 opacity-30 blur-lg transition duration-1000 group-hover:opacity-100" />
        
        <Card className="relative border-zinc-800 bg-zinc-900/80 backdrop-blur-xl text-zinc-100 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 font-bold text-white shadow-lg shadow-violet-500/20">
                0
              </span>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">DeudZero</CardTitle>
            <CardDescription className="text-zinc-400">
              Ingresa tus credenciales para acceder a tu gestor de deudas
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Correo Electrónico</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  required
                  disabled={isPending}
                  className="border-zinc-800 bg-zinc-950/50 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:ring-violet-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isPending}
                  className="border-zinc-800 bg-zinc-950/50 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:ring-violet-500"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-white hover:from-violet-500 hover:to-indigo-500 focus:ring-violet-500 shadow-lg shadow-violet-500/10 cursor-pointer"
              >
                {isPending ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
              <div className="text-center text-sm text-zinc-400">
                ¿No tienes una cuenta?{' '}
                <Link
                  href="/registro"
                  className="font-medium text-violet-400 hover:text-violet-300 hover:underline"
                >
                  Regístrate aquí
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
