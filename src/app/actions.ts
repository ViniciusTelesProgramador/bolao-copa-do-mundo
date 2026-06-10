'use server';

import { createClient } from '@/lib/supabase/server';
import { RankingEntry } from '@/types';
import { revalidatePath } from 'next/cache';

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
      .select('match_time')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return { success: false, error: 'Partida não encontrada.' };
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

    // 1. Buscar todos os perfis públicos
    // Para funcionar em ambiente onde usuários leem apenas o próprio perfil no RLS padrão,
    // o ideal é que a tabela profiles tenha permissão de leitura para authenticated (ajustado no SQL).
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name');

    if (profilesError || !profiles) {
      console.error('Erro ao buscar perfis:', profilesError);
      return [];
    }

    // 2. Buscar todas as predictions que possuem pontos definidos
    const { data: predictions, error: predictionsError } = await supabase
      .from('predictions')
      .select('user_id, points')
      .is('points', 'not.null');

    if (predictionsError) {
      console.error('Erro ao buscar palpites para o ranking:', predictionsError);
      return [];
    }

    // 3. Agregar pontos e contagem em memória de forma limpa e performática
    const rankingMap = new Map<string, { total_points: number; predictions_count: number }>();
    
    // Inicializar mapa com todos os usuários
    profiles.forEach((p) => {
      rankingMap.set(p.id, { total_points: 0, predictions_count: 0 });
    });

    // Somar pontos das predictions pontuadas
    predictions.forEach((pred) => {
      const current = rankingMap.get(pred.user_id) || { total_points: 0, predictions_count: 0 };
      rankingMap.set(pred.user_id, {
        total_points: current.total_points + (pred.points || 0),
        predictions_count: current.predictions_count + 1
      });
    });

    // 4. Montar a lista final com os nomes dos perfis
    const rankingList: RankingEntry[] = profiles.map((p) => {
      const stats = rankingMap.get(p.id) || { total_points: 0, predictions_count: 0 };
      return {
        user_id: p.id,
        name: p.name,
        total_points: stats.total_points,
        predictions_count: stats.predictions_count
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
