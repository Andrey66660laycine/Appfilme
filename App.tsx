
import React, { useEffect, useState, useRef, createContext } from 'react';
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

const App: React.FC = () => {
  const [hash, setHash] = useState(window.location.hash);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  
  const [showAppModal, setShowAppModal] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [nativeVideoUrl, setNativeVideoUrl] = useState<string | null>(null); 
  const [isIframeLoaded, setIsIframeLoaded] = useState(false); 
  const [welcomeBackToast, setWelcomeBackToast] = useState<{ visible: boolean; item: any }>({ visible: false, item: null });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const loaderTimeoutRef = useRef<number | null>(null);

  // Sniffer logic
  useEffect(() => {
    window.receberVideo = (url: string) => {
        if (!url) return;
        const AD_KEYWORDS = ['doubleclick', 'googleads', 'facebook', 'analytics', 'pixel', 'tracker'];
        if (AD_KEYWORDS.some(keyword => url.toLowerCase().includes(keyword))) return;
        setNativeVideoUrl(url);
    };
  }, []);

  // Supabase Auth Handling - FIXED to prevent infinite loading
  useEffect(() => {
    const initAuth = async () => {
        try {
            const { data } = await supabase.auth.getSession();
            setSession(data.session);
        } catch (e) {
            console.error("Auth init error:", e);
        } finally {
            setLoading(false);
        }
    };
    initAuth();

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

  const closeNativePlayer = () => {
      setNativeVideoUrl(null);
      setPlayerState(null);
      if (window.history.state?.playerOpen) window.history.back();
  };

  const handlePlayRequest = (config: PlayerState) => {
      if (!currentProfile) return;
      setIsIframeLoaded(false);
      setNativeVideoUrl(null);
      setPlayerState(config);
      
      if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
      loaderTimeoutRef.current = window.setTimeout(() => setIsIframeLoaded(true), 5000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInputRef.current?.value;
    if (query?.trim()) window.location.hash = `#/search/${encodeURIComponent(query)}`;
  };

  if (loading) return null; // Still loading session

  if (!session) return <Welcome onStart={() => {}} />;
  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
  if (!currentProfile) return <ProfileGateway onProfileSelect={setCurrentProfile} onLogout={() => supabase.auth.signOut()} />;

  const renderContent = () => {
    if (hash === '#/privacy') return <PrivacyPolicy />;
    if (!hash || hash === '#/') return <Home onMovieClick={handleItemClick} onPlayVideo={handlePlayRequest} />;
    if (hash.startsWith('#/movie/')) return <MovieDetails id={hash.replace('#/movie/', '')} onPlay={(c) => handlePlayRequest({...c, tmdbId: Number(hash.replace('#/movie/', ''))})} />;
    if (hash.startsWith('#/tv/')) return <TVDetails id={hash.replace('#/tv/', '')} onPlay={(c) => handlePlayRequest({...c, tmdbId: Number(hash.replace('#/tv/', ''))})} />;
    if (hash.startsWith('#/search/')) return <Search query={decodeURIComponent(hash.replace('#/search/', ''))} onMovieClick={handleItemClick} />;
    if (hash === '#/library') return <Library onMovieClick={handleItemClick} />;
    if (hash === '#/downloads') return <Downloads />;
    return <Home onMovieClick={handleItemClick} onPlayVideo={handlePlayRequest} />;
  };

  const handleItemClick = (id: number, type: 'movie' | 'tv' = 'movie') => { window.location.hash = `#/${type}/${id}`; };

  return (
    <ProfileContext.Provider value={currentProfile}>
      {nativeVideoUrl && playerState && (
        <CustomVideoPlayer 
            src={nativeVideoUrl}
            onClose={closeNativePlayer}
            onErrorFallback={() => setNativeVideoUrl(null)} 
            title={playerState.title}
            tmdbId={playerState.tmdbId}
            type={playerState.type}
            season={playerState.season}
            episode={playerState.episode}
        />
      )}

      {playerState && !nativeVideoUrl && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="absolute top-0 left-0 w-full z-40 p-4">
                <button onClick={closeNativePlayer} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/5 flex items-center justify-center text-white">
                    <span className="material-symbols-rounded">arrow_back</span>
                </button>
            </div>
            <iframe 
                src={playerState.type === 'movie' ? `https://playerflixapi.com/filme/${playerState.id}` : `https://playerflixapi.com/serie/${playerState.tmdbId}/${playerState.season}/${playerState.episode}`} 
                className="flex-1 w-full h-full border-none"
                allowFullScreen
            />
        </div>
      )}

      {!playerState && (
        <>
          <nav id="navbar" className="fixed top-0 left-0 w-full z-40 px-4 py-4 transition-all bg-black/90 backdrop-blur-xl">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.hash = '#/'}>
                      <span className="font-display font-bold text-xl tracking-[0.2em] text-white uppercase">Void Max</span>
                  </div>
                  <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 w-[160px] md:w-[300px]">
                      <span className="material-symbols-rounded text-white/30 text-xl">search</span>
                      <input ref={searchInputRef} type="text" placeholder="Buscar..." className="bg-transparent border-none outline-none text-sm text-white w-full" />
                  </form>
                  <button onClick={() => setCurrentProfile(null)} className="w-9 h-9 rounded-full overflow-hidden border border-white/20">
                      <img src={currentProfile.avatar} className="w-full h-full object-cover" />
                  </button>
              </div>
          </nav>

          <main className="pt-20">{renderContent()}</main>

          <div className="fixed bottom-0 left-0 w-full bg-black/95 backdrop-blur-xl border-t border-white/5 py-3 px-6 z-50 lg:hidden flex justify-around">
                <button onClick={() => window.location.hash = '#/'} className="text-white/50 focus:text-white flex flex-col items-center">
                    <span className="material-symbols-rounded">home</span>
                    <span className="text-[10px]">Início</span>
                </button>
                <button onClick={() => window.location.hash = '#/search/'} className="text-white/50 focus:text-white flex flex-col items-center">
                    <span className="material-symbols-rounded">search</span>
                    <span className="text-[10px]">Buscar</span>
                </button>
                <button onClick={() => window.location.hash = '#/library'} className="text-white/50 focus:text-white flex flex-col items-center">
                    <span className="material-symbols-rounded">bookmarks</span>
                    <span className="text-[10px]">Minha Lista</span>
                </button>
          </div>
        </>
      )}
    </ProfileContext.Provider>
  );
};

export default App;
