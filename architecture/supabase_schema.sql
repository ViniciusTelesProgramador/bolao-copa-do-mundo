-- SQL Schema para o Bolão Copa do Mundo 2026
-- Este arquivo deve ser executado no SQL Editor do Supabase.

-- Habilitar a extensão pgcrypto para geração de UUID se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. TABELA: profiles
-- Extensão da tabela auth.users gerenciada pelo Supabase Auth.
-- Contém informações públicas dos usuários do bolão.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Habilitar Row Level Security (RLS) para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para profiles:
-- Qualquer usuário autenticado pode ler os perfis (necessário para listar os nomes de todos no ranking).
-- Apenas o próprio usuário pode inserir ou atualizar seu perfil.
CREATE POLICY "Qualquer usuário autenticado pode ver perfis públicos"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuários podem inserir seu próprio perfil"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);


-- Trigger para criar o profile automaticamente após um cadastro no Supabase Auth.
-- Se o usuário fornecer um 'name' no metadata, ele será usado, senão usa a parte antes do '@' no email.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, name, created_at)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.created_at
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Registra a trigger na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =========================================================================
-- 2. TABELA: matches
-- Armazena os dados das partidas da Copa do Mundo.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    home_team text NOT NULL,
    away_team text NOT NULL,
    home_flag text NOT NULL, -- Emoji da bandeira (ex: 🇧🇷)
    away_flag text NOT NULL, -- Emoji da bandeira (ex: 🇦🇷)
    match_time timestamptz NOT NULL, -- Horário de início do jogo
    home_score int, -- Resultado real do time da casa (nulo até o término da partida)
    away_score int, -- Resultado real do time de fora (nulo até o término da partida)
    stage text DEFAULT 'Fase de Grupos' NOT NULL,
    group_name text, -- Ex: 'Grupo A' (nulo se for mata-mata)
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Habilitar Row Level Security (RLS) para matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para matches:
-- Leitura pública para todos os usuários (mesmo não autenticados podem ver a tabela de jogos).
-- Modificações permitidas apenas por admins (feitas com service role ou por verificação de email admin).
CREATE POLICY "Jogos são visíveis por todos"
    ON public.matches
    FOR SELECT
    USING (true);

-- Sem políticas para INSERT/UPDATE/DELETE para usuários comuns.
-- Desta forma, apenas a service_role (usada pelo Admin no painel via Server Actions com permissão especial)
-- ou triggers do sistema podem editar esta tabela.


-- =========================================================================
-- 3. TABELA: predictions
-- Armazena os palpites dados pelos usuários.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.predictions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    home_score int NOT NULL, -- Palpite de gols para o time da casa
    away_score int NOT NULL, -- Palpite de gols para o time de fora
    points int, -- Pontuação calculada após o resultado real (nulo até cálculo)
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT unique_user_match UNIQUE(user_id, match_id)
);

-- Habilitar Row Level Security (RLS) para predictions
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para predictions:
-- 1. Leitura: O usuário pode ver os próprios palpites a qualquer momento.
--    Palpites de outros usuários só são visíveis se a partida correspondente já tiver começado.
CREATE POLICY "Leitura de palpites própria ou após início do jogo"
    ON public.predictions
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.matches 
            WHERE matches.id = match_id 
            AND matches.match_time <= now()
        )
    );

-- 2. Inserção: Usuário só insere seu próprio palpite e APENAS se o jogo ainda não começou.
CREATE POLICY "Usuários inserem os próprios palpites antes do jogo começar"
    ON public.predictions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM public.matches 
            WHERE matches.id = match_id 
            AND matches.match_time > now()
        )
    );

-- 3. Edição: Usuário só edita seu próprio palpite e APENAS se o jogo ainda não começou.
CREATE POLICY "Usuários editam os próprios palpites antes do jogo começar"
    ON public.predictions
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM public.matches 
            WHERE matches.id = match_id 
            AND matches.match_time > now()
        )
    )
    WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM public.matches 
            WHERE matches.id = match_id 
            AND matches.match_time > now()
        )
    );

-- 4. Exclusão: Usuário só deleta seu próprio palpite se o jogo não começou.
CREATE POLICY "Usuários removem os próprios palpites antes do jogo começar"
    ON public.predictions
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM public.matches 
            WHERE matches.id = match_id 
            AND matches.match_time > now()
        )
    );


-- Trigger para atualizar a coluna updated_at automaticamente em predictions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_predictions_updated_at ON public.predictions;
CREATE TRIGGER update_predictions_updated_at
    BEFORE UPDATE ON public.predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- =========================================================================
-- 4. LÓGICA DE NEGÓCIO: Cálculo de Pontos
-- =========================================================================

-- Função para calcular e atualizar a pontuação de todos os palpites de um jogo
CREATE OR REPLACE FUNCTION public.calculate_points(p_match_id uuid)
RETURNS void AS $$
DECLARE
    v_home_score int;
    v_away_score int;
BEGIN
    -- Obter placar real do jogo
    SELECT home_score, away_score
    INTO v_home_score, v_away_score
    FROM public.matches
    WHERE id = p_match_id;

    -- Se o placar não estiver preenchido pelo admin, encerra sem alterar nada
    IF v_home_score IS NULL OR v_away_score IS NULL THEN
        RETURN;
    END IF;

    -- Atualiza os pontos de todas as predictions deste jogo
    UPDATE public.predictions
    SET points = CASE
        -- Placar exato: 3 pontos
        WHEN home_score = v_home_score AND away_score = v_away_score THEN 3

        -- Vencedor + diferença de gols: 2 pontos (somente jogos decididos/não empatados)
        WHEN (v_home_score - v_away_score) = (home_score - away_score) 
             AND (v_home_score - v_away_score) <> 0 
             AND sign(v_home_score - v_away_score) = sign(home_score - away_score) THEN 2

        -- Apenas o vencedor ou o empate não-exato: 1 ponto
        WHEN sign(v_home_score - v_away_score) = sign(home_score - away_score) THEN 1

        -- Erro / Sem acerto: 0 pontos
        ELSE 0
    END
    WHERE match_id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger para recalcular pontos automaticamente quando o placar real de uma partida for salvo/atualizado
CREATE OR REPLACE FUNCTION public.trigger_recalculate_points()
RETURNS trigger AS $$
BEGIN
    -- Só dispara se o placar real mudou e agora está preenchido
    IF (NEW.home_score IS DISTINCT FROM OLD.home_score OR NEW.away_score IS DISTINCT FROM OLD.away_score)
       AND NEW.home_score IS NOT NULL 
       AND NEW.away_score IS NOT NULL THEN
        PERFORM public.calculate_points(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_score_update ON public.matches;
CREATE TRIGGER on_match_score_update
    AFTER UPDATE ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_recalculate_points();


-- =========================================================================
-- 5. POPULAR DADOS INICIAIS (10 Jogos da Copa do Mundo 2026)
-- Agendados a partir de 11/06/2026 (após o horário atual da inicialização)
-- =========================================================================

INSERT INTO public.matches (home_team, away_team, home_flag, away_flag, match_time, stage, group_name)
VALUES
    ('Estados Unidos', 'México', '🇺🇸', '🇲🇽', '2026-06-11 14:00:00-03', 'Fase de Grupos', 'Grupo A'),
    ('Canadá', 'Japão', '🇨🇦', '🇯🇵', '2026-06-11 18:00:00-03', 'Fase de Grupos', 'Grupo A'),
    ('Brasil', 'Argentina', '🇧🇷', '🇦🇷', '2026-06-12 13:00:00-03', 'Fase de Grupos', 'Grupo B'),
    ('Espanha', 'Alemanha', '🇪🇸', '🇩🇪', '2026-06-12 16:00:00-03', 'Fase de Grupos', 'Grupo B'),
    ('França', 'Itália', '🇫🇷', '🇮🇹', '2026-06-13 10:00:00-03', 'Fase de Grupos', 'Grupo C'),
    ('Inglaterra', 'Senegal', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇸🇳', '2026-06-13 14:00:00-03', 'Fase de Grupos', 'Grupo C'),
    ('Portugal', 'Uruguai', '🇵🇹', '🇺🇾', '2026-06-14 13:00:00-03', 'Fase de Grupos', 'Grupo D'),
    ('Bélgica', 'Marrocos', '🇧🇪', '🇲🇦', '2026-06-14 16:00:00-03', 'Fase de Grupos', 'Grupo D'),
    ('Holanda', 'Equador', '🇳🇱', '🇪🇨', '2026-06-15 14:00:00-03', 'Fase de Grupos', 'Grupo E'),
    ('Croácia', 'Coreia do Sul', '🇭🇷', '🇰🇷', '2026-06-15 18:00:00-03', 'Fase de Grupos', 'Grupo E')
ON CONFLICT DO NOTHING;
