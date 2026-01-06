
import { WatchHistoryItem } from '../types';

const STORAGE_KEY = 'sv_continue_watching_v2';

export const storageService = {
  getHistory: (): WatchHistoryItem[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Erro ao ler histórico", e);
      return [];
    }
  },

  addToHistory: (item: WatchHistoryItem) => {
    try {
      const history = storageService.getHistory();
      // Remove se já existir (para colocar no topo depois)
      const filtered = history.filter(h => !(h.id === item.id && h.type === item.type));
      
      // Adiciona ao início
      const newHistory = [item, ...filtered].slice(0, 20); // Mantém apenas os últimos 20
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Erro ao salvar histórico", e);
    }
  },

  removeFromHistory: (id: number, type: 'movie' | 'tv') => {
    try {
      const history = storageService.getHistory();
      const newHistory = history.filter(h => !(h.id === id && h.type === type));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    } catch (e) {
        return [];
    }
  }
};
