export function updateMastery(previousScore: number, correctness: number, completeness: number): number {
  const observation = correctness * 0.6 + completeness * 0.4;
  return Math.round(previousScore * 0.7 + observation * 0.3);
}
