# Sistema de Diseño de la Interfaz (Frontend Design System)

Este documento detalla el sistema de diseño visual premium y la arquitectura tecnológica utilizada en este proyecto (Calculadora Salarial SV). Puedes compartir este archivo con **Antigravity** o cualquier otra IA para replicar exactamente la misma estética limpia, moderna y con estilo de **glassmorphism** (vidrio esmerilado) en otras aplicaciones.

---

## 1. Stack Tecnológico del Frontend

Para replicar este frontend, se utilizan las siguientes tecnologías y librerías clave:

- **Framework Principal:** `Next.js 16` (con React 19 y App Router).
- **Librería de Estilos:** `Tailwind CSS v4.0` (utilizando la directiva `@import "tailwindcss";` y `@theme inline` en vez del antiguo `tailwind.config.js`).
- **Componentes UI de Base:** `shadcn/ui` (con estilo `new-york` y base de `Radix UI` para accesibilidad, incluyendo `dialog`, `select`, `slider`, `checkbox`, etc.).
- **Iconos:** `Lucide React`.
- **Animaciones e Interacciones:** `Framer Motion` (para transiciones y scroll fade effects) y `GSAP` (con `@gsap/react` para micro-animaciones complejas y fluidas).
- **Gráficos de Datos:** `ApexCharts` (`react-apexcharts`) estilizados para acoplarse al modo oscuro y claro.

---

## 2. Tipografía y Estructura de Texto

- **Fuente Principal:** `Inter` (cargada desde Google Fonts) con fallbacks `system-ui, sans-serif`.
- **Suavizado de Fuentes:** `.antialiased` (hace que las fuentes se rendericen más finas y estilizadas).
- **Jerarquía:**
  - **Títulos primarios / de Tarjetas:** `text-lg font-semibold leading-none tracking-tight`
  - **Descripciones / Textos secundarios:** `text-sm text-muted-foreground`
  - **Inputs y Contenido general:** `text-sm`

---

## 3. Paleta de Colores (Formato OKLCH)

El proyecto utiliza el moderno formato de color **OKLCH** para obtener mayor consistencia perceptiva y control del brillo en pantallas modernas. Los colores clave son:

### Colores Base (Light Mode)
- **Fondo General (`--background`):** `oklch(0.99 0.005 180)` (un blanco purificado muy suave con un toque verde-azulado extremadamente sutil).
- **Texto Principal (`--foreground`):** `oklch(0.2 0.02 180)`
- **Fondo de Tarjetas (`--card`):** `oklch(1 0 0)` (blanco puro)
- **Texto de Tarjetas (`--card-foreground`):** `oklch(0.2 0.02 180)`
- **Bordes (`--border`):** `oklch(0.9 0.01 180)`
- **Inputs (`--input`):** `oklch(0.9 0.01 180)`

### Colores Base (Dark Mode)
- **Fondo General (`--background`):** `oklch(0.12 0.01 180)` (un gris oscuro profundo con un matiz verde azulado oscuro muy elegante).
- **Texto Principal (`--foreground`):** `oklch(0.95 0.01 180)`
- **Fondo de Tarjetas (`--card`):** `oklch(0.16 0.02 180)` (un tono ligeramente más claro que el fondo general para dar elevación)
- **Bordes (`--border`):** `oklch(0.24 0.02 180)`

---

## 4. Paletas de Acento Dinámicas

La aplicación cuenta con 4 temas de acento dinámicos que se aplican agregando el atributo `data-accent` al elemento `<html>` (por ejemplo: `<html data-accent="teal">`):

| Acento | ID | Primary (`--primary`) | Primary Foreground | Secondary (`--secondary`) |
| :--- | :--- | :--- | :--- | :--- |
| **Verde azulado (Default)** | `teal` | `oklch(0.45 0.08 180)` | `oklch(0.98 0.01 180)` | `oklch(0.92 0.03 180)` |
| **Azul** | `blue` | `oklch(0.49 0.15 250)` | `oklch(0.98 0.01 250)` | `oklch(0.92 0.04 250)` |
| **Violeta** | `violet`| `oklch(0.5 0.18 300)`  | `oklch(0.98 0.01 300)` | `oklch(0.92 0.05 300)` |
| **Ámbar** | `amber` | `oklch(0.62 0.15 75)`  | `oklch(0.2 0.04 75)`   | `oklch(0.93 0.05 75)`  |

---

## 5. Efecto Estrella: Glassmorphism Premium

El diseño resalta gracias a su efecto de vidrio esmerilado que se aplica a las tarjetas principales utilizando variables de CSS y propiedades de backdrop-filter:

### Modo Claro (Light Glass)
- **Fondo (`--glass-bg`):** `rgba(255, 255, 255, 0.91)` (blanco translúcido de alta opacidad)
- **Borde (`--glass-border`):** `rgba(226, 232, 240, 0.90)` (borde ultra-fino y nítido)
- **Sombra (`--glass-shadow`):** 
  `0 12px 30px -10px rgba(0, 0, 0, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.98)` (sombra suave de caída con iluminación interna blanca para dar volumen tridimensional)

### Modo Oscuro (Dark Glass)
- **Fondo (`--glass-bg`):** `rgba(20, 26, 40, 0.65)` (un azul/pizarra oscuro semi-transparente muy sofisticado)
- **Borde (`--glass-border`):** `rgba(255, 255, 255, 0.09)` (borde sutil brillante)
- **Sombra (`--glass-shadow`):**
  `0 16px 48px -12px rgba(0, 0, 0, 0.5), 0 2px 12px -2px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 rgba(255, 255, 255, 0.02)`

### Implementación CSS/Tailwind del Glassmorphism:
Para aplicar este efecto a una tarjeta, usa los siguientes estilos combinados:
```html
<div class="rounded-3xl p-6 transition-colors duration-300" 
     style="background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow);">
  <!-- Contenido -->
</div>
```

---

## 6. Tarjetas (Cards)

- **Tarjetas Estándar:**
  - Esquinas: `rounded-[20px]` o `rounded-3xl`
  - Borde: `border` (usa el color `--border`)
  - Fondo: `bg-card`
  - Texto: `text-card-foreground`
  - Sombra: `shadow-none` (para diseño plano) o `var(--glass-shadow)` para el efecto de relieve.
- **Estructura Interna:**
  - Separación vertical interna estándar: `space-y-1.5` en cabeceras.
  - Padding general de tarjeta: `p-6` o `p-6 md:p-8` para pantallas más grandes.

---

## 7. Botones (Buttons)

- **Forma:** Esquinas de borde redondeado grandes (`rounded-xl`, equivalente a `12px`).
- **Estados de Foco:** Anillo de foco sutil de 2 píxeles (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`).
- **Variantes de Estilo:**
  - **Primario:** `bg-primary text-primary-foreground hover:opacity-90` (color de acento sólido).
  - **Secundario:** `bg-secondary text-secondary-foreground hover:bg-secondary/80` (color más suave).
  - **Delineado (Outline):** `border border-input bg-background hover:bg-accent hover:text-accent-foreground`.
  - **Fantasma (Ghost):** `hover:bg-accent hover:text-accent-foreground` (sin fondo ni borde, solo cambia al hacer hover).

---

## 8. Campos de Entrada (Inputs y Selects)

- **Campos de Texto:**
  - Altura: `h-10` (40px)
  - Esquinas: `rounded-xl`
  - Bordes: `border border-input bg-background px-3 py-2`
  - Hover / Focus: Anillo al enfocar (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`).
- **Selectores (Dropdowns):**
  - Componente base: Radix UI Select.
  - Estilo de gatillo (Trigger): `flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring`
  - Estilo de contenido (Content/Popover): `rounded-xl border bg-popover text-popover-foreground shadow-md`

---

## Instrucciones para Antigravity al Crear un Nuevo Proyecto

Al iniciar tu próximo proyecto con **Antigravity**, puedes enviarle esta directiva:

> *"Quiero que uses el sistema de diseño y las tecnologías detalladas en el archivo `FRONTEND_DESIGN_SYSTEM.md`. Este sistema utiliza **Next.js 16**, **Tailwind CSS v4.0** y componentes de **shadcn/ui** (estilo `new-york` sobre Radix UI). Se caracteriza por una tipografía limpia con la fuente `Inter`, esquinas muy redondeadas (`rounded-xl` y `rounded-[20px]`/`3xl`), una paleta basada en variables de color de contraste perceptivo **OKLCH**, y sobre todo, un acabado de **glassmorphic** premium con fondos translúcidos, sombras ricas en profundidad e iluminación interna y desenfoque de fondo (`backdrop-filter: blur(20px)`)."*
