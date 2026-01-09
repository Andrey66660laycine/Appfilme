
import { Movie, MovieDetails, CastMember, SeriesDetails, Episode } from '../types';

const API_KEY = '3d4ec0a70c701a66813c74db64aaa57c';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const LANG = 'pt-BR';

export const tmdb = {
  getTrending: async (type: 'all' | 'movie' | 'tv' = 'all', isKid: boolean = false): Promise<Movie[]> => {
    try {
      let url = `${BASE_URL}/trending/${type}/week?api_key=${API_KEY}&language=${LANG}`;
      
      if (isKid) {
          const typePath = type === 'all' ? 'movie' : type; 
          url = `${BASE_URL}/discover/${typePath}?api_key=${API_KEY}&language=${LANG}&sort_by=popularity.desc&with_genres=16,10751&without_genres=27,53,80&include_adult=false`;
      }

      const res = await fetch(url);
      const data = await res.json();
      return data.results || [];
    } catch (error) {
      console.error("Failed to fetch trending:", error);
      return [];
    }
  },

  getOriginals: async (): Promise<Movie[]> => {
      try {
          const url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=${LANG}&sort_by=vote_average.desc&vote_count.gte=1000&include_adult=false&with_networks=213`; 
          const res = await fetch(url);
          const data = await res.json();
          return data.results || [];
      } catch (e) {
          return [];
      }
  },

  searchMovies: async (query: string): Promise<Movie[]> => {
    try {
      const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=${LANG}&include_adult=false`);
      const data = await res.json();
      return data.results || [];
    } catch (error) {
      console.error("Failed to search:", error);
      return [];
    }
  },

  discoverByGenre: async (genreId: number, type: 'movie' | 'tv' = 'movie', page: number = 1): Promise<Movie[]> => {
    try {
        const res = await fetch(`${BASE_URL}/discover/${type}?api_key=${API_KEY}&language=${LANG}&with_genres=${genreId}&sort_by=popularity.desc&include_adult=false&page=${page}`);
        const data = await res.json();
        return (data.results || []).map((item: any) => ({ ...item, media_type: type }));
    } catch (error) {
        console.error("Failed to discover by genre:", error);
        return [];
    }
  },

  getRecommendations: async (id: string, type: 'movie' | 'tv'): Promise<Movie[]> => {
      try {
          // 1. Tenta pegar recomendações diretas
          let res = await fetch(`${BASE_URL}/${type}/${id}/recommendations?api_key=${API_KEY}&language=${LANG}`);
          let data = await res.json();
          let results = data.results || [];

          // 2. FILTRO DE QUALIDADE & POPULARIDADE
          // Se tiver poucos resultados ou resultados ruins, tenta pegar "Similar"
          if (results.length < 5) {
              res = await fetch(`${BASE_URL}/${type}/${id}/similar?api_key=${API_KEY}&language=${LANG}`);
              data = await res.json();
              results = [...results, ...(data.results || [])];
          }

          // 3. Aplica filtros rigorosos: Pós-2010, Populares e com Imagem
          const filtered = results.filter((item: any) => {
              const releaseDate = item.release_date || item.first_air_date;
              const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : 0;
              return (
                  year >= 2010 && // Apenas filmes recentes
                  item.vote_average >= 5.0 && // Nota mínima
                  item.backdrop_path && // Tem que ter imagem de fundo
                  item.vote_count > 100 // Remove filmes obscuros
              );
          });

          // 4. Se o filtro for muito agressivo e sobrar pouco, relaxa o filtro de ano
          const finalResults = filtered.length >= 4 ? filtered : results.filter((i: any) => i.backdrop_path);

          return finalResults.map((item: any) => ({ ...item, media_type: type }));
      } catch (error) {
          console.error("Failed to fetch recommendations:", error);
          return [];
      }
  },

  getCollection: async (collectionId: number): Promise<any | null> => {
      try {
          const res = await fetch(`${BASE_URL}/collection/${collectionId}?api_key=${API_KEY}&language=${LANG}`);
          const data = await res.json();
          if (data.success === false) return null;
          return data;
      } catch (error) {
          console.error("Failed to fetch collection:", error);
          return null;
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

  getVideos: async (id: string, type: 'movie' | 'tv'): Promise<any[]> => {
      try {
          let res = await fetch(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}&language=${LANG}`);
          let data = await res.json();
          let results = data.results || [];
          
          if (results.length === 0) {
              res = await fetch(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}&language=en-US`);
              data = await res.json();
              results = data.results || [];
          }
          
          return results;
      } catch (error) {
          console.error("Failed to fetch videos:", error);
          return [];
      }
  },

  getPosterUrl: (path: string, size: 'w500' | 'original' = 'w500') => 
    path ? `${IMAGE_BASE_URL}/${size}${path}` : 'https://picsum.photos/500/750?grayscale',
    
  getBackdropUrl: (path: string, size: 'w300' | 'w780' | 'w1280' | 'original' = 'original') => 
    path ? `${IMAGE_BASE_URL}/${size}${path}` : 'https://picsum.photos/1920/1080?grayscale',
};
