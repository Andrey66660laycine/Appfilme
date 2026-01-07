
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
import { Profile } from './types';

// Context for Current Profile
export const ProfileContext = createContext<Profile | null>(null);

interface PlayerState {
  type: 'movie' | 'tv';
  id: string; // IMDb ID for movies, TMDb ID for TV
  tmdbId?: number; // Needed for history
  season?: number;
  episode?: number;
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
  
  // Player States
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [showPlayerControls, setShowPlayerControls] = useState(true);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);
  const [nextEpisode, setNextEpisode] = useState<NextEpisodeInfo | null>(null);
  
  // Ads States
  const [pendingPlayerState, setPendingPlayerState] = useState<PlayerState | null>(null);
  const [showAds, setShowAds] = useState(false);
  const [adTimer, setAdTimer] = useState(15);
  
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
    setIsPlayerLoading(true);
    setPlayerState(config);
    setPendingPlayerState(null);

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
    
    setTimeout(() => { setIsPlayerLoading(false); }, 1500);
  };

  const handleNextEpisode = () => {
      if (playerState && nextEpisode) {
          setIsPlayerLoading(true);
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

  if (loading) return null;
  if (!session) return <Welcome onStart={handleStartApp} />;
  if (!currentProfile) return <ProfileGateway onProfileSelect={handleProfileSelect} onLogout={handleLogout} />;

  return (
    <ProfileContext.Provider value={currentProfile}>
      
      {/* ADS OVERLAY */}
      {showAds && (
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

      {/* PLAYER OVERLAY */}
      {playerState && !showAds && (
        <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col overflow-hidden">
            {isPlayerLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mb-6"></div>
                </div>
            )}
            
            <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-500 ${showPlayerControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/90 to-transparent pointer-events-auto">
                     <div className="flex items-center gap-4">
                         <button onClick={closePlayer} className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center hover:bg-white/10 transition-all border border-white/5">
                            <span className="material-symbols-rounded text-white text-3xl">arrow_back</span>
                         </button>
                         <div>
                            <h2 className="text-white font-bold text-lg drop-shadow-md">
                                {playerState.type === 'tv' ? `S${playerState.season}:E${playerState.episode}` : 'Reproduzindo'}
                            </h2>
                            <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
                                VOID MAX
                            </span>
                         </div>
                     </div>
                </div>

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
                 <iframe src={getPlayerUrl()} width="100%" height="100%" frameBorder="0" allowFullScreen className="w-full h-full object-cover" title="Player" allow="autoplay; encrypted-media; fullscreen; picture-in-picture"></iframe>
            </div>
        </div>
      )}

      {/* NAVBAR */}
      {!isSearchActive && !isLibraryActive && !playerState && !showAds && (
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
      {!playerState && !showAds && renderContent()}

      {/* MOBILE NAV */}
      {!playerState && !showAds && (
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
