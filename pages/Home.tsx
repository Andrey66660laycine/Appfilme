
import React, { useEffect, useState, useContext } from 'react';
import { tmdb } from '../services/tmdbService';
import { storageService } from '../services/storageService';
import { Movie, WatchHistoryItem } from '../types';
import { ProfileContext } from '../App';
import AISuggestionModal from '../components/AISuggestionModal';

interface HomeProps {
  onMovieClick: (id: number, type?: 'movie' | 'tv') => void;
  onPlayVideo: (config: any) => void;
}

const Home: React.FC<HomeProps> = ({ onMovieClick, onPlayVideo }) => {
  const currentProfile = useContext(ProfileContext);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inList, setInList] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv' | 'originals'>('all');

  // Atualização inteligente do histórico
  const refreshHistory = async () => {
      if (!currentProfile) return;
      // Usa a nova função que já filtra duplicatas e itens terminados
      const smartHistory = await storageService.getSmartContinueWatching(currentProfile.id);
      setWatchHistory(smartHistory);
  };

  useEffect(() => {
      const onFocus = () => refreshHistory();
      window.addEventListener('focus', onFocus);
      const interval = setInterval(refreshHistory, 2000); 
      return () => {
          window.removeEventListener('focus', onFocus);
          clearInterval(interval);
      };
  }, [currentProfile]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!currentProfile) return;

        let results: Movie[] = [];
        if (activeTab === 'all') results = await tmdb.getTrending('all', currentProfile.is_kid);
        else if (activeTab === 'movie') results = await tmdb.getTrending('movie', currentProfile.is_kid);
        else if (activeTab === 'tv') results = await tmdb.getTrending('tv', currentProfile.is_kid);
        else if (activeTab === 'originals') results = await tmdb.getOriginals();

        setTrending(results);
        await refreshHistory();
        
        if (results.length > 0) {
            const feat = results[0];
            const type = feat.media_type === 'tv' ? 'tv' : 'movie';
            const exists = await storageService.isInLibrary(currentProfile.id, feat.id, type);
            setInList(exists);
        }

      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [currentProfile, activeTab]);

  if (loading && !trending.length) return (
      <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
               <div className="w-16 h-16 border-4 border-white/10 border-t-primary rounded-full animate-spin"></div>
               <p className="text-white/30 text-xs uppercase tracking-widest animate-pulse">Carregando Void...</p>
          </div>
      </div>
  );

  if (!trending.length) return null;

  const featured = trending[0];
  const top10 = trending.slice(0, 10);
  const others = trending.slice(10);

  const handleClick = (item: Movie) => {
    onMovieClick(item.id, item.media_type === 'tv' || activeTab === 'tv' || activeTab === 'originals' ? 'tv' : 'movie');
  };

  const handleHistoryClick = async (item: WatchHistoryItem) => {
    const playConfig: any = {
        type: item.type,
        tmdbId: Number(item.id || item.tmdb_id),
        season: item.season || 1,
        episode: item.episode || 1,
        initialTime: item.progress || 0 
    };

    if (item.type === 'tv') {
        playConfig.id = String(item.id);
        onPlayVideo(playConfig);
    } else {
        try {
            const details = await tmdb.getMovieDetails(String(item.id));
            playConfig.id = details?.imdb_id || String(item.id);
            onPlayVideo(playConfig);
        } catch (e) {
            playConfig.id = String(item.id);
            onPlayVideo(playConfig);
        }
    }
  };

  const handleRemoveFromHistory = async (e: React.MouseEvent, item: WatchHistoryItem) => {
      e.stopPropagation();
      if (!currentProfile) return;
      const matchId = Number(item.tmdb_id || item.id);
      if (!isNaN(matchId)) {
          await storageService.removeFromHistory(currentProfile.id, matchId, item.type);
          refreshHistory();
      }
  };

  const toggleMyList = async () => {
      if (!currentProfile) return;
      const type = featured.media_type === 'tv' || activeTab === 'tv' ? 'tv' : 'movie';
      if (inList) {
          const success = await storageService.removeFromLibrary(currentProfile.id, featured.id, type);
          if (success) setInList(false);
      } else {
          const success = await storageService.addToLibrary(currentProfile.id, {
              id: featured.id,
              type: type,
              title: getTitle(featured),
              poster_path: featured.poster_path,
              backdrop_path: featured.backdrop_path,
              vote_average: featured.vote_average,
              release_date: featured.release_date || (featured as any).first_air_date,
              addedAt: Date.now()
          });
          if (success) setInList(true);
      }
  };

  const handleFeaturedPlay = async () => {
     const isTv = featured.media_type === 'tv' || activeTab === 'tv' || activeTab === 'originals';
     if (isTv) {
         onPlayVideo({ type: 'tv', id: String(featured.id), tmdbId: featured.id, season: 1, episode: 1 });
     } else {
         try {
             const details = await tmdb.getMovieDetails(String(featured.id));
             onPlayVideo({ type: 'movie', id: details?.imdb_id || String(featured.id), tmdbId: featured.id });
         } catch(e) {}
     }
  };
  
  const handleAIPlay = async (movie: Movie) => {
      setShowAIModal(false);
      const isTv = movie.media_type === 'tv';
      if (isTv) {
          onPlayVideo({ type: 'tv', id: String(movie.id), tmdbId: movie.id, season: 1, episode: 1 });
      } else {
          try {
              const details = await tmdb.getMovieDetails(String(movie.id));
              onPlayVideo({ type: 'movie', id: details?.imdb_id || String(movie.id), tmdbId: movie.id });
          } catch(e) {}
     }
  };

  const getTitle = (item: Movie) => item.title || (item as any).name || 'Untitled';
  const getDate = (item: Movie) => (item.release_date || (item as any).first_air_date || '').split('-')[0];

  return (
    <div className="animate-fade-in relative bg-black pb-32">

      {showBanner && (
          <div className="relative z-50 bg-gradient-to-r from-purple-900 to-primary text-white text-xs font-bold px-4 py-2 flex items-center justify-center text-center animate-slide-up shadow-lg border-b border-white/10">
              <span className="material-symbols-rounded text-sm mr-2 animate-pulse">new_releases</span>
              <span>Versão 2.0: Player Inteligente e Novo Design.</span>
              <button onClick={() => setShowBanner(false)} className="absolute right-2 p-1 hover:bg-white/20 rounded-full transition-colors"><span className="material-symbols-rounded text-sm">close</span></button>
          </div>
      )}
      
      {showAIModal && <AISuggestionModal onClose={() => setShowAIModal(false)} onPlay={handleAIPlay} history={watchHistory} isKid={currentProfile?.is_kid || false} />}

      {/* FAB AI - Floating Action Button */}
      <div className="fixed bottom-24 right-4 z-40 lg:bottom-10 lg:right-10 animate-fade-in-up">
          <button onClick={() => setShowAIModal(true)} className="group relative flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:bg-white hover:text-black hover:scale-110 transition-all duration-300">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping-slow opacity-0 group-hover:opacity-100"></div>
              <span className="material-symbols-rounded text-3xl group-hover:rotate-12 transition-transform">auto_awesome</span>
          </button>
      </div>

      {/* HERO SECTION REDESIGNED */}
      <header className="relative w-full h-[85vh] min-h-[600px] overflow-hidden group">
          
          {/* Background Image with Parallax & Zoom */}
          <div className="absolute inset-0 bg-cover bg-center animate-zoom-slow" style={{backgroundImage: `url(${tmdb.getBackdropUrl(featured.backdrop_path, 'original')})`}}></div>
          
          {/* Premium Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>
          
          {/* Subtle Aurora Effect at bottom */}
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-primary/10 to-transparent opacity-50 mix-blend-screen pointer-events-none"></div>

          <div className="absolute bottom-0 left-0 w-full p-6 pb-12 lg:pb-24 flex flex-col items-start lg:pl-16 z-10 max-w-7xl mx-auto opacity-0 animate-slide-up">
              
              {/* Metadata Badges */}
              <div className="mb-6 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                       <span className="material-symbols-rounded text-yellow-400 text-sm fill-1">star</span>
                       <span className="text-white font-bold text-xs">{featured.vote_average.toFixed(1)}</span>
                  </div>
                  <span className="text-white/60 text-xs font-medium px-2 border-l border-white/20">{getDate(featured)}</span>
                  <span className="text-white/60 text-xs font-medium px-2 border-l border-white/20 uppercase tracking-wider">{featured.media_type === 'tv' ? 'Série' : 'Filme'}</span>
                  <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/20 uppercase tracking-widest shadow-[0_0_10px_rgba(242,13,242,0.2)]">Top 1</span>
              </div>

              {/* Title */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black text-white mb-6 tracking-tighter drop-shadow-2xl leading-[0.9] max-w-4xl">
                  {getTitle(featured)}
              </h1>

              {/* Overview */}
              <p className="text-white/70 text-sm md:text-base leading-relaxed line-clamp-3 max-w-lg mb-10 font-light border-l-2 border-primary/50 pl-4">
                  {featured.overview}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center flex-wrap gap-4 w-full md:w-auto">
                  <button onClick={handleFeaturedPlay} className="relative overflow-hidden group flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all duration-300 w-full md:w-auto min-w-[200px] shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      <span className="material-symbols-rounded text-3xl fill-1 group-hover:text-primary transition-colors">play_arrow</span> 
                      <span>Assistir Agora</span>
                  </button>
                  
                  <button onClick={toggleMyList} className={`group flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-medium text-lg transition-all w-full md:w-auto min-w-[180px] backdrop-blur-md border ${inList ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/30'}`}>
                      <span className={`material-symbols-rounded transition-transform duration-300 ${!inList ? 'group-hover:rotate-90' : ''}`}>{inList ? 'check' : 'add'}</span>
                      <span>{inList ? 'Na Lista' : 'Minha Lista'}</span>
                  </button>
              </div>
          </div>
      </header>

      <main className="relative z-20 -mt-16 space-y-16">
          
          {/* SECTION: SMART CONTINUE WATCHING */}
          {activeTab === 'all' && watchHistory.length > 0 && (
            <section className="pl-4 lg:pl-16 opacity-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-primary rounded-full"></div>
                    <h2 className="text-white text-xl font-display font-bold tracking-tight">Continuar Assistindo</h2>
                </div>

                <div className="flex overflow-x-auto gap-5 pb-8 pr-4 hide-scrollbar snap-x cursor-grab active:cursor-grabbing">
                    {watchHistory.map((item) => {
                        const duration = item.duration || 1;
                        const progress = item.progress || 0;
                        const percent = Math.min(100, (progress / duration) * 100);
                        const remaining = Math.round((duration - progress) / 60);

                        return (
                          <div key={`${item.id}-${item.timestamp}`} onClick={() => handleHistoryClick(item)} className="flex-none w-[280px] md:w-[320px] snap-start group relative cursor-pointer">
                              
                              {/* Remove Button */}
                              <button onClick={(e) => handleRemoveFromHistory(e, item)} className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-surface border border-white/10 text-white/50 hover:text-white hover:bg-red-500 hover:border-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-30 shadow-lg scale-90 group-hover:scale-100">
                                <span className="material-symbols-rounded text-lg">close</span>
                              </button>

                              {/* Card Container */}
                              <div className="relative aspect-video rounded-xl overflow-hidden bg-surface shadow-2xl ring-1 ring-white/5 group-hover:ring-primary/50 transition-all duration-300">
                                  <img src={tmdb.getBackdropUrl(item.backdrop_path, 'w780')} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-100" />
                                  
                                  {/* Play Icon Overlay */}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                      <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 shadow-lg group-active:scale-95 transition-transform">
                                          <span className="material-symbols-rounded text-white text-4xl ml-1 fill-1">play_arrow</span>
                                      </div>
                                  </div>
                                  
                                  {/* Progress Bar Container */}
                                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                                      <div className="h-full bg-gradient-to-r from-primary to-purple-400 shadow-[0_0_15px_#f20df2]" style={{ width: `${percent}%` }}></div>
                                  </div>

                                  {/* Smart Info Badge */}
                                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/5 flex items-center gap-2">
                                       <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                       <span className="text-[10px] font-bold text-white uppercase tracking-wider">{item.type === 'tv' ? `S${item.season} E${item.episode}` : 'Filme'}</span>
                                  </div>
                              </div>

                              {/* Meta Info */}
                              <div className="mt-3 px-1 flex justify-between items-start">
                                  <div className="max-w-[80%]">
                                      <h3 className="text-white text-sm font-bold truncate group-hover:text-primary transition-colors">{item.title}</h3>
                                      <p className="text-white/40 text-xs mt-0.5">Faltam {remaining} min</p>
                                  </div>
                                  <span className="material-symbols-rounded text-white/20 group-hover:text-white/60 transition-colors">schedule</span>
                              </div>
                          </div>
                        );
                    })}
                </div>
            </section>
          )}
          
          {/* SECTION: TOP 10 RANKING */}
          <section className="pl-4 lg:pl-16">
              <div className="flex items-center gap-3 mb-6">
                 <h2 className="text-white text-xl font-display font-bold tracking-tight">
                    {currentProfile?.is_kid ? 'Mais Populares' : `Top 10 ${activeTab === 'movie' ? 'Filmes' : activeTab === 'tv' ? 'Séries' : 'Hoje'}`}
                 </h2>
              </div>
              
              <div className="flex overflow-x-auto gap-4 pb-8 pr-4 hide-scrollbar snap-x items-center">
                  {top10.map((item, index) => (
                    <div key={item.id} onClick={() => handleClick(item)} className="flex-none flex items-center snap-start relative w-[200px] group cursor-pointer hover:-translate-y-2 transition-transform duration-300">
                        {/* Styled Number */}
                        <div className="font-display font-black text-[140px] leading-none text-transparent text-stroke z-0 translate-y-4 -mr-8 select-none opacity-50 group-hover:opacity-100 transition-opacity">
                            {index + 1}
                        </div>
                        
                        {/* Poster */}
                        <div className="relative w-[140px] aspect-[2/3] rounded-lg overflow-hidden shadow-2xl z-10 ring-1 ring-white/10 group-hover:ring-white/30 transition-all">
                            <img src={tmdb.getPosterUrl(item.poster_path)} className="w-full h-full object-cover" alt={getTitle(item)} />
                        </div>
                    </div>
                  ))}
              </div>
          </section>

          {/* SECTION: CATEGORY TABS & GRID */}
          <section className="pl-4 lg:pl-16 px-4">
              <div className="flex items-center gap-4 mb-8 overflow-x-auto hide-scrollbar pr-4 pb-2 border-b border-white/5">
                  {['all', 'movie', 'tv', 'originals'].map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab as any)} className={`relative px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${activeTab === tab ? 'text-black bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                          {tab === 'all' ? 'Para Você' : tab === 'movie' ? 'Filmes' : tab === 'tv' ? 'Séries' : 'Originais'}
                      </button>
                  ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pr-4 max-w-[1600px]">
                  {others.map((item, idx) => (
                    <div 
                        key={item.id} 
                        onClick={() => handleClick(item)} 
                        className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-surface ring-1 ring-white/5 hover:ring-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                        style={{ animationDelay: `${idx * 50}ms` }}
                    >
                        <img src={tmdb.getPosterUrl(item.poster_path)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" alt={getTitle(item)} loading="lazy" />
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                            <p className="text-white text-sm font-bold leading-tight mb-1">{getTitle(item)}</p>
                            <div className="flex items-center justify-between">
                                <p className="text-primary text-[10px] font-bold uppercase tracking-wider">{item.media_type === 'tv' || activeTab === 'tv' ? 'Série' : 'Filme'}</p>
                                <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold">
                                     <span className="material-symbols-rounded text-[10px] fill-1">star</span>
                                     {item.vote_average.toFixed(1)}
                                </div>
                            </div>
                        </div>
                    </div>
                  ))}
              </div>
          </section>
      </main>

      <style>{`
          .text-stroke { -webkit-text-stroke: 2px rgba(255,255,255,0.3); }
          .group:hover .text-stroke { -webkit-text-stroke: 2px rgba(255,255,255,0.8); text-shadow: 0 0 20px rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};

export default Home;
