
import { supabase } from '@/integrations/supabase/client';

export interface Team {
  id: string;
  name: string;
  full_name: string;
  short_code: string | null;
  created_at: string;
}

export const fetchTeams = async (): Promise<Team[]> => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching teams:', error);
    throw error;
  }

  return data || [];
};

export const fetchTeamById = async (teamId: string): Promise<Team | null> => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (error) {
    console.error('Error fetching team:', error);
    return null;
  }

  return data;
};
