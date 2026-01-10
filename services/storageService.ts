
import { supabase } from './supabase';
import { WatchHistoryItem, LibraryItem, Profile } from '../types';

// Chave para o LocalStorage
const HISTORY_KEY = 'void_watch_history_v2';
const LIBRARY_KEY = 'void_library_v2';

export const storageService = {
  
  // --- CONFIG GERAL ---
  getAppConfig: async (key: string): Promise<string | null> => {
      try {
        const { data } = await supabase.from('app_config').select('value').eq('key', key).maybeSingle();
        return data ? data.value : null;
      } catch { return null; }
  },

  // --- PROFILES (Mantém no Supabase para auth, mas com fallback se necessário) ---
  getProfiles: async (): Promise<Profile[]> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data } = await supabase.from('profiles').select('*').order('created_at');
        return data || [];
      } catch { return []; }
  },

  createProfile: async (name: string, avatar: string, isKid: boolean): Promise<Profile | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data } = await supabase.from('profiles').insert({ user_id: user.id, name, avatar, is_kid: isKid }).select().single();
        return data;
      } catch { return null; }
  },

  updateProfile: async (profileId: string, updates: Partial<Profile>) => {
      try { await supabase.from('profiles').update(updates).eq('id', profileId); return true; } catch { return false; }
  },

  deleteProfile: async (profileId: string) => {
      try { await supabase.from('profiles').delete().eq('id', profileId); return true; } catch { return false; }
  },

  deleteAccountData: async () => {
      // Implementação simplificada
      return true;
  },

  updateWatchStats: async () => {},

  // --- HISTORY & PROGRESS (LOCALSTORAGE TOTAL) ---

  addToHistory: async (profileId: string, item: any): Promise<void> => {
      // Wrapper para compatibilidade, o updateProgress faz o trabalho pesado agora
      storageService.updateProgress(profileId, item.id, item.type, item.progress || 0, item.duration || 0, item.season, item.episode, item);
  },

  getHistory: async (profileId: string): Promise<WatchHistoryItem[]> => {
      try {
          const raw = localStorage.getItem(`${HISTORY_KEY}_${profileId}`);
          if (!raw) return [];
          const history: any[] = JSON.parse(raw);
          
          // Ordena pelo timestamp (mais recente primeiro)
          return history.sort((a, b) => b.timestamp - a.timestamp);
      } catch (e) {
          console.error("Erro ao ler histórico local", e);
          return [];
      }
  },

  getSeriesHistory: async (profileId: string, tmdbId: number): Promise<WatchHistoryItem[]> => {
      try {
          const allHistory = await storageService.getHistory(profileId);
          // Filtra apenas itens dessa série específica
          return allHistory.filter(h => h.tmdb_id === tmdbId && h.type === 'tv');
      } catch { return []; }
  },

  removeFromHistory: async (profileId: string, tmdbId: number, type: 'movie' | 'tv'): Promise<boolean> => {
      try {
          const allHistory = await storageService.getHistory(profileId);
          const newHistory = allHistory.filter(h => !(h.tmdb_id === tmdbId && h.type === type));
          localStorage.setItem(`${HISTORY_KEY}_${profileId}`, JSON.stringify(newHistory));
          return true;
      } catch { return false; }
  },

  updateProgress: async (profileId: string, tmdbId: number, type: 'movie'|'tv', progress: number, duration: number, season?: number, episode?: number, extraData?: any) => {
      try {
          const key = `${HISTORY_KEY}_${profileId}`;
          const raw = localStorage.getItem(key);
          let history: any[] = raw ? JSON.parse(raw) : [];

          const existingIndex = history.findIndex(h => {
              if (type === 'movie') return h.tmdb_id === tmdbId && h.type === 'movie';
              return h.tmdb_id === tmdbId && h.type === 'tv' && h.season === season && h.episode === episode;
          });

          const newItem = {
              id: String(tmdbId), // ID único
              tmdb_id: tmdbId,
              type,
              season: season || 0,
              episode: episode || 0,
              progress,
              duration,
              timestamp: Date.now(),
              // Preserva metadados se existirem, ou usa os novos
              title: extraData?.title || (existingIndex > -1 ? history[existingIndex].title : ''),
              poster_path: extraData?.poster_path || (existingIndex > -1 ? history[existingIndex].poster_path : ''),
              backdrop_path: extraData?.backdrop_path || (existingIndex > -1 ? history[existingIndex].backdrop_path : ''),
              vote_average: extraData?.vote_average || 0
          };

          if (existingIndex > -1) {
              history[existingIndex] = newItem;
          } else {
              history.push(newItem);
          }

          localStorage.setItem(key, JSON.stringify(history));
      } catch (e) {
          console.error("Erro ao salvar progresso local", e);
      }
  },

  // --- LIBRARY (LOCALSTORAGE) ---
  
  getLibrary: async (profileId: string): Promise<LibraryItem[]> => {
      try {
          const raw = localStorage.getItem(`${LIBRARY_KEY}_${profileId}`);
          return raw ? JSON.parse(raw) : [];
      } catch { return []; }
  },

  addToLibrary: async (profileId: string, item: LibraryItem): Promise<boolean> => {
      try {
          const lib = await storageService.getLibrary(profileId);
          if (lib.some(i => i.id === item.id && i.type === item.type)) return true;
          
          lib.unshift({ ...item, addedAt: Date.now() });
          localStorage.setItem(`${LIBRARY_KEY}_${profileId}`, JSON.stringify(lib));
          return true;
      } catch { return false; }
  },

  removeFromLibrary: async (profileId: string, id: number, type: 'movie' | 'tv'): Promise<boolean> => {
      try {
          const lib = await storageService.getLibrary(profileId);
          const newLib = lib.filter(i => !(i.id === id && i.type === type));
          localStorage.setItem(`${LIBRARY_KEY}_${profileId}`, JSON.stringify(newLib));
          return true;
      } catch { return false; }
  },

  isInLibrary: async (profileId: string, id: number, type: 'movie' | 'tv'): Promise<boolean> => {
      const lib = await storageService.getLibrary(profileId);
      return lib.some(i => i.id === id && i.type === type);
  },

  getProgress: async (profileId: string, id: number, type: 'movie' | 'tv'): Promise<number> => {
      try {
          const history = await storageService.getHistory(profileId);
          // Pega o item mais recente desse ID
          const item = history.find(h => h.tmdb_id === id && h.type === type);
          if (item && item.duration > 0) {
              return (item.progress / item.duration) * 100;
          }
          return 0;
      } catch { return 0; }
  }
};
