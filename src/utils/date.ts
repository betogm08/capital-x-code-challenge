// Normaliza a medianoche UTC para poder comparar contra fechas "YYYY-MM-DD"
// (que Date ya interpreta como UTC) sin que la hora actual introduzca
// diferencias de fracciones de día.
export function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}
