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
  // CONMEBOL
  'brazil':                         ['brasil', 'brazil'],
  'argentina':                      ['argentina'],
  'uruguay':                        ['uruguai', 'uruguay'],
  'colombia':                       ['colombia'],
  'ecuador':                        ['equador', 'ecuador'],
  'bolivia':                        ['bolivia'],
  'venezuela':                      ['venezuela'],
  'chile':                          ['chile'],
  'paraguay':                       ['paraguai', 'paraguay'],
  'peru':                           ['peru'],
  // CONCACAF
  'united states':                  ['estados unidos', 'eua', 'usa', 'united states'],
  'mexico':                         ['mexico'],
  'canada':                         ['canada'],
  'costa rica':                     ['costa rica'],
  'panama':                         ['panama'],
  'honduras':                       ['honduras'],
  'el salvador':                    ['el salvador'],
  'jamaica':                        ['jamaica'],
  'trinidad and tobago':            ['trinidad e tobago', 'trinidad and tobago'],
  'haiti':                          ['haiti'],
  'cuba':                           ['cuba'],
  'guatemala':                      ['guatemala'],
  // UEFA
  'germany':                        ['alemanha', 'germany'],
  'spain':                          ['espanha', 'spain'],
  'france':                         ['franca', 'france'],
  'england':                        ['inglaterra', 'england'],
  'portugal':                       ['portugal'],
  'netherlands':                    ['holanda', 'paises baixos', 'netherlands'],
  'belgium':                        ['belgica', 'belgium'],
  'italy':                          ['italia', 'italy'],
  'denmark':                        ['dinamarca', 'denmark'],
  'switzerland':                    ['suica', 'switzerland'],
  'austria':                        ['austria'],
  'turkey':                         ['turquia', 'turkey', 'turkiye'],
  'poland':                         ['polonia', 'poland'],
  'ukraine':                        ['ucrania', 'ukraine'],
  'serbia':                         ['servia', 'serbia'],
  'scotland':                       ['escocia', 'scotland'],
  'wales':                          ['gales', 'wales'],
  'croatia':                        ['croacia', 'croatia'],
  'czechia':                        ['republica tcheca', 'czechia', 'czech republic'],
  'czech republic':                 ['republica tcheca', 'czechia'],
  'slovakia':                       ['eslovaquia', 'slovakia'],
  'slovenia':                       ['eslovenia', 'slovenia'],
  'hungary':                        ['hungria', 'hungary'],
  'romania':                        ['romenia', 'romania'],
  'greece':                         ['grecia', 'greece'],
  'albania':                        ['albania'],
  'norway':                         ['noruega', 'norway'],
  'sweden':                         ['suecia', 'sweden'],
  'georgia':                        ['georgia', 'georgia'],
  'iceland':                        ['islandia', 'iceland'],
  'finland':                        ['finlandia', 'finland'],
  'north macedonia':                ['macedonia do norte', 'north macedonia'],
  'bosnia and herzegovina':         ['bosnia e herzegovina', 'bosnia and herzegovina', 'bosnia'],
  'montenegro':                     ['montenegro'],
  'luxembourg':                     ['luxemburgo', 'luxembourg'],
  // CAF
  'morocco':                        ['marrocos', 'morocco'],
  'senegal':                        ['senegal'],
  'nigeria':                        ['nigeria'],
  'cameroon':                       ['camaroes', 'cameroon'],
  'south africa':                   ['africa do sul', 'south africa'],
  'ghana':                          ['gana', 'ghana'],
  'egypt':                          ['egito', 'egypt'],
  'algeria':                        ['argelia', 'algeria'],
  'tunisia':                        ['tunisia'],
  'mali':                           ['mali'],
  'democratic republic of congo':   ['republica democratica do congo', 'dr congo', 'rdc', 'congo dr'],
  'dr congo':                       ['republica democratica do congo', 'dr congo', 'rdc'],
  "cote d ivoire":                  ['costa do marfim', 'ivory coast', 'cote divoire'],
  'ivory coast':                    ['costa do marfim', 'cote divoire'],
  'angola':                         ['angola'],
  'zambia':                         ['zambia', 'zambia'],
  'kenya':                          ['quenia', 'kenya'],
  'tanzania':                       ['tanzania', 'tanzania'],
  'mozambique':                     ['mocambique', 'mozambique'],
  'cape verde':                     ['cabo verde', 'cape verde'],
  'benin':                          ['benin'],
  'namibia':                        ['namibia', 'namibia'],
  'uganda':                         ['uganda'],
  'ethiopia':                       ['etiopia', 'ethiopia'],
  'rwanda':                         ['ruanda', 'rwanda'],
  'equatorial guinea':              ['guine equatorial', 'equatorial guinea'],
  'guinea':                         ['guine', 'guinea'],
  'gabon':                          ['gabao', 'gabon'],
  'burkina faso':                   ['burkina faso'],
  'zimbabwe':                       ['zimbabue', 'zimbabwe'],
  'comoros':                        ['comores', 'comoros'],
  // AFC
  'japan':                          ['japao', 'japan'],
  'south korea':                    ['coreia do sul', 'south korea'],
  'korea republic':                 ['coreia do sul', 'south korea'],
  'iran':                           ['ira', 'iran'],
  'saudi arabia':                   ['arabia saudita', 'saudi arabia'],
  'australia':                      ['australia'],
  'qatar':                          ['catar', 'qatar'],
  'indonesia':                      ['indonesia'],
  'iraq':                           ['iraque', 'iraq'],
  'uzbekistan':                     ['uzbequistao', 'uzbekistan'],
  'jordan':                         ['jordania', 'jordan'],
  'oman':                           ['oma', 'oman'],
  'bahrain':                        ['barem', 'bahrain'],
  'united arab emirates':           ['emirados arabes', 'uae', 'united arab emirates'],
  'china':                          ['china'],
  'india':                          ['india'],
  'kyrgyzstan':                     ['quirguistao', 'kyrgyzstan'],
  'tajikistan':                     ['tajiquistao', 'tajikistan'],
  'thailand':                       ['tailandia', 'thailand'],
  'north korea':                    ['coreia do norte', 'north korea'],
  'palestine':                      ['palestina', 'palestine'],
  'kuwait':                         ['kuweit', 'kuwait'],
  // OFC
  'new zealand':                    ['nova zelandia', 'new zealand'],
  'fiji':                           ['fiji'],
  'papua new guinea':               ['papua nova guine', 'papua new guinea'],
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

// Bloqueio manual: jogadores reais que existem no banco do TheSportsDB mas que sabidamente
// NÃO disputam a Copa 2026 (aposentados, presos, etc). Adicione novos casos aqui conforme surgirem.
const BLOCKED_PLAYER_NAMES = new Set(['robinho'].map(normalizeName));

// Referência para cálculo de idade (início da Copa 2026)
const WORLD_CUP_REFERENCE_DATE = new Date('2026-06-11');
// Limite generoso: serve só para descartar lendas claramente aposentadas (ex: Ronaldinho, Kaká).
// Não pode ser muito baixo, pois jogadores em atividade real (ex: Cristiano Ronaldo, 41 anos
// na Copa 2026) têm idade parecida com a de aposentados — por isso casos específicos como
// "Robinho" vão na lista de bloqueio manual acima, não no corte de idade.
const MAX_PLAYER_AGE = 44;

function isLikelyActiveIn2026(player: any): boolean {
  const name = normalizeName(player.strPlayer || '');
  if (BLOCKED_PLAYER_NAMES.has(name)) return false;

  // Status explícito de aposentado (quando a API informa)
  if (typeof player.strStatus === 'string' && /retired|aposentad/i.test(player.strStatus)) return false;

  // Filtro de idade: descarta jogadores muito acima da idade normal de atividade
  if (player.dateBorn) {
    const birth = new Date(player.dateBorn);
    if (!isNaN(birth.getTime())) {
      let age = WORLD_CUP_REFERENCE_DATE.getFullYear() - birth.getFullYear();
      const beforeBirthday =
        WORLD_CUP_REFERENCE_DATE.getMonth() < birth.getMonth() ||
        (WORLD_CUP_REFERENCE_DATE.getMonth() === birth.getMonth() && WORLD_CUP_REFERENCE_DATE.getDate() < birth.getDate());
      if (beforeBirthday) age--;
      if (age > MAX_PLAYER_AGE) return false;
    }
  }

  return true;
}

// Busca jogadores reais via TheSportsDB, filtrando apenas seleções da Copa 2026
// e descartando jogadores aposentados/muito velhos/bloqueados manualmente.
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
      .filter((p) => p.strSport === 'Soccer' && p.strNationality && isQualifiedNation(p.strNationality) && isLikelyActiveIn2026(p))
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
