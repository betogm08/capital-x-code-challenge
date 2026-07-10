// Single peso <-> cents conversion point, so Math.round isn't scattered
// across services/repositories. Repositories only work in cents.
export function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100);
}

export function centsToPesos(cents: number): number {
  return Math.round(cents) / 100;
}
