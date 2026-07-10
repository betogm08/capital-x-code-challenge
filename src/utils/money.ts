// Único punto de conversión peso <-> centavo, para que el Math.round no esté
// esparcido entre services/repositories. Los repositories solo trabajan en centavos.
export function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100);
}

export function centsToPesos(cents: number): number {
  return Math.round(cents) / 100;
}
