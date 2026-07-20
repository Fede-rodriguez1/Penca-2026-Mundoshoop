// +8: resultado exacto
// +5: ganador correcto + diferencia de goles correcta
// +3: ganador correcto o empate
// +0: predicción incorrecta
export function calcPoints(
  predHome: number, predAway: number,
  realHome: number, realAway: number
): number {
  // Resultado exacto
  if (predHome === realHome && predAway === realAway) return 8;

  const predResult = Math.sign(predHome - predAway);
  const realResult = Math.sign(realHome - realAway);

  if (predResult !== realResult) return 0;

  // Empate no exacto → siempre 3
  if (predResult === 0) return 3;

  // Ganador correcto — verificar diferencia de goles
  const predDiff = Math.abs(predHome - predAway);
  const realDiff = Math.abs(realHome - realAway);
  if (predDiff === realDiff) return 5;

  return 3;
}
