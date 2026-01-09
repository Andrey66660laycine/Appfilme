
import { supabase } from './supabase';
import { WatchHistoryItem, LibraryItem, Profile } from '../types';

// Helper para pegar o user atual
const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

export const storageService = {
  
  // --- CONFIG GERAL (LINK DOWNLOAD, AVISOS, ETC) ---
  getAppConfig: async (key: string): Promise<string | null> => {
      try {
        // Tenta buscar da tabela 'app_config' se existir
        // Estrutura esperada: tabela 'app_config' com colunas 'key' e 'value'
        const { data, error } = await supabase
            .from('app_config')
            .select('value')
            .eq('key', key)
            .maybeSingle();

        if (error || !data) return null;
        return data.value;
      } catch (e) {
          return null; // Retorna null para usar o fallback local
      }
  },

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
                is_premium: false,
                total_watch_time: 0,
                total_movies_watched: 0,
                total_episodes_watched: 0
            })
            .select()
            .single();

        if (error) return null;
        return data;
      } catch (e) {
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
          return false;
      }
  },

  setProfilePremium: async (profileId: string, isPremium: boolean): Promise<boolean> => {
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
          return false;
      }
  },

  deleteAccountData: async (): Promise<boolean> => {
      try {
        const user = await getUser();
        if (!user) return false;
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('user_id', user.id);
        if (error) return false;
        return true;
      } catch (e) {
          return false;
      }
  },

  updateWatchStats: async (profileId: string, seconds: number, movieCount: number = 0, episodeCount: number = 0) => {
      try {
        const { data } = await supabase
            .from('profiles')
            .select('total_watch_time, total_movies_watched, total_episodes_watched')
            .eq('id', profileId)
            .single();
        
        if (data) {
            const currentWatchTime = data.total_watch_time || 0;
            const currentMovies = data.total_movies_watched || 0;
            const currentEpisodes = data.total_episodes_watched || 0;

            await supabase.from('profiles').update({
                total_watch_time: currentWatchTime + seconds,
                total_movies_watched: currentMovies + movieCount,
                total_episodes_watched: currentEpisodes + episodeCount
            }).eq('id', profileId);
        }
      } catch (e) {
          console.error("Erro stats", e);
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

      if (error) return [];
      
      // Mapeia o 'tmdb_id' para 'id' para que o Player abra o filme correto.
      return (data || []).map((item: any) => ({
          ...item,
          id: item.tmdb_id, // Isso garante que o clique abra o filme certo no Player
          row_id: item.id,  // Mantém o ID original caso precise deletar especificamente
          timestamp: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
          progress: item.progress || 0,
          duration: item.duration || 0
      }));
    } catch (e: any) {
      return [];
    }
  },

  // Busca histórico completo de uma série específica (para marcar episódios vistos)
  getSeriesHistory: async (profileId: string, tmdbId: number): Promise<WatchHistoryItem[]> => {
      try {
          if (!profileId) return [];
          
          const { data, error } = await supabase
            .from('watch_history')
            .select('*')
            .eq('profile_id', profileId)
            .eq('tmdb_id', tmdbId)
            .eq('type', 'tv');

          if (error) return [];

          return (data || []).map((item: any) => ({
              ...item,
              id: item.tmdb_id,
              progress: item.progress || 0,
              duration: item.duration || 0,
              season: item.season,
              episode: item.episode
          }));
      } catch (e) {
          console.error("Erro getSeriesHistory", e);
          return [];
      }
  },

  // Remove item do histórico
  removeFromHistory: async (profileId: string, tmdbId: number, type: 'movie' | 'tv'): Promise<boolean> => {
      try {
          const { error } = await supabase
              .from('watch_history')
              .delete()
              .eq('profile_id', profileId)
              .eq('tmdb_id', tmdbId)
              .eq('type', type);
          return !error;
      } catch (e) {
          return false;
      }
  },

  // FIX: Agora usa UPSERT para garantir que salve mesmo que não exista
  updateProgress: async (profileId: string, tmdbId: number, type: 'movie'|'tv', progress: number, duration: number, season?: number, episode?: number) => {
      try {
        const user = await getUser();
        if (!user) return;

        // Se faltar informações críticas, não tenta salvar
        if (!tmdbId || !type) return;

        // Usa UPSERT (Insert or Update) baseado na UNIQUE CONSTRAINT do banco
        // Campos obrigatórios para o conflito: profile_id, tmdb_id, type, season, episode
        const payload: any = {
            user_id: user.id,
            profile_id: profileId,
            tmdb_id: tmdbId,
            type: type,
            season: season || 0,
            episode: episode || 0,
            progress: progress,
            duration: duration,
            created_at: new Date().toISOString() // Atualiza timestamp para subir pro topo
        };

        // NOTA: Se o registro não existir e faltar 'title' ou 'poster_path' (pq vieram nulos neste update), 
        // o banco pode reclamar se forem NOT NULL. 
        // O ideal é o addToHistory ser chamado no início do player com dados completos.
        // Mas o upsert aqui deve resolver a persistência do tempo.
        
        await supabase
            .from('watch_history')
            .upsert(payload, { onConflict: 'profile_id,tmdb_id,type,season,episode' });

      } catch (e) {
          console.error("Erro update progress", e);
      }
  },

  addToHistory: async (profileId: string, item: WatchHistoryItem) => {
    try {
      const user = await getUser();
      if (!user || !profileId) return;

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
          season: item.season || 0,
          episode: item.episode || 0,
          progress: item.progress || 0,
          duration: item.duration || 0,
          created_at: new Date().toISOString()
        }, { onConflict: 'profile_id,tmdb_id,type,season,episode' });

      if (!error) {
          // Atualiza estatísticas apenas se for inserção nova (opcional, complexo de rastrear no client)
          const isMovie = item.type === 'movie';
          await storageService.updateWatchStats(profileId, 0, isMovie ? 1 : 0, isMovie ? 0 : 1);
      }
    } catch (e) {
      console.error("Erro ao salvar histórico", e);
    }
  },

  // --- LIBRARY ---
  
  getLibrary: async (profileId: string): Promise<LibraryItem[]> => {
    try {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('library')
        .select('*')
        .eq('profile_id', profileId)
        .order('added_at', { ascending: false });

      if (error) return [];

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
            .select('progress, duration')
            .eq('profile_id', profileId)
            .eq('tmdb_id', id)
            .eq('type', type)
            .limit(1)
            .maybeSingle();

        if (data && data.duration > 0) {
            return (data.progress / data.duration) * 100;
        }
        return 0;
      } catch {
        return 0;
      }
  }
};
