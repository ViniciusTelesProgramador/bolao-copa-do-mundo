export interface Profile {
  id: string;
  name: string;
  created_at: string;
}

export interface Match {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  match_time: string;
  home_score: number | null;
  away_score: number | null;
  stage: string;
  group_name: string | null;
  created_at: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  created_at: string;
  updated_at: string;
}

export interface RankingEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  artilheiro_guess: string | null;
  artilheiro_points: number;
  total_points: number;
  predictions_count: number;
  acertos_count: number;
  aproveitamento: number;
}

export type ChallengeStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'completed';
export type ChallengeResult = 'challenger_won' | 'challenged_won' | 'tie';

export interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  match_id: string;
  challenger_home: number | null;
  challenger_away: number | null;
  challenged_home: number | null;
  challenged_away: number | null;
  status: ChallengeStatus;
  result: ChallengeResult | null;
  challenger_match_points: number | null;
  challenged_match_points: number | null;
  points_transferred: number;
  created_at: string;
}

export interface ChallengeProfile {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface ChallengeMatch {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  match_time: string;
  home_score: number | null;
  away_score: number | null;
  stage: string;
}

export interface ChallengeWithDetails extends Challenge {
  challenger: ChallengeProfile;
  challenged: ChallengeProfile;
  match: ChallengeMatch;
}
