# Módulo 00 — Setup y Configuración

## Objetivo

Dejar el proyecto base funcionando: Next.js + TypeScript + Tailwind + shadcn/ui + Supabase conectado, con TODO el schema de base de datos creado desde el inicio (MVP + Fase 2), aunque las tablas de Fase 2 no se usen todavía. Esto evita migraciones dolorosas después.

## 1. Inicialización del proyecto

```bash
npx create-next-app@latest debt-manager --typescript --tailwind --app --src-dir --import-alias "@/*"
cd debt-manager
npx shadcn@latest init
```

Componentes de shadcn a instalar desde ya (se usarán en módulos 01 y 03):

```bash
npx shadcn@latest add button card input label select dialog form table badge progress tabs toggle-group sonner skeleton avatar dropdown-menu
```

Dependencias adicionales:

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install zod react-hook-form @hookform/resolvers
npm install recharts
npm install date-fns
```

## 2. Proyecto en Supabase

1. Crear proyecto en supabase.com (región más cercana a El Salvador: us-east-1 o similar).
2. Activar Auth con Email/Password (suficiente para un solo usuario por ahora; no actives proveedores extra todavía).
3. Copiar `Project URL` y `anon public key` a `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` y `GEMINI_API_KEY` solo se usan en server actions / API routes, nunca en cliente.

## 3. Cliente de Supabase (App Router)

Crear `src/lib/supabase/client.ts` (cliente del navegador) y `src/lib/supabase/server.ts` (cliente de servidor con cookies), siguiendo el patrón oficial de `@supabase/ssr` para Next.js App Router. Esto es necesario para que Auth funcione correctamente con Server Components.

## 4. Schema completo de base de datos

Ejecutar como SQL en el editor de Supabase. Se crean TODAS las tablas desde el día uno, aunque las de fase 2 no se usen hasta después.

```sql
-- ============================================
-- MVP: Deudas y Pagos
-- ============================================

create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  nombre text not null,
  tipo text not null check (tipo in ('tarjeta_credito', 'prestamo_personal', 'prestamo_auto', 'prestamo_hipotecario', 'otro')),
  monto_original numeric(12,2) not null check (monto_original > 0),
  saldo_actual numeric(12,2) not null check (saldo_actual >= 0),
  tasa_interes_anual numeric(5,2) not null default 0,
  fecha_corte int check (fecha_corte between 1 and 31),
  fecha_pago int check (fecha_pago between 1 and 31),
  pago_minimo numeric(12,2) default 0,
  activa boolean default true,
  created_at timestamptz default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid references debts on delete cascade not null,
  user_id uuid references auth.users not null,
  monto numeric(12,2) not null check (monto > 0),
  fecha date not null default current_date,
  nota text,
  created_at timestamptz default now()
);

-- ============================================
-- Configuración del usuario (ingreso, estrategia)
-- ============================================

create table user_settings (
  user_id uuid primary key references auth.users not null,
  ingreso_mensual numeric(12,2),
  excedente_mensual numeric(12,2),
  estrategia text default 'avalancha' check (estrategia in ('avalancha', 'bola_nieve')),
  updated_at timestamptz default now()
);

-- ============================================
-- FASE 2: Gastos y categorías
-- ============================================

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  nombre text not null,
  icono text,
  color text,
  es_default boolean default false,
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  categoria_id uuid references categories,
  comercio text not null,
  monto numeric(12,2) not null check (monto > 0),
  fecha date not null default current_date,
  fuente text default 'manual' check (fuente in ('manual', 'ocr_ticket', 'atajo_wallet')),
  ticket_imagen_url text,
  nota text,
  created_at timestamptz default now()
);

create table expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses on delete cascade not null,
  producto text not null,
  cantidad numeric(8,2) default 1,
  precio_unitario numeric(12,2),
  precio_total numeric(12,2),
  created_at timestamptz default now()
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  categoria_id uuid references categories not null,
  monto_limite numeric(12,2) not null,
  mes int not null check (mes between 1 and 12),
  anio int not null,
  created_at timestamptz default now(),
  unique(categoria_id, mes, anio)
);

-- ============================================
-- FASE 2: Recomendaciones de IA (historial)
-- ============================================

create table ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  tipo text check (tipo in ('priorizacion_deuda', 'consejo_gasto', 'resumen_mensual')),
  contenido jsonb not null,
  created_at timestamptz default now()
);
```

## 5. Row Level Security (RLS)

Activar RLS en todas las tablas y crear políticas para que cada usuario solo vea sus propios datos:

```sql
alter table debts enable row level security;
alter table payments enable row level security;
alter table user_settings enable row level security;
alter table categories enable row level security;
alter table expenses enable row level security;
alter table expense_items enable row level security;
alter table budgets enable row level security;
alter table ai_recommendations enable row level security;

-- Patrón repetido para cada tabla con user_id directo
create policy "usuarios ven solo sus deudas" on debts
  for all using (auth.uid() = user_id);

create policy "usuarios ven solo sus pagos" on payments
  for all using (auth.uid() = user_id);

create policy "usuarios ven solo su configuracion" on user_settings
  for all using (auth.uid() = user_id);

create policy "usuarios ven solo sus categorias" on categories
  for all using (auth.uid() = user_id);

create policy "usuarios ven solo sus gastos" on expenses
  for all using (auth.uid() = user_id);

create policy "usuarios ven solo sus recomendaciones" on ai_recommendations
  for all using (auth.uid() = user_id);

-- expense_items no tiene user_id directo, se valida vía join con expenses
create policy "usuarios ven items de sus gastos" on expense_items
  for all using (
    exists (
      select 1 from expenses
      where expenses.id = expense_items.expense_id
      and expenses.user_id = auth.uid()
    )
  );

create policy "usuarios ven solo sus presupuestos" on budgets
  for all using (auth.uid() = user_id);
```

## 6. Categorías por defecto

Insertar categorías base que se cargan automáticamente para cualquier usuario nuevo (esto se puede hacer con un trigger en `auth.users` o simplemente al primer login desde la app). Sugeridas para el mercado salvadoreño: Supermercado, Restaurantes/Comida, Transporte, Servicios (luz, agua, internet), Entretenimiento, Salud, Ropa, Deudas/Pagos, Otros.

## 7. Storage bucket para tickets

Crear bucket `tickets` en Supabase Storage (privado, no público), con política RLS de storage para que cada usuario solo acceda a sus propias imágenes (path con prefijo `{user_id}/...`).

## 8. Checklist de salida de este módulo

- [ ] Proyecto Next.js corriendo localmente con Tailwind y shadcn configurado
- [ ] Conexión a Supabase verificada (consulta simple de prueba)
- [ ] Auth funcionando (login/registro con email)
- [ ] Todas las tablas creadas y visibles en el editor de Supabase
- [ ] RLS activado y probado (un usuario no puede ver datos de otro)
- [ ] Bucket de storage `tickets` creado
- [ ] Variables de entorno en `.env.local` y también configuradas en Vercel
