export type DebtType = 'tarjeta_credito' | 'prestamo_personal' | 'prestamo_auto' | 'prestamo_hipotecario' | 'otro';
export type StrategyType = 'avalancha' | 'bola_nieve';

export interface Debt {
  id: string;
  user_id: string;
  nombre: string;
  tipo: DebtType;
  monto_original: number;
  saldo_actual: number;
  tasa_interes_anual: number;
  fecha_corte: number | null;
  fecha_pago: number | null;
  pago_minimo: number;
  activa: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  debt_id: string;
  user_id: string;
  monto: number;
  fecha: string; // ISO date string (YYYY-MM-DD)
  nota: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  ingreso_mensual: number | null;
  excedente_mensual: number | null;
  estrategia: StrategyType;
  updated_at: string;
}
