
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
  initialTime?: number; // Added to resume playback
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
  
  // MUDANÇA: Padrão agora é 'superflix' (Servidor 2)
  const [activeServer, setActiveServer] = useState<'playerflix' | 'superflix'>('superflix');
  const [videoFoundOverlay, setVideoFoundOverlay] = useState(false);

  const [achievementToast, setAchievementToast] = useState<{ visible: boolean; id: string }>({ visible: false, id: '' });
  const [welcomeBackToast, setWelcomeBackToast] = useState<{ visible: boolean; item: any }>({ visible: false, item: null });
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const loaderTimeoutRef = useRef<number | null>(null);

  // --- SMART REMINDER (Welcome Back) ---
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

  // --- HELPER: VERIFICAR DURAÇÃO (ANTI-TRAILER/ADS) ---
  const validateVideoDuration = (url: string): Promise<boolean> => {
      return new Promise((resolve) => {
          // Se for blob ou extensão exótica, aprova direto
          if (url.startsWith('blob:')) { resolve(true); return; }

          const tempVideo = document.createElement('video');
          tempVideo.preload = 'metadata';
          tempVideo.muted = true;
          
          const timeout = setTimeout(() => {
              // Se demorar muito para carregar metadados, assume que é válido (evita bloquear conteúdo real lento)
              tempVideo.src = "";
              resolve(true);
          }, 3000);

          tempVideo.onloadedmetadata = () => {
              clearTimeout(timeout);
              const duration = tempVideo.duration;
              tempVideo.src = ""; // Limpa memória
              
              // Se a duração for válida e MENOR que 300 segundos (5 min), rejeita.
              if (duration && !isNaN(duration) && duration < 300) {
                  console.warn(`⚠️ Sniffer: Vídeo ignorado (Muito curto: ${duration.toFixed(0)}s) - ${url}`);
                  resolve(false);
              } else {
                  resolve(true);
              }
          };

          tempVideo.onerror = () => {
              clearTimeout(timeout);
              // Se der erro (ex: CORS), aprovamos para não bloquear falso negativo
              resolve(true); 
          };

          tempVideo.src = url;
      });
  };

  // --- NATIVE BRIDGE ---
  useEffect(() => {
    const VIDEO_PATTERNS = [/\.mp4($|\?)/i, /\.mkv($|\?)/i, /\.avi($|\?)/i, /\.m3u8($|\?)/i, /\.mpd($|\?)/i, /master\.txt/i, /\/hls\//i, /video\/mp4/i];
    const AD_KEYWORDS = ['doubleclick', 'googleads', 'googlesyndication', 'facebook', 'analytics', 'pixel', 'tracker', 'adsystem', 'banner', 'pop', 'juicyads'];

    window.receberVideo = async (url: string) => {
        if (!url) return;
        const lowerUrl = url.toLowerCase();
        if (AD_KEYWORDS.some(keyword => lowerUrl.includes(keyword))) return;

        const isValidPattern = VIDEO_PATTERNS.some(regex => regex.test(url)) || url.startsWith('blob:');

        if (isValidPattern) {
            // VERIFICAÇÃO DE DURAÇÃO (NOVO)
            const isLongEnough = await validateVideoDuration(url);
            
            if (!isLongEnough) {
                return; // Aborta se for curto demais
            }

            console.log("✅ VÍDEO VÁLIDO DETECTADO:", url);
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

  // --- APP DOWNLOAD MODAL CHECK ---
  useEffect(() => {
    const isNativeApp = !!window.Android;
    if (!showSplash && session && currentProfile && !isNativeApp) {
        const hasInstalled = localStorage.getItem('void_app_installed');
        if (hasInstalled !== 'true') {
            const timer = setTimeout(() => {
                setShowAppModal(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }
  }, [showSplash, session, currentProfile]);

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

  // --- BROWSER BACK BUTTON ---
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

  // --- SCROLL ---
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

  // --- NEXT EPISODE & RECS ---
  useEffect(() => {
    if (playerState) {
        const fetchPlayerExtras = async () => {
            if (playerState.type === 'tv' && playerState.tmdbId && playerState.season && playerState.episode) {
                try {
                    const seriesDetails = await tmdb.getTVDetails(String(playerState.tmdbId));
                    const seasonEpisodes = await tmdb.getTVSeason(String(playerState.tmdbId), playerState.season);
                    if (seriesDetails && seasonEpisodes) {
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

  // --- ADS ---
  useEffect(() => {
      if (showAds && adContainerRef.current) {
          setAdTimer(15);
          const timerInterval = setInterval(() => {
              setAdTimer(prev => prev > 0 ? prev - 1 : 0);
          }, 1000);
          // Ad Injection Logic (simplified for brevity, keep original injection here)
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
    if (dontShowAgain) {
      // CORREÇÃO: Usando a mesma chave que é verificada no useEffect
      localStorage.setItem('void_app_installed', 'true');
    }
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
    setActiveServer('superflix'); // RESETA SEMPRE PARA O MELHOR (SERVER 2)

    if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
    loaderTimeoutRef.current = window.setTimeout(() => { setIsIframeLoaded(true); }, 7000);

    setPlayerState(config);

    // Save initial history entry (0 progress)
    if (currentProfile && config.tmdbId) {
        try {
            let details: any = null;
            if (config.type === 'movie') details = await tmdb.getMovieDetails(String(config.tmdbId));
            else details = await tmdb.getTVDetails(String(config.tmdbId)); // Use ID directly if string, or config.id

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
                    progress: config.initialTime || 0, // IMPORTANT: Save initial time if continuing
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
  
  // Chamado quando o usuário clica num card relacionado ou episódio no menu lateral
  const handlePlayRelated = (movie: Movie) => {
      setIsPlayerStable(false);
      // Se for um episódio (simulado como Movie object), tratamos aqui
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
      const skipNotice = localStorage.getItem('void_skip_server_notice');
      if (skipNotice === 'true') setShowAds(true);
      else setShowServerNotice(true);
  };

  const handleConfirmNotice = () => {
      if (dontShowNoticeAgain) localStorage.setItem('void_skip_server_notice', 'true');
      setShowServerNotice(false);
      setShowAds(true);
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
                       initialTime: item.progress // PASSAR TEMPO SALVO
                   });
                   setWelcomeBackToast({visible: false, item: null});
               }}
          >
              <img src={tmdb.getPosterUrl(welcomeBackToast.item.poster_path)} className="w-12 h-16 object-cover rounded-md" />
              <div className="flex flex-col justify-center">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-widest mb-1">Continuar de onde parou?</p>
                  <p className="text-white font-bold text-sm line-clamp-1">{welcomeBackToast.item.title}</p>
                  <p className="text-white/50 text-xs">Falta {Math.floor(((welcomeBackToast.item.duration || 0) - (welcomeBackToast.item.progress || 0))/60)} min</p>
              </div>
          </div>
      )}

      {/* MODALS */}
      {showServerNotice && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden animate-slide-up">
                  <div className="relative z-10 text-center">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-[0_0_20px_var(--primary-color)]">
                          <span className="material-symbols-rounded text-primary text-3xl">dns</span>
                      </div>
                      <h2 className="text-xl font-display font-bold text-white mb-2">Dica de Reprodução</h2>
                      <p className="text-white/70 text-sm leading-relaxed mb-6">Utilize o Servidor 2 para melhor velocidade. Se falhar, tente o backup.</p>
                      <button onClick={handleConfirmNotice} className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all mb-4">Entendi, Vamos Assistir</button>
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

      {/* ADS */}
      {showAds && !showServerNotice && (
          <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center p-4 animate-fade-in">
              <div className="absolute top-6 right-6 z-50">
                  <button onClick={closeAdsAndPlay} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all backdrop-blur-md">
                      {adTimer > 0 ? `Aguarde ${adTimer}s` : 'Pular Anúncio'} 
                      <span className="material-symbols-rounded">skip_next</span>
                  </button>
              </div>
              <div ref={adContainerRef} className="bg-transparent p-2 rounded-xl max-w-full flex items-center justify-center z-40 relative min-w-[320px] min-h-[100px]"></div>
          </div>
      )}

      {/* FOUND OVERLAY */}
      {videoFoundOverlay && (
          <div className="fixed inset-0 z-[140] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in pointer-events-none">
              <div className="relative">
                  <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center animate-ping-slow"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-rounded text-6xl text-primary drop-shadow-[0_0_20px_#f20df2]">check_circle</span>
                  </div>
              </div>
              <h2 className="mt-8 text-2xl font-display font-bold text-white tracking-widest uppercase animate-slide-up">Vídeo Encontrado!</h2>
              <p className="mt-2 text-white/50 text-sm animate-pulse">Carregando Player Nativo...</p>
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

      {/* PLAYER EMBED */}
      {playerState && !nativeVideoUrl && !showAds && !showServerNotice && !videoFoundOverlay && (
        <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col overflow-hidden">
            <div className="absolute top-0 left-0 w-full z-30 p-4 flex justify-between items-start bg-gradient-to-b from-black/90 to-transparent pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-4">
                    <button onClick={closeNativePlayer} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors text-white">
                        <span className="material-symbols-rounded">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-white font-bold text-sm shadow-black drop-shadow-md">{playerState.title}</h2>
                        {playerState.type === 'tv' && <p className="text-white/60 text-xs">S{playerState.season} E{playerState.episode}</p>}
                    </div>
                </div>
                <div className="pointer-events-auto bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-1 flex gap-1">
                    <button onClick={() => { setActiveServer('superflix'); setIsIframeLoaded(false); }} className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${activeServer === 'superflix' ? 'bg-green-600 text-white shadow-lg' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}>
                        {activeServer === 'superflix' && <span className="material-symbols-rounded text-[10px]">star</span>}
                        Servidor 2
                    </button>
                    <button onClick={() => { setActiveServer('playerflix'); setIsIframeLoaded(false); }} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${activeServer === 'playerflix' ? 'bg-primary text-white shadow-lg' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}>
                        Servidor 1
                    </button>
                </div>
            </div>

            <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black transition-opacity duration-700 ease-in-out pointer-events-none ${isIframeLoaded ? 'opacity-0' : 'opacity-100'}`}>
                {playerState.backdrop && (
                    <div className="absolute inset-0 bg-cover bg-center opacity-40 scale-110 blur-xl animate-pulse-slow" style={{backgroundImage: `url(${tmdb.getBackdropUrl(playerState.backdrop)})`}}></div>
                )}
                <div className="relative z-10 flex flex-col items-center text-center p-6">
                    <div className="w-20 h-20 border-4 border-white/10 border-t-primary rounded-full animate-spin mb-8 shadow-[0_0_30px_var(--primary-color)]"></div>
                    <div className="flex flex-col items-center gap-2 mt-4">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                            <span className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Conectando ao {activeServer === 'superflix' ? 'Servidor 2 (Rápido)' : 'Servidor 1'}</span>
                        </div>
                        <p className="text-white/50 text-[10px] uppercase tracking-widest mt-2">Dica: Selecione "Server Fast" no player abaixo.</p>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 w-full h-full relative bg-black">
                 {/* INSTRUÇÃO PISCANTE */}
                 {isIframeLoaded && (
                     <div className="absolute top-20 left-0 w-full flex justify-center z-10 pointer-events-none animate-fade-in" style={{animationDelay: '1s'}}>
                         <div className="bg-primary/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-pulse border border-white/20 backdrop-blur-md text-center max-w-[90%]">
                             👆 No player abaixo, selecione a opção "Server Fast" para carregar instantaneamente.
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
                    onLoad={() => setIsIframeLoaded(true)}
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
        <div className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-xl border-t border-white/5 pb-safe pt-2 px-6 z-50 rounded-t-2xl lg:hidden">
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
