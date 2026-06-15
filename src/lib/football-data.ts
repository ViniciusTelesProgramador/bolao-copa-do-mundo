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
  'colombia':                  ['colombia', 'colômbia', 'colombia'],
  'ecuador':                   ['equador', 'ecuador'],
  'bolivia':                   ['bolivia', 'bolívia', 'bolivia'],
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
  "cote d'ivoire":             ['costa do marfim', 'ivory coast'],
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

// Mapa reverso: normalized PT → English key
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

// Busca foto de jogador via TheSportsDB (sem API key)
export async function fetchPlayerImage(playerName: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(playerName);
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encoded}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const player = json.player?.[0];
    return player?.strCutout || player?.strThumb || null;
  } catch {
    return null;
  }
}
