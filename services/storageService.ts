
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
        const { data, error } = await supabase
            .from('app_config')
            .select('value')
            .eq('key', key)
            .maybeSingle();

        if (error || !data) return null;
        return data.value;
      } catch (e) {
          return null; 
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
            
        if (error) return [];
        return data || [];
      } catch (e) {
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
        const { error } = await supabase.from('profiles').update(updates).eq('id', profileId);
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
        const { error } = await supabase.from('profiles').delete().eq('user_id', user.id);
        return !error;
      } catch (e) {
          return false;
      }
  },

  updateWatchStats: async (profileId: string, seconds: number, movieCount: number = 0, episodeCount: number = 0) => {
      try {
        // Lógica simplificada de estatísticas (RPC ou Update direto)
        // Implementação básica para evitar erros
      } catch (e) {}
  },

  // --- HISTORY (Continue Watching) ---

  addToHistory: async (profileId: string, item: any): Promise<void> => {
      try {
          const user = await getUser();
          if (!user || !profileId) return;

          const tmdbId = Number(item.id);

          const payload: any = {
              user_id: user.id,
              profile_id: profileId,
              tmdb_id: tmdbId,
              type: item.type,
              title: item.title,
              poster_path: item.poster_path,
              backdrop_path: item.backdrop_path,
              vote_average: item.vote_average,
              season: item.season || 0,
              episode: item.episode || 0,
              progress: item.progress || 0,
              duration: item.duration || 0,
              updated_at: new Date().toISOString()
          };

          await supabase
              .from('watch_history')
              .upsert(payload, { 
                  onConflict: 'profile_id,tmdb_id,type,season,episode' 
              });
      } catch (e) {
          console.error("Failed to add to history", e);
      }
  },

  getHistory: async (profileId: string): Promise<WatchHistoryItem[]> => {
    try {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from('watch_history')
        .select('*')
        .eq('profile_id', profileId)
        .order('updated_at', { ascending: false }) // ORDEM IMPORTANTE: Pega o mais recente
        .limit(20);

      if (error) return [];
      
      return (data || []).map((item: any) => ({
          ...item,
          id: item.tmdb_id, 
          row_id: item.id,
          timestamp: item.updated_at ? new Date(item.updated_at).getTime() : Date.now(),
          progress: item.progress || 0,
          duration: item.duration || 0
      }));
    } catch (e) {
      return [];
    }
  },

  getSeriesHistory: async (profileId: string, tmdbId: number): Promise<WatchHistoryItem[]> => {
      try {
          if (!profileId) return [];
          const { data } = await supabase
            .from('watch_history')
            .select('*')
            .eq('profile_id', profileId)
            .eq('tmdb_id', tmdbId)
            .eq('type', 'tv');
          
          return (data || []).map((item: any) => ({
              ...item,
              id: item.tmdb_id,
              progress: item.progress || 0,
              duration: item.duration || 0,
              season: item.season,
              episode: item.episode
          }));
      } catch (e) {
          return [];
      }
  },

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

  // --- SAVE PROGRESS (CRITICAL FIX) ---
  updateProgress: async (profileId: string, tmdbId: number, type: 'movie'|'tv', progress: number, duration: number, season?: number, episode?: number, extraData?: any) => {
      try {
        const user = await getUser();
        if (!user || !profileId || !tmdbId) return;

        // Payload Robusto
        const payload: any = {
            user_id: user.id,
            profile_id: profileId,
            tmdb_id: tmdbId,
            type: type,
            season: season || 0,
            episode: episode || 0,
            progress: Math.floor(progress),
            duration: Math.floor(duration),
            updated_at: new Date().toISOString() // Força atualização da data para subir na lista
        };

        // Adiciona metadados se fornecidos (Title, Poster, etc) para criar a linha se não existir
        if (extraData) {
            if (extraData.title) payload.title = extraData.title;
            if (extraData.poster_path) payload.poster_path = extraData.poster_path;
            if (extraData.backdrop_path) payload.backdrop_path = extraData.backdrop_path;
            if (extraData.vote_average) payload.vote_average = extraData.vote_average;
        }

        // UPSERT COM CONFLITO ESPECÍFICO
        await supabase
            .from('watch_history')
            .upsert(payload, { 
                onConflict: 'profile_id,tmdb_id,type,season,episode' 
            });

      } catch (e) {
          console.error("Erro ao salvar progresso:", e);
      }
  },

  // --- LIBRARY ---
  getLibrary: async (profileId: string): Promise<LibraryItem[]> => {
    try {
      if (!profileId) return [];
      const { data } = await supabase
        .from('library')
        .select('*')
        .eq('profile_id', profileId)
        .order('added_at', { ascending: false });
      
      return (data || []).map((row: any) => ({
        id: row.tmdb_id,
        type: row.type,
        title: row.title,
        poster_path: row.poster_path,
        backdrop_path: row.backdrop_path,
        vote_average: row.vote_average,
        release_date: row.release_date,
        addedAt: row.added_at ? new Date(row.added_at).getTime() : Date.now()
      }));
    } catch (e) {
      return [];
    }
  },

  addToLibrary: async (profileId: string, item: LibraryItem): Promise<boolean> => {
      try {
          const user = await getUser();
          if (!user || !profileId) return false;

          const { error } = await supabase.from('library').upsert({
                user_id: user.id,
                profile_id: profileId,
                tmdb_id: item.id,
                type: item.type,
                title: item.title,
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                vote_average: item.vote_average,
                release_date: item.release_date,
                added_at: new Date().toISOString()
            }, { onConflict: 'profile_id,tmdb_id,type' });

          return !error;
      } catch (e) { return false; }
  },

  removeFromLibrary: async (profileId: string, id: number, type: 'movie' | 'tv'): Promise<boolean> => {
      try {
          const { error } = await supabase.from('library').delete().eq('profile_id', profileId).eq('tmdb_id', id).eq('type', type);
          return !error;
      } catch (e) { return false; }
  },

  isInLibrary: async (profileId: string, id: number, type: 'movie' | 'tv'): Promise<boolean> => {
      try {
        const { data } = await supabase.from('library').select('id').eq('profile_id', profileId).eq('tmdb_id', id).eq('type', type).maybeSingle();
        return !!data;
      } catch { return false; }
  },

  getProgress: async (profileId: string, id: number, type: 'movie' | 'tv'): Promise<number> => {
      try {
        // Se for série, isso pegaria um episódio aleatório. Melhor usar getSeriesHistory para precisão.
        // Aqui mantemos genérico
        const { data } = await supabase
            .from('watch_history')
            .select('progress, duration')
            .eq('profile_id', profileId)
            .eq('tmdb_id', id)
            .eq('type', type)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (data && data.duration > 0) {
            return (data.progress / data.duration) * 100;
        }
        return 0;
      } catch { return 0; }
  }
};
