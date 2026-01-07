
import React, { useEffect, useState, useRef, useContext } from 'react';
import { tmdb } from '../services/tmdbService';
import { storageService } from '../services/storageService';
import { SeriesDetails, Episode, Movie } from '../types';
import { ProfileContext } from '../App';

interface TVDetailsProps {
  id: string;
  onPlay: (config: { type: 'tv'; id: string; season: number; episode: number; tmdbId?: number }) => void;
}

const TVDetails: React.FC<TVDetailsProps> = ({ id, onPlay }) => {
  const currentProfile = useContext(ProfileContext);
  const [series, setSeries] = useState<SeriesDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [related, setRelated] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track watched status per episode (Season-Episode -> Progress%)
  const [watchedMap, setWatchedMap] = useState<Record<string, number>>({});
  
  // Tabs & Navigation State
  const [activeTab, setActiveTab] = useState<'episodes' | 'related' | 'details'>('episodes');
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isSeasonMenuOpen, setIsSeasonMenuOpen] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  
  const [inList, setInList] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; icon: string }>({
    visible: false,
    message: '',
    icon: 'check_circle',
  });

  const parallaxRef = useRef<HTMLDivElement>(null);

  // Carrega progresso dos episódios
  useEffect(() => {
    const loadProgress = async () => {
        if (!currentProfile || !id) return;
        
        try {
            const history = await storageService.getSeriesHistory(currentProfile.id, Number(id));
            const map: Record<string, number> = {};
            
            history.forEach(item => {
                if (item.season && item.episode) {
                    // Calcula porcentagem se tiver duração, senão assume 0
                    const pct = item.duration > 0 ? (item.progress / item.duration) * 100 : 0;
                    map[`${item.season}-${item.episode}`] = pct;
                }
            });
            setWatchedMap(map);
        } catch (e) {
            console.error("Erro ao carregar progresso da série", e);
        }
    };
    
    loadProgress();
  }, [id, currentProfile, activeTab]); // Recarrega se mudar a aba (ex: voltando do player)

  useEffect(() => {
    const fetchSeriesData = async () => {
      try {
        setLoading(true);
        const [details, recommendations, videosData] = await Promise.all([
             tmdb.getTVDetails(id),
             tmdb.getRecommendations(id, 'tv'),
             tmdb.getVideos(id, 'tv')
        ]);

        if (details) {
          setSeries(details);
          setRelated(recommendations);

           // Find trailer
          const trailer = videosData.find((v: any) => v.type === "Trailer" && v.site === "YouTube") || videosData.find((v: any) => v.site === "YouTube");
          if (trailer) setTrailerKey(trailer.key);
          
          if (currentProfile) {
            const exists = await storageService.isInLibrary(currentProfile.id, details.id, 'tv');
            setInList(exists);
          }

          if (details.seasons && details.seasons.length > 0) {
            const firstSeason = details.seasons.find(s => s.season_number === 1) || details.seasons[0];
            const seasonNum = firstSeason ? firstSeason.season_number : 1;
            setSelectedSeason(seasonNum);
            
            const epData = await tmdb.getTVSeason(id, seasonNum);
            setEpisodes(epData);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSeriesData();
    window.scrollTo(0, 0);
  }, [id, currentProfile]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 50);
      if (parallaxRef.current) {
        parallaxRef.current.style.transform = `translate3d(0, ${scrollY * 0.4}px, 0)`;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSeasonChange = async (seasonNumber: number) => {
    setSelectedSeason(seasonNumber);
    setIsSeasonMenuOpen(false);
    try {
      const epData = await tmdb.getTVSeason(id, seasonNumber);
      setEpisodes(epData);
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (icon: string, message: string) => {
    setToast({ visible: true, message, icon });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const handleShare = async () => {
    if (!series) return;
    const shareData = {
        title: `Void Max - Assista ${series.name}`,
        text: `Estou assistindo a série ${series.name} no Void Max.`,
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Share dismissed');
        }
    } else {
        navigator.clipboard.writeText(window.location.href);
        showToast('link', 'Link copiado!');
    }
  };

  const handleWatchTrailer = () => {
      if (trailerKey) {
          setShowTrailerModal(true);
      } else {
          showToast('videocam_off', 'Trailer indisponível no momento');
      }
  };

  const toggleMyList = async () => {
    if (!series || !currentProfile) return;
    if (inList) {
        const success = await storageService.removeFromLibrary(currentProfile.id, series.id, 'tv');
        if (success) {
            setInList(false);
            showToast('remove_done', 'Removido da lista');
        }
    } else {
        const success = await storageService.addToLibrary(currentProfile.id, {
            id: series.id,
            type: 'tv',
            title: series.name,
            poster_path: series.poster_path,
            backdrop_path: series.backdrop_path,
            vote_average: series.vote_average,
            release_date: series.first_air_date,
            total_episodes: series.number_of_episodes,
            addedAt: Date.now()
        });
        if (success) {
            setInList(true);
            showToast('playlist_add_check', 'Adicionado à Minha Lista');
        } else {
             showToast('error', 'Erro ao adicionar');
        }
    }
  };

  const playEpisode = (episodeNumber: number) => {
     onPlay({
        type: 'tv',
        id: id,
        tmdbId: Number(id),
        season: selectedSeason,
        episode: episodeNumber
     });
  };

  const playFirstEpisode = () => {
      const episodeToPlay = episodes.length > 0 ? episodes[0].episode_number : 1;
      playEpisode(episodeToPlay);
  }
  
  const handleRelatedClick = (relatedId: number) => {
      window.location.hash = `#/tv/${relatedId}`;
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!series) return (
    <div className="pt-24 px-6 text-center bg-background-dark min-h-screen">
      <p>Série não encontrada.</p>
      <button onClick={() => window.history.back()} className="mt-4 text-primary font-bold">Voltar</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-dark animate-fade-in pb-20 overflow-x-hidden">
      
      {/* TOAST */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-surface/90 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300 ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-[-20px] opacity-0'}`}>
        <span className="material-symbols-rounded text-primary">{toast.icon}</span>
        <span className="text-sm font-medium">{toast.message}</span>
      </div>

       {/* TRAILER MODAL */}
       {showTrailerModal && trailerKey && (
          <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-fade-in">
              <button 
                  onClick={() => setShowTrailerModal(false)}
                  className="absolute top-4 right-4 z-50 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                  <span className="material-symbols-rounded">close</span>
              </button>
              <div className="w-full h-full max-w-5xl max-h-[80vh] aspect-video bg-black">
                  <iframe 
                      width="100%" 
                      height="100%" 
                      src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`} 
                      title="YouTube video player" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                  ></iframe>
              </div>
          </div>
      )}

      {/* NAVIGATION */}
      <nav className={`fixed top-0 left-0 w-full p-4 z-40 flex justify-between items-center transition-all duration-500 ${isScrolled ? 'bg-background-dark/90 backdrop-blur-xl border-b border-white/5' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
        <button onClick={() => window.history.back()} className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <span className="material-symbols-rounded text-white">arrow_back</span>
        </button>
        <div className="flex gap-3">
          <button onClick={() => showToast('cast', 'Transmitindo...')} className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <span className="material-symbols-rounded text-white">cast</span>
          </button>
          <button onClick={handleShare} className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <span className="material-symbols-rounded text-white">ios_share</span>
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="relative w-full h-[60vh] lg:h-[70vh] overflow-hidden">
        <div 
          ref={parallaxRef}
          className="absolute inset-0 w-full h-[120%] -top-[10%] bg-cover bg-center" 
          style={{ backgroundImage: `url(${tmdb.getBackdropUrl(series.backdrop_path, 'original')})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background-dark/90 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 w-full p-6 pb-4 z-10 max-w-4xl mx-auto lg:ml-10">
          <div className="flex items-center gap-2 mb-3 animate-fade-in-up">
            <span className="text-xs font-bold text-white/60 tracking-widest uppercase">• Série Original</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-none tracking-tight drop-shadow-2xl mb-4 animate-fade-in-up">
            {series.name}
          </h1>

          <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-white/80 font-medium mb-6 animate-fade-in-up">
            <span className="text-green-400 font-bold">{Math.round(series.vote_average * 10)}% Match</span>
            <span>{series.first_air_date?.split('-')[0]}</span>
            <span className="bg-white/20 px-1.5 rounded text-xs border border-white/10">16+</span>
            <span>{series.number_of_seasons} Temporadas</span>
            <span className="border border-white/30 px-1.5 rounded text-[10px] uppercase">4K HDR</span>
          </div>

          <div className="flex gap-3 animate-fade-in-up">
            <button onClick={playFirstEpisode} className="bg-white text-black px-6 py-3 rounded-xl font-bold font-display flex items-center gap-2 hover:bg-gray-200 transition-colors active:scale-95 shadow-xl">
              <span className="material-symbols-rounded fill-1">play_arrow</span>
              Assistir
            </button>
            <button onClick={handleWatchTrailer} className="px-6 py-3 bg-white/10 border border-white/10 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-white/20 transition-colors active:scale-95">
                <span className="material-symbols-rounded">smart_display</span>
                Trailer
            </button>
            <button onClick={toggleMyList} className={`px-4 py-3 rounded-xl flex items-center justify-center transition active:scale-95 backdrop-blur-md border ${inList ? 'bg-primary border-primary text-white' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}>
              <span className="material-symbols-rounded">{inList ? 'check' : 'add'}</span>
            </button>
          </div>
          
          <p className="mt-4 text-white/70 text-sm line-clamp-2 max-w-lg font-light animate-fade-in-up">
            {series.overview}
          </p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-20 bg-background-dark min-h-screen -mt-2 rounded-t-3xl border-t border-white/5 shadow-[0_-10px_50px_rgba(0,0,0,1)]">
        
        {/* TABS HEADER */}
        <div className="sticky top-[72px] z-30 bg-background-dark/95 backdrop-blur-xl border-b border-white/5">
          <div className="flex px-6 gap-8 overflow-x-auto hide-scrollbar">
            <button 
                onClick={() => setActiveTab('episodes')}
                className={`py-4 text-sm font-bold border-b-2 uppercase tracking-wide transition-colors whitespace-nowrap ${activeTab === 'episodes' ? 'text-primary border-primary' : 'text-white/50 border-transparent hover:text-white'}`}
            >
                Episódios
            </button>
            <button 
                onClick={() => setActiveTab('related')}
                className={`py-4 text-sm font-bold border-b-2 uppercase tracking-wide transition-colors whitespace-nowrap ${activeTab === 'related' ? 'text-primary border-primary' : 'text-white/50 border-transparent hover:text-white'}`}
            >
                Relacionados
            </button>
            <button 
                onClick={() => setActiveTab('details')}
                className={`py-4 text-sm font-bold border-b-2 uppercase tracking-wide transition-colors whitespace-nowrap ${activeTab === 'details' ? 'text-primary border-primary' : 'text-white/50 border-transparent hover:text-white'}`}
            >
                Detalhes
            </button>
          </div>
        </div>

        <div className="p-6 max-w-4xl mx-auto min-h-[400px]">
            
            {/* TAB: EPISODES */}
            {activeTab === 'episodes' && (
                <div className="animate-fade-in">
                    <div className="relative mb-6 z-20">
                        <button 
                          onClick={() => setIsSeasonMenuOpen(!isSeasonMenuOpen)} 
                          className="flex items-center gap-2 text-xl font-display font-bold text-white hover:text-white/80 transition-colors"
                        >
                            <span>Temporada {selectedSeason}</span>
                            <span className={`material-symbols-rounded text-2xl transition-transform ${isSeasonMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                        <p className="text-xs text-white/40 mt-1">{episodes.length} Episódios</p>

                        {/* Dropdown Menu */}
                        {isSeasonMenuOpen && (
                          <div className="absolute top-full left-0 mt-2 w-48 bg-surface/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 animate-fade-in p-1 max-h-60 overflow-y-auto">
                            {series.seasons.filter(s => s.season_number > 0).map(s => (
                              <button 
                                key={s.id}
                                onClick={() => handleSeasonChange(s.season_number)} 
                                className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg flex justify-between items-center group transition-colors ${selectedSeason === s.season_number ? 'text-primary' : 'text-white hover:bg-white/10'}`}
                              >
                                Temporada {s.season_number}
                                {selectedSeason === s.season_number && <span className="material-symbols-rounded text-sm">check</span>}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        {episodes.map((ep) => {
                          const progress = watchedMap[`${selectedSeason}-${ep.episode_number}`] || 0;
                          const isWatched = progress > 85;
                          const inProgress = progress > 0 && progress <= 85;

                          return (
                            <div key={ep.id} className="group flex flex-col sm:flex-row gap-4 p-3 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer" onClick={() => playEpisode(ep.episode_number)}>
                              <div className="relative w-full sm:w-[180px] aspect-video rounded-xl overflow-hidden bg-surface shrink-0">
                                  <img 
                                    src={ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : tmdb.getBackdropUrl(series.backdrop_path)} 
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                                    alt={ep.name}
                                  />
                                  
                                  {/* Overlay Play Icon */}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                      <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                          <span className="material-symbols-rounded fill-1">play_arrow</span>
                                      </div>
                                  </div>

                                  {/* Progress / Watched Indicator */}
                                  {isWatched && (
                                      <div className="absolute top-2 right-2 bg-green-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md backdrop-blur-sm flex items-center gap-1">
                                          <span className="material-symbols-rounded text-[10px]">check</span> VISTO
                                      </div>
                                  )}

                                  {inProgress && (
                                      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
                                          <div className="h-full bg-primary shadow-[0_0_5px_#f20df2]" style={{ width: `${progress}%` }}></div>
                                      </div>
                                  )}
                              </div>

                              <div className="flex-1 flex flex-col justify-center gap-1.5">
                                  <div className="flex justify-between items-start">
                                      <h3 className={`font-bold text-base leading-tight transition-colors ${isWatched ? 'text-white/60' : 'text-white group-hover:text-primary'}`}>{ep.episode_number}. {ep.name}</h3>
                                  </div>
                                  <span className="text-white/40 text-xs font-medium">S{selectedSeason} E{ep.episode_number} • {ep.air_date ? new Date(ep.air_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'TBA'}</span>
                                  <p className="text-white/60 text-xs leading-relaxed line-clamp-2">{ep.overview || "Sem descrição disponível."}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                </div>
            )}

            {/* TAB: RELATED */}
            {activeTab === 'related' && (
                <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {related.length > 0 ? related.slice(0, 12).map(item => (
                         <div key={item.id} onClick={() => handleRelatedClick(item.id)} className="relative aspect-[2/3] rounded-xl overflow-hidden group cursor-pointer ring-1 ring-white/5 hover:ring-primary/50 transition-all duration-300">
                            <img src={tmdb.getPosterUrl(item.poster_path)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={item.title || (item as any).name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                <p className="text-white font-bold text-sm line-clamp-2">{item.title || (item as any).name}</p>
                            </div>
                         </div>
                    )) : (
                        <div className="col-span-full text-center py-10 text-white/40">
                            Sem títulos relacionados no momento.
                        </div>
                    )}
                </div>
            )}

            {/* TAB: DETAILS */}
            {activeTab === 'details' && (
                <div className="animate-fade-in space-y-4">
                     <div className="flex justify-between py-3 border-b border-white/5">
                        <span className="text-white/50 text-sm">Gêneros</span>
                        <span className="text-white text-sm text-right">{series.genres.map(g => g.name).join(', ')}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-white/5">
                        <span className="text-white/50 text-sm">Status</span>
                        <span className="text-white text-sm">{series.status}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-white/5">
                        <span className="text-white/50 text-sm">Primeira Exibição</span>
                        <span className="text-white text-sm">{new Date(series.first_air_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-white/5">
                        <span className="text-white/50 text-sm">Tagline</span>
                        <span className="text-white text-sm italic text-right">"{series.tagline || 'N/A'}"</span>
                    </div>
                    
                    <div className="mt-8">
                         <h3 className="text-white font-bold mb-4">Temporadas</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             {series.seasons.map(s => (
                                 <div key={s.id} className="flex gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
                                     <div className="w-12 h-16 bg-black rounded overflow-hidden shrink-0">
                                         {s.poster_path ? (
                                             <img src={tmdb.getPosterUrl(s.poster_path)} className="w-full h-full object-cover" />
                                         ) : (
                                             <div className="w-full h-full flex items-center justify-center text-xs text-white/20">N/A</div>
                                         )}
                                     </div>
                                     <div className="flex flex-col justify-center">
                                         <span className="text-sm font-bold text-white">{s.name}</span>
                                         <span className="text-xs text-white/50">{s.episode_count} Episódios</span>
                                         <span className="text-[10px] text-white/30">{s.air_date ? s.air_date.split('-')[0] : ''}</span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>
            )}
            
        </div>
      </div>
    </div>
  );
};

export default TVDetails;
