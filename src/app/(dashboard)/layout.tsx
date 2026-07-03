import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/actions/auth';
import { LogOut, Plus } from 'lucide-react';
import { DashboardNav } from '@/components/dashboard-nav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-transparent font-sans antialiased">

      {/* Floating Glass Header */}
      <header className="sticky top-4 z-40 mx-auto w-full max-w-6xl px-4 md:px-6 mt-4">
        <div className="glass-navbar px-6 h-16 rounded-2xl flex items-center justify-between">

          {/* Left side: Logo & Navigation */}
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2.5 select-none cursor-pointer group">
              <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 transition-transform duration-350 group-hover:rotate-12" fill="none">
                <path
                  d="M12 2C12 2 12.5 8 15 10.5C17.5 13 22 13 22 13C22 13 16 13.5 13.5 16C11 18.5 11 22 11 22C11 22 10.5 16 8 13.5C5.5 11 2 11 2 11C2 11 8 10.5 10.5 8C13 5.5 12 2 12 2Z"
                  fill="url(#gemini-spark)"
                />
                <defs>
                  <linearGradient id="gemini-spark" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="35%" stopColor="#8B5CF6" />
                    <stop offset="70%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">
                  DeudZero
                </span>
                <span className="text-[7px] font-black text-slate-500 tracking-[0.16em] mt-1 leading-none uppercase">
                  Financial AI
                </span>
              </div>
            </Link>
          </div>

          {/* Right side: Logout Only */}
          <div className="flex items-center gap-4">
            {/* Mini Logout Button */}
            <form action={logout}>
              <button
                type="submit"
                title="Cerrar sesion"
                className="h-8 w-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer border-none bg-transparent"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 pb-28 md:pb-28">
        {children}
      </main>

      {/* Unified Navigation (Tab Bar / macOS Dock) */}
      <DashboardNav />
    </div>
  );
}
