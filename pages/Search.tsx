
import React, { useEffect, useState, useRef } from 'react';
import { Movie } from '../types';
import { tmdb } from '../services/tmdbService';

interface SearchProps {
  query: string;
  onMovieClick: (id: number, type?: 'movie' | 'tv') => void;
}

const Search: React.FC<SearchProps> = ({ query: initialQuery, onMovieClick }) => {
  const [inputValue, setInputValue] = useState(initialQuery);
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'default' | 'loading' | 'results'>('default');
  const [history, setHistory] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem('sv_search_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    setInputValue(initialQuery);
    if (initialQuery) {
      handleSearch(initialQuery);
    } else {
      setView('default');
    }
  }, [initialQuery]);

  const saveToHistory = (term: string) => {
    if (!term.trim()) return;
    const newHistory = [term, ...history.filter(h => h !== term)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('sv_search_history', JSON.stringify(newHistory));
  };

  // Main search logic (Text based)
  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      setView('default');
      return;
    }

    setLoading(true);
    setView('loading');
    
    try {
      const movies = await tmdb.searchMovies(term);
      setResults(movies);
      setView('results');
      if (movies.length > 0) saveToHistory(term);
    } catch (err) {
      console.error(err);
      setView('results');
    } finally {
      setLoading(false);
    }
  };

  // Logic for genre clicks (Discover API)
  const handleGenreClick = async (genreId: number, genreName: string) => {
      setInputValue(genreName); // Visual update only
      setLoading(true);
      setView('loading');
      try {
          const movies = await tmdb.discoverByGenre(genreId, 'movie');
          setResults(movies);
          setView('results');
      } catch (err) {
          console.error(err);
          setView('results');
      } finally {
          setLoading(false);
      }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);

    if (!val.trim()) {
      setView('default');
      return;
    }

    // Immediate view change for responsiveness
    if (view !== 'loading') setView('loading');

    debounceTimer.current = window.setTimeout(() => {
      handleSearch(val);
    }, 600);
  };

  const clearSearch = () => {
    setInputValue('');
    setView('default');
    setResults([]);
    setActiveFilter('Todos');
    if (window.location.hash.startsWith('#/search/')) {
        window.location.hash = '#/search/';
    }
  };

  const deleteHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h !== item);
    setHistory(newHistory);
    localStorage.setItem('sv_search_history', JSON.stringify(newHistory));
  };

  const clearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem('sv_search_history');
  };

  const selectFilter = (filter: string) => {
    setActiveFilter(filter);
  };
  
  const handleItemClick = (item: Movie) => {
    onMovieClick(item.id, item.media_type === 'tv' ? 'tv' : 'movie');
  };

  const getTitle = (item: Movie) => item.title || (item as any).name || 'Untitled';

  const genres = [
    { id: 28, name: 'Ação', img: 'https://image.tmdb.org/t/p/w500/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg', color: 'from-purple-900' },
    { id: 878, name: 'Sci-Fi', img: 'https://image.tmdb.org/t/p/w500/8rpDcsfLJypbO6vREc05475qg9e.jpg', color: 'from-teal-900' },
    { id: 27, name: 'Terror', img: 'https://image.tmdb.org/t/p/w500/5aUVLiqcW0kFTBfGsCWjvLas91w.jpg', color: 'from-red-900' },
    { id: 35, name: 'Comédia', img: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg', color: 'from-yellow-600' },
    { id: 10749, name: 'Romance', img: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg', color: 'from-pink-900' },
    { id: 16, name: 'Animação', img: 'https://image.tmdb.org/t/p/w500/4n8QNNdk4BOX9Dslfbz5Dy6j1HK.jpg', color: 'from-blue-600' },
  ];

  // Filtering Logic for Display
  const filteredResults = results.filter(item => {
      if (activeFilter === 'Todos') return true;
      if (activeFilter === 'Filmes') return item.media_type === 'movie';
      if (activeFilter === 'Séries') return item.media_type === 'tv';
      if (activeFilter === '4K UHD') return item.vote_average > 7.5; // Simulação
      return true;
  });

  return (
    <div className="bg-background-dark min-h-screen animate-fade-in pb-20">
      {/* STICKY HEADER */}
      <header className="sticky top-0 z-50 glass-header px-4 pt-4 pb-2 transition-all duration-300">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-4">
          
          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 group input-glow rounded-xl transition-all duration-300 border border-white/5 bg-surface">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-rounded text-[22px]">search</span>
              </div>
              
              <input 
                value={inputValue}
                onChange={onInputChange}
                className="block w-full rounded-xl border-none bg-transparent py-3.5 pl-11 pr-10 text-sm text-white placeholder-white/40 focus:ring-0" 
                placeholder="Filmes, séries, gêneros..." 
                type="text" 
                autoComplete="off"
              />
              
              {inputValue && (
                <button onClick={clearSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white transition-colors">
                  <span className="material-symbols-rounded text-[20px] bg-white/10 rounded-full p-0.5">close</span>
                </button>
              )}
            </div>
            
            <button onClick={clearSearch} className="text-sm font-medium text-white/60 hover:text-primary transition-colors active:scale-95">
              Cancelar
            </button>
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4">
            {['Todos', 'Filmes', 'Séries', '4K UHD'].map(f => (
              <button 
                key={f}
                onClick={() => selectFilter(f)} 
                className={`flex items-center justify-center px-4 py-1.5 rounded-full text-xs transition-all active:scale-95 whitespace-nowrap border ${activeFilter === f ? 'active border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(242,13,242,0.3)] font-bold' : 'border-white/10 bg-surface text-white/70 hover:bg-white/10 hover:border-white/20 font-medium'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="w-full max-w-2xl mx-auto px-4 py-4 min-h-[70vh]">

        {/* VIEW 1: DEFAULT (History & Categories) */}
        {view === 'default' && (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* Recent Searches */}
            {history.length > 0 && (
              <section id="recentSearches">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-display font-bold tracking-tight text-white flex items-center gap-2">
                    Recentes
                    <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                  </h2>
                  <button onClick={clearAllHistory} className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors uppercase tracking-wider">Limpar</button>
                </div>
                
                <div className="space-y-2">
                  {history.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => { setInputValue(item); handleSearch(item); }}
                      className="group flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-surface-highlight border border-white/5 hover:border-white/10 transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-white/50 group-hover:text-primary transition-colors">
                          <span className="material-symbols-rounded text-[18px]">history</span>
                        </div>
                        <span className="text-sm text-white/90 font-medium truncate">{item}</span>
                      </div>
                      <button onClick={(e) => deleteHistoryItem(e, item)} className="p-1.5 rounded-full text-white/30 hover:text-red-400 hover:bg-white/10 transition-colors">
                        <span className="material-symbols-rounded text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Browse Genres */}
            <section>
              <h2 className="text-lg font-display font-bold tracking-tight text-white mb-4">Navegar por Gêneros</h2>
              <div className="grid grid-cols-2 gap-3">
                {genres.map(genre => (
                  <div 
                    key={genre.id}
                    onClick={() => handleGenreClick(genre.id, genre.name)}
                    className="relative h-24 rounded-xl overflow-hidden group cursor-pointer border border-white/5 hover:border-primary/50 transition-all duration-300"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${genre.color} via-transparent to-black z-0`}></div>
                    <img src={genre.img} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60 group-hover:scale-110 group-hover:opacity-80 transition-all duration-500" alt={genre.name} />
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <span className="text-white font-bold text-lg tracking-wide drop-shadow-lg group-hover:text-primary transition-colors">{genre.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: LOADING SKELETON */}
        {view === 'loading' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <span className="text-sm text-white/50">Buscando...</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-[2/3] rounded-xl bg-surface animate-pulse-fast"></div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: RESULTS */}
        {view === 'results' && (
          <div className="pt-2 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Resultados para "<span className="text-primary">{inputValue}</span>"</h2>
            </div>
            
            {filteredResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {filteredResults.map((item, index) => (
                  <div 
                    key={item.id} 
                    onClick={() => handleItemClick(item)}
                    className="relative group cursor-pointer opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                  >
                    <div className="aspect-[2/3] w-full overflow-hidden rounded-xl bg-surface relative shadow-lg group-hover:shadow-primary/30 ring-1 ring-white/5 group-hover:ring-primary/50 transition-all duration-300">
                      <img src={tmdb.getPosterUrl(item.poster_path)} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" alt={getTitle(item)} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                      <div className="absolute top-2 left-2 bg-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                        {item.vote_average > 7 ? 'HD' : 'SD'}
                      </div>
                      <div className="absolute bottom-0 p-3 w-full">
                        <p className="text-white font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">{getTitle(item)}</p>
                        <p className="text-white/50 text-xs mt-1">{item.media_type === 'tv' ? 'Série' : 'Filme'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-40 bg-white/5 rounded-3xl border border-white/5">
                <span className="material-symbols-rounded text-6xl text-white/20 mb-4">search_off</span>
                <p className="text-xl text-white/40 font-display">Nenhum resultado encontrado.</p>
                <button onClick={clearSearch} className="mt-4 text-primary font-bold hover:underline">Limpar busca</button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default Search;
