
import { supabase } from './supabase';
import { WatchHistoryItem, LibraryItem, Profile } from '../types';

// Helper para pegar o user atual
const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

export const storageService = {
  
  // --- PROFILES ---
  
  getProfiles: async (): Promise<Profile[]> => {
      try {
        const user = await getUser();
        if (!user) return [];
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: true });
            
        if (error) {
            console.error("Erro ao buscar perfis:", error.message);
            return [];
        }
        return data || [];
      } catch (e) {
          console.error("Erro desconhecido ao buscar perfis", e);
          return [];
      }
  },

  createProfile: async (name: string, avatar: string, isKid: boolean): Promise<Profile | null> => {
      try {
        const user = await getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .insert({
                user_id: user.id,
                name,
                avatar,
                is_kid: isKid,
                is_premium: false, // Legacy field
                total_watch_time: 0,
                total_movies_watched: 0,
                total_episodes_watched: 0
            })
            .select()
            .single();

        if (error) {
            console.error("Erro ao criar perfil:", error.message);
            return null;
        }
        return data;
      } catch (e) {
          console.error("Erro ao criar perfil", e);
          return null;
      }
  },

  updateProfile: async (profileId: string, updates: Partial<Profile>): Promise<boolean> => {
      try {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profileId);
            
        return !error;
      } catch (e) {
          console.error("Erro ao atualizar perfil", e);
          return false;
      }
  },

  setProfilePremium: async (profileId: string, isPremium: boolean): Promise<boolean> => {
      // Deprecated but kept for compatibility
      try {
          const { error } = await supabase
            .from('profiles')
            .update({ is_premium: isPremium })
            .eq('id', profileId);
          return !error;
      } catch (e) {
          return false;
      }
  },

  deleteProfile: async (profileId: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', profileId);
        return !error;
      } catch (e) {
          console.error("Erro ao deletar perfil", e);
          return false;
      }
  },

  updateWatchStats: async (profileId: string, seconds: number, movieCount: number = 0, episodeCount: number = 0) => {
      try {
        const { data, error } = await supabase
            .from('profiles')
            .select('total_watch_time, total_movies_watched, total_episodes_watched')
            .eq('id', profileId)
            .single();
        
        if (error) {
            console.error("Erro ao ler stats:", error.message);
            return;
        }
        
        if (data) {
            // Garante que valores nulos sejam tratados como 0
            const currentWatchTime = data.total_watch_time || 0;
            const currentMovies = data.total_movies_watched || 0;
            const currentEpisodes = data.total_episodes_watched || 0;

            const { error: updateError } = await supabase.from('profiles').update({
                total_watch_time: currentWatchTime + seconds,
                total_movies_watched: currentMovies + movieCount,
                total_episodes_watched: currentEpisodes + episodeCount
            }).eq('id', profileId);

            if (updateError) {
                console.error("Erro ao atualizar stats:", updateError.message);
            }
        }
      } catch (e) {
          console.error("Erro exception stats update", e);
      }
  },

  // --- HISTORY (Profile Scoped) ---

  getHistory: async (profileId: string): Promise<WatchHistoryItem[]> => {
    try {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from('watch_history')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
          console.error("Supabase Error (getHistory):", error.message);
          return [];
      }
      
      return (data || []).map((item: any) => ({
          ...item,
          timestamp: item.created_at ? new Date(item.created_at).getTime() : Date.now()
      }));
    } catch (e: any) {
      console.error("Erro ao ler histórico:", e.message || e);
      return [];
    }
  },

  addToHistory: async (profileId: string, item: WatchHistoryItem) => {
    try {
      const user = await getUser();
      if (!user) {
          return;
      }
      if (!profileId) return;

      const { error } = await supabase
        .from('watch_history')
        .upsert({
          user_id: user.id,
          profile_id: profileId,
          tmdb_id: item.id,
          type: item.type,
          title: item.title,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          vote_average: item.vote_average,
          season: item.season,
          episode: item.episode,
          created_at: new Date().toISOString()
        }, { onConflict: 'profile_id,tmdb_id,type' });

      if (!error) {
          // Atualiza estatísticas do perfil
          const isMovie = item.type === 'movie';
          // Se for filme, adiciona 1 filme. Se for série, adiciona 1 episódio.
          // Não adicionamos tempo aqui (0), o tempo é adicionado pelo cronômetro em App.tsx
          await storageService.updateWatchStats(profileId, 0, isMovie ? 1 : 0, isMovie ? 0 : 1);
      } else {
          console.error("Erro Supabase History Insert:", error.message);
      }
    } catch (e) {
      console.error("Erro ao salvar histórico", e);
    }
  },

  // --- LIBRARY (Profile Scoped) ---
  
  getLibrary: async (profileId: string): Promise<LibraryItem[]> => {
    try {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('library')
        .select('*')
        .eq('profile_id', profileId)
        .order('added_at', { ascending: false });

      if (error) {
          return [];
      }

      return (data || []).map((row: any) => ({
        id: row.tmdb_id,
        type: row.type,
        title: row.title,
        poster_path: row.poster_path,
        backdrop_path: row.backdrop_path,
        vote_average: row.vote_average,
        release_date: row.release_date,
        total_episodes: row.total_episodes,
        addedAt: row.added_at ? new Date(row.added_at).getTime() : Date.now()
      }));
    } catch (e) {
      return [];
    }
  },

  addToLibrary: async (profileId: string, item: LibraryItem): Promise<boolean> => {
      try {
          const user = await getUser();
          if (!user) return false;
          if (!profileId) return false;

          const { error } = await supabase
            .from('library')
            .upsert({
                user_id: user.id,
                profile_id: profileId,
                tmdb_id: item.id,
                type: item.type,
                title: item.title,
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                vote_average: item.vote_average,
                release_date: item.release_date,
                total_episodes: item.total_episodes,
                added_at: new Date().toISOString()
            }, { onConflict: 'profile_id,tmdb_id,type' });

          if (error) return false;
          return true;
      } catch (e) {
          return false;
      }
  },

  removeFromLibrary: async (profileId: string, id: number, type: 'movie' | 'tv'): Promise<boolean> => {
      try {
          if (!profileId) return false;
          const { error } = await supabase
            .from('library')
            .delete()
            .eq('profile_id', profileId)
            .eq('tmdb_id', id)
            .eq('type', type);
          return !error;
      } catch (e) {
          return false;
      }
  },

  isInLibrary: async (profileId: string, id: number, type: 'movie' | 'tv'): Promise<boolean> => {
      try {
        if (!profileId) return false;
        const { data, error } = await supabase
            .from('library')
            .select('id')
            .eq('profile_id', profileId)
            .eq('tmdb_id', id)
            .eq('type', type)
            .maybeSingle();
        
        if (error) return false;
        return !!data;
      } catch {
        return false;
      }
  },

  getProgress: async (profileId: string, id: number, type: 'movie' | 'tv'): Promise<number> => {
      try {
        if (!profileId) return 0;
        const { data } = await supabase
            .from('watch_history')
            .select('id')
            .eq('profile_id', profileId)
            .eq('tmdb_id', id)
            .eq('type', type)
            .limit(1);

        if (type === 'movie') return (data && data.length > 0) ? 100 : 0;
        return (data && data.length > 0) ? 30 : 0;
      } catch {
        return 0;
      }
  }
};
