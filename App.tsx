
import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import Home from './pages/Home';
import Search from './pages/Search';
import MovieDetails from './pages/MovieDetails';
import TVDetails from './pages/TVDetails';
import Welcome from './pages/Welcome';
import Library from './pages/Library';
import ProfileGateway from './pages/ProfileGateway';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CollectionDetails from './pages/CollectionDetails';
import GenreExplorer from './pages/GenreExplorer';
import SplashScreen from './components/SplashScreen'; 
import AppDownloadModal from './components/AppDownloadModal';
import CustomVideoPlayer from './components/CustomVideoPlayer'; // IMPORTADO O PLAYER NATIVO
import { tmdb } from './services/tmdbService';
import { storageService } from './services/storageService';
import { supabase } from './services/supabase';
import { Profile, Movie } from './types';

// Context for Current Profile
export const ProfileContext = createContext<Profile | null>(null);

interface PlayerState {
  type: 'movie' | 'tv';
  id: string; // IMDb ID for movies, TMDb ID for TV
  tmdbId?: number; // Needed for history
  season?: number;
  episode?: number;
  title?: string; 
  backdrop?: string;
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
  
  // App Download Modal State
  const [showAppModal, setShowAppModal] = useState(false);
  
  // Player States
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [nativeVideoUrl, setNativeVideoUrl] = useState<string | null>(null); 
  const [playerRecommendations, setPlayerRecommendations] = useState<Movie[]>([]); // Recomendações para o player
  const [isPlayerStable, setIsPlayerStable] = useState(false); // TRAVA DE SEGURANÇA CONTRA LOOP

  // ANTI-LOOP: Lista de URLs que já falharam
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  
  const [isIframeLoaded, setIsIframeLoaded] = useState(false); 
  const [nextEpisode, setNextEpisode] = useState<NextEpisodeInfo | null>(null);
  
  // Server Warning Modal
  const [showServerNotice, setShowServerNotice] = useState(false);
  const [dontShowNoticeAgain, setDontShowNoticeAgain] = useState(false);

  // Ads States
  const [pendingPlayerState, setPendingPlayerState] = useState<PlayerState | null>(null);
  const [showAds, setShowAds] = useState(false);
  const [adTimer, setAdTimer] = useState(15);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const loaderTimeoutRef = useRef<number | null>(null);

  // --- SNIFFER DE REDE (Client-Side Network Interceptor) ---
  // Tenta capturar links que o iframe pede se o Java falhar
  useEffect(() => {
    if (playerState && !nativeVideoUrl) {
        const originalFetch = window.fetch;
        const originalXHR = window.XMLHttpRequest.prototype.open;

        // Hook Fetch
        window.fetch = async (...args) => {
            const [resource] = args;
            const url = typeof resource === 'string' ? resource : (resource as Request).url;
            checkUrlForVideo(url);
            return originalFetch(...args);
        };

        // Hook XHR
        window.XMLHttpRequest.prototype.open = function(method, url) {
            if (typeof url === 'string') checkUrlForVideo(url);
            return originalXHR.apply(this, arguments as any);
        };

        const checkUrlForVideo = (url: string) => {
             // Basic extension check
             if (url.match(/\.(mp4|m3u8|mkv)($|\?)/i)) {
                 if (!failedUrls.has(url) && !isPlayerStable) {
                     console.log("🕵️ Sniffer detectou vídeo:", url);
                     window.receberVideo(url);
                 }
             }
        };

        return () => {
            window.fetch = originalFetch;
            window.XMLHttpRequest.prototype.open = originalXHR;
        };
    }
  }, [playerState, nativeVideoUrl, failedUrls, isPlayerStable]);


  // --- NATIVE BRIDGE (JAVA -> JS) ---
  useEffect(() => {
    window.receberVideo = (url: string) => {
        // 1. Se o player já está rodando liso, ignora links novos (evita loop/reload)
        if (isPlayerStable) {
            console.log("🛡️ Player estável. Ignorando novo link:", url);
            return;
        }

        // 2. Se a URL já falhou antes, ignora
        if (failedUrls.has(url)) {
            console.log("🚫 URL ignorada (falhou anteriormente):", url);
            return;
        }

        // 3. Se é a mesma URL, ignora
        if (nativeVideoUrl === url) return;

        console.log("🎬 Link Nativo Recebido/Aceito:", url);
        if (url && (url.startsWith('http') || url.startsWith('blob'))) {
            setNativeVideoUrl(url);
        }
    };

    return () => {
        // @ts-ignore
        delete window.receberVideo;
    };
  }, [failedUrls, isPlayerStable, nativeVideoUrl]);

  // --- APP DOWNLOAD MODAL CHECK ---
  useEffect(() => {
    if (!showSplash && session && currentProfile) {
        const hasInstalled = localStorage.getItem('void_app_installed');
        if (hasInstalled !== 'true') {
            const timer = setTimeout(() => {
                setShowAppModal(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }
  }, [showSplash, session, currentProfile]);

  const handleCloseAppModal = (dontShowAgain: boolean) => {
      setShowAppModal(false);
      if (dontShowAgain) {
          localStorage.setItem('void_app_installed', 'true');
      }
  };

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

  // --- BROWSER BACK BUTTON HANDLING ---
  useEffect(() => {
    if (playerState) {
      window.history.pushState({ playerOpen: true }, "");
      
      const handlePopState = (event: PopStateEvent) => {
        closeNativePlayer();
        setIsIframeLoaded(false);
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [playerState]);

  // --- HIDDEN CHRONOMETER ---
  useEffect(() => {
      let interval: number;
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

  // --- NEXT EPISODE & RECOMMENDATIONS LOGIC ---
  useEffect(() => {
    if (playerState) {
        const fetchPlayerExtras = async () => {
            // Next Episode Logic
            if (playerState.type === 'tv' && playerState.tmdbId && playerState.season && playerState.episode) {
                try {
                    const seriesDetails = await tmdb.getTVDetails(String(playerState.tmdbId));
                    const seasonEpisodes = await tmdb.getTVSeason(String(playerState.tmdbId), playerState.season);
                    
                    if (seriesDetails && seasonEpisodes) {
                        const currentSeasonEpisodesCount = seasonEpisodes.length;
                        const totalSeasons = seriesDetails.number_of_seasons;
                        
                        if (playerState.episode < currentSeasonEpisodesCount) {
                            setNextEpisode({
                                season: playerState.season,
                                episode: playerState.episode + 1,
                                title: `S${playerState.season}:E${playerState.episode + 1}`
                            });
                        } else if (playerState.season < totalSeasons) {
                             setNextEpisode({
                                season: playerState.season + 1,
                                episode: 1,
                                title: `S${playerState.season + 1}:E1`
                            });
                        } else {
                            setNextEpisode(null);
                        }
                    }
                } catch (e) {
                    setNextEpisode(null);
                }
            } else {
                setNextEpisode(null);
            }

            // Recommendations Logic (For Movie Post-Play)
            if (playerState.tmdbId) {
                try {
                    const recs = await tmdb.getRecommendations(String(playerState.tmdbId), playerState.type);
                    setPlayerRecommendations(recs.slice(0, 5)); // Top 5
                } catch (e) {
                    console.error("Erro recs player", e);
                }
            }
        };
        fetchPlayerExtras();
    } else {
        setNextEpisode(null);
        setPlayerRecommendations([]);
    }
  }, [playerState]);

  // --- ADS INJECTION ---
  useEffect(() => {
      if (showAds && adContainerRef.current) {
          setAdTimer(15);
          const timerInterval = setInterval(() => {
              setAdTimer(prev => prev > 0 ? prev - 1 : 0);
          }, 1000);

          adContainerRef.current.innerHTML = '';
          const adDiv = document.createElement('div');
          adContainerRef.current.appendChild(adDiv);

          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.innerHTML = `
            (function(i,n,p,a,g,e){
              i.inpagepush = i.inpagepush || function() {
                (i.inpagepush.q=(i.inpagepush.q||[])).push(arguments)
              };
              var s=n.getElementsByTagName('head')[0];
              var q=n.createElement('script'); q.async=1;
              q.src='//static.qualiclicks.com/inpage/inpage.js';
              s.appendChild(q);
              i.inpagepush('init', {
                host: 'xml.qualiclicks.com',
                feed: 1014622,
                auth : 'QhcS',
                subid: '',
                refresh: 120,
                position: 'top',
                slots: 2,
                query : '',
                nodesrc : true
              });
              i.inpagepush('show');
            })(window, document);
          `;
          adDiv.appendChild(script);

          return () => {
              clearInterval(timerInterval);
              if (adContainerRef.current) adContainerRef.current.innerHTML = '';
          };
      }
  }, [showAds]);

  // --- HANDLERS ---
  const handleStartApp = () => { };
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
    if (query?.trim()) window.location.hash = `#/search/${encodeURIComponent(query)}`;
  };

  const handleGoHome = () => { window.location.hash = '#/'; window.scrollTo(0,0); };
  const handleGoSearch = () => { window.location.hash = '#/search/'; window.scrollTo(0,0); }
  const handleGoLibrary = () => { window.location.hash = '#/library'; window.scrollTo(0,0); }
  const handleItemClick = (id: number, type: 'movie' | 'tv' = 'movie') => { window.location.hash = `#/${type}/${id}`; };

  // --- PLAY LOGIC ---
  const startVideoPlayer = async (config: PlayerState) => {
    setIsIframeLoaded(false);
    setNativeVideoUrl(null); 
    setFailedUrls(new Set()); 
    setIsPlayerStable(false); // Reseta estabilidade
    setPendingPlayerState(null);

    // Loader do Embed (fallback)
    if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
    loaderTimeoutRef.current = window.setTimeout(() => {
        setIsIframeLoaded(true);
    }, 7000);

    setPlayerState(config);

    // Salva histórico
    try {
        if (!currentProfile) return;
        
        let details: any = null;
        try {
            if (config.type === 'movie' && config.tmdbId) {
                details = await tmdb.getMovieDetails(String(config.tmdbId));
            } else {
                details = await tmdb.getTVDetails(config.id);
            }
        } catch (err) {}

        if (details) {
            setPlayerState(prev => prev ? ({
                ...prev,
                title: config.type === 'movie' ? details.title : details.name,
                backdrop: details.backdrop_path
            }) : null);

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
        console.error("Player start error", e);
    }
  };

  const handleNextEpisode = () => {
      if (playerState && nextEpisode) {
          // Reseta estabilidade para aceitar novo link
          setIsPlayerStable(false);
          startVideoPlayer({
              ...playerState,
              season: nextEpisode.season,
              episode: nextEpisode.episode
          });
      }
  };
  
  const handlePlayRelated = (movie: Movie) => {
      setIsPlayerStable(false);
      handleItemClick(movie.id, movie.media_type as any);
  };

  const handlePlayRequest = (config: PlayerState) => {
      if (!currentProfile) return;
      setPendingPlayerState(config);

      const skipNotice = localStorage.getItem('void_skip_server_notice');
      if (skipNotice === 'true') {
          setShowAds(true);
      } else {
          setShowServerNotice(true);
      }
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
      if (window.history.state?.playerOpen) window.history.back();
  };

  // --- FALLBACK LOGIC ---
  const handleNativePlayerError = () => {
      console.log("⚠️ Player nativo falhou. Alternando para Embed (Fallback).");
      setIsPlayerStable(false); // Player falhou, não é estável
      
      // Adiciona a URL atual à lista negra
      if (nativeVideoUrl) {
          setFailedUrls(prev => new Set(prev).add(nativeVideoUrl));
      }

      setNativeVideoUrl(null);
      setIsIframeLoaded(false); 
      
      if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
      loaderTimeoutRef.current = window.setTimeout(() => {
          setIsIframeLoaded(true);
      }, 7000);
  };
  
  // Callback chamado pelo CustomVideoPlayer quando começa a reproduzir com sucesso
  const handlePlayerStable = () => {
      console.log("✅ Player Nativo Estabilizado. Bloqueando injeções externas.");
      setIsPlayerStable(true);
  };

  const getEmbedUrl = () => {
    if (!playerState) return '';
    if (playerState.type === 'movie') return `https://playerflixapi.com/filme/${playerState.id}`;
    return `https://playerflixapi.com/serie/${playerState.id}/${playerState.season}/${playerState.episode}`;
  };

  // --- RENDER CONTENT ---
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
    
    return <Home onMovieClick={handleItemClick} onPlayVideo={handlePlayRequest} />;
  };

  const isSearchActive = hash.startsWith('#/search/');
  const isLibraryActive = hash === '#/library';
  const isPrivacyPage = hash === '#/privacy';

  if (loading) return null;

  return (
    <ProfileContext.Provider value={currentProfile}>
      
      {showAppModal && !playerState && !showAds && !showServerNotice && !showSplash && <AppDownloadModal onClose={handleCloseAppModal} />}

      {/* MODAL DE AVISO */}
      {showServerNotice && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden animate-slide-up">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[50px] pointer-events-none"></div>
                  <div className="relative z-10 text-center">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-[0_0_20px_rgba(242,13,242,0.15)]">
                          <span className="material-symbols-rounded text-primary text-3xl">dns</span>
                      </div>
                      <h2 className="text-xl font-display font-bold text-white mb-2">Dica de Reprodução</h2>
                      <p className="text-white/70 text-sm leading-relaxed mb-6">
                          Se o vídeo não carregar, tente a opção <b>"Trocar Servidor"</b>.
                      </p>
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

      {/* ANÚNCIOS */}
      {showAds && !showServerNotice && (
          <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center p-4 animate-fade-in">
              <div className="absolute top-6 right-6 z-50">
                  <button onClick={closeAdsAndPlay} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all backdrop-blur-md">
                      {adTimer > 0 ? `Aguarde ${adTimer}s` : 'Pular Anúncio'} 
                      <span className="material-symbols-rounded">skip_next</span>
                  </button>
              </div>
              <div className="text-white mb-8 text-center animate-pulse z-40">
                  <p className="text-2xl font-display font-bold mb-2 tracking-widest uppercase">Void Max</p>
                  <p className="text-sm text-white/50">Carregando conteúdo...</p>
              </div>
              <div ref={adContainerRef} className="bg-transparent p-2 rounded-xl max-w-full flex items-center justify-center z-40 relative min-w-[320px] min-h-[100px]"></div>
          </div>
      )}

      {/* --- PLAYER NATIVO (Alta Prioridade) --- */}
      {nativeVideoUrl && playerState && currentProfile && (
        <CustomVideoPlayer 
            src={nativeVideoUrl}
            onClose={closeNativePlayer}
            onErrorFallback={handleNativePlayerError} // Passando a função de fallback
            onPlayerStable={handlePlayerStable} // Avisa que o player está rodando
            title={playerState.title}
            profileId={currentProfile.id}
            tmdbId={playerState.tmdbId}
            type={playerState.type}
            season={playerState.season}
            episode={playerState.episode}
            nextEpisode={nextEpisode ? { ...nextEpisode, onPlay: handleNextEpisode } : undefined}
            recommendations={playerRecommendations}
            onPlayRelated={handlePlayRelated}
        />
      )}

      {/* --- PLAYER EMBED (Fallback) --- */}
      {playerState && !nativeVideoUrl && !showAds && !showServerNotice && (
        <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col overflow-hidden">
            <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black transition-opacity duration-700 ease-in-out ${isIframeLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {playerState.backdrop && (
                    <div className="absolute inset-0 bg-cover bg-center opacity-40 scale-110 blur-xl animate-pulse-slow" style={{backgroundImage: `url(${tmdb.getBackdropUrl(playerState.backdrop)})`}}></div>
                )}
                <div className="relative z-10 flex flex-col items-center text-center p-6">
                    <div className="w-20 h-20 border-4 border-white/10 border-t-primary rounded-full animate-spin mb-8 shadow-[0_0_30px_rgba(242,13,242,0.4)]"></div>
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-2 tracking-tight drop-shadow-xl">{playerState.title || "Void Max"}</h2>
                    {playerState.type === 'tv' && <p className="text-white/70 text-lg font-medium mb-1">Temporada {playerState.season} • Episódio {playerState.episode}</p>}
                    <div className="flex flex-col items-center gap-2 mt-4">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                            <span className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Conectando</span>
                        </div>
                        <p className="text-white/30 text-[10px] uppercase tracking-widest mt-2 animate-pulse">
                            Tentando conexão segura...
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Controles para EMBED */}
            {nextEpisode && (
                <div className="absolute bottom-24 right-8 z-30 pointer-events-auto animate-slide-up">
                    <button onClick={handleNextEpisode} className="bg-white/10 backdrop-blur-md border border-white/10 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 hover:bg-white/20 transition-all group">
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[10px] uppercase font-bold text-white/50">Próximo</span>
                            <span className="text-base">{nextEpisode.title}</span>
                        </div>
                        <span className="material-symbols-rounded">skip_next</span>
                    </button>
                </div>
            )}

            <div className="flex-1 w-full h-full relative bg-black">
                 <iframe 
                    src={getEmbedUrl()} 
                    width="100%" height="100%" 
                    frameBorder="0" allowFullScreen 
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
