'use client';

import React, { useState, useMemo, useRef } from 'react';
import MatchCard from './MatchCard';
import { Match, Prediction } from '@/types';
import { CaretDown, CaretUp, MagnifyingGlass, X } from '@phosphor-icons/react';

interface PredictionsAccordionListProps {
  matches: Match[];
  predictionsMap: Map<string, Prediction>;
  isAuthenticated: boolean;
}

// Normaliza texto para comparação sem acento/case
function normalize(s: string) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export default function PredictionsAccordionList({
  matches,
  predictionsMap,
  isAuthenticated
}: PredictionsAccordionListProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lista dedupada de países
  const allCountries = useMemo(() => {
    const set = new Set<string>();
    matches.forEach(m => {
      if (m.home_team !== 'A confirmar') set.add(m.home_team);
      if (m.away_team !== 'A confirmar') set.add(m.away_team);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [matches]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setActiveCountry(null);
    if (val.length >= 3) {
      const norm = normalize(val);
      setSuggestions(allCountries.filter(c => normalize(c).includes(norm)).slice(0, 8));
    } else {
      setSuggestions([]);
    }
  };

  const selectCountry = (country: string) => {
    setActiveCountry(country);
    setQuery(country);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    setQuery('');
    setActiveCountry(null);
    setSuggestions([]);
  };

  // Filtra partidas pelo país ativo (ou todas)
  const filteredMatches = useMemo(() => {
    if (!activeCountry) return matches;
    return matches.filter(m => m.home_team === activeCountry || m.away_team === activeCountry);
  }, [matches, activeCountry]);

  // Agrupar partidas por Fase/Grupo
  const groups: Record<string, Match[]> = {};
  const groupOrder: string[] = [];

  filteredMatches.forEach((match) => {
    const key = match.group_name || match.stage;
    if (!groups[key]) {
      groups[key] = [];
      groupOrder.push(key);
    }
    groups[key].push(match);
  });

  // Ordenar grupos alfabética e cronologicamente
  groupOrder.sort((a, b) => {
    const cleanA = a.trim();
    const cleanB = b.trim();
    const isGroupA = cleanA.toLowerCase().startsWith('grupo ');
    const isGroupB = cleanB.toLowerCase().startsWith('grupo ');
    if (isGroupA && isGroupB) {
      return cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
    }
    if (isGroupA) return -1;
    if (isGroupB) return 1;

    const stageOrder = [
      'fase de grupos',
      'fase de 32',
      'oitavas de final',
      'quartas de final',
      'semifinal',
      'decisão do 3º lugar',
      'final'
    ];
    const indexA = stageOrder.indexOf(cleanA.toLowerCase());
    const indexB = stageOrder.indexOf(cleanB.toLowerCase());
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
  });




  // Expandir a primeira seção por padrão para melhorar a UX inicial
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(
    groupOrder.length > 0 ? groupOrder[0] : null
  );

  const toggleExpand = (groupKey: string) => {
    if (activeCountry) return; // com filtro ativo todos ficam abertos
    setExpandedGroupId(expandedGroupId === groupKey ? null : groupKey);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* ── Busca por país ──────────────────────────────────────────────── */}
      <div className="relative">
        <div className="relative flex items-center">
          <MagnifyingGlass size={16} className="absolute left-3.5 text-secondary pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Buscar por país… (ex: Brasil)"
            className="w-full pl-9 pr-10 py-3 bg-card border border-border-custom rounded-2xl text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:border-accent-custom transition-colors"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 text-secondary hover:text-primary transition-colors cursor-pointer"
              aria-label="Limpar busca"
            >
              <X size={16} weight="bold" />
            </button>
          )}
        </div>

        {/* Sugestões */}
        {suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1.5 w-full bg-card border border-border-custom rounded-2xl shadow-2xl overflow-hidden divide-y divide-border-custom/40">
            {suggestions.map(country => (
              <li key={country}>
                <button
                  onClick={() => selectCountry(country)}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-primary hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  {country}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Badge do filtro ativo */}
      {activeCountry && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary font-bold">Filtrando por:</span>
          <span className="flex items-center gap-1.5 bg-accent-custom/10 text-accent-custom border border-accent-custom/20 px-3 py-1 rounded-full text-xs font-black">
            {activeCountry}
            <button onClick={clearSearch} className="hover:opacity-70 cursor-pointer" aria-label="Remover filtro">
              <X size={12} weight="bold" />
            </button>
          </span>
          <span className="text-xs text-secondary">
            {filteredMatches.length} jogo{filteredMatches.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      {groupOrder.map((groupKey) => {
        const groupMatches = groups[groupKey];
        const isOpen = !!activeCountry || expandedGroupId === groupKey;
        
        // Pega a primeira letra da chave para o círculo (ex: "Grupo A" -> "A")
        const badgeLetter = groupKey.startsWith('Grupo ')
          ? groupKey.replace('Grupo ', '').trim().substring(0, 1)
          : '🏆';

        // Conta quantos jogos nesse grupo o usuário já palpitou
        const predictedCount = groupMatches.filter((m) => predictionsMap.has(m.id)).length;

        return (
          <div key={groupKey} className="border border-border-custom bg-card rounded-2xl overflow-hidden transition-all duration-300 shadow-md">
            {/* Header do Grupo/Fase */}
            <div
              onClick={() => toggleExpand(groupKey)}
              className={`flex items-center justify-between p-4 cursor-pointer select-none bg-card hover:bg-muted/70 transition-colors ${
                isOpen ? 'border-b border-border-custom' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase shrink-0 shadow-sm select-none">
                  {badgeLetter}
                </span>
                <h3 className="text-xs sm:text-sm font-black text-primary uppercase tracking-widest select-none">
                  {groupKey}
                </h3>
                <span className="text-[10px] bg-muted border border-border-custom/50 text-secondary px-2.5 py-0.5 rounded-full font-bold select-none whitespace-nowrap">
                  {predictedCount} de {groupMatches.length} palpitados
                </span>
              </div>

              <div className="flex items-center gap-2 text-secondary">
                {isOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
              </div>
            </div>

            {/* Grid de Jogos (MatchCards) */}
            {isOpen && (
              <div className="p-4 bg-muted/20 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupMatches.map((match) => {
                    const matchIndex = matches.findIndex((m) => m.id === match.id);
                    const matchNumber = matchIndex !== -1 ? matchIndex + 1 : undefined;
                    return (
                      <MatchCard
                        key={match.id}
                        match={match}
                        prediction={predictionsMap.get(match.id)}
                        isAuthenticated={isAuthenticated}
                        matchNumber={matchNumber}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
