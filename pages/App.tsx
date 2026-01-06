
import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import Home from './pages/Home';
import Search from './pages/Search';
import MovieDetails from './pages/MovieDetails';
import TVDetails from './pages/TVDetails';
import Welcome from './pages/Welcome';
import Library from './pages/Library';
import ProfileGateway from './pages/ProfileGateway';
import { tmdb } from './services/tmdbService';
import { storageService } from './services/storageService';
import { supabase } from './services/supabase';
import { Profile } from '../types';

// Context for Current Profile
export const ProfileContext = createContext<Profile | null>(null);

interface PlayerState {
  type: 'movie' | 'tv';
  id: string; // IMDb ID for movies, TMDb ID for TV
  tmdbId?: number; // Needed for history
  season?: number;
  episode?: number;
}

const App: React.FC = () => {
  const [hash, setHash] = useState(window.location.hash);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  
  // Player States
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [showPlayerControls, setShowPlayerControls] = useState(true);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);
  
  // Ads States (Mandatory now)
  const [pendingPlayerState, setPendingPlayerState] = useState<PlayerState | null>(null);
  const [showAds, setShowAds] = useState(false);
  const [adTimer, setAdTimer] = useState(15); // Tempo sugerido para o anúncio
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);

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

  // --- HIDDEN CHRONOMETER (TRACK TIME) ---
  useEffect(() => {
      let interval: number;
      if (currentProfile) {
          interval = window.setInterval(() => {
              storageService.updateWatchStats(currentProfile.id, 60);
          }, 60000);
      }
      return () => {
          if (interval) clearInterval(interval);
      };
  }, [currentProfile]);

  // --- SCROLL EFFECT ---
  useEffect(() => {
    const navbar = document.getElementById('navbar');
    const handleScroll = () => {
      if (navbar) {
        if (window.scrollY > 50) {
          navbar.classList.add('bg-black/80', 'backdrop-blur-xl', 'shadow-lg', 'py-2');
          navbar.classList.remove('py-4');
        } else {
          navbar.classList.remove('bg-black/80', 'backdrop-blur-xl', 'shadow-lg', 'py-2');
          navbar.classList.add('py-4');
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- PLAYER CONTROLS ---
  useEffect(() => {
    if (playerState) {
        const resetControls = () => {
            setShowPlayerControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = window.setTimeout(() => {
                setShowPlayerControls(false);
            }, 3000);
        };
        window.addEventListener('mousemove', resetControls);
        window.addEventListener('touchstart', resetControls);
        resetControls();
        return () => {
            window.removeEventListener('mousemove', resetControls);
            window.removeEventListener('touchstart', resetControls);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }
  }, [playerState]);

  // --- ADSTERRA SCRIPT INJECTION ---
  useEffect(() => {
      if (showAds && adContainerRef.current) {
          // Timer countdown
          setAdTimer(15);
          const timerInterval = setInterval(() => {
              setAdTimer(prev => prev > 0 ? prev - 1 : 0);
          }, 1000);

          // Limpa scripts anteriores para evitar duplicação
          adContainerRef.current.innerHTML = '';

          // Container div necessário para o script do banner
          const adDiv = document.createElement('div');
          adDiv.id = "container-19c1f4948dd443234ef09fb67ff9b5c5";
          adContainerRef.current.appendChild(adDiv);

          // Script 1: Banner (Invoke)
          const script1 = document.createElement('script');
          script1.src = "https://pl28417823.effectivegatecpm.com/19c1f4948dd443234ef09fb67ff9b5c5/invoke.js";
          script1.async = true;
          script1.setAttribute('data-cfasync', 'false');
          adContainerRef.current.appendChild(script1);

          // Script 2: Popunder (Direct)
          const script2 = document.createElement('script');
          script2.src = "https://pl28417816.effectivegatecpm.com/0f/00/cf/0f00cf8d31071e91267999001af02e64.js";
          script2.async = true;
          document.body.appendChild(script2); // Popunders geralmente funcionam melhor no body

          return () => {
              clearInterval(timerInterval);
              if (document.body.contains(script2)) {
                  document.body.removeChild(script2);
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

  // FUNÇÃO INTERNA: Inicia o player e salva histórico
  const startVideoPlayer = async (config: PlayerState) => {
    setIsPlayerLoading(true);
    setPlayerState(config);
    setPendingPlayerState(null); // Limpa pendência

    try {
        if (!currentProfile) return;
        
        let details: any;
        if (config.type === 'movie') {
             if (config.tmdbId) {
                details = await tmdb.getMovieDetails(String(config.tmdbId));
             }
        } else {
             details = await tmdb.getTVDetails(config.id);
        }

        if (details) {
            // Salva no histórico e incrementa estatísticas
            await storageService.addToHistory(currentProfile.id, {
                id: details.id,
                type: config.type,
                title: config.type === 'movie' ? details.title : details.name,
                poster_path: details.poster_path,
                backdrop_path: details.backdrop_path,
                vote_average: details.vote_average,
                timestamp: Date.now(),
                season: config.season,
                episode: config.episode
            });
        }
    } catch (e) {
        console.error("Failed to save history", e);
    }
    
    setTimeout(() => { setIsPlayerLoading(false); }, 2000);
  };

  // FUNÇÃO PRINCIPAL: OBRIGA A VER O ANÚNCIO
  const handlePlayRequest = (config: PlayerState) => {
      if (!currentProfile) return;

      console.log("Solicitação de Play. Iniciando Anúncios...");
      setPendingPlayerState(config);
      setShowAds(true);
  };

  const closeAdsAndPlay = () => {
      setShowAds(false);
      if (pendingPlayerState) {
          startVideoPlayer(pendingPlayerState);
      }
  };

  const closePlayer = () => { setPlayerState(null); };

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
    return <Home onMovieClick={(id, type) => handleItemClick(id, type)} onPlayVideo={handlePlayRequest} />;
  };

  const isSearchActive = hash.startsWith('#/search/');
  const isLibraryActive = hash === '#/library';

  // --- RENDER LOGIC ---

  if (loading) return null;

  if (!session) {
      return <Welcome onStart={handleStartApp} />;
  }

  if (!currentProfile) {
      return <ProfileGateway onProfileSelect={handleProfileSelect} onLogout={handleLogout} />;
  }

  return (
    <ProfileContext.Provider value={currentProfile}>
      
      {/* ADS OVERLAY (MANDATORY) */}
      {showAds && (
          <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center p-4 animate-fade-in">
              <div className="absolute top-6 right-6 z-50">
                  <button 
                    onClick={closeAdsAndPlay} 
                    // Disabled while timer > 0 if you wanted forced view, but for UX enabling it always or after 5s is better.
                    // Let's keep it enabled but with countdown text
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
                  >
                      {adTimer > 0 ? `Aguarde ${adTimer}s` : 'Pular Anúncio'} 
                      <span className="material-symbols-rounded">skip_next</span>
                  </button>
              </div>
              
              <div className="text-white mb-8 text-center animate-pulse z-40">
                  <p className="text-2xl font-display font-bold mb-2">Apoie o StreamVerse</p>
                  <p className="text-sm text-white/50">O vídeo começará após o anúncio.</p>
              </div>
              
              {/* ADSTERRA CONTAINER */}
              <div 
                ref={adContainerRef} 
                className="bg-white p-2 rounded-xl max-w-full overflow-hidden min-h-[250px] min-w-[300px] flex items-center justify-center shadow-2xl z-40 relative"
              >
                  {/* Scripts injected by useEffect */}
              </div>
          </div>
      )}

      {/* IMMERSIVE NATIVE PLAYER OVERLAY */}
      {playerState && !showAds && (
        <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col overflow-hidden">
            {isPlayerLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
                    <div className="w-16 h-16 border-4 border-white/20 border-t-primary rounded-full animate-spin mb-6"></div>
                    <p className="text-white/60 font-display text-lg tracking-widest uppercase animate-pulse">Carregando Player...</p>
                </div>
            )}
            <div className={`absolute top-0 left-0 w-full p-6 z-10 transition-opacity duration-500 bg-gradient-to-b from-black/90 to-transparent ${showPlayerControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 <div className="flex items-center gap-4">
                     <button onClick={closePlayer} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all hover:scale-105 group">
                        <span className="material-symbols-rounded text-white text-3xl group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                     </button>
                     <div>
                        <h2 className="text-white font-bold text-lg drop-shadow-md">
                            {playerState.type === 'tv' ? `S${playerState.season}:E${playerState.episode}` : 'Reproduzindo'}
                        </h2>
                        <span className="text-primary text-xs font-bold uppercase tracking-wider">
                            StreamVerse
                        </span>
                     </div>
                 </div>
            </div>
            <div className="flex-1 w-full h-full relative bg-black">
                 <iframe src={getPlayerUrl()} width="100%" height="100%" frameBorder="0" allowFullScreen className="w-full h-full object-cover" title="Player" allow="autoplay; encrypted-media; fullscreen; picture-in-picture"></iframe>
            </div>
        </div>
      )}

      {/* HEADER */}
      {!isSearchActive && !isLibraryActive && !playerState && !showAds && (
        <nav id="navbar" className="fixed top-0 left-0 w-full z-40 transition-all duration-300 px-4 py-4 lg:px-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={handleGoHome}>
                    <div className="text-primary flex items-center justify-center size-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(242,13,242,0.3)]">
                        <span className="material-symbols-rounded text-[24px]">movie_filter</span>
                    </div>
                    <span className="font-display font-bold text-xl tracking-tight hidden md:block text-shadow-sm">StreamVerse</span>
                </div>
                
                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 px-4 py-2.5 focus-within:bg-black/60 focus-within:border-primary/50 transition-all w-[160px] md:w-[300px] group shadow-inner">
                    <span className="material-symbols-rounded text-white/50 text-xl group-focus-within:text-primary transition-colors">search</span>
                    <input ref={searchInputRef} type="text" placeholder="Buscar filmes..." className="bg-transparent border-none outline-none text-sm text-white placeholder-white/40 w-full p-0 focus:ring-0" />
                </form>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end">
                        <span className="text-xs font-bold text-white/90 uppercase tracking-wider">{currentProfile.name}</span>
                    </div>
                    <button onClick={() => setCurrentProfile(null)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:border-white transition-all hover:scale-105">
                        <img src={currentProfile.avatar} className="w-full h-full object-cover" />
                    </button>
                </div>
            </div>
        </nav>
      )}

      {/* CONTENT */}
      {!playerState && !showAds && renderContent()}

      {/* MOBILE NAV */}
      {!playerState && !showAds && (
        <div className="fixed bottom-0 left-0 w-full glass-dark pb-safe pt-2 px-6 z-50 rounded-t-2xl lg:hidden">
            <div className="flex justify-between items-center pb-2">
                <button onClick={handleGoHome} className={`flex flex-col items-center gap-1 group w-16 ${(hash === '#/' || !hash) ? 'text-primary' : 'text-white/50'}`}>
                    <span className="material-symbols-rounded text-2xl group-hover:-translate-y-1 transition-transform">home</span>
                    <span className="text-[10px] font-medium">Início</span>
                </button>
                <button onClick={handleGoSearch} className={`flex flex-col items-center gap-1 group w-16 ${isSearchActive ? 'text-primary' : 'text-white/50'}`}>
                    <span className="material-symbols-rounded text-2xl group-hover:-translate-y-1 transition-transform">search</span>
                    <span className="text-[10px] font-medium">Buscar</span>
                </button>
                <button onClick={handleGoLibrary} className={`flex flex-col items-center gap-1 group w-16 ${isLibraryActive ? 'text-primary' : 'text-white/50 hover:text-white'}`}>
                    <span className={`material-symbols-rounded text-2xl group-hover:-translate-y-1 transition-transform ${isLibraryActive ? 'fill-1' : ''}`}>bookmarks</span>
                    <span className="text-[10px] font-medium">Biblioteca</span>
                </button>
                <button onClick={() => setCurrentProfile(null)} className="text-white/50 flex flex-col items-center gap-1 group hover:text-white transition-colors w-16">
                    <div className="size-6 rounded-full overflow-hidden border-2 border-white/20 transition-colors">
                        <img src={currentProfile.avatar} className="w-full h-full object-cover" alt="User" />
                    </div>
                    <span className="text-[10px] font-medium">Perfil</span>
                </button>
            </div>
        </div>
      )}
    </ProfileContext.Provider>
  );
};

export default App;
