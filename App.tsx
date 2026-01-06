
import React, { useEffect, useState, useRef } from 'react';
import Home from './pages/Home';
import Search from './pages/Search';
import MovieDetails from './pages/MovieDetails';
import TVDetails from './pages/TVDetails';

interface PlayerState {
  type: 'movie' | 'tv';
  id: string; // IMDb ID for movies, TMDb ID for TV
  season?: number;
  episode?: number;
}

const App: React.FC = () => {
  const [hash, setHash] = useState(window.location.hash);
  const [loading, setLoading] = useState(true);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const playContent = (config: PlayerState) => {
    setPlayerState(config);
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
      return <MovieDetails id={id} onPlay={playContent} />;
    }
    if (hash.startsWith('#/tv/')) {
      const id = hash.replace('#/tv/', '');
      return <TVDetails id={id} onPlay={playContent} />;
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

      {/* VIDEO PLAYER MODAL */}
      <div id="videoModal" className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-300 ${playerState ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <button onClick={closePlayer} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition z-50">
              <span className="material-symbols-rounded text-white text-3xl">close</span>
          </button>
          
          {playerState && (
             <div className="w-full h-full md:w-[90%] md:h-[90%] bg-black relative shadow-2xl overflow-hidden rounded-xl">
               <iframe 
                  src={getPlayerUrl()} 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  allowFullScreen
                  className="w-full h-full"
                  title="Player"
               ></iframe>
             </div>
          )}
      </div>

      {/* HEADER - Hide if on Search page (which has its own header) on mobile */}
      {!isSearchActive && (
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
      {renderContent()}

      {/* BOTTOM NAVIGATION (Mobile) */}
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
    </>
  );
};

export default App;
