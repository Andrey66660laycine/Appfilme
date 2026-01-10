
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
import { Profile, Movie } from './types';

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
  const [isPlayerStable, setIsPlayerStable] = useState(false); 
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const [isIframeLoaded, setIsIframeLoaded] = useState(false); 
  const [nextEpisode, setNextEpisode] = useState<NextEpisodeInfo | null>(null);
  const [showServerNotice, setShowServerNotice] = useState(false);
  const [dontShowNoticeAgain, setDontShowNoticeAgain] = useState(false);
  const [pendingPlayerState, setPendingPlayerState] = useState<PlayerState | null>(null);
  const [showAds, setShowAds] = useState(false);
  const [adTimer, setAdTimer] = useState(15);
  
  // Padrão 'superflix'
  const [activeServer, setActiveServer] = useState<'playerflix' | 'superflix'>('superflix');
  const [videoFoundOverlay, setVideoFoundOverlay] = useState(false);

  const [welcomeBackToast, setWelcomeBackToast] = useState<{ visible: boolean; item: any }>({ visible: false, item: null });
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const loaderTimeoutRef = useRef<number | null>(null);

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
  }, [currentProfile]);

  const validateVideoDuration = (url: string): Promise<boolean> => {
      return new Promise((resolve) => {
          if (url.startsWith('blob:')) { resolve(true); return; }
          const tempVideo = document.createElement('video');
          tempVideo.preload = 'metadata';
          tempVideo.muted = true;
          const timeout = setTimeout(() => {
              tempVideo.src = "";
              resolve(true);
          }, 3000);
          tempVideo.onloadedmetadata = () => {
              clearTimeout(timeout);
              const duration = tempVideo.duration;
              tempVideo.src = ""; 
              if (duration && !isNaN(duration) && duration < 300) {
                  console.warn(`⚠️ Sniffer: Vídeo curto ignorado (${duration.toFixed(0)}s)`);
                  resolve(false);
              } else {
                  resolve(true);
              }
          };
          tempVideo.onerror = () => { clearTimeout(timeout); resolve(true); };
          tempVideo.src = url;
      });
  };

  useEffect(() => {
    const VIDEO_PATTERNS = [/\.mp4($|\?)/i, /\.mkv($|\?)/i, /\.avi($|\?)/i, /\.m3u8($|\?)/i, /\.mpd($|\?)/i, /master\.txt/i, /\/hls\//i, /video\/mp4/i];
    const AD_KEYWORDS = ['doubleclick', 'googleads', 'googlesyndication', 'facebook', 'analytics', 'pixel', 'tracker', 'adsystem', 'banner', 'pop', 'juicyads'];

    window.receberVideo = async (url: string) => {
        if (!url) return;
        const lowerUrl = url.toLowerCase();
        if (AD_KEYWORDS.some(keyword => lowerUrl.includes(keyword))) return;

        const isValidPattern = VIDEO_PATTERNS.some(regex => regex.test(url)) || url.startsWith('blob:');

        if (isValidPattern) {
            const isLongEnough = await validateVideoDuration(url);
            if (!isLongEnough) return; 

            console.log("✅ VÍDEO VÁLIDO:", url);
            setNativeVideoUrl(prev => {
                if (prev === url) return prev;
                setVideoFoundOverlay(true);
                setTimeout(() => {
                    setNativeVideoUrl(url);
                    setIsIframeLoaded(false); 
                    setTimeout(() => setVideoFoundOverlay(false), 500);
                }, 1500);
                return prev;
            });
        }
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  useEffect(() => {
    if (playerState) {
        const fetchPlayerExtras = async () => {
            if (playerState.type === 'tv' && playerState.tmdbId && playerState.season && playerState.episode) {
                try {
                    const seasonEpisodes = await tmdb.getTVSeason(String(playerState.tmdbId), playerState.season);
                    if (seasonEpisodes) {
                        const currentSeasonEpisodesCount = seasonEpisodes.length;
                        if (playerState.episode < currentSeasonEpisodesCount) {
                            setNextEpisode({
                                season: playerState.season,
                                episode: playerState.episode + 1,
                                title: `S${playerState.season}:E${playerState.episode + 1}`
                            });
                        } else {
                            setNextEpisode(null);
                        }
                    }
                } catch (e) { setNextEpisode(null); }
            } else {
                setNextEpisode(null);
            }

            if (playerState.tmdbId) {
                try {
                    const recs = await tmdb.getRecommendations(String(playerState.tmdbId), playerState.type);
                    setPlayerRecommendations(recs.slice(0, 5)); 
                } catch (e) { console.error(e); }
            }
        };
        fetchPlayerExtras();
    } else {
        setNextEpisode(null);
        setPlayerRecommendations([]);
    }
  }, [playerState]);

  useEffect(() => {
      if (showAds && adContainerRef.current) {
          setAdTimer(15);
          const timerInterval = setInterval(() => {
              setAdTimer(prev => prev > 0 ? prev - 1 : 0);
          }, 1000);
          return () => clearInterval(timerInterval);
      }
  }, [showAds]);

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
    setVideoFoundOverlay(false);
    setFailedUrls(new Set()); 
    setIsPlayerStable(false);
    setPendingPlayerState(null);
    setActiveServer('superflix'); 

    if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
    // Tempo aumentado para garantir que o loader bonito fique na tela
    loaderTimeoutRef.current = window.setTimeout(() => { setIsIframeLoaded(true); }, 5000);

    setPlayerState(config);

    if (currentProfile && config.tmdbId) {
        try {
            let details: any = null;
            if (config.type === 'movie') details = await tmdb.getMovieDetails(String(config.tmdbId));
            else details = await tmdb.getTVDetails(String(config.tmdbId));

            if (details) {
                setPlayerState(prev => prev ? ({
                    ...prev,
                    title: config.type === 'movie' ? details.title : details.name,
                    backdrop: details.backdrop_path,
                    id: config.type === 'movie' ? (details.imdb_id || String(config.tmdbId)) : String(config.tmdbId)
                }) : null);

                await storageService.addToHistory(currentProfile.id, {
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
        } catch (e) { console.error(e); }
    }
  };

  const handleNextEpisode = () => {
      if (playerState && nextEpisode) {
          setIsPlayerStable(false);
          startVideoPlayer({
              ...playerState,
              season: nextEpisode.season,
              episode: nextEpisode.episode,
              initialTime: 0
          });
      }
  };
  
  const handlePlayRelated = (movie: Movie) => {
      setIsPlayerStable(false);
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
      setPendingPlayerState(config);
      // Pular avisos antigos e ir direto pro player
      startVideoPlayer(config);
  };

  const handleConfirmNotice = () => {
      if (dontShowNoticeAgain) localStorage.setItem('void_skip_server_notice', 'true');
      setShowServerNotice(false);
      // Se tiver ads, mostraria aqui, senão play
      if (pendingPlayerState) startVideoPlayer(pendingPlayerState);
  };

  const closeAdsAndPlay = () => {
      setShowAds(false);
      if (pendingPlayerState) startVideoPlayer(pendingPlayerState);
  };

  const closeNativePlayer = () => {
      setNativeVideoUrl(null);
      setPlayerState(null);
      setIsPlayerStable(false);
      setVideoFoundOverlay(false);
      if (window.history.state?.playerOpen) window.history.back();
  };

  const handleNativePlayerError = () => {
      setIsPlayerStable(false);
      if (nativeVideoUrl) setFailedUrls(prev => new Set(prev).add(nativeVideoUrl));
      setNativeVideoUrl(null);
      setIsIframeLoaded(false); 
      if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
      loaderTimeoutRef.current = window.setTimeout(() => { setIsIframeLoaded(true); }, 5000);
  };
  
  const handlePlayerStable = () => { setIsPlayerStable(true); };

  const getEmbedUrl = () => {
    if (!playerState) return '';
    if (activeServer === 'superflix') {
        if (playerState.type === 'movie') return `https://superflixapi.buzz/filme/${playerState.id}`;
        return `https://superflixapi.buzz/serie/${playerState.tmdbId}/${playerState.season}/${playerState.episode}`;
    }
    if (playerState.type === 'movie') return `https://playerflixapi.com/filme/${playerState.tmdbId}`;
    return `https://playerflixapi.com/serie/${playerState.tmdbId}/${playerState.season}/${playerState.episode}`;
  };

  const renderContent = () => {
    if (hash === '#/privacy') return <PrivacyPolicy />;
    if (!session) return <Welcome onStart={handleStartApp} />;
    if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
    if (!currentProfile) return <ProfileGateway onProfileSelect={handleProfileSelect} onLogout={handleLogout} />;

    if (!hash || hash === '#/') return <Home onMovieClick={handleItemClick} onPlayVideo={handlePlayRequest} />;
    if (hash.startsWith('#/movie/')) return <MovieDetails id={hash.replace('#/movie/', '')} onPlay={(c) => handlePlayRequest({...c, tmdbId: Number(hash.replace('#/movie/', ''))})} />;
    if (hash.startsWith('#/tv/')) return <TVDetails id={hash.replace('#/tv/', '')} onPlay={(c) => handlePlayRequest({...c, tmdbId: Number(hash.replace('#/tv/', ''))})} />;
    if (hash.startsWith('#/collection/')) return <CollectionDetails id={hash.replace('#/collection/', '')} onMovieClick={handleItemClick} />;
    if (hash.startsWith('#/genre/')) {
        const [id, name] = hash.replace('#/genre/', '').split('/');
        return <GenreExplorer genreId={Number(id)} genreName={decodeURIComponent(name || '')} onMovieClick={handleItemClick} />;
    }
    if (hash.startsWith('#/search/')) return <Search query={decodeURIComponent(hash.replace('#/search/', ''))} onMovieClick={handleItemClick} />;
    if (hash === '#/library') return <Library onMovieClick={handleItemClick} />;
    if (hash === '#/downloads') return <Downloads />;
    
    return <Home onMovieClick={handleItemClick} onPlayVideo={handlePlayRequest} />;
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

      {/* FOUND OVERLAY */}
      {videoFoundOverlay && (
          <div className="fixed inset-0 z-[140] bg-black flex flex-col items-center justify-center animate-fade-in pointer-events-none">
              <div className="w-full h-1 absolute top-0 left-0 bg-white/10 overflow-hidden">
                  <div className="h-full bg-primary animate-progress-line"></div>
              </div>
              <div className="flex flex-col items-center animate-slide-up">
                  <span className="material-symbols-rounded text-6xl text-white mb-6">play_circle</span>
                  <h2 className="text-2xl font-display font-bold text-white tracking-widest uppercase">Iniciando Player</h2>
              </div>
          </div>
      )}

      {/* PLAYER NATIVO */}
      {nativeVideoUrl && playerState && currentProfile && !videoFoundOverlay && (
        <CustomVideoPlayer 
            src={nativeVideoUrl}
            onClose={closeNativePlayer}
            onErrorFallback={handleNativePlayerError} 
            onPlayerStable={handlePlayerStable}
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

      {/* PLAYER EMBED (WEBVIEW MODE) */}
      {playerState && !nativeVideoUrl && !showAds && !showServerNotice && !videoFoundOverlay && (
        <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col overflow-hidden">
            
            {/* ELEGANT TOP BAR */}
            <div className="absolute top-0 left-0 w-full z-40 p-4 flex justify-between items-start pointer-events-none">
                <button onClick={closeNativePlayer} className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white">
                    <span className="material-symbols-rounded">arrow_back</span>
                </button>
                
                {/* Minimal Server Switcher */}
                <div className="pointer-events-auto flex gap-2 p-1 bg-black/60 backdrop-blur-xl border border-white/5 rounded-full">
                    <button onClick={() => { setActiveServer('superflix'); setIsIframeLoaded(false); }} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${activeServer === 'superflix' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}>
                        Server Fast
                    </button>
                    <button onClick={() => { setActiveServer('playerflix'); setIsIframeLoaded(false); }} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${activeServer === 'playerflix' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}>
                        Backup
                    </button>
                </div>
            </div>

            {/* BLACK LOADING OVERLAY (NO POLLUTION) */}
            <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-black transition-opacity duration-1000 ease-in-out pointer-events-none ${isIframeLoaded ? 'opacity-0' : 'opacity-100'}`}>
                {playerState.backdrop && (
                    <div className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl animate-pulse-slow scale-110" style={{backgroundImage: `url(${tmdb.getBackdropUrl(playerState.backdrop)})`}}></div>
                )}
                <div className="relative z-10 flex flex-col items-center">
                    {/* Minimalist Loader */}
                    <div className="w-16 h-16 relative">
                        <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                        <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
                    </div>
                    <h2 className="mt-8 text-white font-display font-bold text-xl tracking-tight">{playerState.title}</h2>
                    <p className="text-white/40 text-xs mt-2 uppercase tracking-widest font-medium">Conectando...</p>
                </div>
            </div>
            
            {/* IFRAME CONTAINER */}
            <div className="flex-1 w-full h-full relative bg-black">
                 {/* SUBTLE NOTICE (DISAPPEARS) */}
                 {isIframeLoaded && (
                     <div className="absolute bottom-10 left-0 w-full flex justify-center z-20 pointer-events-none animate-slide-up">
                         <div className="bg-black/60 backdrop-blur-md text-white/70 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wide border border-white/5">
                             Dica: Se travar, alterne o servidor acima.
                         </div>
                     </div>
                 )}

                 <iframe 
                    key={activeServer} 
                    src={getEmbedUrl()} 
                    width="100%" height="100%" 
                    frameBorder="0" allowFullScreen 
                    className="w-full h-full object-cover" 
                    title="Player" 
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    referrerPolicy="no-referrer"
                    onLoad={() => {
                        // Small delay to ensure render
                        setTimeout(() => setIsIframeLoaded(true), 1000);
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
