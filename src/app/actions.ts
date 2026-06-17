'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { RankingEntry } from '@/types';
import { revalidatePath } from 'next/cache';
import timeMapping from '@/lib/match_times_mapping.json';

/**
 * Salva ou edita o palpite de um usuário para uma determinada partida.
 * Restrição comportamental: O palpite só pode ser criado/editado se match_time > now()
 */
export async function savePrediction(
  matchId: string,
  homeScore: number,
  awayScore: number
) {
  try {
    const supabase = await createClient();

    // 1. Obter usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Você precisa estar logado para palpitar.' };
    }

    // 2. Buscar dados da partida para verificar o horário de início
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('match_time, home_team, away_team')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return { success: false, error: 'Partida não encontrada.' };
    }

    // Validar se é confronto indefinido ("A confirmar")
    if (match.home_team === 'A confirmar' || match.away_team === 'A confirmar') {
      return { success: false, error: 'Não é permitido palpitar em confrontos indefinidos.' };
    }

    // 3. Validar se a partida já começou
    const matchTime = new Date(match.match_time);
    if (matchTime <= new Date()) {
      return { success: false, error: 'O palpite não pode ser enviado ou editado após o início da partida.' };
    }

    // 4. Inserir ou atualizar o palpite (Upsert)
    const { error: upsertError } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: user.id,
          match_id: matchId,
          home_score: homeScore,
          away_score: awayScore,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,match_id'
        }
      );

    if (upsertError) {
      console.error('Erro no upsert do palpite:', upsertError);
      return { success: false, error: 'Erro ao salvar o palpite no banco de dados.' };
    }

    // Revalidar rotas para atualizar o cache
    revalidatePath('/palpites');
    revalidatePath(`/palpites/${matchId}`);
    revalidatePath('/perfil');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Ocorreu um erro inesperado.' };
  }
}

/**
 * Sincroniza resultados da Copa 2026 via football-data.org. Apenas admin.
 */
export async function syncMatchScores() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Não autenticado.' };

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) return { success: false, error: 'Acesso negado.' };

    const { fetchFinishedWCMatches, teamsMatch } = await import('@/lib/football-data');
    const admin = createAdminClient();

    const { data: ourMatches } = await admin
      .from('matches')
      .select('id, home_team, away_team, match_time')
      .is('home_score', null);

    if (!ourMatches || ourMatches.length === 0) {
      return { success: true, updated: 0, message: 'Nenhuma partida pendente.' };
    }

    const apiMatches = await fetchFinishedWCMatches();
    if (apiMatches.length === 0) {
      return { success: true, updated: 0, message: 'Nenhum resultado disponível na API ainda.' };
    }

    let updated = 0;
    const errors: string[] = [];

    for (const ourMatch of ourMatches) {
      const ourDate = new Date(ourMatch.match_time).toISOString().slice(0, 10);
      const apiMatch = apiMatches.find((am) => {
        const apiDate = new Date(am.utcDate).toISOString().slice(0, 10);
        if (apiDate !== ourDate) return false;
        return teamsMatch(ourMatch.home_team, am.homeTeam.name) && teamsMatch(ourMatch.away_team, am.awayTeam.name);
      });

      if (!apiMatch) continue;
      const home = apiMatch.score.fullTime.home;
      const away = apiMatch.score.fullTime.away;
      if (home === null || away === null) continue;

      const { error } = await admin.from('matches').update({ home_score: home, away_score: away }).eq('id', ourMatch.id);
      if (error) errors.push(`${ourMatch.home_team} x ${ourMatch.away_team}: ${error.message}`);
      else updated++;
    }

    if (updated > 0) {
      revalidatePath('/');
      revalidatePath('/palpites');
      revalidatePath('/perfil');
      revalidatePath('/todos');
      revalidatePath('/admin');
    }

    return {
      success: true,
      updated,
      errors: errors.length > 0 ? errors : undefined,
      message: updated > 0 ? `${updated} placar(es) atualizado(s) automaticamente!` : 'Nenhum novo resultado disponível.',
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado.' };
  }
}

/**
 * Salva o resultado final de uma partida. Apenas admin pode executar.
 * Dispara automaticamente a trigger de recálculo de pontuações no banco de dados.
 */
export async function saveMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number
) {
  try {
    const supabase = await createClient();

    // 1. Obter usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    // 2. Verificar se o e-mail corresponde ao administrador
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) {
      return { success: false, error: 'Acesso negado. Apenas o administrador pode salvar resultados.' };
    }

    // 3. Atualizar o placar na tabela de partidas
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore
      })
      .eq('id', matchId);

    if (updateError) {
      console.error('Erro ao salvar resultado real:', updateError);
      return { success: false, error: 'Erro ao atualizar o placar da partida.' };
    }

    // Revalidar rotas para aplicar os pontos recalculados
    revalidatePath('/admin');
    revalidatePath('/palpites');
    revalidatePath('/perfil');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Ocorreu um erro inesperado.' };
  }
}

/**
 * Retorna o ranking consolidado de todos os participantes do bolão.
 * Puxa perfis e predictions do Supabase e calcula a agregação de pontos e palpites.
 */
export async function getRanking(): Promise<RankingEntry[]> {
  try {
    const supabase = await createClient();

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, artilheiro_guess, artilheiro_points');

    if (profilesError || !profiles) {
      console.error('Erro ao buscar perfis:', profilesError);
      return [];
    }

    // 2. Buscar todas as predictions que possuem pontos definidos
    const { data: predictions, error: predictionsError } = await supabase
      .from('predictions')
      .select('user_id, points')
      .not('points', 'is', null);

    if (predictionsError) {
      console.error('Erro ao buscar palpites para o ranking:', predictionsError);
      return [];
    }

    // 3. Agregar pontos e contagem em memória de forma limpa e performática
    const rankingMap = new Map<string, { total_points: number; predictions_count: number; acertos_count: number }>();

    // Inicializar mapa com todos os usuários
    profiles.forEach((p) => {
      rankingMap.set(p.id, { total_points: p.artilheiro_points || 0, predictions_count: 0, acertos_count: 0 });
    });

    // Somar pontos das predictions pontuadas
    predictions.forEach((pred) => {
      const current = rankingMap.get(pred.user_id) || { total_points: 0, predictions_count: 0, acertos_count: 0 };
      rankingMap.set(pred.user_id, {
        total_points: current.total_points + (pred.points || 0),
        predictions_count: current.predictions_count + 1,
        acertos_count: current.acertos_count + ((pred.points ?? 0) > 0 ? 1 : 0),
      });
    });

    // 4. Montar a lista final com os nomes dos perfis
    const rankingList: RankingEntry[] = profiles.map((p) => {
      const stats = rankingMap.get(p.id) || { total_points: 0, predictions_count: 0, acertos_count: 0 };
      const aproveitamento = stats.predictions_count > 0
        ? Math.round((stats.acertos_count / stats.predictions_count) * 100)
        : 0;
      return {
        user_id: p.id,
        name: p.name,
        avatar_url: p.avatar_url ?? null,
        artilheiro_guess: p.artilheiro_guess ?? null,
        artilheiro_points: p.artilheiro_points || 0,
        total_points: stats.total_points,
        predictions_count: stats.predictions_count,
        acertos_count: stats.acertos_count,
        aproveitamento,
      };
    });

    // 5. Ordenar: 1º por pontos totais (decrescente), 2º por palpites feitos (decrescente), 3º alfabeticamente
    rankingList.sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }
      if (b.predictions_count !== a.predictions_count) {
        return b.predictions_count - a.predictions_count;
      }
      return a.name.localeCompare(b.name);
    });

    return rankingList;
  } catch (error) {
    console.error('Erro ao construir o ranking:', error);
    return [];
  }
}

/**
 * Cadastra uma nova partida no banco de dados. Apenas admin pode executar.
 */
export async function createMatch(data: {
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  match_time: string;
  stage: string;
  group_name: string | null;
}) {
  try {
    const supabase = await createClient();

    // 1. Obter usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    // 2. Verificar se o e-mail corresponde ao administrador
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) {
      return { success: false, error: 'Acesso negado. Apenas o administrador pode cadastrar partidas.' };
    }

    // 3. Inserir a partida no banco
    const { error: insertError } = await supabase
      .from('matches')
      .insert(data);

    if (insertError) {
      console.error('Erro ao inserir partida:', insertError);
      return { success: false, error: 'Erro ao cadastrar partida no banco de dados.' };
    }

    revalidatePath('/admin');
    revalidatePath('/palpites');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Ocorreu um erro inesperado.' };
  }
}

/**
 * Corrige o fuso horário de todos os jogos para o fuso horário oficial de Brasília/Fortaleza (BRT, UTC-3).
 * Apenas o admin autenticado pode executar.
 */
export async function shiftAllMatchTimes() {
  try {
    const supabase = await createClient();

    // 1. Obter usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    // 2. Verificar se o e-mail corresponde ao administrador
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) {
      return { success: false, error: 'Acesso negado. Apenas o administrador pode ajustar horários.' };
    }

    // 3. Buscar todas as partidas
    const { data: matches, error: fetchError } = await supabase
      .from('matches')
      .select('id, home_team, away_team, stage, group_name, match_time');

    if (fetchError || !matches) {
      return { success: false, error: 'Erro ao buscar partidas.' };
    }

    // 4. Mapear e atualizar cada partida
    for (const match of matches) {
      let correctTime: string | null = null;

      if (match.stage === 'Fase de Grupos') {
        // Encontrar por times
        const mapped = timeMapping.find((item: any) => {
          return item.stage === 'Fase de Grupos' &&
            ((item.home_team === match.home_team && item.away_team === match.away_team) ||
             (item.home_team === match.away_team && item.away_team === match.home_team));
        });
        if (mapped) {
          correctTime = mapped.correct_time;
        }
      } else {
        // Para mata-mata, encontrar por id primeiro (caso os IDs coincidam)
        const mappedById = timeMapping.find((item: any) => item.id === match.id);
        if (mappedById) {
          correctTime = mappedById.correct_time;
        } else {
          // Fallback se o ID mudou (ex: se o banco foi recriado):
          // Encontrar todos os jogos desta fase no banco, ordenados por match_time original
          const stageMatches = matches
            .filter((m) => m.stage === match.stage)
            .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime());
          
          const index = stageMatches.findIndex((m) => m.id === match.id);
          
          // Encontrar todos os mapeamentos desta fase, ordenados por correct_time
          const mappedStage = timeMapping
            .filter((item: any) => item.stage === match.stage)
            .sort((a: any, b: any) => new Date(a.correct_time).getTime() - new Date(b.correct_time).getTime());
          
          if (index !== -1 && mappedStage[index]) {
            correctTime = mappedStage[index].correct_time;
          }
        }
      }

      if (!correctTime) {
        console.warn(`Aviso: Horário correto não encontrado para a partida ${match.home_team} vs ${match.away_team} (${match.stage})`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('matches')
        .update({ match_time: correctTime })
        .eq('id', match.id);

      if (updateError) {
        console.error(`Erro ao atualizar partida ${match.id}:`, updateError);
        return { success: false, error: `Erro ao atualizar partida: ${updateError.message}` };
      }
    }

    revalidatePath('/admin');
    revalidatePath('/palpites');
    revalidatePath('/todos');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro inesperado.' };
  }
}

/**
 * Atualiza o apelido (nome público) do usuário logado na tabela profiles.
 */
export async function updateNickname(newName: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Não autenticado.' };

    const trimmed = newName.trim();
    if (trimmed.length < 2) return { success: false, error: 'Apelido deve ter pelo menos 2 caracteres.' };
    if (trimmed.length > 30) return { success: false, error: 'Apelido deve ter no máximo 30 caracteres.' };

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('name', trimmed)
      .neq('id', user.id)
      .maybeSingle();

    if (existing) return { success: false, error: 'Esse apelido já está em uso.' };

    const { error } = await supabase
      .from('profiles')
      .update({ name: trimmed })
      .eq('id', user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/perfil');
    revalidatePath('/');
    revalidatePath('/todos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro inesperado.' };
  }
}

/**
 * Admin: revalida todos os palpites de artilheiro já salvos e limpa os que não
 * correspondem a um jogador real de uma seleção da Copa 2026 (ex: nomes inventados).
 */
export async function cleanupInvalidArtilheiroGuesses() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Não autenticado.' };

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) return { success: false, error: 'Acesso negado.' };

    const admin = createAdminClient();
    const { data: profiles, error: fetchError } = await admin
      .from('profiles')
      .select('id, name, artilheiro_guess')
      .not('artilheiro_guess', 'is', null);

    if (fetchError) return { success: false, error: fetchError.message };

    const { validatePlayerName } = await import('@/lib/football-data');
    const cleared: { name: string; guess: string }[] = [];

    for (const p of profiles || []) {
      if (!p.artilheiro_guess) continue;
      const validation = await validatePlayerName(p.artilheiro_guess);
      if (!validation.valid) {
        await admin.from('profiles').update({ artilheiro_guess: null }).eq('id', p.id);
        cleared.push({ name: p.name, guess: p.artilheiro_guess });
      } else if (validation.canonicalName && validation.canonicalName !== p.artilheiro_guess) {
        // Normaliza para o nome oficial (acentos/grafia)
        await admin.from('profiles').update({ artilheiro_guess: validation.canonicalName }).eq('id', p.id);
      }
    }

    revalidatePath('/perfil');
    revalidatePath('/todos');
    return { success: true, checked: (profiles || []).length, cleared };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro inesperado.' };
  }
}

/**
 * Busca jogadores reais (das seleções da Copa 2026) para o autocomplete do palpite de artilheiro.
 */
export async function searchArtilheiroPlayers(query: string) {
  const { searchPlayers } = await import('@/lib/football-data');
  return searchPlayers(query);
}

/**
 * Salva o palpite do artilheiro do torneio para o usuário logado.
 */
export async function saveArtilheiroGuess(playerName: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Não autenticado.' };

    const trimmed = playerName.trim();
    if (!trimmed) return { success: false, error: 'Digite o nome do jogador.' };
    if (trimmed.length > 60) return { success: false, error: 'Nome muito longo.' };

    // Prazo fixo: 72h a partir de 15/06/2026 (ou ARTILHEIRO_DEADLINE env var)
    const deadlineStr = process.env.ARTILHEIRO_DEADLINE || '2026-06-18T23:59:59-03:00';
    if (Date.now() > new Date(deadlineStr).getTime()) {
      return { success: false, error: 'Prazo encerrado. Os palpites de artilheiro foram fechados.' };
    }

    // Valida que é um jogador real de uma seleção da Copa 2026 (evita "Caça rato" etc.)
    const { validatePlayerName } = await import('@/lib/football-data');
    const validation = await validatePlayerName(trimmed);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Jogador não encontrado entre as seleções da Copa do Mundo 2026. Selecione um nome da lista de sugestões.',
      };
    }
    const finalName = validation.canonicalName!;

    const { error } = await supabase
      .from('profiles')
      .update({ artilheiro_guess: finalName })
      .eq('id', user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/perfil');
    revalidatePath('/todos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro inesperado.' };
  }
}

/**
 * Admin confirma o artilheiro real e distribui 5 pts para quem acertou.
 */
export async function confirmArtilheiro(playerName: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Não autenticado.' };

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) return { success: false, error: 'Acesso negado.' };

    const admin = createAdminClient();
    const normalizedName = playerName.trim().toLowerCase();

    // Reset todos os pontos de artilheiro
    await admin.from('profiles').update({ artilheiro_points: 0 }).not('id', 'is', null);

    // Busca todos os palpites de artilheiro
    const { data: guesses } = await admin
      .from('profiles')
      .select('id, artilheiro_guess')
      .not('artilheiro_guess', 'is', null);

    const winnerIds = (guesses || [])
      .filter((p) => p.artilheiro_guess?.trim().toLowerCase() === normalizedName)
      .map((p) => p.id);

    if (winnerIds.length > 0) {
      await admin.from('profiles').update({ artilheiro_points: 5 }).in('id', winnerIds);
    }

    revalidatePath('/');
    revalidatePath('/perfil');
    revalidatePath('/todos');
    revalidatePath('/admin');
    return { success: true, winners: winnerIds.length };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro inesperado.' };
  }
}

/**
 * Admin reseta a senha de qualquer usuário via Admin API.
 */
export async function adminResetPassword(userId: string, newPassword: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Não autenticado.' };

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) return { success: false, error: 'Acesso negado.' };

    if (newPassword.length < 6) return { success: false, error: 'A senha deve ter pelo menos 6 caracteres.' };

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro inesperado.' };
  }
}

/**
 * Usuário logado altera a própria senha.
 */
export async function changePassword(newPassword: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Não autenticado.' };

    if (newPassword.length < 6) return { success: false, error: 'A senha deve ter pelo menos 6 caracteres.' };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro inesperado.' };
  }
}

/**
 * Salva a URL do avatar do usuário na tabela profiles.
 */
export async function updateAvatarUrl(avatarUrl: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Não autenticado.' };

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/perfil');
    revalidatePath('/');
    revalidatePath('/todos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro inesperado.' };
  }
}

/**
 * Exclui um usuário pelo ID. Apenas admin pode executar.
 * Remove também os palpites e o perfil associado.
 */
export async function deleteUser(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Não autenticado.' };

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) {
      return { success: false, error: 'Acesso negado.' };
    }

    if (userId === user.id) {
      return { success: false, error: 'Não é possível excluir sua própria conta.' };
    }

    const admin = createAdminClient();

    await admin.from('predictions').delete().eq('user_id', userId);
    await admin.from('profiles').delete().eq('id', userId);

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/admin');
    revalidatePath('/');
    revalidatePath('/todos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro inesperado.' };
  }
}

/**
 * Cria um novo usuário com apelido + senha, sem confirmação de e-mail.
 * Usa o Admin API (service role) para marcar o e-mail como já confirmado.
 */
export async function registerUser(nickname: string, password: string) {
  try {
    const supabase = createAdminClient();

    const sanitized = nickname
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '');

    if (!sanitized) {
      return { success: false, error: 'Apelido inválido. Use letras e números.' };
    }

    const email = `${sanitized}@bolao.interno`;

    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: nickname.trim() },
    });

    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        return { success: false, error: 'Esse apelido já está em uso. Escolha outro.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao criar conta.' };
  }
}

export async function upsertMatchComment(
  matchId: string,
  content: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 200) return { error: 'Comentário inválido' };

  const { data: match } = await supabase
    .from('matches')
    .select('match_time')
    .eq('id', matchId)
    .single();

  if (!match || new Date(match.match_time) > new Date()) {
    return { error: 'O jogo ainda não começou' };
  }

  const { error } = await supabase
    .from('match_comments')
    .upsert(
      { match_id: matchId, user_id: user.id, content: trimmed },
      { onConflict: 'match_id,user_id' },
    );

  if (error) return { error: error.message };
  return {};
}

