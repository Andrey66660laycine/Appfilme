
import React, { useEffect, useState, useRef } from 'react';
import { tmdb } from '../services/tmdbService';
import { Movie } from '../types';

interface GenreExplorerProps {
  genreId: number;
  genreName: string;
  onMovieClick: (id: number, type?: 'movie' | 'tv') => void;
}

const GenreExplorer: React.FC<GenreExplorerProps> = ({ genreId, genreName, onMovieClick }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const observerTarget = useRef(null);
  const [hasMore, setHasMore] = useState(true);

  // Initial Load & Infinite Scroll
  useEffect(() => {
    if (!isSearching) {
        fetchMovies(page);
    }
  }, [page, isSearching]);

  // Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && hasMore && !isSearching) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loading, hasMore, isSearching]);

  // Search Logic
  useEffect(() => {
      const delayDebounce = setTimeout(async () => {
          if (searchQuery.trim()) {
              setIsSearching(true);
              setLoading(true);
              try {
                  const results = await tmdb.searchMovies(searchQuery);
                  // Client-side filtering because TMDB search endpoint doesn't strictly filter by genre_ids nicely
                  // Note: 'genre_ids' might be missing in some search results, so we are lenient or strictly filter.
                  const filtered = results.filter(m => m.genre_ids && m.genre_ids.includes(genreId));
                  setMovies(filtered);
                  setHasMore(false); // Disable infinite scroll for search results
              } catch (e) {
                  console.error(e);
              } finally {
                  setLoading(false);
              }
          } else {
              if (isSearching) {
                  setIsSearching(false);
                  setMovies([]);
                  setPage(1); // Reset to page 1 for infinite scroll
                  setHasMore(true);
                  // The first useEffect will trigger fetchMovies(1)
              }
          }
      }, 600);

      return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const fetchMovies = async (pageNum: number) => {
    setLoading(true);
    try {
      const newMovies = await tmdb.discoverByGenre(genreId, 'movie', pageNum);
      if (newMovies.length === 0) {
          setHasMore(false);
      } else {
          setMovies(prev => pageNum === 1 ? newMovies : [...prev, ...newMovies]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = (item: Movie) => item.title || (item as any).name || 'Untitled';

  return (
    <div className="min-h-screen bg-background-dark animate-fade-in pb-20">
      
      {/* HEADER WITH SEARCH */}
      <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 transition-all">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4 w-full md:w-auto">
                  <button onClick={() => window.history.back()} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                      <span className="material-symbols-rounded">arrow_back</span>
                  </button>
                  <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
                      {genreName}
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded uppercase tracking-wider font-bold">Explorar</span>
                  </h1>
              </div>

              <div className="relative w-full md:w-96">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 material-symbols-rounded">search</span>
                  <input 
                    type="text" 
                    placeholder={`Pesquisar filmes de ${genreName}...`}
                    className="w-full bg-black/50 border border-white/10 rounded-full pl-12 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 transition-colors"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                          <span className="material-symbols-rounded text-lg">close</span>
                      </button>
                  )}
              </div>
          </div>
      </nav>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-4 py-6">
          {movies.length === 0 && !loading ? (
              <div className="text-center py-20">
                  <span className="material-symbols-rounded text-6xl text-white/10 mb-4">movie_filter</span>
                  <p className="text-white/40">Nenhum filme encontrado.</p>
              </div>
          ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {movies.map((item, index) => (
                      <div 
                        key={`${item.id}-${index}`} 
                        onClick={() => onMovieClick(item.id, 'movie')}
                        className="relative aspect-[2/3] rounded-xl overflow-hidden group cursor-pointer bg-white/5 ring-1 ring-white/5 hover:ring-red-500/50 transition-all duration-300 hover:scale-[1.02]"
                      >
                          <img 
                            src={tmdb.getPosterUrl(item.poster_path)} 
                            alt={getTitle(item)} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                              <span className="text-white font-bold text-sm line-clamp-2 leading-tight">{getTitle(item)}</span>
                              <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-white/60">{(item.release_date || '').split('-')[0]}</span>
                                  <span className="flex items-center text-[10px] text-yellow-500 font-bold gap-0.5">
                                      <span className="material-symbols-rounded text-[10px] fill-1">star</span> 
                                      {item.vote_average.toFixed(1)}
                                  </span>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {/* LOADING SKELETON / SPINNER */}
          {loading && (
              <div className="flex justify-center py-10 w-full">
                  <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
          )}

          {/* OBSERVER TARGET FOR INFINITE SCROLL */}
          {!isSearching && <div ref={observerTarget} className="h-10 w-full"></div>}
      </div>
    </div>
  );
};

export default GenreExplorer;
