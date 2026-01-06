
import React, { useEffect, useState, useRef } from 'react';
import Home from './pages/Home';
import Search from './pages/Search';
import MovieDetails from './pages/MovieDetails';
import TVDetails from './pages/TVDetails';
import { tmdb } from './services/tmdbService';
import { storageService } from './services/storageService';

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
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [showPlayerControls, setShowPlayerControls] = useState(true);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      clearTimeout(timer);
    };
  }, []);

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

  // Player Controls Interaction Logic
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInputRef.current?.value;
    if (query?.trim()) {
      window.location.hash = `#/search/${encodeURIComponent(query)}`;
    }
  };

  const handleGoHome = () => {
    window.location.hash = '#/';
    window.scrollTo(0,0);
  };

  const handleGoSearch = () => {
    window.location.hash = '#/search/';
    window.scrollTo(0,0);
  }

  const handleItemClick = (id: number, type: 'movie' | 'tv' = 'movie') => {
    window.location.hash = `#/${type}/${id}`;
  };

  const playContent = async (config: PlayerState) => {
    setIsPlayerLoading(true);
    setPlayerState(config);

    // Save to History Logic
    try {
        let details: any;
        const searchId = config.tmdbId ? String(config.tmdbId) : config.id; // Use TMDB ID preferably

        if (config.type === 'movie') {
             // If we only have IMDB ID, we might need to rely on what was passed or fetch. 
             // Ideally we pass tmdbId. If not, we skip history or fetch by imdb not implemented in this simplified service.
             // Assuming config.tmdbId is passed for accurate history
             if (config.tmdbId) {
                details = await tmdb.getMovieDetails(String(config.tmdbId));
             }
        } else {
             details = await tmdb.getTVDetails(config.id);
        }

        if (details) {
            storageService.addToHistory({
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
    
    // Fake loading delay for the "Teleport" effect
    setTimeout(() => {
        setIsPlayerLoading(false);
    }, 2000);
  };

  const closePlayer = () => {
    setPlayerState(null);
  };

  const getPlayerUrl = () => {
    if (!playerState) return '';
    if (playerState.type === 'movie') {
      return `https://playerflixapi.com/filme/${playerState.id}`;
    } else {
      return `https://playerflixapi.com/serie/${playerState.id}/${playerState.season}/${playerState.episode}`;
    }
  };

  const renderContent = () => {
    if (!hash || hash === '#/') {
      return <Home onMovieClick={(id, type) => handleItemClick(id, type)} onPlayVideo={playContent} />;
    }
    if (hash.startsWith('#/movie/')) {
      const id = hash.replace('#/movie/', '');
      return <MovieDetails id={id} onPlay={(c) => playContent({...c, tmdbId: Number(id)})} />;
    }
    if (hash.startsWith('#/tv/')) {
      const id = hash.replace('#/tv/', '');
      return <TVDetails id={id} onPlay={(c) => playContent({...c, tmdbId: Number(id)})} />;
    }
    if (hash.startsWith('#/search/')) {
      const query = decodeURIComponent(hash.replace('#/search/', ''));
      return <Search query={query} onMovieClick={(id, type) => handleItemClick(id, type)} />;
    }
    return <Home onMovieClick={(id, type) => handleItemClick(id, type)} onPlayVideo={playContent} />;
  };

  const isSearchActive = hash.startsWith('#/search/');

  return (
    <>
      {/* SPLASH SCREEN / LOADER */}
      <div id="loader" className={`fixed inset-0 z-[100] bg-background-dark flex flex-col items-center justify-center transition-opacity duration-500 ${!loading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="relative flex items-center justify-center">
              <div className="absolute w-24 h-24 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
              <span className="material-symbols-rounded text-6xl text-primary animate-bounce">movie_filter</span>
          </div>
          <h1 className="mt-4 text-xl font-display font-bold tracking-widest text-white/80 animate-pulse uppercase">StreamVerse</h1>
      </div>

      {/* IMMERSIVE NATIVE PLAYER OVERLAY */}
      {playerState && (
        <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col overflow-hidden">
            
            {/* Loading/Teleport State */}
            {isPlayerLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
                    <div className="w-16 h-16 border-4 border-white/20 border-t-primary rounded-full animate-spin mb-6"></div>
                    <p className="text-white/60 font-display text-lg tracking-widest uppercase animate-pulse">Carregando Player Nativo...</p>
                </div>
            )}

            {/* Custom Native UI Overlay */}
            <div className={`absolute top-0 left-0 w-full p-6 z-10 transition-opacity duration-500 bg-gradient-to-b from-black/90 to-transparent ${showPlayerControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 <div className="flex items-center gap-4">
                     <button onClick={closePlayer} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all hover:scale-105 group">
                        <span className="material-symbols-rounded text-white text-3xl group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                     </button>
                     <div>
                        <h2 className="text-white font-bold text-lg drop-shadow-md">
                            {playerState.type === 'tv' ? `S${playerState.season}:E${playerState.episode}` : 'Reproduzindo'}
                        </h2>
                        <span className="text-primary text-xs font-bold uppercase tracking-wider">StreamVerse Premium Player</span>
                     </div>
                 </div>
            </div>

            {/* The Embed (Acting as the video source) */}
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
                 ></iframe>
            </div>

        </div>
      )}


      {/* HEADER - Hide if on Search page or Player is open */}
      {!isSearchActive && !playerState && (
        <nav id="navbar" className="fixed top-0 left-0 w-full z-40 transition-all duration-300 px-4 py-4 lg:px-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={handleGoHome}>
                    <div className="text-primary flex items-center justify-center size-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <span className="material-symbols-rounded text-[24px]">movie_filter</span>
                    </div>
                    <span className="font-display font-bold text-xl tracking-tight hidden md:block">StreamVerse</span>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-full border border-white/5 px-3 py-2 focus-within:bg-black/40 focus-within:border-primary/50 transition-all w-[140px] md:w-[260px] focus-within:w-[220px] md:focus-within:w-[320px]">
                    <span className="material-symbols-rounded text-white/50 text-xl">search</span>
                    <input ref={searchInputRef} type="text" placeholder="Buscar..." className="bg-transparent border-none outline-none text-sm text-white placeholder-white/50 w-full p-0 focus:ring-0" />
                </form>

                <button className="text-white hover:text-primary transition-colors relative">
                    <span className="material-symbols-rounded text-[28px]">notifications</span>
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black"></span>
                </button>
            </div>
        </nav>
      )}

      {/* CONTENT AREA */}
      {!playerState && renderContent()}

      {/* BOTTOM NAVIGATION (Mobile) */}
      {!playerState && (
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
                <button className="text-white/50 flex flex-col items-center gap-1 group hover:text-white transition-colors w-16">
                    <span className="material-symbols-rounded text-2xl group-hover:-translate-y-1 transition-transform">bookmark</span>
                    <span className="text-[10px] font-medium">Lista</span>
                </button>
                <button className="text-white/50 flex flex-col items-center gap-1 group hover:text-white transition-colors w-16">
                    <div className="size-6 rounded-full overflow-hidden border border-white/20 group-hover:border-primary transition-colors">
                        <img src="https://randomuser.me/api/portraits/women/44.jpg" className="w-full h-full object-cover" alt="User" />
                    </div>
                    <span className="text-[10px] font-medium">Perfil</span>
                </button>
            </div>
        </div>
      )}
    </>
  );
};

export default App;
