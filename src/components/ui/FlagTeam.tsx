import React from 'react';

interface FlagTeamProps {
  flag: string; // Pode ser "BR", "US", "🇺🇸", "🇧🇷", etc.
  name: string;
  reverse?: boolean;
  className?: string;
}

// Converte emoji de bandeira ou código ISO para o código de 2 letras minúsculo (ex: "br", "us")
// Isso garante compatibilidade com o Windows, que não renderiza emojis de bandeira nativamente.
function getCountryCode(flag: string): string {
  if (!flag) return '';
  const trimmed = flag.trim();
  
  // Caso 1: Já é um código ISO de 2 letras (ex: "BR", "US")
  if (trimmed.length === 2 && /^[a-zA-Z]{2}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  
  // Caso 2: É um emoji de bandeira (ex: "🇧🇷")
  // Varre os code points do emoji para extrair os caracteres de região originais
  try {
    const codePoints = Array.from(trimmed);
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
  const countryCode = getCountryCode(flag);

  return (
    <div className={`flex items-center gap-2.5 ${reverse ? 'flex-row-reverse text-right' : 'flex-row'} ${className}`}>
      {countryCode ? (
        <img
          src={`https://flagcdn.com/w40/${countryCode}.png`}
          srcSet={`https://flagcdn.com/w80/${countryCode}.png 2x`}
          alt={`Bandeira do(a) ${name}`}
          className="w-6 h-4.5 object-cover rounded shadow-sm select-none shrink-0 border border-slate-700/50"
          loading="lazy"
        />
      ) : (
        <span className="text-xl leading-none select-none shrink-0" role="img" aria-label={`Bandeira do(a) ${name}`}>
          {flag}
        </span>
      )}
      <span className="font-bold text-slate-800 dark:text-slate-150 tracking-wide text-xs sm:text-sm md:text-base truncate">
        {name}
      </span>
    </div>
  );
}
