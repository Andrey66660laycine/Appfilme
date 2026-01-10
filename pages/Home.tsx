
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
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [showBanner, setShowBanner] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv' | 'originals'>('all');

  // Atualização robusta do histórico via LocalStorage
  const refreshHistory = async () => {
      if (!currentProfile) return;
      // Agora pega do LocalStorage, muito mais rápido
      const history = await storageService.getHistory(currentProfile.id);
      
      const continueWatching = history.filter(item => {
          if (!item.duration || item.duration === 0) return true;
          const pct = (item.progress / item.duration);
          return pct < 0.95 && pct > 0.02; // Filtra terminados e iniciados acidentalmente
      });

      setWatchHistory(continueWatching);
  };

  useEffect(() => {
      const onFocus = () => refreshHistory();
      window.addEventListener('focus', onFocus);
      const interval = setInterval(refreshHistory, 2000); // Polling mais rápido para refletir mudanças do player
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
      <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
    // Configuração para abrir o player direto no ponto salvo
    const playConfig: any = {
        type: item.type,
        tmdbId: Number(item.id || item.tmdb_id),
        season: item.season || 1,
        episode: item.episode || 1,
        initialTime: item.progress || 0 // Tempo exato salvo no LocalStorage
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
      // CORREÇÃO: Garante que estamos passando um número para o storageService
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
    <div className="animate-fade-in relative bg-black pb-24">

      {showBanner && (
          <div className="relative z-50 bg-gradient-to-r from-blue-900 to-primary/80 text-white text-xs font-bold px-4 py-2 flex items-center justify-center text-center animate-slide-up shadow-lg border-b border-white/10">
              <span className="material-symbols-rounded text-sm mr-2 animate-pulse">info</span>
              <span>Novos servidores adicionados. Melhor qualidade e velocidade.</span>
              <button onClick={() => setShowBanner(false)} className="absolute right-2 p-1 hover:bg-white/20 rounded-full transition-colors"><span className="material-symbols-rounded text-sm">close</span></button>
          </div>
      )}
      
      {showAIModal && <AISuggestionModal onClose={() => setShowAIModal(false)} onPlay={handleAIPlay} history={watchHistory} isKid={currentProfile?.is_kid || false} />}

      {showBugModal && (
          <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-display font-bold text-white">Reportar Problema</h2>
                      <button onClick={() => setShowBugModal(false)} className="text-white/50 hover:text-white"><span className="material-symbols-rounded">close</span></button>
                  </div>
                  <textarea value={bugDescription} onChange={(e) => setBugDescription(e.target.value)} placeholder="Descreva..." className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm mb-4" />
                  <button onClick={() => { alert("Enviado!"); setShowBugModal(false); }} className="w-full bg-white text-black py-2 rounded-lg font-bold">Enviar</button>
              </div>
          </div>
      )}

      {/* FAB AI */}
      <div className="fixed bottom-24 right-4 z-40 lg:bottom-10 lg:right-10 animate-fade-in-up">
          <button onClick={() => setShowAIModal(true)} className="group relative flex items-center justify-center w-14 h-14 bg-white text-black rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:shadow-[0_0_35px_rgba(242,13,242,0.6)] hover:scale-110 transition-all duration-300">
              <span className="material-symbols-rounded text-3xl group-hover:rotate-12 transition-transform text-primary fill-1">auto_awesome</span>
          </button>
      </div>

      {/* HERO */}
      <header className="relative w-full h-[85vh] min-h-[600px] overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center animate-zoom-slow" style={{backgroundImage: `url(${tmdb.getBackdropUrl(featured.backdrop_path, 'original')})`}}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent"></div>

          <div className="absolute top-24 right-4 md:right-8 z-30">
              <button onClick={() => setShowBugModal(true)} className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full transition-all group">
                  <span className="material-symbols-rounded text-white/50 text-sm">bug_report</span>
              </button>
          </div>

          <div className="absolute bottom-0 left-0 w-full p-6 pb-12 lg:pb-20 flex flex-col items-start lg:items-start lg:pl-16 z-10 max-w-7xl mx-auto opacity-0 animate-slide-up">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 backdrop-blur-md px-2 py-1 rounded">Destaque #1</span>
                  <span className="text-white/80 text-xs font-medium bg-white/10 px-2 py-1 rounded">{getDate(featured)}</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-yellow-400"><span className="material-symbols-rounded text-sm fill-current">star</span> {featured.vote_average.toFixed(1)}</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-4 tracking-tight drop-shadow-2xl leading-[0.9]">
                  {getTitle(featured)}
              </h1>

              <p className="text-white/70 text-sm md:text-base leading-relaxed line-clamp-3 max-w-md mb-8 font-light">{featured.overview}</p>

              <div className="flex items-center flex-wrap gap-4 w-full md:w-auto">
                  <button onClick={handleFeaturedPlay} className="group flex items-center justify-center gap-2 bg-white text-black px-8 py-3.5 rounded-full font-bold text-base hover:scale-105 transition-all duration-300 w-full md:w-auto min-w-[160px]">
                      <span className="material-symbols-rounded text-3xl group-hover:text-primary transition-colors">play_arrow</span> Assistir
                  </button>
                  <button onClick={toggleMyList} className={`group flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-medium text-base active:scale-95 transition-all w-full md:w-auto min-w-[160px] ${inList ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'glass text-white hover:bg-white/10'}`}>
                      <span className={`material-symbols-rounded transition-transform duration-300 ${!inList ? 'group-hover:rotate-90' : ''}`}>{inList ? 'check' : 'add'}</span>
                      <span>{inList ? 'Adicionado' : 'Minha Lista'}</span>
                  </button>
              </div>
          </div>
      </header>

      <main className="relative z-10 -mt-10 lg:-mt-20 space-y-12">
          
          {/* SECTION: CONTINUE WATCHING (PREMIUM REDESIGN) */}
          {activeTab === 'all' && watchHistory.length > 0 && (
            <section className="pl-4 lg:pl-16 opacity-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-between pr-4 mb-4">
                    <h2 className="text-white text-lg md:text-xl font-display font-bold tracking-tight flex items-center gap-2">
                        Continuar Assistindo
                        <span className="material-symbols-rounded text-primary text-base animate-pulse">resume</span>
                    </h2>
                </div>

                <div className="flex overflow-x-auto gap-4 pb-8 pr-4 hide-scrollbar snap-x cursor-grab active:cursor-grabbing">
                    {watchHistory.map((item) => {
                        const percent = (item.duration || 0) > 0 ? ((item.progress || 0) / (item.duration || 1)) * 100 : 0;
                        return (
                          <div key={`${item.id}-${item.timestamp}`} onClick={() => handleHistoryClick(item)} className="flex-none w-[260px] md:w-[300px] snap-start group relative cursor-pointer">
                              {/* Close Button */}
                              <button onClick={(e) => handleRemoveFromHistory(e, item)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-red-500 text-white/70 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-30 backdrop-blur-sm border border-white/10">
                                <span className="material-symbols-rounded text-lg">close</span>
                              </button>

                              {/* Card Image */}
                              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 shadow-xl ring-1 ring-white/10 group-hover:ring-primary/50 transition-all duration-300">
                                  <img src={tmdb.getBackdropUrl(item.backdrop_path, 'w780')} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100" />
                                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300 border border-white/30 group-hover:bg-primary group-hover:border-primary shadow-lg">
                                          <span className="material-symbols-rounded text-white text-3xl ml-1 fill-1">play_arrow</span>
                                      </div>
                                  </div>
                                  
                                  {/* Progress Bar (Neon) */}
                                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 backdrop-blur-sm">
                                      <div className="h-full bg-gradient-to-r from-primary to-purple-500 shadow-[0_0_10px_#f20df2]" style={{ width: `${percent}%` }}></div>
                                  </div>

                                  {/* Remaining Time Badge */}
                                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-bold text-white/90 border border-white/10">
                                      {Math.round(((item.duration || 0) - (item.progress || 0)) / 60)} min rest.
                                  </div>
                              </div>

                              <div className="mt-3 px-1">
                                  <h3 className="text-white text-sm font-bold truncate group-hover:text-primary transition-colors">{item.title}</h3>
                                  {item.type === 'tv' && (
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] font-bold text-black bg-white px-1.5 rounded uppercase tracking-wide">S{item.season} E{item.episode}</span>
                                          <span className="text-[10px] text-white/40">Continuar de {Math.floor((item.progress || 0) / 60)}m</span>
                                      </div>
                                  )}
                                  {item.type === 'movie' && <span className="text-[10px] text-white/40 mt-1 block">Filme • {Math.floor(percent)}% Completo</span>}
                              </div>
                          </div>
                        );
                    })}
                </div>
            </section>
          )}
          
          {/* SECTION: Top 10 */}
          <section className="pl-4 lg:pl-16">
              <h2 className="text-white text-lg md:text-xl font-display font-bold tracking-tight mb-6">
                  {currentProfile?.is_kid ? 'Mais Populares' : `Top 10 ${activeTab === 'movie' ? 'Filmes' : activeTab === 'tv' ? 'Séries' : 'Hoje'}`}
              </h2>
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

          {/* SECTION: Recommended Grid */}
          <section className="pl-4 lg:pl-16 mb-20 px-4">
              <div className="flex items-center gap-4 mb-5 overflow-x-auto hide-scrollbar pr-4">
                  {['all', 'movie', 'tv', 'originals'].map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-white text-black' : 'glass text-white hover:bg-white/10'}`}>
                          {tab === 'all' ? 'Para Você' : tab === 'movie' ? 'Filmes' : tab === 'tv' ? 'Séries' : 'Originais'}
                      </button>
                  ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pr-4 max-w-7xl">
                  {others.map(item => (
                    <div key={item.id} onClick={() => handleClick(item)} className="relative aspect-[2/3] rounded-lg overflow-hidden group cursor-pointer ring-1 ring-white/5 hover:ring-primary/50 transition-all duration-300">
                        <img src={tmdb.getPosterUrl(item.poster_path)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={getTitle(item)} loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <div>
                                <p className="text-white text-sm font-bold truncate">{getTitle(item)}</p>
                                <p className="text-primary text-xs">{item.media_type === 'tv' || activeTab === 'tv' ? 'Série' : 'Filme'}</p>
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
