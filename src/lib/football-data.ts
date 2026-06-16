// Normaliza nome de time: remove acentos, lowercase, trim
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Mapa inglês (normalizado) → variantes em português (normalizadas)
// Cobre todos os 48 times da Copa 2026
const EN_TO_PT: Record<string, string[]> = {
  'brazil':                    ['brasil', 'brazil'],
  'argentina':                 ['argentina'],
  'uruguay':                   ['uruguai', 'uruguay'],
  'colombia':                  ['colombia', 'colombia'],
  'ecuador':                   ['equador', 'ecuador'],
  'bolivia':                   ['bolivia', 'bolivia'],
  'venezuela':                 ['venezuela'],
  'chile':                     ['chile'],
  'paraguay':                  ['paraguai', 'paraguay'],
  'peru':                      ['peru'],
  'united states':             ['estados unidos', 'eua', 'usa', 'united states'],
  'mexico':                    ['mexico', 'mexico'],
  'canada':                    ['canada', 'canada'],
  'costa rica':                ['costa rica'],
  'panama':                    ['panama', 'panama'],
  'honduras':                  ['honduras'],
  'el salvador':               ['el salvador'],
  'jamaica':                   ['jamaica'],
  'trinidad and tobago':       ['trinidad e tobago', 'trinidad and tobago'],
  'haiti':                     ['haiti'],
  'cuba':                      ['cuba'],
  'germany':                   ['alemanha', 'germany'],
  'spain':                     ['espanha', 'spain'],
  'france':                    ['franca', 'france'],
  'england':                   ['inglaterra', 'england'],
  'portugal':                  ['portugal'],
  'netherlands':               ['holanda', 'paises baixos', 'netherlands'],
  'belgium':                   ['belgica', 'belgium'],
  'italy':                     ['italia', 'italy'],
  'denmark':                   ['dinamarca', 'denmark'],
  'switzerland':               ['suica', 'switzerland'],
  'austria':                   ['austria'],
  'turkey':                    ['turquia', 'turkey', 'turkiye'],
  'poland':                    ['polonia', 'poland'],
  'ukraine':                   ['ucrania', 'ukraine'],
  'serbia':                    ['servia', 'serbia'],
  'scotland':                  ['escocia', 'scotland'],
  'wales':                     ['gales', 'wales'],
  'croatia':                   ['croacia', 'croatia'],
  'czechia':                   ['republica tcheca', 'czechia', 'czech republic'],
  'czech republic':            ['republica tcheca', 'czechia'],
  'slovakia':                  ['eslovaquia', 'slovakia'],
  'hungary':                   ['hungria', 'hungary'],
  'romania':                   ['romenia', 'romania'],
  'greece':                    ['grecia', 'greece'],
  'albania':                   ['albania'],
  'norway':                    ['noruega', 'norway'],
  'sweden':                    ['suecia', 'sweden'],
  'morocco':                   ['marrocos', 'morocco'],
  'senegal':                   ['senegal'],
  'nigeria':                   ['nigeria'],
  'cameroon':                  ['camaroes', 'cameroon'],
  'south africa':              ['africa do sul', 'south africa'],
  'ghana':                     ['gana', 'ghana'],
  'egypt':                     ['egito', 'egypt'],
  'algeria':                   ['argelia', 'algeria'],
  'tunisia':                   ['tunisia'],
  'mali':                      ['mali'],
  'democratic republic of congo': ['republica democratica do congo', 'dr congo', 'congo'],
  "cote d ivoire":             ['costa do marfim', 'ivory coast'],
  'ivory coast':               ['costa do marfim'],
  'japan':                     ['japao', 'japan'],
  'south korea':               ['coreia do sul', 'south korea'],
  'korea republic':            ['coreia do sul', 'south korea'],
  'saudi arabia':              ['arabia saudita', 'saudi arabia'],
  'iran':                      ['ira', 'iran'],
  'australia':                 ['australia'],
  'qatar':                     ['catar', 'qatar'],
  'indonesia':                 ['indonesia'],
  'iraq':                      ['iraque', 'iraq'],
  'new zealand':               ['nova zelandia', 'new zealand'],
  'china':                     ['china'],
  'india':                     ['india'],
  'united arab emirates':      ['emirados arabes', 'uae'],
};

// Mapa reverso: normalized PT → English key (construído uma vez)
const PT_TO_EN_KEY = new Map<string, string>();
for (const [enKey, ptVariants] of Object.entries(EN_TO_PT)) {
  const normalizedEn = normalizeName(enKey);
  PT_TO_EN_KEY.set(normalizedEn, enKey);
  for (const pt of ptVariants) {
    PT_TO_EN_KEY.set(normalizeName(pt), enKey);
  }
}

// Retorna a chave inglesa para um nome de time (português ou inglês)
export function getEnglishKey(teamName: string): string {
  const normalized = normalizeName(teamName);
  return PT_TO_EN_KEY.get(normalized) || normalized;
}

// Verifica se dois nomes de time correspondem ao mesmo time
export function teamsMatch(nameA: string, nameB: string): boolean {
  if (normalizeName(nameA) === normalizeName(nameB)) return true;
  return getEnglishKey(nameA) === getEnglishKey(nameB);
}

// Verifica se uma nacionalidade corresponde a uma das 48 seleções da Copa 2026
export function isQualifiedNation(nationality: string): boolean {
  return PT_TO_EN_KEY.has(normalizeName(nationality));
}

export interface PlayerSearchResult {
  name: string;
  team: string | null;
  nationality: string | null;
  thumb: string | null;
}

// Busca jogadores reais via TheSportsDB, filtrando apenas seleções da Copa 2026
export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(trimmed)}`,
      { signal: controller.signal, next: { revalidate: 0 } }
    );
    clearTimeout(timeout);
    if (!res.ok) return [];
    const json = await res.json();
    const players = (json.player || []) as any[];
    return players
      .filter((p) => p.strSport === 'Soccer' && p.strNationality && isQualifiedNation(p.strNationality))
      .slice(0, 8)
      .map((p) => ({
        name: p.strPlayer as string,
        team: (p.strTeam as string) || null,
        nationality: (p.strNationality as string) || null,
        thumb: (p.strCutout || p.strThumb || null) as string | null,
      }));
  } catch {
    return [];
  }
}

// Verifica se um nome digitado (completo, só sobrenome, ou com inicial — ex: "Mbappé",
// "K. Havertz", "Cristiano Ronaldo") corresponde ao nome completo retornado pela API.
function namesMatch(input: string, fullName: string): boolean {
  const normInput = normalizeName(input);
  const normFull = normalizeName(fullName);
  if (normFull === normInput) return true;

  const fullParts = normFull.split(/\s+/);
  // Nome digitado é uma única palavra que bate com algum "pedaço" do nome completo
  // (ex: "mbappe" bate com "kylian mbappe", "ronaldo" bate com "cristiano ronaldo")
  if (fullParts.includes(normInput) && normInput.length >= 3) return true;

  // Compara o último "sobrenome" de cada lado (cobre "k havertz" vs "kai havertz")
  const inputParts = normInput.split(/\s+/);
  const lastInput = inputParts[inputParts.length - 1];
  const lastFull = fullParts[fullParts.length - 1];
  if (lastInput === lastFull && lastInput.length >= 3) return true;

  return false;
}

// Confirma que um nome de jogador corresponde a um jogador real (nome completo, sobrenome
// ou apelido) de uma das seleções da Copa 2026 (usado como validação de servidor).
export async function validatePlayerName(name: string): Promise<{ valid: boolean; canonicalName?: string }> {
  const results = await searchPlayers(name);
  const match = results.find((r) => namesMatch(name, r.name));
  if (match) return { valid: true, canonicalName: match.name };
  return { valid: false };
}

export interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
}

// Busca partidas finalizadas da Copa 2026 no football-data.org
export async function fetchFinishedWCMatches(): Promise<FDMatch[]> {
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) throw new Error('FOOTBALL_API_KEY não configurada.');

  const res = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED&season=2026',
    {
      headers: { 'X-Auth-Token': apiKey },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`football-data.org error ${res.status}: ${text}`);
  }

  const json = await res.json();
  return (json.matches || []) as FDMatch[];
}

// Busca foto de jogador via TheSportsDB com timeout de 2s para não travar a página
export async function fetchPlayerImage(playerName: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const encoded = encodeURIComponent(playerName);
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encoded}`,
      { signal: controller.signal, next: { revalidate: 3600 } }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    const player = json.player?.[0];
    return player?.strCutout || player?.strThumb || null;
  } catch {
    return null;
  }
}
