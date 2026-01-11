import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import Home from './pages/Home';
import Search from './pages/Search';
import MovieDetails from './pages/MovieDetails';
import TVDetails from './pages/TVDetails';
import Welcome from './pages/Welcome';
import Library from './pages/Library';
import Downloads from './pages/Downloads';
import ProfileGateway from './pages/ProfileGateway';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CollectionDetails from './pages/CollectionDetails';
import GenreExplorer from './pages/GenreExplorer';
import SplashScreen from './components/SplashScreen'; 
import AppDownloadModal from './components/AppDownloadModal';
import CustomVideoPlayer from './components/CustomVideoPlayer'; 
import { tmdb } from './services/tmdbService';
import { storageService } from './services/storageService';
import { supabase } from './services/supabase';
import { Profile, Movie, Episode } from './types';

export const ProfileContext = createContext<Profile | null>(null);

interface PlayerState {
  type: 'movie' | 'tv';
  id: string; 
  tmdbId?: number; 
  season?: number;
  episode?: number;
  title?: string; 
  backdrop?: string;
  initialTime?: number; 
}

interface NextEpisodeInfo {
  season: number;
  episode: number;
  title?: string;
}

const App: React.FC = () => {
  const [hash, setHash] = useState(window.location.hash);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  
  const [showAppModal, setShowAppModal] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [nativeVideoUrl, setNativeVideoUrl] = useState<string | null>(null); 
  const [playerRecommendations, setPlayerRecommendations] = useState<Movie[]>([]); 
  const [isIframeLoaded, setIsIframeLoaded] = useState(false); 
  const [nextEpisode, setNextEpisode] = useState<NextEpisodeInfo | null>(null);
  const [showAds, setShowAds] = useState(false);
  const [showServerNotice, setShowServerNotice] = useState(false);
  
  const [welcomeBackToast, setWelcomeBackToast] = useState<{ visible: boolean; item: any }>({ visible: false, item: null });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const loaderTimeoutRef = useRef<number | null>(null);

  // --- LOGICA DE SNIFFER OTIMIZADA (SEM TRAVAMENTOS) ---
  useEffect(() => {
    // Palavras-chave para ignorar (anúncios, trackers)
    const AD_KEYWORDS = ['doubleclick', 'googleads', 'facebook', 'analytics', 'pixel', 'tracker', 'shim', 'pixel'];

    window.receberVideo = async (url: string) => {
        if (!url) return;
        const lowerUrl = url.toLowerCase();
        
        // Filtro básico de segurança
        if (AD_KEYWORDS.some(keyword => lowerUrl.includes(keyword))) return;

        // Se chegou aqui, é um vídeo. Envia DIRETO para o player.
        // O player externo (Netlify) lidará com erros de CORS ou formatos.
        console.log("🚀 URL Detectada:", url);
        setNativeVideoUrl(url);
    };
  }, []);

  useEffect(() => {
    const isNativeApp = !!window.Android;
    if (!showSplash && session && currentProfile && !isNativeApp) {
        const hasInstalled = localStorage.getItem('void_app_installed');
        if (hasInstalled !== 'true') {
            const timer = setTimeout(() => { setShowAppModal(true); }, 3000);
            return () => clearTimeout(timer);
        }
    }
  }, [showSplash, session, currentProfile]);

  useEffect(() => {
      const checkLastWatch = async () => {
          if (!currentProfile) return;
          const history = await storageService.getHistory(currentProfile.id);
          if (history.length > 0) {
              const last = history[0];
              const duration = last.duration || 0;
              const progress = last.progress || 0;
              const pct = duration > 0 ? (progress / duration) : 0;
              
              if (pct > 0.05 && pct < 0.90) {
                  setWelcomeBackToast({ visible: true, item: last });
                  setTimeout(() => setWelcomeBackToast(prev => ({ ...prev, visible: false })), 8000);
              }
          }
      };
      if (currentProfile && !playerState) checkLastWatch();
  }, [currentProfile, playerState]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setSession(session);
      if (!session) setCurrentProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (playerState) {
      window.history.pushState({ playerOpen: true }, "");
      const handlePopState = () => {
        closeNativePlayer();
        setIsIframeLoaded(false);
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [playerState]);

  useEffect(() => {
    const navbar = document.getElementById('navbar');
    const handleScroll = () => {
      if (navbar) {
        if (window.scrollY > 50) {
          navbar.classList.add('bg-black/90', 'backdrop-blur-xl', 'shadow-lg', 'py-2');
          navbar.classList.remove('py-4');
        } else {
          navbar.classList.remove('bg-black/90', 'backdrop-blur-xl', 'shadow-lg', 'py-2');
          navbar.classList.add('py-4');
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Carrega recomendações e próximo episódio para passar ao player
  useEffect(() => {
    if (playerState) {
        const fetchPlayerExtras = async () => {
            const promises = [];

            if (playerState.type === 'tv' && playerState.tmdbId && playerState.season && playerState.episode) {
                promises.push(
                    tmdb.getTVSeason(String(playerState.tmdbId), playerState.season)
                        .then((seasonEpisodes: Episode[]) => {
                            if (seasonEpisodes) {
                                const currentSeasonEpisodesCount = seasonEpisodes.length;
                                if (playerState.episode && playerState.episode < currentSeasonEpisodesCount) {
                                    setNextEpisode({
                                        season: playerState.season || 1,
                                        episode: (playerState.episode || 1) + 1,
                                        title: `S${playerState.season}:E${(playerState.episode || 1) + 1}`
                                    });
                                } else {
                                    setNextEpisode(null);
                                }
                            }
                        })
                        .catch(() => setNextEpisode(null))
                );
            } else {
                setNextEpisode(null);
            }

            if (playerState.tmdbId) {
                promises.push(
                    tmdb.getRecommendations(String(playerState.tmdbId), playerState.type)
                        .then((recs: Movie[]) => setPlayerRecommendations(recs.slice(0, 5)))
                        .catch((e: any) => console.error(e))
                );
            }
            
            await Promise.all(promises);
        };
        fetchPlayerExtras();
    } else {
        setNextEpisode(null);
        setPlayerRecommendations([]);
    }
  }, [playerState]);

  const handleStartApp = () => { };
  const handleLogout = async () => { await supabase.auth.signOut(); setCurrentProfile(null); };
  const handleProfileSelect = (profile: Profile) => { setCurrentProfile(profile); window.location.hash = '#/'; };
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInputRef.current?.value;
    if (query?.trim()) window.location.hash = `#/search/${encodeURIComponent(query)}`;
  };
  
  const handleCloseAppModal = (dontShowAgain: boolean) => {
    if (dontShowAgain) localStorage.setItem('void_app_installed', 'true');
    setShowAppModal(false);
  };

  const handleGoHome = () => { window.location.hash = '#/'; window.scrollTo(0,0); };
  const handleGoSearch = () => { window.location.hash = '#/search/'; window.scrollTo(0,0); }
  const handleGoLibrary = () => { window.location.hash = '#/library'; window.scrollTo(0,0); }
  const handleGoDownloads = () => { window.location.hash = '#/downloads'; window.scrollTo(0,0); }
  const handleItemClick = (id: number, type: 'movie' | 'tv' = 'movie') => { window.location.hash = `#/${type}/${id}`; };

  const startVideoPlayer = async (config: PlayerState) => {
    setIsIframeLoaded(false);
    setNativeVideoUrl(null); 
    
    if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
    // Timeout de segurança maior para dar tempo do sniffer pegar o link
    loaderTimeoutRef.current = window.setTimeout(() => { setIsIframeLoaded(true); }, 8000);

    setPlayerState(config);

    // Carrega metadados (Título, Backdrop) antes de abrir
    if (currentProfile && config.tmdbId) {
        const fetchDetails = async () => {
            let details: any = null;
            try {
                if (config.type === 'movie') {
                    details = await tmdb.getMovieDetails(String(config.tmdbId));
                } else {
                    details = await tmdb.getTVDetails(String(config.tmdbId));
                }

                if (details) {
                    setPlayerState(prev => prev ? ({
                        ...prev,
                        title: config.type === 'movie' ? details.title : details.name,
                        backdrop: details.backdrop_path,
                        id: config.type === 'movie' ? (details.imdb_id || String(config.tmdbId)) : String(config.tmdbId)
                    }) : null);

                    // Salva no histórico local
                    storageService.addToHistory(currentProfile.id, {
                        id: config.tmdbId,
                        type: config.type,
                        title: config.type === 'movie' ? details.title : details.name,
                        poster_path: details.poster_path,
                        backdrop_path: details.backdrop_path,
                        vote_average: details.vote_average,
                        season: config.season,
                        episode: config.episode,
                        progress: config.initialTime || 0,
                        duration: 0
                    });
                }
            } catch (e) {
                console.error("Erro ao buscar detalhes para o player", e);
            }
        };
        fetchDetails();
    }
  };

  const handleNextEpisode = () => {
      if (playerState && nextEpisode) {
          startVideoPlayer({
              ...playerState,
              season: nextEpisode.season,
              episode: nextEpisode.episode,
              initialTime: 0
          });
      }
  };
  
  const handlePlayRelated = (movie: Movie) => {
      if (playerState?.type === 'tv' && (movie as any).episode_number) {
           const epNumber = (movie as any).episode_number;
           startVideoPlayer({
               ...playerState,
               episode: epNumber,
               initialTime: 0
           });
      } else {
           handleItemClick(movie.id, movie.media_type as any);
      }
  };

  const handlePlayRequest = (config: PlayerState) => {
      if (!currentProfile) return;
      startVideoPlayer(config);
  };

  const closeNativePlayer = () => {
      setNativeVideoUrl(null);
      setPlayerState(null);
      if (window.history.state?.playerOpen) window.history.back();
  };

  const handleNativePlayerError = () => {
      // Se falhar o nativo, reseta e mostra o embed
      setNativeVideoUrl(null);
      setIsIframeLoaded(false); 
      if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
      loaderTimeoutRef.current = window.setTimeout(() => { setIsIframeLoaded(true); }, 5000);
  };
  
  const getEmbedUrl = () => {
    if (!playerState) return '';
    if (playerState.type === 'movie') return `https://playerflixapi.com/filme/${playerState.id}`;
    if (playerState.type === 'tv') return `https://playerflixapi.com/serie/${playerState.tmdbId}/${playerState.season}/${playerState.episode}`;
    return '';
  };

  const renderContent = () => {
    if (hash === '#/privacy') return <PrivacyPolicy />;
    if (!session) return <Welcome onStart={handleStartApp} />;
    if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
    if (!currentProfile) return <ProfileGateway onProfileSelect={handleProfileSelect} onLogout={handleLogout} />;

    const content = (() => {
        if (!hash || hash === '#/') return <Home onMovieClick={handleItemClick} onPlayVideo={(c: any) => handlePlayRequest(c)} />;
        if (hash.startsWith('#/movie/')) return <MovieDetails id={hash.replace('#/movie/', '')} onPlay={(c: any) => handlePlayRequest({...c, tmdbId: Number(hash.replace('#/movie/', ''))})} />;
        if (hash.startsWith('#/tv/')) return <TVDetails id={hash.replace('#/tv/', '')} onPlay={(c: any) => handlePlayRequest({...c, tmdbId: Number(hash.replace('#/tv/', ''))})} />;
        if (hash.startsWith('#/collection/')) return <CollectionDetails id={hash.replace('#/collection/', '')} onMovieClick={handleItemClick} />;
        if (hash.startsWith('#/genre/')) {
            const [id, name] = hash.replace('#/genre/', '').split('/');
            return <GenreExplorer genreId={Number(id)} genreName={decodeURIComponent(name || '')} onMovieClick={handleItemClick} />;
        }
        if (hash.startsWith('#/search/')) return <Search query={decodeURIComponent(hash.replace('#/search/', ''))} onMovieClick={handleItemClick} />;
        if (hash === '#/library') return <Library onMovieClick={handleItemClick} />;
        if (hash === '#/downloads') return <Downloads />;
        return <Home onMovieClick={handleItemClick} onPlayVideo={(c: any) => handlePlayRequest(c)} />;
    })();

    return <div key={hash} className="page-enter w-full">{content}</div>;
  };

  const isSearchActive = hash.startsWith('#/search/');
  const isLibraryActive = hash === '#/library';
  const isDownloadsActive = hash === '#/downloads';
  const isPrivacyPage = hash === '#/privacy';

  if (loading) return null;

  return (
    <ProfileContext.Provider value={currentProfile}>
      
      {showAppModal && !playerState && !showAds && !showServerNotice && !showSplash && <AppDownloadModal onClose={handleCloseAppModal} />}

      {/* TOASTS */}
      {welcomeBackToast.visible && welcomeBackToast.item && (
          <div className="fixed top-24 right-4 z-[999] bg-[#1a1a1a] border border-primary/50 rounded-xl p-4 shadow-2xl animate-slide-up flex gap-4 max-w-sm cursor-pointer hover:bg-[#252525] transition-colors"
               onClick={() => {
                   const item = welcomeBackToast.item;
                   handlePlayRequest({
                       type: item.type,
                       id: String(item.tmdb_id), 
                       tmdbId: item.tmdb_id,
                       season: item.season,
                       episode: item.episode,
                       initialTime: item.progress 
                   });
                   setWelcomeBackToast({visible: false, item: null});
               }}
          >
              <img src={tmdb.getPosterUrl(welcomeBackToast.item.poster_path)} className="w-12 h-16 object-cover rounded-md" />
              <div className="flex flex-col justify-center">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-widest mb-1">Continuar?</p>
                  <p className="text-white font-bold text-sm line-clamp-1">{welcomeBackToast.item.title}</p>
              </div>
          </div>
      )}

      {/* PLAYER PONTE (IFRAME BRIDGE) */}
      {nativeVideoUrl && playerState && currentProfile && (
        <CustomVideoPlayer 
            src={nativeVideoUrl}
            onClose={closeNativePlayer}
            onErrorFallback={handleNativePlayerError} 
            title={playerState.title}
            profileId={currentProfile.id}
            tmdbId={playerState.tmdbId}
            type={playerState.type}
            season={playerState.season}
            episode={playerState.episode}
            initialTime={playerState.initialTime} 
            nextEpisode={nextEpisode ? { ...nextEpisode, onPlay: handleNextEpisode } : undefined}
            recommendations={playerRecommendations}
            onPlayRelated={handlePlayRelated}
        />
      )}

      {/* BUSCA DE EMBED (FALLBACK SE O SNIFFER NÃO PEGAR NADA) */}
      {playerState && !nativeVideoUrl && !showAds && (
        <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col overflow-hidden">
            
            {/* TOP BAR */}
            <div className="absolute top-0 left-0 w-full z-40 p-4 flex justify-between items-start pointer-events-none">
                <button onClick={closeNativePlayer} className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white">
                    <span className="material-symbols-rounded">arrow_back</span>
                </button>
            </div>

            {/* LOADER OVERLAY */}
            <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-black transition-opacity duration-1000 ease-in-out pointer-events-none ${isIframeLoaded ? 'opacity-0' : 'opacity-100'}`}>
                {playerState.backdrop && (
                    <div className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl animate-pulse-slow scale-110" style={{backgroundImage: `url(${tmdb.getBackdropUrl(playerState.backdrop)})`}}></div>
                )}
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 relative">
                        <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                        <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
                    </div>
                    <h2 className="mt-8 text-white font-display font-bold text-xl tracking-tight">{playerState.title}</h2>
                    <p className="text-white/40 text-xs mt-2 uppercase tracking-widest font-medium">Buscando Fonte...</p>
                </div>
            </div>
            
            {/* IFRAME EMBED (FALLBACK) */}
            <div className="flex-1 w-full h-full relative bg-black">
                 <iframe 
                    src={getEmbedUrl()} 
                    width="100%" height="100%" 
                    frameBorder="0" allowFullScreen 
                    className="w-full h-full object-cover" 
                    title="Player" 
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    referrerPolicy="no-referrer"
                    onLoad={() => {
                        setTimeout(() => setIsIframeLoaded(true), 1500);
                    }}
                 ></iframe>
            </div>
        </div>
      )}

      {/* NAVBAR & CONTENT */}
      {!isSearchActive && !isLibraryActive && !isDownloadsActive && !playerState && !showAds && !showServerNotice && !isPrivacyPage && currentProfile && (
        <nav id="navbar" className="fixed top-0 left-0 w-full z-40 transition-all duration-300 px-4 py-4 lg:px-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={handleGoHome}>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                        <span className="material-symbols-rounded text-white text-lg">movie</span>
                    </div>
                    <span className="font-display font-bold text-xl tracking-[0.2em] text-white uppercase hidden md:block">Void Max</span>
                </div>
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 px-4 py-2.5 w-[160px] md:w-[300px]">
                    <span className="material-symbols-rounded text-white/30 text-xl">search</span>
                    <input ref={searchInputRef} type="text" placeholder="Buscar..." className="bg-transparent border-none outline-none text-sm text-white placeholder-white/30 w-full p-0 focus:ring-0 font-light" />
                </form>
                <div className="flex items-center gap-3">
                    <button onClick={() => setCurrentProfile(null)} className="w-9 h-9 rounded-full overflow-hidden border border-white/20 hover:border-white transition-all">
                        <img src={currentProfile.avatar} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                    </button>
                </div>
            </div>
        </nav>
      )}

      {!playerState && !showAds && !showServerNotice && renderContent()}

      {!playerState && !showAds && !showServerNotice && !isPrivacyPage && currentProfile && (
        <div className="fixed bottom-0 left-0 w-full bg-[#050505]/95 backdrop-blur-xl border-t border-white/5 pb-safe pt-2 px-6 z-50 rounded-t-2xl lg:hidden">
            <div className="flex justify-between items-center pb-2">
                <button onClick={handleGoHome} className={`flex flex-col items-center gap-1 group w-14 ${(hash === '#/' || !hash) ? 'text-white' : 'text-white/30'}`}>
                    <span className="material-symbols-rounded text-2xl group-hover:-translate-y-1 transition-transform">home</span>
                    <span className="text-[9px] font-medium tracking-wide">INÍCIO</span>
                </button>
                <button onClick={handleGoSearch} className={`flex flex-col items-center gap-1 group w-14 ${isSearchActive ? 'text-white' : 'text-white/30'}`}>
                    <span className="material-symbols-rounded text-2xl group-hover:-translate-y-1 transition-transform">search</span>
                    <span className="text-[9px] font-medium tracking-wide">BUSCAR</span>
                </button>
                <button onClick={handleGoDownloads} className={`flex flex-col items-center gap-1 group w-14 ${isDownloadsActive ? 'text-white' : 'text-white/30'}`}>
                    <span className="material-symbols-rounded text-2xl group-hover:-translate-y-1 transition-transform">download</span>
                    <span className="text-[9px] font-medium tracking-wide">OFFLINE</span>
                </button>
                <button onClick={handleGoLibrary} className={`flex flex-col items-center gap-1 group w-14 ${isLibraryActive ? 'text-white' : 'text-white/30'}`}>
                    <span className="material-symbols-rounded text-2xl group-hover:-translate-y-1 transition-transform">bookmarks</span>
                    <span className="text-[9px] font-medium tracking-wide">LISTA</span>
                </button>
            </div>
        </div>
      )}
    </ProfileContext.Provider>
  );
};

export default App;