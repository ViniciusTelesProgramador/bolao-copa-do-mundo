export interface SimpleScore {
  home_score: number;
  away_score: number;
}

export interface SimpleResult {
  home_score: number | null;
  away_score: number | null;
}

/**
 * Calcula os pontos obtidos em um palpite com base no resultado real do jogo.
 * Regras:
 * - Acertar placar exato: 3 pontos
 * - Acertar vencedor + diferença de gols (apenas para jogos não empatados): 2 pontos
 * - Acertar apenas o vencedor ou o empate não-exato: 1 ponto
 * - Errar: 0 pontos
 */
export function calculatePoints(
  prediction: SimpleScore,
  result: SimpleResult
): number {
  const { home_score: predHome, away_score: predAway } = prediction;
  const { home_score: realHome, away_score: realAway } = result;

  // Se o resultado real ainda não foi preenchido, os pontos são 0 (ou nulos no banco)
  if (realHome === null || realAway === null) {
    return 0;
  }

  // 1. Acertar placar exato: 3 pontos
  if (predHome === realHome && predAway === realAway) {
    return 3;
  }

  const realDiff = realHome - realAway;
  const predDiff = predHome - predAway;

  // 2. Acertar vencedor + diferença de gols (apenas para jogos decididos)
  if (realDiff === predDiff && realDiff !== 0 && Math.sign(realDiff) === Math.sign(predDiff)) {
    return 2;
  }

  // 3. Acertar apenas o vencedor ou o empate não-exato
  if (Math.sign(realDiff) === Math.sign(predDiff)) {
    return 1;
  }

  // 4. Errar
  return 0;
}
