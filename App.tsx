
import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import Home from './pages/Home';
import Search from './pages/Search';
import MovieDetails from './pages/MovieDetails';
import TVDetails from './pages/TVDetails';
import Welcome from './pages/Welcome';
import Library from './pages/Library';
import ProfileGateway from './pages/ProfileGateway';
import PrivacyPolicy from './pages/PrivacyPolicy'; // Import New Page
import SplashScreen from './components/SplashScreen'; 
import { tmdb } from './services/tmdbService';
import { storageService } from './services/storageService';
import { supabase } from './services/supabase';
import { Profile } from './types';

// Context for Current Profile
export const ProfileContext = createContext<Profile | null>(null);

interface PlayerState {
  type: 'movie' | 'tv';
  id: string; // IMDb ID for movies, TMDb ID for TV
  tmdbId?: number; // Needed for history
  season?: number;
  episode?: number;
  title?: string; // Para exibir no loader
  backdrop?: string; // Para o background do loader
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
  
  // Player States
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [showPlayerControls, setShowPlayerControls] = useState(true);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false); // Estado para controlar o loader do iframe
  const [nextEpisode, setNextEpisode] = useState<NextEpisodeInfo | null>(null);
  
  // Server Warning Modal State
  const [showServerNotice, setShowServerNotice] = useState(false);
  const [dontShowNoticeAgain, setDontShowNoticeAgain] = useState(false);

  // Ads States
  const [pendingPlayerState, setPendingPlayerState] = useState<PlayerState | null>(null);
  const [showAds, setShowAds] = useState(false);
  const [adTimer, setAdTimer] = useState(15);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const loaderTimeoutRef = useRef<number | null>(null);

  // --- AUTH CHECK ---
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

  // --- ROUTING ---
  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // --- BROWSER BACK BUTTON HANDLING FOR PLAYER ---
  useEffect(() => {
    if (playerState) {
      // Quando o player abre, empurramos um estado no histórico
      window.history.pushState({ playerOpen: true }, "");
      
      const handlePopState = (event: PopStateEvent) => {
        // Se o usuário clicar em voltar, fechamos o player
        setPlayerState(null);
        setIsIframeLoaded(false);
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [playerState]);

  // --- HIDDEN CHRONOMETER (TRACK TIME) ---
  useEffect(() => {
      let interval: number;
      // FIX: Atualiza a cada 10 segundos para feedback mais rápido no perfil
      if (currentProfile && playerState) { 
          interval = window.setInterval(() => {
              storageService.updateWatchStats(currentProfile.id, 10);
          }, 10000);
      }
      return () => {
          if (interval) clearInterval(interval);
      };
  }, [currentProfile, playerState]);

  // --- SCROLL EFFECT ---
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

  // --- PLAYER CONTROLS & NEXT EPISODE LOGIC ---
  useEffect(() => {
    if (playerState) {
        // 1. Controls visibility logic
        const resetControls = () => {
            setShowPlayerControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = window.setTimeout(() => {
                setShowPlayerControls(false);
            }, 3000); // 3 seconds hide delay
        };
        window.addEventListener('mousemove', resetControls);
        window.addEventListener('touchstart', resetControls);
        resetControls();

        // 2. Next Episode Calculation Logic
        const calculateNextEpisode = async () => {
            if (playerState.type === 'tv' && playerState.tmdbId && playerState.season && playerState.episode) {
                try {
                    const seriesDetails = await tmdb.getTVDetails(String(playerState.tmdbId));
                    const seasonEpisodes = await tmdb.getTVSeason(String(playerState.tmdbId), playerState.season);
                    
                    if (seriesDetails && seasonEpisodes) {
                        const currentSeasonEpisodesCount = seasonEpisodes.length;
                        const totalSeasons = seriesDetails.number_of_seasons;
                        
                        // Case A: Next episode in same season
                        if (playerState.episode < currentSeasonEpisodesCount) {
                            setNextEpisode({
                                season: playerState.season,
                                episode: playerState.episode + 1,
                                title: `S${playerState.season}:E${playerState.episode + 1}`
                            });
                        } 
                        // Case B: First episode of next season
                        else if (playerState.season < totalSeasons) {
                             setNextEpisode({
                                season: playerState.season + 1,
                                episode: 1,
                                title: `S${playerState.season + 1}:E1`
                            });
                        } else {
                            setNextEpisode(null); // Series ended
                        }
                    }
                } catch (e) {
                    setNextEpisode(null);
                }
            } else {
                setNextEpisode(null);
            }
        };
        calculateNextEpisode();

        return () => {
            window.removeEventListener('mousemove', resetControls);
            window.removeEventListener('touchstart', resetControls);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    } else {
        setNextEpisode(null);
        if (loaderTimeoutRef.current) {
            clearTimeout(loaderTimeoutRef.current);
            loaderTimeoutRef.current = null;
        }
    }
  }, [playerState]);

  // --- SAFE BANNER INJECTION (Only the requested ad) ---
  useEffect(() => {
      if (showAds && adContainerRef.current) {
          // Reset Timer
          setAdTimer(15);
          const timerInterval = setInterval(() => {
              setAdTimer(prev => prev > 0 ? prev - 1 : 0);
          }, 1000);

          // Clear previous
          adContainerRef.current.innerHTML = '';
          
          // Create wrapper
          const adDiv = document.createElement('div');
          adDiv.style.overflow = "hidden";
          adDiv.style.display = "flex";
          adDiv.style.justifyContent = "center";
          adDiv.style.alignItems = "center";
          adContainerRef.current.appendChild(adDiv);

          // Script 1: Config
          const configScript = document.createElement('script');
          configScript.type = 'text/javascript';
          configScript.text = `
              atOptions = {
                  'key' : 'fb9f4466d526cca0ef371ffed97324dd',
                  'format' : 'iframe',
                  'height' : 90,
                  'width' : 728,
                  'params' : {}
              };
          `;
          adDiv.appendChild(configScript);

          // Script 2: Invoke
          const invokeScript = document.createElement('script');
          invokeScript.type = 'text/javascript';
          invokeScript.src = "https://www.highperformanceformat.com/fb9f4466d526cca0ef371ffed97324dd/invoke.js";
          adDiv.appendChild(invokeScript);

          return () => {
              clearInterval(timerInterval);
              if (adContainerRef.current) {
                  adContainerRef.current.innerHTML = '';
              }
          };
      }
  }, [showAds]);

  // --- HANDLERS ---
  const handleStartApp = () => { /* Handled by Auth Listener */ };
  
  const handleLogout = async () => {
      await supabase.auth.signOut();
      setCurrentProfile(null);
  };

  const handleProfileSelect = (profile: Profile) => {
      setCurrentProfile(profile);
      window.location.hash = '#/';
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInputRef.current?.value;
    if (query?.trim()) {
      window.location.hash = `#/search/${encodeURIComponent(query)}`;
    }
  };

  const handleGoHome = () => { window.location.hash = '#/'; window.scrollTo(0,0); };
  const handleGoSearch = () => { window.location.hash = '#/search/'; window.scrollTo(0,0); }
  const handleGoLibrary = () => { window.location.hash = '#/library'; window.scrollTo(0,0); }
  const handleItemClick = (id: number, type: 'movie' | 'tv' = 'movie') => { window.location.hash = `#/${type}/${id}`; };

  // --- PLAY LOGIC ---
  const startVideoPlayer = async (config: PlayerState) => {
    // Reset loader state to SHOWING
    setIsIframeLoaded(false);
    
    // Set initial configuration
    let finalConfig = { ...config };
    setPendingPlayerState(null);

    // FIX: Force loader to stay for exactly 7 seconds (Increased from 5s)
    if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
    loaderTimeoutRef.current = window.setTimeout(() => {
        setIsIframeLoaded(true); // Hide loader after 7s
    }, 7000);

    // Inicializa o player imediatamente para feedback visual
    setPlayerState(finalConfig);

    try {
        if (!currentProfile) return;
        
        let details: any = null;
        
        // Tentativa de buscar detalhes completos
        try {
            if (config.type === 'movie') {
                 if (config.tmdbId) {
                    details = await tmdb.getMovieDetails(String(config.tmdbId));
                 }
            } else {
                 details = await tmdb.getTVDetails(config.id);
            }
        } catch (err) {
            console.warn("Failed to fetch details for history, using config fallback", err);
        }

        // Se conseguiu detalhes, atualiza o título no player e salva histórico completo
        if (details) {
            setPlayerState(prev => prev ? ({
                ...prev,
                title: config.type === 'movie' ? details.title : details.name,
                backdrop: details.backdrop_path
            }) : null);

            await storageService.addToHistory(currentProfile.id, {
                id: details.id, // TMDB ID
                type: config.type,
                title: config.type === 'movie' ? details.title : details.name,
                poster_path: details.poster_path,
                backdrop_path: details.backdrop_path,
                vote_average: details.vote_average,
                timestamp: Date.now(),
                season: config.season,
                episode: config.episode
            });
        } else if (config.tmdbId) {
            // FALLBACK CRÍTICO: Se a API falhar, salva com o que temos para garantir o "Continuar Assistindo"
             await storageService.addToHistory(currentProfile.id, {
                id: config.tmdbId,
                type: config.type,
                title: config.title || "Título Indisponível",
                poster_path: "", // Vai ficar sem imagem até a próxima atualização
                backdrop_path: "",
                vote_average: 0,
                timestamp: Date.now(),
                season: config.season,
                episode: config.episode
            });
        }
    } catch (e) {
        console.error("Critical error in player start flow", e);
    }
  };

  const handleNextEpisode = () => {
      if (playerState && nextEpisode) {
          startVideoPlayer({
              ...playerState,
              season: nextEpisode.season,
              episode: nextEpisode.episode
          });
      }
  };

  const handlePlayRequest = (config: PlayerState) => {
      if (!currentProfile) return;
      setPendingPlayerState(config);

      // Check if user skipped the notice
      const skipNotice = localStorage.getItem('void_skip_server_notice');
      if (skipNotice === 'true') {
          setShowAds(true);
      } else {
          setShowServerNotice(true);
      }
  };

  const handleConfirmNotice = () => {
      if (dontShowNoticeAgain) {
          localStorage.setItem('void_skip_server_notice', 'true');
      }
      setShowServerNotice(false);
      setShowAds(true); // Proceed to Ads then Player
  };

  const closeAdsAndPlay = () => {
      setShowAds(false);
      if (pendingPlayerState) {
          startVideoPlayer(pendingPlayerState);
      }
  };

  const closePlayer = () => { 
      // This is now mostly handled by Browser Back, but kept for cleanup
      setPlayerState(null); 
      setIsIframeLoaded(false);
      if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
      // Clean up history state if closed manually
      if (window.history.state?.playerOpen) {
          window.history.back();
      }
  };

  const getPlayerUrl = () => {
    if (!playerState) return '';
    if (playerState.type === 'movie') {
      return `https://playerflixapi.com/filme/${playerState.id}`;
    } else {
      return `https://playerflixapi.com/serie/${playerState.id}/${playerState.season}/${playerState.episode}`;
    }
  };

  // --- RENDER CONTENT ---
  const renderContent = () => {
    // PUBLIC ROUTES
    if (hash === '#/privacy') {
        return <PrivacyPolicy />;
    }

    // PROTECTED ROUTES
    if (!session) return <Welcome onStart={handleStartApp} />;
    
    // Show Splash Screen initially after auth
    if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
    
    // Profile Selection
    if (!currentProfile) return <ProfileGateway onProfileSelect={handleProfileSelect} onLogout={handleLogout} />;

    // Main App Routes
    if (!hash || hash === '#/') {
      return <Home onMovieClick={(id, type) => handleItemClick(id, type)} onPlayVideo={handlePlayRequest} />;
    }
    if (hash.startsWith('#/movie/')) {
      const id = hash.replace('#/movie/', '');
      return <MovieDetails id={id} onPlay={(c) => handlePlayRequest({...c, tmdbId: Number(id)})} />;
    }
    if (hash.startsWith('#/tv/')) {
      const id = hash.replace('#/tv/', '');
      return <TVDetails id={id} onPlay={(c) => handlePlayRequest({...c, tmdbId: Number(id)})} />;
    }
    if (hash.startsWith('#/search/')) {
      const query = decodeURIComponent(hash.replace('#/search/', ''));
      return <Search query={query} onMovieClick={(id, type) => handleItemClick(id, type)} />;
    }
    if (hash === '#/library') {
      return <Library onMovieClick={(id, type) => handleItemClick(id, type)} />;
    }
    
    // Default
    return <Home onMovieClick={(id, type) => handleItemClick(id, type)} onPlayVideo={handlePlayRequest} />;
  };

  const isSearchActive = hash.startsWith('#/search/');
  const isLibraryActive = hash === '#/library';
  const isPrivacyPage = hash === '#/privacy';

  if (loading) return null;

  return (
    <ProfileContext.Provider value={currentProfile}>
      
      {/* SERVER NOTICE MODAL */}
      {showServerNotice && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden animate-slide-up">
                  {/* Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[50px] pointer-events-none"></div>
                  
                  <div className="relative z-10 text-center">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-[0_0_20px_rgba(242,13,242,0.15)]">
                          <span className="material-symbols-rounded text-primary text-3xl">dns</span>
                      </div>
                      
                      <h2 className="text-xl font-display font-bold text-white mb-2">Dica de Reprodução</h2>
                      <p className="text-white/70 text-sm leading-relaxed mb-6">
                          Se o vídeo não carregar ou travar, procure pela opção <b className="text-white">"Trocar Servidor"</b> ou ícone de nuvem dentro do player.
                      </p>
                      
                      <button 
                          onClick={handleConfirmNotice}
                          className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all active:scale-95 shadow-lg mb-4"
                      >
                          Entendi, Vamos Assistir
                      </button>
                      
                      <div className="flex items-center justify-center gap-2 cursor-pointer group" onClick={() => setDontShowNoticeAgain(!dontShowNoticeAgain)}>
                          <div className={`w-5 h-5 rounded border border-white/30 flex items-center justify-center transition-colors ${dontShowNoticeAgain ? 'bg-primary border-primary' : 'bg-transparent'}`}>
                              {dontShowNoticeAgain && <span className="material-symbols-rounded text-white text-sm">check</span>}
                          </div>
                          <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors">Não mostrar novamente</span>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ADS OVERLAY */}
      {showAds && !showServerNotice && (
          <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center p-4 animate-fade-in">
              <div className="absolute top-6 right-6 z-50">
                  <button 
                    onClick={closeAdsAndPlay} 
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
                  >
                      {adTimer > 0 ? `Aguarde ${adTimer}s` : 'Pular Anúncio'} 
                      <span className="material-symbols-rounded">skip_next</span>
                  </button>
              </div>
              
              <div className="text-white mb-8 text-center animate-pulse z-40">
                  <p className="text-2xl font-display font-bold mb-2 tracking-widest uppercase">Void Max</p>
                  <p className="text-sm text-white/50">Carregando conteúdo...</p>
              </div>
              
              <div 
                ref={adContainerRef} 
                className="bg-transparent p-2 rounded-xl max-w-full overflow-hidden flex items-center justify-center z-40 relative min-w-[320px] min-h-[100px]"
              >
              </div>
          </div>
      )}

      {/* EMBED PLAYER WITH PREMIUM LOADER */}
      {playerState && !showAds && !showServerNotice && (
        <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col overflow-hidden">
            
            {/* PREMIUM LOADER OVERLAY */}
            <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black transition-opacity duration-700 ease-in-out ${isIframeLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {/* Backdrop Background */}
                {playerState.backdrop && (
                    <div 
                        className="absolute inset-0 bg-cover bg-center opacity-40 scale-110 blur-xl animate-pulse-slow" 
                        style={{backgroundImage: `url(${tmdb.getBackdropUrl(playerState.backdrop)})`}}
                    ></div>
                )}
                
                <div className="relative z-10 flex flex-col items-center text-center p-6">
                    <div className="w-20 h-20 border-4 border-white/10 border-t-primary rounded-full animate-spin mb-8 shadow-[0_0_30px_rgba(242,13,242,0.4)]"></div>
                    
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-2 tracking-tight drop-shadow-xl">
                        {playerState.title || "Void Max"}
                    </h2>
                    {playerState.type === 'tv' && (
                        <p className="text-white/70 text-lg font-medium mb-1">
                           Temporada {playerState.season} • Episódio {playerState.episode}
                        </p>
                    )}
                    <div className="flex flex-col items-center gap-2 mt-4">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                            <span className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Conectando</span>
                        </div>
                        <p className="text-white/30 text-[10px] uppercase tracking-widest mt-2 animate-pulse">
                            Dica: Se não carregar, troque de servidor no player
                        </p>
                         <p className="text-red-400/70 text-[10px] uppercase tracking-widest mt-1">
                            Aviso: Alguns conteúdos podem estar indisponíveis temporariamente
                        </p>
                    </div>
                </div>
            </div>
            
            {/* EMBED CONTROLS (Back Button REMOVED as requested) */}
            <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-500 ${showPlayerControls ? 'opacity-100' : 'opacity-0'}`}>
                {/* Next Episode Button */}
                {nextEpisode && (
                    <div className="absolute bottom-24 right-8 pointer-events-auto animate-slide-up">
                        <button 
                            onClick={handleNextEpisode}
                            className="bg-white/10 backdrop-blur-md border border-white/10 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 hover:bg-white/20 transition-all group"
                        >
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[10px] uppercase font-bold text-white/50">Próximo</span>
                                <span className="text-base">{nextEpisode.title}</span>
                            </div>
                            <span className="material-symbols-rounded">skip_next</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 w-full h-full relative bg-black">
                 <iframe 
                    src={getPlayerUrl()} 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    allowFullScreen 
                    className="w-full h-full object-cover" 
                    title="Player" 
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    referrerPolicy="no-referrer"
                 ></iframe>
            </div>
        </div>
      )}

      {/* NAVBAR */}
      {!isSearchActive && !isLibraryActive && !playerState && !showAds && !showServerNotice && !isPrivacyPage && currentProfile && (
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

      {/* CONTENT */}
      {!playerState && !showAds && !showServerNotice && renderContent()}

      {/* MOBILE NAV */}
      {!playerState && !showAds && !showServerNotice && !isPrivacyPage && currentProfile && (
        <div className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-xl border-t border-white/5 pb-safe pt-2 px-6 z-50 rounded-t-2xl lg:hidden">
            <div className="flex justify-between items-center pb-2">
                <button onClick={handleGoHome} className={`flex flex-col items-center gap-1 group w-16 ${(hash === '#/' || !hash) ? 'text-white' : 'text-white/30'}`}>
                    <span className="material-symbols-rounded text-2xl group-hover:-translate-y-1 transition-transform">home</span>
                    <span className="text-[10px] font-medium tracking-wide">INÍCIO</span>
                </button>
                <button onClick={handleGoSearch} className={`flex flex-col items-center gap-1 group w-16 ${isSearchActive ? 'text-white' : 'text-white/30'}`}>
                    <span className="material-symbols-rounded text-2xl group-hover:-translate-y-1 transition-transform">search</span>
                    <span className="text-[10px] font-medium tracking-wide">BUSCAR</span>
                </button>
                <button onClick={handleGoLibrary} className={`flex flex-col items-center gap-1 group w-16 ${isLibraryActive ? 'text-white' : 'text-white/30'}`}>
                    <span className="material-symbols-rounded text-2xl group-hover:-translate-y-1 transition-transform">bookmarks</span>
                    <span className="text-[10px] font-medium tracking-wide">LISTA</span>
                </button>
                <button onClick={() => setCurrentProfile(null)} className="text-white/30 flex flex-col items-center gap-1 group hover:text-white transition-colors w-16">
                    <div className="size-6 rounded-full overflow-hidden border border-white/20 transition-colors">
                        <img src={currentProfile.avatar} className="w-full h-full object-cover grayscale" alt="User" />
                    </div>
                    <span className="text-[10px] font-medium tracking-wide">PERFIL</span>
                </button>
            </div>
        </div>
      )}
    </ProfileContext.Provider>
  );
};

export default App;
