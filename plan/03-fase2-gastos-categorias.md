# Módulo 03 — Fase 2: Gastos y Categorías

Depende de: Módulo 01 completo y estable.

## Objetivo

Registrar gastos manualmente, clasificarlos por categoría, y obtener visibilidad de en qué se está gastando más, para poder identificar dónde recortar y liberar más excedente hacia las deudas. Este módulo NO incluye OCR todavía (eso es el Módulo 04) — aquí los gastos se ingresan a mano, rápido.

## 1. Estructura de rutas nuevas

```
src/app/(dashboard)/
  gastos/
    page.tsx              -> Lista de gastos + filtros
    nuevo/page.tsx          -> Formulario rápido de gasto
  categorias/
    page.tsx                -> Gestión de categorías (crear/editar/eliminar)
```

## 2. Pantalla: Nuevo gasto (`/gastos/nuevo`)

Esta pantalla debe ser la más rápida de toda la app — el objetivo es que registrar un gasto tome menos de 10 segundos. Campos:

- Comercio (input con autocompletado basado en comercios usados anteriormente, vía query a `expenses` agrupado por `comercio`).
- Monto (input numérico, teclado numérico en mobile).
- Categoría (selector visual de chips/badges con ícono y color, no un dropdown tradicional — más rápido de tocar).
- Fecha (default: hoy, raramente se cambia).
- Nota opcional (colapsada por defecto, no agregar fricción).

Después de guardar, mostrar un toast de confirmación y quedarse en la misma pantalla lista para el siguiente gasto (muchas veces se registran varios seguidos).

## 3. Pantalla: Lista de gastos (`/gastos`)

- Agrupados por fecha (Hoy, Ayer, esta semana, este mes).
- Filtro por categoría y por rango de fechas.
- Cada gasto muestra: ícono de categoría, comercio, monto, fecha.
- Total del período visible arriba.

## 4. Dashboard de gastos — vista de análisis

Agregar una sección (puede ser un tab dentro de `/gastos` o una pantalla `/gastos/analisis`):

- **Gráfico de dona** (Recharts `PieChart`) de gasto por categoría del mes actual.
- **Comparativa mes anterior vs mes actual** por categoría, con indicador de subida/bajada (esto es lo que responde "en qué debo gastar menos").
- **Top 5 comercios** donde más se gasta.
- **Card de "dinero disponible para deudas"**: ingreso mensual (de `user_settings`) menos total de gastos del mes = excedente real disponible. Esto conecta directamente con el módulo de deudas, ya que el excedente calculado aquí puede sugerir actualizar el `excedente_mensual` en configuración.

## 5. Gestión de categorías (`/categorias`)

CRUD simple. Las categorías por defecto (creadas en Módulo 00) no se pueden eliminar, solo editar nombre/color/ícono. El usuario puede agregar categorías personalizadas.

## 6. Presupuestos por categoría (opcional dentro de esta fase)

Tabla `budgets` ya existe desde el Módulo 00. Permitir definir un límite mensual por categoría y mostrar una barra de progreso en la vista de análisis (ej. "Restaurantes: $85 de $150 — 57%"). Si se supera el 90% del presupuesto, mostrar alerta visual en el dashboard principal, no solo en la pantalla de gastos — el usuario debe verlo sin tener que ir a buscarlo.

## 7. Server Actions necesarias

`src/app/actions/expenses.ts`:
- `crearGasto(data)`
- `actualizarGasto(id, data)`
- `eliminarGasto(id)`
- `obtenerResumenPorCategoria(mes, anio)`
- `obtenerComerciosFrecuentes()` — para el autocompletado

`src/app/actions/categories.ts`:
- `crearCategoria(data)`
- `actualizarCategoria(id, data)`
- `eliminarCategoria(id)` (bloquear si `es_default = true`)

`src/app/actions/budgets.ts`:
- `definirPresupuesto(categoriaId, monto, mes, anio)`
- `obtenerProgresoPresupuestos(mes, anio)`

## 8. Checklist de salida de este módulo

- [ ] Registrar un gasto toma menos de 10 segundos en mobile
- [ ] Autocompletado de comercios funciona
- [ ] Gráfico de gasto por categoría muestra datos reales
- [ ] Comparativa mes a mes funcional
- [ ] Card de excedente disponible calcula correctamente (ingreso - gastos)
- [ ] Presupuestos opcionales funcionando con alerta al superar 90%
