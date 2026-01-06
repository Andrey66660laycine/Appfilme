
import { Movie, MovieDetails, CastMember, SeriesDetails, Episode } from '../types';

const API_KEY = '3d4ec0a70c701a66813c74db64aaa57c';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const LANG = 'pt-BR';

export const tmdb = {
  getTrending: async (): Promise<Movie[]> => {
    try {
      const res = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=${LANG}`);
      const data = await res.json();
      return data.results || [];
    } catch (error) {
      console.error("Failed to fetch trending:", error);
      return [];
    }
  },

  searchMovies: async (query: string): Promise<Movie[]> => {
    try {
      const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=${LANG}`);
      const data = await res.json();
      return data.results || [];
    } catch (error) {
      console.error("Failed to search:", error);
      return [];
    }
  },

  getMovieDetails: async (id: string): Promise<MovieDetails | null> => {
    try {
      const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=${LANG}`);
      const data = await res.json();
      if (data.success === false) return null;
      return data;
    } catch (error) {
      console.error("Failed to fetch movie details:", error);
      return null;
    }
  },

  getMovieCast: async (id: string): Promise<CastMember[]> => {
    try {
      const res = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}&language=${LANG}`);
      const data = await res.json();
      if (data && Array.isArray(data.cast)) {
        return data.cast.slice(0, 10);
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch movie cast:", error);
      return [];
    }
  },

  getTVDetails: async (id: string): Promise<SeriesDetails | null> => {
    try {
      const res = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=${LANG}`);
      const data = await res.json();
      if (data.success === false) return null;
      return data;
    } catch (error) {
      console.error("Failed to fetch TV details:", error);
      return null;
    }
  },

  getTVSeason: async (id: string, seasonNumber: number): Promise<Episode[]> => {
    try {
      const res = await fetch(`${BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${API_KEY}&language=${LANG}`);
      const data = await res.json();
      return data.episodes || [];
    } catch (error) {
      console.error("Failed to fetch season:", error);
      return [];
    }
  },

  getTVCast: async (id: string): Promise<CastMember[]> => {
    try {
      const res = await fetch(`${BASE_URL}/tv/${id}/credits?api_key=${API_KEY}&language=${LANG}`);
      const data = await res.json();
      if (data && Array.isArray(data.cast)) {
        return data.cast.slice(0, 10);
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch TV cast:", error);
      return [];
    }
  },

  getPosterUrl: (path: string, size: 'w500' | 'original' = 'w500') => 
    path ? `${IMAGE_BASE_URL}/${size}${path}` : 'https://picsum.photos/500/750?grayscale',
    
  getBackdropUrl: (path: string, size: 'w300' | 'w780' | 'w1280' | 'original' = 'original') => 
    path ? `${IMAGE_BASE_URL}/${size}${path}` : 'https://picsum.photos/1920/1080?grayscale',
};
