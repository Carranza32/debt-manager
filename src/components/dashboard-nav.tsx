'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CreditCard, Receipt, Sparkles, Settings } from 'lucide-react';

const navItems = [
  { href: '/',              label: 'Inicio',    icon: Home       },
  { href: '/deudas',        label: 'Deudas',    icon: CreditCard },
  { href: '/gastos',        label: 'Gastos',    icon: Receipt    },
  { href: '/asesor',        label: 'Asesor IA', icon: Sparkles   },
  { href: '/configuracion', label: 'Ajustes',   icon: Settings   },
];

export function DashboardNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 md:bottom-5 inset-x-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 z-50 w-full md:w-auto md:min-w-[480px] bg-white/75 backdrop-blur-xl border-t md:border border-white/30 md:rounded-2xl shadow-[0_-5px_15px_-3px_rgba(0,0,0,0.03)] md:shadow-lg transition-all duration-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around md:justify-center md:gap-8 px-2 md:px-6 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1.5 px-3 py-1 rounded-xl min-w-[60px] active:scale-95 transition-all duration-150 ${
                active ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`h-5.5 w-5.5 transition-transform ${active ? 'stroke-[2.2] scale-105' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] font-medium tracking-wide font-sans leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
