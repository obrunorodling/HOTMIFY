import { Currency } from '../types/index.ts';

export function formatCurrency(value: number, currency: Currency = 'BRL'): string {
  const safeValue = isNaN(value) ? 0 : value;
  
  if (currency === 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(safeValue);
  }

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(safeValue);
  }

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(safeValue);
}

export function formatNumber(value: number): string {
  const safeValue = isNaN(value) ? 0 : value;
  return new Intl.NumberFormat('pt-BR').format(safeValue);
}

export function formatPercent(value: number): string {
  const safeValue = isNaN(value) ? 0 : value;
  return safeValue.toFixed(2).replace('.', ',') + '%';
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateOnly(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}
