
import React, { useEffect, useState } from 'react';
import { tmdb } from '../services/tmdbService';
import { storageService } from '../services/storageService';
import { Movie, WatchHistoryItem } from '../types';

interface HomeProps {
  onMovieClick: (id: number, type?: 'movie' | 'tv') => void;
  onPlayVideo: (config: any) => void;
}

const Home: React.FC<HomeProps> = ({ onMovieClick, onPlayVideo }) => {
  const [trending, setTrending] = useState<Movie[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inList, setInList] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const results = await tmdb.getTrending();
        setTrending(results);
        
        // Fetch history
        const history = storageService.getHistory();
        setWatchHistory(history);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !trending.length) return null;

  const featured = trending[0];
  const top10 = trending.slice(0, 10);
  const others = trending.slice(10);

  const handleClick = (item: Movie) => {
    onMovieClick(item.id, item.media_type === 'tv' ? 'tv' : 'movie');
  };

  const handleHistoryClick = (item: WatchHistoryItem) => {
    onMovieClick(item.id, item.type);
  };

  const handleFeaturedPlay = async () => {
     if (featured.media_type === 'tv') {
         onPlayVideo({ type: 'tv', id: String(featured.id), tmdbId: featured.id, season: 1, episode: 1 });
     } else {
         try {
             const details = await tmdb.getMovieDetails(String(featured.id));
             if (details && details.imdb_id) {
                 onPlayVideo({ type: 'movie', id: details.imdb_id, tmdbId: featured.id });
             } else {
                 console.error("IMDb ID not found");
             }
         } catch(e) {
             console.error("Error fetching movie details", e);
         }
     }
  };

  const getTitle = (item: Movie) => item.title || (item as any).name || 'Untitled';
  const getDate = (item: Movie) => (item.release_date || (item as any).first_air_date || '').split('-')[0];

  return (
    <div className="animate-fade-in">
      {/* HERO SECTION */}
      <header className="relative w-full h-[90vh] min-h-[600px] overflow-hidden">
          {/* Background with slow zoom */}
          <div className="absolute inset-0 bg-cover bg-center animate-zoom-slow" 
               style={{backgroundImage: `url(${tmdb.getBackdropUrl(featured.backdrop_path, 'original')})`}}>
          </div>
          
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/30 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background-dark/80 via-transparent to-transparent"></div>

          {/* Hero Content */}
          <div className="absolute bottom-0 left-0 w-full p-6 pb-12 lg:pb-20 flex flex-col items-start lg:items-start lg:pl-16 z-10 max-w-7xl mx-auto opacity-0 animate-slide-up">
              
              {/* Movie Meta */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 backdrop-blur-md px-2 py-1 rounded">Destaque #1</span>
                  <span className="text-white/80 text-xs font-medium bg-white/10 px-2 py-1 rounded">{getDate(featured)}</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-yellow-400">
                      <span className="material-symbols-rounded text-sm fill-current">star</span> {featured.vote_average.toFixed(1)}
                  </span>
              </div>

              {/* Title */}
              <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-4 tracking-tight drop-shadow-2xl leading-[0.9]">
                  {getTitle(featured).split(':')[0]} <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                    {getTitle(featured).split(':')[1] || ''}
                  </span>
              </h1>

              {/* Description */}
              <p className="text-white/70 text-sm md:text-base leading-relaxed line-clamp-3 max-w-md mb-8 font-light">
                  {featured.overview}
              </p>

              {/* Actions */}
              <div className="flex items-center flex-wrap gap-4 w-full md:w-auto">
                  <button onClick={handleFeaturedPlay} className="group flex items-center justify-center gap-2 bg-white text-black px-8 py-3.5 rounded-full font-bold text-base hover:scale-105 transition-all duration-300 w-full md:w-auto min-w-[160px]">
                      <span className="material-symbols-rounded text-3xl group-hover:text-primary transition-colors">play_arrow</span>
                      Assistir
                  </button>
                  
                  <button 
                    onClick={() => setInList(!inList)}
                    className={`group flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-medium text-base active:scale-95 transition-all w-full md:w-auto min-w-[160px] ${inList ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'glass text-white hover:bg-white/10'}`}
                  >
                      <span className={`material-symbols-rounded transition-transform duration-300 ${!inList ? 'group-hover:rotate-90' : ''}`}>
                        {inList ? 'check' : 'add'}
                      </span>
                      <span>{inList ? 'Adicionado' : 'Minha Lista'}</span>
                  </button>
              </div>
          </div>
      </header>

      {/* CONTENT SECTIONS CONTAINER */}
      <main className="relative z-10 -mt-10 lg:-mt-20 space-y-12 pb-10">
          
          {/* SECTION: Continue Watching (Only if history exists) */}
          {watchHistory.length > 0 && (
            <section className="pl-4 lg:pl-16 opacity-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-between pr-4 mb-4">
                    <h2 className="text-white text-lg md:text-xl font-display font-bold tracking-tight flex items-center gap-2">
                        Continuar Assistindo
                        <span className="material-symbols-rounded text-primary text-base animate-pulse">history</span>
                    </h2>
                </div>

                <div className="flex overflow-x-auto gap-4 pb-8 pr-4 hide-scrollbar snap-x cursor-grab active:cursor-grabbing">
                    {watchHistory.map((item, idx) => (
                      <div key={`${item.id}-${item.timestamp}`} onClick={() => handleHistoryClick(item)} className="flex-none w-[260px] md:w-[320px] snap-start group relative cursor-pointer">
                          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800 shadow-lg ring-1 ring-white/5 group-hover:ring-primary/50 transition-all duration-500">
                              <img src={tmdb.getBackdropUrl(item.backdrop_path)} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300 border border-white/30">
                                      <span className="material-symbols-rounded text-white text-3xl ml-1">play_arrow</span>
                                  </div>
                              </div>
                              {/* Progress Bar (Fake random progress for demo since we don't track seconds) */}
                              <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                                  <div className="h-full bg-gradient-to-r from-primary to-purple-500 shadow-[0_0_10px_#f20df2]" style={{ width: '45%' }}></div>
                              </div>
                          </div>
                          <div className="mt-3">
                              <h3 className="text-white text-sm font-bold truncate group-hover:text-primary transition-colors">{item.title}</h3>
                              <p className="text-white/40 text-xs mt-0.5">
                                {item.type === 'tv' && item.season ? `Temporada ${item.season} • Episódio ${item.episode}` : 'Filme'}
                              </p>
                          </div>
                      </div>
                    ))}
                </div>
            </section>
          )}

          {/* SECTION: Top 10 Trending */}
          <section className="pl-4 lg:pl-16">
              <h2 className="text-white text-lg md:text-xl font-display font-bold tracking-tight mb-6">Em Alta no Top 10</h2>
              <div className="flex overflow-x-auto gap-0 pb-8 pr-4 hide-scrollbar snap-x items-center">
                  {top10.map((item, index) => (
                    <div key={item.id} onClick={() => handleClick(item)} className="flex-none flex items-center snap-start relative w-[180px] group cursor-pointer hover:-translate-y-2 transition-transform duration-300">
                        <span className="text-[120px] font-bold leading-none text-stroke font-display -mr-6 z-0 translate-y-2 select-none">{index + 1}</span>
                        <div className="relative w-[120px] aspect-[2/3] rounded-lg overflow-hidden shadow-2xl z-10 rotate-3 group-hover:rotate-0 transition-transform duration-300 ring-1 ring-white/10">
                            <img src={tmdb.getPosterUrl(item.poster_path)} className="w-full h-full object-cover" alt={getTitle(item)} />
                        </div>
                    </div>
                  ))}
              </div>
          </section>

          {/* SECTION: Recommended */}
          <section className="pl-4 lg:pl-16 mb-20 px-4">
              <div className="flex items-center gap-4 mb-5 overflow-x-auto hide-scrollbar pr-4">
                  <button className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-bold whitespace-nowrap">Para Você</button>
                  <button className="px-4 py-1.5 rounded-full glass text-white text-sm font-medium hover:bg-white/10 whitespace-nowrap transition-colors">Filmes</button>
                  <button className="px-4 py-1.5 rounded-full glass text-white text-sm font-medium hover:bg-white/10 whitespace-nowrap transition-colors">Séries</button>
                  <button className="px-4 py-1.5 rounded-full glass text-white text-sm font-medium hover:bg-white/10 whitespace-nowrap transition-colors">Originais</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pr-4 max-w-7xl">
                  {others.map(item => (
                    <div key={item.id} onClick={() => handleClick(item)} className="relative aspect-[2/3] rounded-lg overflow-hidden group cursor-pointer ring-1 ring-white/5 hover:ring-primary/50 transition-all duration-300">
                        <img src={tmdb.getPosterUrl(item.poster_path)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={getTitle(item)} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <div>
                                <p className="text-white text-sm font-bold truncate">{getTitle(item)}</p>
                                <p className="text-primary text-xs">{item.media_type === 'tv' ? 'Série' : 'Filme'}</p>
                            </div>
                        </div>
                    </div>
                  ))}
              </div>
          </section>
      </main>
    </div>
  );
};

export default Home;
