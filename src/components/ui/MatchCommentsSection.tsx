'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { upsertMatchComment } from '@/app/actions';

const MAX = 200;

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500',
];
const avatarColor = (name: string) => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { name: string; avatar_url: string | null } | null;
}

export default function MatchCommentsSection({
  matchId,
  canComment,
  currentUserId,
}: {
  matchId: string;
  canComment: boolean;
  currentUserId: string | null;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const prefilled = useRef(false);
  const supabaseRef = useRef(createClient());

  const fetchComments = useCallback(async () => {
    const { data } = await supabaseRef.current
      .from('match_comments')
      .select('id, user_id, content, created_at, profiles(name, avatar_url)')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    const rows = (data as unknown as Comment[]) || [];
    setComments(rows);
    setLoading(false);
    if (!prefilled.current && currentUserId) {
      const own = rows.find(c => c.user_id === currentUserId);
      if (own) { setText(own.content); prefilled.current = true; }
    }
  }, [matchId, currentUserId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    setErr(null);
    try {
      const result = await upsertMatchComment(matchId, trimmed);
      if (result?.error) setErr(result.error);
      else await fetchComments();
    } catch {
      setErr('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const myComment = comments.find(c => c.user_id === currentUserId);

  if (!loading && comments.length === 0 && !canComment) return null;

  return (
    <div className="border-t border-border-custom/40">
      <div className="px-4 pt-3 pb-2 flex items-center gap-1.5">
        <span className="text-[10px]">💬</span>
        <p className="text-[10px] font-black text-secondary uppercase tracking-wider">
          Comentários ao vivo{comments.length > 0 ? ` (${comments.length})` : ''}
        </p>
      </div>

      {loading ? (
        <p className="px-4 pb-3 text-[11px] text-secondary/50 italic">Carregando...</p>
      ) : comments.length > 0 ? (
        <div className="px-4 pb-3 space-y-2.5">
          {comments.map(c => {
            const name = c.profiles?.name || 'Participante';
            const isOwn = c.user_id === currentUserId;
            return (
              <div key={c.id} className="flex items-start gap-2">
                {c.profiles?.avatar_url ? (
                  <img
                    src={c.profiles.avatar_url}
                    alt={name}
                    className="w-6 h-6 rounded-full object-cover shrink-0 border border-border-custom mt-0.5"
                  />
                ) : (
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[9px] font-black text-white shrink-0 mt-0.5 ${avatarColor(name)}`}>
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="flex-1 min-w-0 bg-muted/40 rounded-xl px-3 py-2">
                  <span className={`text-[10px] font-black block mb-0.5 ${isOwn ? 'text-accent-custom' : 'text-secondary'}`}>
                    {name}{isOwn && ' (você)'}
                  </span>
                  <p className="text-[12px] text-primary leading-snug break-words">{c.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        canComment && (
          <p className="px-4 pb-3 text-[11px] text-secondary/50 italic">
            Seja o primeiro a comentar!
          </p>
        )
      )}

      {currentUserId && canComment && (
        <div className="px-4 pb-4 pt-1 border-t border-border-custom/30">
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, MAX))}
            placeholder="Escreva algo sobre o jogo..."
            rows={2}
            className="w-full px-3 py-2 bg-base border border-border-custom rounded-xl text-xs text-primary resize-none focus:outline-none focus:border-accent-custom transition-colors"
          />
          {err && <p className="text-[10px] text-red-400 mt-1">{err}</p>}
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-[10px] font-bold ${text.length > MAX * 0.85 ? 'text-amber-500' : 'text-secondary/40'}`}>
              {text.length}/{MAX}
            </span>
            <button
              onClick={handleSubmit}
              disabled={saving || !text.trim()}
              className="px-3 h-7 bg-accent-custom hover:bg-accent-hover text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all disabled:opacity-40 cursor-pointer"
            >
              {saving ? '...' : myComment ? 'Atualizar' : 'Enviar'}
            </button>
          </div>
        </div>
      )}

      {currentUserId && !canComment && myComment && (
        <p className="px-4 pb-3 text-[10px] text-secondary/50 italic">Jogo encerrado — comentários desativados.</p>
      )}
    </div>
  );
}
