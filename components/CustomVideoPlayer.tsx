
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { gamificationService } from '../services/gamificationService';
import { tmdb } from '../services/tmdbService';
import { Movie } from '../types';

interface CustomVideoPlayerProps {
  src: string;
  onClose: () => void;
  onErrorFallback: () => void; 
  onPlayerStable?: () => void; 
  title?: string;
  profileId?: string;
  tmdbId?: number;
  type?: 'movie' | 'tv';
  season?: number;
  episode?: number;
  initialTime?: number;
  nextEpisode?: { season: number; episode: number; title?: string; onPlay: () => void };
  recommendations?: Movie[];
  onPlayRelated?: (movie: Movie) => void;
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ 
    src, 
    onClose, 
    onErrorFallback,
    onPlayerStable,
    title = "Reproduzindo",
    profileId,
    tmdbId,
    type,
    season,
    episode,
    initialTime = 0,
    nextEpisode,
    recommendations,
    onPlayRelated
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);
  
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showNextEpButton, setShowNextEpButton] = useState(false);
  const [showPostPlay, setShowPostPlay] = useState(false);
  const [hasStabilized, setHasStabilized] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showCastMenu, setShowCastMenu] = useState(false); // CAST MENU STATE
  const [lastTap, setLastTap] = useState(0);
  const [doubleTapAnimation, setDoubleTapAnimation] = useState<'left' | 'right' | null>(null);
  const [playAnimation, setPlayAnimation] = useState<'play' | 'pause' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const controlsTimeoutRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);

  // --- NATIVE BRIDGE COMMUNICATION ---
  // Avisa o app Android quando o player fecha
  const handleClose = () => {
      if (window.Android && window.Android.onPlayerClosed) {
          try {
              window.Android.onPlayerClosed();
          } catch (e) { console.error(e); }
      }
      onClose();
  };

  // --- DYNAMIC THEME BASED ON GENRE ---
  useEffect(() => {
      const fetchGenre = async () => {
          if (!tmdbId) return;
          try {
              let details;
              if (type === 'movie') details = await tmdb.getMovieDetails(String(tmdbId));
              else details = await tmdb.getTVDetails(String(tmdbId));

              if (details && details.genres.length > 0) {
                  const genreId = details.genres[0].id;
                  const root = document.documentElement;
                  if (genreId === 27) root.style.setProperty('--primary-color', '#ff0000');
                  else if (genreId === 878) root.style.setProperty('--primary-color', '#00f2ff');
                  else if (genreId === 10749) root.style.setProperty('--primary-color', '#ff0080');
                  else root.style.setProperty('--primary-color', '#f20df2');
              }
          } catch (e) {}
      };
      fetchGenre();
      return () => document.documentElement.style.setProperty('--primary-color', '#f20df2');
  }, [tmdbId, type]);

  // --- ERROR HANDLING ---
  const handleVideoError = useCallback(() => {
      console.warn("⚠️ Erro no vídeo nativo. Tentando fallback para Embed.");
      if (onErrorFallback) onErrorFallback();
  }, [onErrorFallback]);

  // --- STABILITY, GAMIFICATION & BRIDGE SIGNAL ---
  useEffect(() => {
      if (playing && !hasStabilized && currentTime > 1) {
          setHasStabilized(true);
          if (onPlayerStable) onPlayerStable();
          
          // BRIDGE: Avisa o Android que o vídeo pegou (Stop Sniffing)
          if (window.Android && window.Android.onVideoPlaying) {
              try {
                  console.log("Bridge: Sending onVideoPlaying");
                  window.Android.onVideoPlaying(src);
              } catch (e) { console.error("Erro bridge playing", e); }
          }
          
          if (profileId) gamificationService.checkAchievements(profileId, 'late_night');
      }
  }, [playing, currentTime, hasStabilized, onPlayerStable, profileId, src]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setShowPostPlay(false);
    setShowNextEpButton(false);
    
    if (src.includes('.m3u8')) video.crossOrigin = "anonymous";
    else video.removeAttribute('crossOrigin');

    const handleLoadedMetadata = () => {
        setDuration(video.duration);
        setIsLoading(false);
        if (initialTime > 0 && initialTime < video.duration) {
            video.currentTime = initialTime;
        }
        video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', () => { setIsLoading(false); setPlaying(true); });
    video.addEventListener('pause', () => setPlaying(false));
    video.addEventListener('error', handleVideoError);

    if (src.includes('.m3u8')) {
        if (window.Hls && window.Hls.isSupported()) {
            const hls = new window.Hls({ debug: false, enableWorker: true, lowLatencyMode: true });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                setIsLoading(false);
                if (initialTime > 0) video.currentTime = initialTime;
                video.play().catch(() => {});
            });
            hls.on(window.Hls.Events.ERROR, (event: any, data: any) => {
                if (data.fatal) {
                   if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
                   else handleVideoError();
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
        } else {
            handleVideoError();
        }
    } else {
        video.src = src;
    }

    return () => {
        if (hlsRef.current) hlsRef.current.destroy();
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleVideoError);
    };
  }, [src, initialTime, handleVideoError]);

  // --- SAVE PROGRESS (FIX: Use Robust Upsert) ---
  useEffect(() => {
      progressIntervalRef.current = window.setInterval(() => {
          if (videoRef.current && profileId && tmdbId && type) {
              const ct = videoRef.current.currentTime;
              const dur = videoRef.current.duration;
              const isFinished = (dur - ct < 180) || (ct > dur * 0.95);
              const progressToSave = isFinished ? dur : ct;

              storageService.updateProgress(
                  profileId, 
                  tmdbId, 
                  type, 
                  progressToSave, 
                  dur,
                  season,
                  episode
              );
          }
      }, 5000); 

      return () => {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      };
  }, [profileId, tmdbId, type, season, episode]);

  // --- CASTING LOGIC ---
  const handleCastClick = () => {
      // Prioridade 1: Bridge Nativo do Android (Seu app)
      if (window.Android && window.Android.castVideo) {
          try {
              window.Android.castVideo(src, title || "Video");
              return;
          } catch(e) {
              console.error("Native cast error", e);
          }
      }

      // Prioridade 2: API Nativa do Navegador (Chrome/AirPlay)
      const video = videoRef.current;
      // @ts-ignore
      if (video && video.webkitShowPlaybackTargetPicker) {
          // @ts-ignore
          video.webkitShowPlaybackTargetPicker();
          return;
      }
      
      // Se não for possível usar nativo, mostra menu com opção externa
      setShowCastMenu(true);
  };

  const openExternalCastApp = () => {
      // Abre Intent Android para apps como Web Video Caster / LocalCast / VLC
      const intentUrl = `intent:${src}#Intent;type=video/*;title=${encodeURIComponent(title || 'Video')};end`;
      window.location.href = intentUrl;
      setShowCastMenu(false);
  };

  // --- CONTROLS ---
  const resetControlsTimeout = useCallback(() => {
      if (isLocked) return;
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (playing) {
          controlsTimeoutRef.current = window.setTimeout(() => {
              setShowControls(false);
              setShowSpeedMenu(false);
              setShowCastMenu(false);
          }, 4000);
      }
  }, [playing, isLocked]);

  useEffect(() => {
      const events = ['mousemove', 'touchstart', 'click', 'keydown'];
      events.forEach(e => window.addEventListener(e, resetControlsTimeout));
      resetControlsTimeout();
      return () => {
          events.forEach(e => window.removeEventListener(e, resetControlsTimeout));
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      };
  }, [resetControlsTimeout]);

  const togglePlay = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!videoRef.current) return;
      setPlayAnimation(videoRef.current.paused ? 'play' : 'pause');
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = window.setTimeout(() => setPlayAnimation(null), 600);
      videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
      resetControlsTimeout();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      if (videoRef.current) {
          videoRef.current.currentTime = time;
          setCurrentTime(time);
      }
      resetControlsTimeout();
  };

  const skip = (seconds: number) => {
      if (videoRef.current) {
          videoRef.current.currentTime += seconds;
          resetControlsTimeout();
      }
  };

  const changeSpeed = (speed: number) => {
      if (videoRef.current) {
          videoRef.current.playbackRate = speed;
          setPlaybackSpeed(speed);
          setShowSpeedMenu(false);
      }
  };

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen();
          setIsFullscreen(true);
      } else {
          document.exitFullscreen();
          setIsFullscreen(false);
      }
  };

  const handleTimeUpdate = () => {
      if (videoRef.current) {
          const ct = videoRef.current.currentTime;
          const dur = videoRef.current.duration;
          setCurrentTime(ct);
          if (videoRef.current.buffered.length > 0) {
              setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
          }

          if (dur > 0) {
              const remaining = dur - ct;
              if (type === 'tv' && nextEpisode) {
                  if (remaining < 45 && !showNextEpButton) setShowNextEpButton(true);
                  if (remaining > 45 && showNextEpButton) setShowNextEpButton(false);
              }
              if (type === 'movie' && recommendations && recommendations.length > 0) {
                   if ((remaining < 90 || ct > dur * 0.97) && !showPostPlay) {
                       setShowPostPlay(true);
                       setShowControls(false); 
                   }
                   if (remaining > 90 && ct < dur * 0.97 && showPostPlay) setShowPostPlay(false);
              }
          }
      }
  };

  const handleDownload = () => {
      if (isDownloading) return;
      setIsDownloading(true);
      if (window.Android && window.Android.download) {
          try {
              window.Android.download(src, title || 'video');
              setTimeout(() => setIsDownloading(false), 2000);
          } catch (e) { fallbackDownload(); }
      } else { fallbackDownload(); }
  };

  const fallbackDownload = () => {
      const a = document.createElement('a');
      a.href = src;
      a.target = '_blank';
      a.download = title || 'video';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => setIsDownloading(false), 1000);
  };

  const formatTime = (time: number) => {
      if (isNaN(time)) return "0:00";
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      const seconds = Math.floor(time % 60);
      if (hours > 0) return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (isLocked) return;
      const currentTimeTap = new Date().getTime();
      const tapLength = currentTimeTap - lastTap;
      if (tapLength < 300 && tapLength > 0) {
          const touchX = e.changedTouches[0].clientX;
          const screenWidth = window.innerWidth;
          if (touchX < screenWidth / 3) { skip(-10); setDoubleTapAnimation('left'); } 
          else if (touchX > (screenWidth * 2) / 3) { skip(10); setDoubleTapAnimation('right'); } 
          else { togglePlay(); }
          setTimeout(() => setDoubleTapAnimation(null), 500);
      } else { if (!showControls) setShowControls(true); }
      setLastTap(currentTimeTap);
  };

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[9999] bg-black overflow-hidden flex flex-col justify-center font-body group select-none animate-fade-in"
      onTouchEnd={handleTouchEnd}
      onDoubleClick={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        key={src}
        className={`w-full h-full object-contain transition-all duration-700 ease-in-out ${showPostPlay ? 'scale-75 translate-y-[-10%] opacity-40 blur-sm' : 'scale-100 opacity-100'}`}
        onTimeUpdate={handleTimeUpdate}
        playsInline
        // @ts-ignore
        referrerPolicy="no-referrer"
      />

      {playAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 animate-ping-once">
               <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-md">
                   <span className="material-symbols-rounded text-white text-5xl">
                       {playAnimation === 'play' ? 'play_arrow' : 'pause'}
                   </span>
               </div>
          </div>
      )}

      {doubleTapAnimation && (
          <div className={`absolute top-1/2 -translate-y-1/2 ${doubleTapAnimation === 'left' ? 'left-10 md:left-32' : 'right-10 md:right-32'} z-50 flex flex-col items-center justify-center pointer-events-none`}>
               <div className="w-full h-full bg-white/10 rounded-full p-4 backdrop-blur-md animate-ping-fast">
                   <span className="material-symbols-rounded text-white text-4xl drop-shadow-md">
                       {doubleTapAnimation === 'left' ? 'replay_10' : 'forward_10'}
                   </span>
               </div>
               <span className="text-white font-bold text-sm mt-2 drop-shadow-md">10s</span>
          </div>
      )}

      {showNextEpButton && nextEpisode && !showPostPlay && (
          <div className="absolute bottom-20 right-6 z-[60] animate-slide-up">
              <button 
                onClick={nextEpisode.onPlay}
                className="group relative bg-white text-black pl-5 pr-6 py-3 rounded-full font-bold flex items-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 transition-all"
              >
                  <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse opacity-50"></div>
                  <div className="flex flex-col items-start leading-none">
                      <span className="text-[9px] uppercase font-bold text-black/60">Próximo</span>
                      <span className="text-sm font-black">{nextEpisode.title || 'Episódio'}</span>
                  </div>
                  <span className="material-symbols-rounded fill-1 text-2xl group-hover:translate-x-1 transition-transform">skip_next</span>
              </button>
          </div>
      )}

      {showPostPlay && recommendations && (
          <div className="absolute inset-x-0 bottom-0 h-[60%] z-[70] bg-gradient-to-t from-black via-black/95 to-transparent animate-slide-up flex flex-col justify-end pb-8 px-6">
              <div className="w-full max-w-5xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                      <div>
                          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">A seguir</p>
                          <h2 className="text-2xl font-display font-bold text-white">Você também pode gostar</h2>
                      </div>
                      <button onClick={handleClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white text-sm font-bold transition-colors">
                          Fechar Player
                      </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {recommendations.slice(0, 4).map((rec, i) => (
                          <div 
                             key={rec.id} 
                             onClick={() => onPlayRelated && onPlayRelated(rec)}
                             className="relative aspect-[16/9] rounded-xl overflow-hidden cursor-pointer group ring-1 ring-white/10 hover:ring-primary/50 transition-all hover:scale-[1.02]"
                             style={{ animationDelay: `${i * 100}ms` }}
                          >
                               <img src={tmdb.getBackdropUrl(rec.backdrop_path, 'w780')} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                               <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center">
                                   <span className="material-symbols-rounded text-4xl text-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100 drop-shadow-lg">play_circle</span>
                               </div>
                               <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black to-transparent">
                                   <p className="text-white text-xs font-bold truncate">{rec.title}</p>
                                   <p className="text-primary text-[10px] font-bold">{rec.vote_average.toFixed(1)} ★</p>
                               </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 bg-black/20">
          <div className="w-16 h-16 border-4 border-white/10 border-t-primary rounded-full animate-spin shadow-[0_0_30px_var(--primary-color)]"></div>
        </div>
      )}

      {isLocked && (
          <button 
            onClick={() => setIsLocked(false)} 
            className="absolute top-8 left-1/2 -translate-x-1/2 z-[60] bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center gap-2 text-white animate-pulse"
          >
              <span className="material-symbols-rounded">lock</span>
              <span className="text-xs font-bold uppercase">Toque para desbloquear</span>
          </button>
      )}

      {!isLocked && !showPostPlay && (
      <div className={`absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} flex flex-col justify-between p-4 md:p-8 z-40 pointer-events-none`}>
          <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-4">
                  <button onClick={handleClose} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-all">
                      <span className="material-symbols-rounded text-3xl">arrow_back</span>
                  </button>
                  <div>
                      <h2 className="text-white font-bold text-base md:text-lg drop-shadow-md leading-none">{title}</h2>
                      {(season && episode) && <p className="text-white/60 text-xs mt-1">S{season}:E{episode}</p>}
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  {/* CAST BUTTON */}
                  <div className="relative">
                      <button onClick={handleCastClick} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-all" title="Transmitir">
                          <span className="material-symbols-rounded text-2xl">cast</span>
                      </button>
                      
                      {/* CAST MENU */}
                      {showCastMenu && (
                          <div className="absolute top-full right-0 mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-fade-in-up origin-top-right">
                              <div className="p-3 border-b border-white/10">
                                  <p className="text-xs text-white/50 uppercase font-bold tracking-wider">Transmitir para</p>
                              </div>
                              <button onClick={openExternalCastApp} className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors group">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                      <span className="material-symbols-rounded text-lg">open_in_new</span>
                                  </div>
                                  <div>
                                      <p className="text-sm font-bold text-white">App Externo</p>
                                      <p className="text-[10px] text-white/50">Roku, FireTV, DLNA</p>
                                  </div>
                              </button>
                              <div className="bg-blue-500/10 p-3">
                                  <p className="text-[9px] text-blue-200 leading-tight">
                                      Para Roku/TVs sem Cast nativo, recomendamos usar o "Web Video Caster".
                                  </p>
                              </div>
                          </div>
                      )}
                  </div>

                  <button onClick={handleDownload} className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all ${isDownloading ? 'bg-primary text-white animate-pulse' : 'hover:bg-white/10'}`} title="Baixar">
                      <span className="material-symbols-rounded text-2xl">{isDownloading ? 'downloading' : 'download'}</span>
                  </button>
                  <button onClick={() => setIsLocked(true)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-all" title="Bloquear Tela">
                      <span className="material-symbols-rounded text-2xl">lock_open</span>
                  </button>
              </div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto hidden md:block">
             {!isLoading && (
                 <button onClick={togglePlay} className="w-20 h-20 rounded-full bg-black/40 hover:bg-primary/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/10 transition-all hover:scale-110 shadow-2xl group">
                    <span className="material-symbols-rounded text-5xl fill-1 ml-1 group-hover:scale-110 transition-transform">{playing ? 'pause' : 'play_arrow'}</span>
                 </button>
             )}
          </div>

          <div className="pointer-events-auto pb-safe">
              <div className="flex items-center gap-4 group/seekbar relative mb-2">
                  <div className="relative flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer group-hover/seekbar:h-2 transition-all">
                      <div className="absolute top-0 left-0 h-full bg-white/30 rounded-full transition-all" style={{ width: `${(buffered / duration) * 100}%` }}></div>
                      <div className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all relative shadow-[0_0_10px_var(--primary-color)]" style={{ width: `${(currentTime / duration) * 100}%` }}>
                          <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover/seekbar:scale-100 transition-transform"></div>
                      </div>
                      <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
              </div>

              <div className="flex items-center justify-between px-1">
                   <div className="flex items-center gap-4">
                       <button onClick={togglePlay} className="md:hidden text-white hover:text-primary transition-colors">
                           <span className="material-symbols-rounded text-3xl shadow-lg fill-1">{playing ? 'pause' : 'play_arrow'}</span>
                       </button>
                       <span className="text-xs font-bold text-white/90 font-mono tracking-wider">{formatTime(currentTime)} / {formatTime(duration)}</span>
                   </div>

                   <div className="flex items-center gap-2 sm:gap-4 relative">
                       <div className="relative">
                           <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="px-2 py-1 rounded hover:bg-white/10 text-white/90 text-xs font-bold border border-white/20 flex items-center gap-1">
                               {playbackSpeed}x
                           </button>
                           {showSpeedMenu && (
                               <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden shadow-xl min-w-[80px] animate-fade-in-up">
                                   {[0.5, 1, 1.25, 1.5, 2].map(s => (
                                       <button key={s} onClick={() => changeSpeed(s)} className={`block w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/10 ${playbackSpeed === s ? 'text-primary' : 'text-white'}`}>
                                           {s}x
                                       </button>
                                   ))}
                               </div>
                           )}
                       </div>
                       <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="text-white/70 hover:text-white transition-colors active:scale-90"><span className="material-symbols-rounded text-2xl">forward_10</span></button>
                       <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors"><span className="material-symbols-rounded text-3xl shadow-lg">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span></button>
                   </div>
              </div>
          </div>
      </div>
      )}

      <style>{`
          .animate-ping-once { animation: pingOnce 0.6s cubic-bezier(0, 0, 0.2, 1) forwards; }
          @keyframes pingOnce { 0% { transform: scale(0.8); opacity: 0; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
          .animate-ping-fast { animation: pingFast 0.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
          @keyframes pingFast { 75%, 100% { transform: scale(1.5); opacity: 0; } }
      `}</style>
    </div>
  );
};

export default CustomVideoPlayer;
