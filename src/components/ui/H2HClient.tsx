'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowsLeftRight, Trophy, Target, Sword } from '@phosphor-icons/react';
import { H2HData } from '@/types';

interface ProfileBasic { id: string; name: string; avatar_url: string | null; }

interface Props {
  profiles: ProfileBasic[];
  data: H2HData | null;
  userIdA: string | null;
  userIdB: string | null;
}

const COLORS = ['bg-red-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-pink-500','bg-indigo-500','bg-cyan-500'];
const avatarBg = (name: string) => COLORS[(name.charCodeAt(0) || 0) % COLORS.length];

function Avatar({ p, size = 16 }: { p: ProfileBasic; size?: number }) {
  const dim = `w-${size} h-${size}`;
  return p.avatar_url ? (
    <img src={p.avatar_url} alt={p.name} className={`${dim} rounded-full object-cover border-2 border-border-custom shrink-0`} />
  ) : (
    <span className={`${dim} rounded-full flex items-center justify-center text-white font-black text-xl shrink-0 select-none ${avatarBg(p.name)}`}>
      {p.name.charAt(0).toUpperCase()}
    </span>
  );
}

function StatBar({ labelA, labelB, valA, valB, fmt = (v: number) => String(v) }: {
  labelA: string; labelB: string; valA: number; valB: number; fmt?: (v: number) => string;
}) {
  const total = valA + valB;
  const pctA = total === 0 ? 50 : Math.round((valA / total) * 100);
  const aWins = valA > valB;
  const bWins = valB > valA;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-black">
        <span className={aWins ? 'text-accent-custom' : 'text-secondary'}>{fmt(valA)}</span>
        <span className={bWins ? 'text-accent-custom' : 'text-secondary'}>{fmt(valB)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
        <div
          className={`h-full rounded-full transition-all duration-700 ${aWins ? 'bg-accent-custom' : bWins ? 'bg-secondary/40' : 'bg-secondary/40'}`}
          style={{ width: `${pctA}%` }}
        />
        <div className="flex-1 bg-muted" />
      </div>
      <div className="flex items-center justify-between text-[9px] font-bold text-secondary uppercase tracking-wide">
        <span>{labelA.split(' ')[0]}</span>
        <span>{labelB.split(' ')[0]}</span>
      </div>
    </div>
  );
}

function StatRow({ icon, label, valA, valB, higherIsBetter = true, fmt = (v: number) => String(v) }: {
  icon: React.ReactNode; label: string; valA: number; valB: number; higherIsBetter?: boolean; fmt?: (v: number) => string;
}) {
  const aLeads = higherIsBetter ? valA > valB : valA < valB;
  const bLeads = higherIsBetter ? valB > valA : valB < valA;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border-custom/40 last:border-0">
      <div className="flex-1 text-right">
        <span className={`text-sm font-black ${aLeads ? 'text-accent-custom' : 'text-primary'}`}>{fmt(valA)}</span>
        {aLeads && <span className="text-[8px] text-accent-custom ml-1">◄</span>}
      </div>
      <div className="flex flex-col items-center gap-1 w-28 shrink-0">
        <div className="flex items-center gap-1.5 text-secondary">
          {icon}
          <span className="text-[9px] font-black text-secondary uppercase tracking-wider">{label}</span>
        </div>
      </div>
      <div className="flex-1 text-left">
        {bLeads && <span className="text-[8px] text-accent-custom mr-1">►</span>}
        <span className={`text-sm font-black ${bLeads ? 'text-accent-custom' : 'text-primary'}`}>{fmt(valB)}</span>
      </div>
    </div>
  );
}

export default function H2HClient({ profiles, data, userIdA, userIdB }: Props) {
  const router = useRouter();
  const [selA, setSelA] = useState(userIdA ?? '');
  const [selB, setSelB] = useState(userIdB ?? '');
  const [search, setSearch] = useState('');

  const filtered = profiles.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const profileA = profiles.find(p => p.id === (data ? data.userA.id : selA));
  const profileB = profiles.find(p => p.id === (data ? data.userB.id : selB));

  function handleCompare() {
    if (selA && selB && selA !== selB) {
      router.push(`/h2h?a=${selA}&b=${selB}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-16 bg-base text-primary min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-primary uppercase tracking-wider flex items-center gap-2.5">
          <ArrowsLeftRight size={26} weight="fill" className="text-accent-custom" />
          Comparar jogadores
        </h1>
        <p className="text-xs text-secondary font-bold mt-1">Estatísticas cara a cara entre dois participantes</p>
      </div>

      {/* Selector */}
      <div className="bg-card border border-border-custom rounded-2xl p-4 mb-8">
        <input
          type="text"
          placeholder="Buscar participante..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border-custom rounded-xl text-sm text-primary placeholder:text-secondary/40 focus:outline-none focus:border-accent-custom mb-3"
        />
        <div className="space-y-1.5 max-h-40 overflow-y-auto mb-4">
          {filtered.map(p => {
            const isA = selA === p.id;
            const isB = selB === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (isA) { setSelA(''); return; }
                  if (isB) { setSelB(''); return; }
                  if (!selA) { setSelA(p.id); return; }
                  if (!selB) { setSelB(p.id); return; }
                  setSelA(p.id);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isA ? 'bg-accent-custom/10 border-accent-custom/40 text-accent-custom' :
                  isB ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                  'bg-muted/40 border-transparent hover:border-border-custom text-primary'
                }`}
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.name} className="w-7 h-7 rounded-full object-cover border border-border-custom shrink-0" />
                ) : (
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 ${avatarBg(p.name)}`}>
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-sm font-bold flex-1 truncate">{p.name}</span>
                {isA && <span className="text-[9px] font-black bg-accent-custom/20 text-accent-custom px-1.5 py-0.5 rounded-full shrink-0">A</span>}
                {isB && <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full shrink-0">B</span>}
              </button>
            );
          })}
        </div>

        {/* Selected preview */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border ${selA ? 'border-accent-custom/30 bg-accent-custom/5' : 'border-dashed border-border-custom bg-muted/20'}`}>
            {selA && profiles.find(p => p.id === selA) ? (
              <>
                <Avatar p={profiles.find(p => p.id === selA)!} size={6} />
                <span className="text-xs font-black text-primary truncate">{profiles.find(p => p.id === selA)!.name}</span>
              </>
            ) : (
              <span className="text-[10px] text-secondary font-bold">Jogador A</span>
            )}
          </div>
          <span className="text-secondary font-black text-sm shrink-0">VS</span>
          <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border ${selB ? 'border-blue-500/30 bg-blue-500/5' : 'border-dashed border-border-custom bg-muted/20'}`}>
            {selB && profiles.find(p => p.id === selB) ? (
              <>
                <Avatar p={profiles.find(p => p.id === selB)!} size={6} />
                <span className="text-xs font-black text-primary truncate">{profiles.find(p => p.id === selB)!.name}</span>
              </>
            ) : (
              <span className="text-[10px] text-secondary font-bold">Jogador B</span>
            )}
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={!selA || !selB || selA === selB}
          className="w-full py-2.5 bg-accent-custom text-slate-950 font-black text-sm rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
        >
          Comparar ⚔️
        </button>
      </div>

      {/* Results */}
      {data && profileA && profileB && (
        <div className="space-y-4">
          {/* VS header */}
          <div className="bg-card border border-border-custom rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                <Avatar p={profileA} size={14} />
                <span className="text-sm font-black text-primary text-center truncate max-w-full">{profileA.name}</span>
                <span className="text-[10px] text-secondary font-bold">{data.userA.rank}º lugar</span>
              </div>
              <div className="flex flex-col items-center shrink-0">
                <ArrowsLeftRight size={22} weight="bold" className="text-accent-custom" />
                <span className="text-[9px] font-black text-secondary uppercase tracking-wider mt-1">VS</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                <Avatar p={profileB} size={14} />
                <span className="text-sm font-black text-primary text-center truncate max-w-full">{profileB.name}</span>
                <span className="text-[10px] text-secondary font-bold">{data.userB.rank}º lugar</span>
              </div>
            </div>
          </div>

          {/* Stats comparison */}
          <div className="bg-card border border-border-custom rounded-2xl p-4">
            <h3 className="text-[10px] font-black text-secondary uppercase tracking-widest mb-3">Estatísticas</h3>
            <div>
              <StatRow
                icon={<Trophy size={11} weight="fill" className="text-amber-500" />}
                label="Pontos"
                valA={data.userA.total_points}
                valB={data.userB.total_points}
              />
              <StatRow
                icon={<Target size={11} weight="fill" className="text-green-500" />}
                label="Aproveit."
                valA={data.userA.aproveitamento}
                valB={data.userB.aproveitamento}
                fmt={v => `${v}%`}
              />
              <StatRow
                icon={<span className="text-[10px]">🎯</span>}
                label="Palpites"
                valA={data.userA.predictions_count}
                valB={data.userB.predictions_count}
              />
              <StatRow
                icon={<span className="text-[10px]">🏅</span>}
                label="Posição"
                valA={data.userA.rank}
                valB={data.userB.rank}
                higherIsBetter={false}
                fmt={v => `${v}º`}
              />
            </div>
          </div>

          {/* X1 between them */}
          <div className="bg-card border border-border-custom rounded-2xl p-4">
            <h3 className="text-[10px] font-black text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Sword size={11} weight="fill" className="text-accent-custom" />
              X1 entre eles ({data.x1.total} {data.x1.total === 1 ? 'duelo' : 'duelos'})
            </h3>
            {data.x1.total === 0 ? (
              <p className="text-xs text-secondary text-center py-2">Nenhum duelo X1 entre esses jogadores ainda.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className={`rounded-xl p-3 ${data.x1.aWins > data.x1.bWins ? 'bg-accent-custom/10 border border-accent-custom/20' : 'bg-muted/40 border border-border-custom/40'}`}>
                  <span className="text-2xl font-black text-primary block">{data.x1.aWins}</span>
                  <span className="text-[9px] font-black text-secondary uppercase">vitórias</span>
                  <span className="text-[9px] text-secondary block mt-0.5">{profileA.name.split(' ')[0]}</span>
                </div>
                <div className="bg-muted/40 border border-border-custom/40 rounded-xl p-3">
                  <span className="text-2xl font-black text-secondary block">{data.x1.ties}</span>
                  <span className="text-[9px] font-black text-secondary uppercase">empates</span>
                </div>
                <div className={`rounded-xl p-3 ${data.x1.bWins > data.x1.aWins ? 'bg-accent-custom/10 border border-accent-custom/20' : 'bg-muted/40 border border-border-custom/40'}`}>
                  <span className="text-2xl font-black text-primary block">{data.x1.bWins}</span>
                  <span className="text-[9px] font-black text-secondary uppercase">vitórias</span>
                  <span className="text-[9px] text-secondary block mt-0.5">{profileB.name.split(' ')[0]}</span>
                </div>
              </div>
            )}
          </div>

          {/* Common predictions */}
          {data.predictions.total > 0 && (
            <div className="bg-card border border-border-custom rounded-2xl p-4">
              <h3 className="text-[10px] font-black text-secondary uppercase tracking-widest mb-3">
                Jogos em comum ({data.predictions.total} palpites)
              </h3>
              <p className="text-[10px] text-secondary font-bold mb-3 text-center">Quem marcou mais pontos no mesmo jogo?</p>
              <StatBar
                labelA={profileA.name}
                labelB={profileB.name}
                valA={data.predictions.aMore}
                valB={data.predictions.bMore}
              />
              <p className="text-center text-[10px] text-secondary font-bold mt-2">
                {data.predictions.tied} empate{data.predictions.tied !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
