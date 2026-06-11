import React from 'react';

interface FlagTeamProps {
  flag: string; // Pode ser "BR", "US", "🇺🇸", "🇧🇷", etc.
  name: string;
  reverse?: boolean;
  className?: string;
}

// Dicionário de mapeamento robusto para seleções da Copa do Mundo e seus emojis correspondentes.
// Isso resolve o problema de renderização de emojis no Windows e mapeia subdivisões do Reino Unido (ex: Inglaterra).
const FLAG_MAP: Record<string, string> = {
  // Emojis exatos de bandeiras
  '🇺🇸': 'us',
  '🇲🇽': 'mx',
  '🇨🇦': 'ca',
  '🇯🇵': 'jp',
  '🇧🇷': 'br',
  '🇦🇷': 'ar',
  '🇪🇸': 'es',
  '🇩🇪': 'de',
  '🇫🇷': 'fr',
  '🇮🇹': 'it',
  '🏴󠁧󠁢󠁥󠁮󠁧󠁿': 'gb-eng',
  '🏴󠁧󠁢󠁳󠁣󠁴󠁿': 'gb-sct',
  '🏴󠁧󠁢󠁷󠁬󠁳󠁿': 'gb-wls',
  '🇸🇳': 'sn',
  '🇵🇹': 'pt',
  '🇺🇾': 'uy',
  '🇧🇪': 'be',
  '🇲🇦': 'ma',
  '🇳🇱': 'nl',
  '🇪🇨': 'ec',
  '🇭🇷': 'hr',
  '🇰🇷': 'kr',

  // Nomes de seleções em minúsculo (sem acentos e normalizado)
  'estados unidos': 'us',
  'eua': 'us',
  'usa': 'us',
  'méxico': 'mx',
  'mexico': 'mx',
  'canadá': 'ca',
  'canada': 'ca',
  'japão': 'jp',
  'japao': 'jp',
  'brasil': 'br',
  'argentina': 'ar',
  'espanha': 'es',
  'alemanha': 'de',
  'frança': 'fr',
  'franca': 'fr',
  'itália': 'it',
  'italia': 'it',
  'inglaterra': 'gb-eng',
  'senegal': 'sn',
  'portugal': 'pt',
  'uruguai': 'uy',
  'bélgica': 'be',
  'belgica': 'be',
  'marrocos': 'ma',
  'holanda': 'nl',
  'países baixos': 'nl',
  'paises baixos': 'nl',
  'equador': 'ec',
  'croácia': 'hr',
  'croacia': 'hr',
  'coreia do sul': 'kr',
  'coreia': 'kr',
  'sérvia': 'rs',
  'servia': 'rs',
  'suíça': 'ch',
  'suica': 'ch',
  'camarões': 'cm',
  'camaroes': 'cm',
  'gana': 'gh',
  'colômbia': 'co',
  'colombia': 'co',
  'chile': 'cl',
  'peru': 'pe',
  'paraguai': 'py',
  'venezuela': 've',
  'bolívia': 'bo',
  'bolivia': 'bo',
  'suécia': 'se',
  'suecia': 'se',
  'ucrânia': 'ua',
  'ucrania': 'ua',
  'turquia': 'tr',
  'costa rica': 'cr',
  'dinamarca': 'dk',
  'tunísia': 'tn',
  'tunisia': 'tn',
  'austrália': 'au',
  'australia': 'au',
  'polônia': 'pl',
  'polonia': 'pl',
  'arábia saudita': 'sa',
  'arabia saudita': 'sa',
  'catar': 'qa',
  'irã': 'ir',
  'ira': 'ir',
  'país de gales': 'gb-wls',
  'pais de gales': 'gb-wls',
  'wales': 'gb-wls',
  'escócia': 'gb-sct',
  'scotland': 'gb-sct',
  'irlanda do norte': 'gb-nir',
  'nigéria': 'ng',
  'nigeria': 'ng',
  'egito': 'eg',
  'argélia': 'dz',
  'argelia': 'dz',
  'costa do marfim': 'ci',
  'áfrica do sul': 'za',
  'africa do sul': 'za'
};

// Converte emoji de bandeira ou código ISO para o código de 2 letras minúsculo (ex: "br", "us")
function getCountryCode(flag: string, name: string): string {
  if (!flag) return '';
  const trimmedFlag = flag.trim();
  const cleanName = name ? name.trim().toLowerCase() : '';

  // 1. Verificar dicionário direto para emoji ou nome
  if (FLAG_MAP[trimmedFlag]) return FLAG_MAP[trimmedFlag];
  if (FLAG_MAP[cleanName]) return FLAG_MAP[cleanName];

  // 2. Caso seja código ISO de 2 letras digitado (ex: "BR", "US")
  if (trimmedFlag.length === 2 && /^[a-zA-Z]{2}$/.test(trimmedFlag)) {
    return trimmedFlag.toLowerCase();
  }

  // 3. Fallback de varredura de code points de emojis normais
  try {
    const codePoints = Array.from(trimmedFlag);
    const codes = codePoints
      .map(char => char.codePointAt(0))
      .filter(cp => cp !== undefined && cp >= 127462 && cp <= 127487)
      .map(cp => String.fromCharCode(cp! - 127397).toLowerCase());

    if (codes.length === 2) {
      return codes.join('');
    }
  } catch (e) {
    console.error('Erro ao converter emoji para ISO:', e);
  }

  return '';
}

export default function FlagTeam({ flag, name, reverse = false, className = '' }: FlagTeamProps) {
  const countryCode = getCountryCode(flag, name);

  return (
    <div className={`flex items-center gap-2.5 ${reverse ? 'flex-row-reverse text-right' : 'flex-row'} ${className} min-w-0`}>
      {countryCode ? (
        <img
          src={`https://flagcdn.com/w40/${countryCode}.png`}
          srcSet={`https://flagcdn.com/w80/${countryCode}.png 2x`}
          alt={`Bandeira do(a) ${name}`}
          className="w-6 h-4.5 object-cover rounded shadow-sm select-none shrink-0 border border-border-custom/50"
          loading="lazy"
        />
      ) : (
        <span className="text-xl leading-none select-none shrink-0" role="img" aria-label={`Bandeira do(a) ${name}`}>
          {flag}
        </span>
      )}
      <span
        style={{ color: 'var(--text-primary)' }}
        className="font-bold tracking-wide text-xs sm:text-sm md:text-base truncate min-w-0"
      >
        {name}
      </span>
    </div>
  );
}
