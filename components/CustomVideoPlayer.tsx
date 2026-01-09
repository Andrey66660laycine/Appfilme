
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';

interface CustomVideoPlayerProps {
  src: string;
  onClose: () => void;
  onErrorFallback: () => void; // Função para chamar se der erro
  title?: string;
  profileId?: string;
  tmdbId?: number;
  type?: 'movie' | 'tv';
  season?: number;
  episode?: number;
  initialTime?: number;
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ 
    src, 
    onClose, 
    onErrorFallback,
    title = "Reproduzindo",
    profileId,
    tmdbId,
    type,
    season,
    episode,
    initialTime = 0
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);
  
  // State Basics
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Advanced Features State
  const [isLocked, setIsLocked] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [doubleTapAnimation, setDoubleTapAnimation] = useState<'left' | 'right' | null>(null);
  const [playAnimation, setPlayAnimation] = useState<'play' | 'pause' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const controlsTimeoutRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);

  // --- ERROR HANDLING & FALLBACK ---
  const handleVideoError = useCallback(() => {
      console.warn("⚠️ Erro no vídeo nativo. Tentando fallback para Embed.");
      if (onErrorFallback) onErrorFallback();
  }, [onErrorFallback]);

  // --- INITIALIZATION & HLS ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    
    // IMPORTANT: Para MP4s diretos que não enviam headers CORS (ex: cdn.cnvslink.com), 
    // NÃO podemos usar crossOrigin="anonymous", senão o browser bloqueia (erro 403/cors).
    // Apenas HLS (.m3u8) precisa obrigatoriamente de CORS.
    if (src.includes('.m3u8')) {
        video.crossOrigin = "anonymous";
    } else {
        video.removeAttribute('crossOrigin');
    }

    const handleLoadedMetadata = () => {
        setDuration(video.duration);
        setIsLoading(false);
        if (initialTime > 0 && initialTime < video.duration) {
            video.currentTime = initialTime;
        }
        video.play().then(() => setPlaying(true)).catch(() => {
            console.log("Autoplay blocked, waiting for user interaction");
            setPlaying(false);
        });
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    
    // Event Listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', () => { setIsLoading(false); setPlaying(true); });
    video.addEventListener('pause', () => setPlaying(false));
    video.addEventListener('error', handleVideoError); // ERROR HANDLER

    // HLS Logic
    if (src.includes('.m3u8')) {
        if (window.Hls && window.Hls.isSupported()) {
            const hls = new window.Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
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
                   switch (data.type) {
                     case window.Hls.ErrorTypes.NETWORK_ERROR:
                       hls.startLoad();
                       break;
                     case window.Hls.ErrorTypes.MEDIA_ERROR:
                       hls.recoverMediaError();
                       break;
                     default:
                       handleVideoError(); // Fatal HLS Error -> Fallback
                       break;
                   }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
        } else {
            handleVideoError(); // No support -> Fallback
        }
    } else {
        // Standard MP4
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

  // --- SAVE PROGRESS (CRITICAL) ---
  useEffect(() => {
      progressIntervalRef.current = window.setInterval(() => {
          if (videoRef.current && !videoRef.current.paused && profileId && tmdbId && type) {
              storageService.updateProgress(
                  profileId, 
                  tmdbId, 
                  type, 
                  videoRef.current.currentTime, 
                  videoRef.current.duration,
                  season,
                  episode
              );
          }
      }, 5000); // 5s Update Interval

      return () => {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      };
  }, [profileId, tmdbId, type, season, episode]);

  // --- CONTROLS VISIBILITY ---
  const resetControlsTimeout = useCallback(() => {
      if (isLocked) return;
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (playing) {
          controlsTimeoutRef.current = window.setTimeout(() => {
              setShowControls(false);
              setShowSpeedMenu(false);
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

  // --- HANDLERS ---
  const togglePlay = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!videoRef.current) return;
      
      // Animation Trigger
      setPlayAnimation(videoRef.current.paused ? 'play' : 'pause');
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = window.setTimeout(() => setPlayAnimation(null), 600);

      if (videoRef.current.paused) {
          videoRef.current.play();
      } else {
          videoRef.current.pause();
      }
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
          setCurrentTime(videoRef.current.currentTime);
          if (videoRef.current.buffered.length > 0) {
              const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
              setBuffered(bufferedEnd);
          }
      }
  };

  const handleDownload = () => {
      if (isDownloading) return;
      setIsDownloading(true);

      if (window.Android && window.Android.download) {
          try {
              window.Android.download(src, title);
              setTimeout(() => setIsDownloading(false), 2000);
          } catch (e) {
              fallbackDownload();
          }
      } else {
          fallbackDownload();
      }
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

  // --- GESTURES ---
  const handleTouchEnd = (e: React.TouchEvent) => {
      if (isLocked) return;
      const currentTimeTap = new Date().getTime();
      const tapLength = currentTimeTap - lastTap;
      
      if (tapLength < 300 && tapLength > 0) {
          const touchX = e.changedTouches[0].clientX;
          const screenWidth = window.innerWidth;
          
          if (touchX < screenWidth / 3) {
              skip(-10);
              setDoubleTapAnimation('left');
          } else if (touchX > (screenWidth * 2) / 3) {
              skip(10);
              setDoubleTapAnimation('right');
          } else {
              togglePlay();
          }
          setTimeout(() => setDoubleTapAnimation(null), 500);
      } else {
          if (!showControls) setShowControls(true);
      }
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
        key={src} // Force re-render on source change to reset attributes
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        playsInline
        // @ts-ignore - Bypass TS check for referrerPolicy
        referrerPolicy="no-referrer"
      />

      {/* --- CENTER PLAY/PAUSE ANIMATION --- */}
      {playAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 animate-ping-once">
               <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-md">
                   <span className="material-symbols-rounded text-white text-5xl">
                       {playAnimation === 'play' ? 'play_arrow' : 'pause'}
                   </span>
               </div>
          </div>
      )}

      {/* --- DOUBLE TAP ANIMATION --- */}
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

      {/* --- BUFFERING LOADER --- */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 bg-black/20">
          <div className="w-16 h-16 border-4 border-white/10 border-t-primary rounded-full animate-spin shadow-[0_0_30px_rgba(242,13,242,0.4)]"></div>
        </div>
      )}

      {/* --- LOCK BUTTON (ALWAYS VISIBLE IF LOCKED) --- */}
      {isLocked && (
          <button 
            onClick={() => setIsLocked(false)} 
            className="absolute top-8 left-1/2 -translate-x-1/2 z-[60] bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center gap-2 text-white animate-pulse"
          >
              <span className="material-symbols-rounded">lock</span>
              <span className="text-xs font-bold uppercase">Toque para desbloquear</span>
          </button>
      )}

      {/* --- CONTROLS OVERLAY --- */}
      {!isLocked && (
      <div className={`absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} flex flex-col justify-between p-4 md:p-8 z-40 pointer-events-none`}>
          
          {/* TOP BAR */}
          <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-4">
                  <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-all">
                      <span className="material-symbols-rounded text-3xl">arrow_back</span>
                  </button>
                  <div>
                      <h2 className="text-white font-bold text-base md:text-lg drop-shadow-md leading-none">{title}</h2>
                      {(season && episode) && <p className="text-white/60 text-xs mt-1">S{season}:E{episode}</p>}
                  </div>
              </div>
              
              <div className="flex items-center gap-4">
                  <button onClick={handleDownload} className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all ${isDownloading ? 'bg-primary text-white animate-pulse' : 'hover:bg-white/10'}`} title="Baixar">
                      <span className="material-symbols-rounded text-2xl">{isDownloading ? 'downloading' : 'download'}</span>
                  </button>
                  <button onClick={() => setIsLocked(true)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-all" title="Bloquear Tela">
                      <span className="material-symbols-rounded text-2xl">lock_open</span>
                  </button>
              </div>
          </div>

          {/* CENTER PLAY BUTTON (DESKTOP) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto hidden md:block">
             {!isLoading && (
                 <button onClick={togglePlay} className="w-20 h-20 rounded-full bg-black/40 hover:bg-primary/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/10 transition-all hover:scale-110 shadow-2xl group">
                    <span className="material-symbols-rounded text-5xl fill-1 ml-1 group-hover:scale-110 transition-transform">{playing ? 'pause' : 'play_arrow'}</span>
                 </button>
             )}
          </div>

          {/* BOTTOM CONTROLS */}
          <div className="pointer-events-auto pb-safe">
              
              {/* PROGRESS BAR */}
              <div className="flex items-center gap-4 group/seekbar relative mb-2">
                  <div className="relative flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer group-hover/seekbar:h-2 transition-all">
                      <div className="absolute top-0 left-0 h-full bg-white/30 rounded-full transition-all" style={{ width: `${(buffered / duration) * 100}%` }}></div>
                      <div className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all relative shadow-[0_0_10px_#f20df2]" style={{ width: `${(currentTime / duration) * 100}%` }}>
                          <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover/seekbar:scale-100 transition-transform"></div>
                      </div>
                      <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-between px-1">
                   <div className="flex items-center gap-4">
                       <button onClick={togglePlay} className="md:hidden text-white hover:text-primary transition-colors">
                           <span className="material-symbols-rounded text-3xl shadow-lg fill-1">{playing ? 'pause' : 'play_arrow'}</span>
                       </button>
                       <span className="text-xs font-bold text-white/90 font-mono tracking-wider">{formatTime(currentTime)} / {formatTime(duration)}</span>
                   </div>

                   <div className="flex items-center gap-2 sm:gap-4 relative">
                       {/* SPEED CONTROL */}
                       <div className="relative">
                           <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="px-2 py-1 rounded hover:bg-white/10 text-white/90 text-xs font-bold border border-white/20 flex items-center gap-1">
                               {playbackSpeed}x
                           </button>
                           {showSpeedMenu && (
                               <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden shadow-xl min-w-[80px] animate-fade-in-up">
                                   {[0.5, 1, 1.25, 1.5, 2].map(s => (
                                       <button 
                                        key={s} 
                                        onClick={() => changeSpeed(s)} 
                                        className={`block w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/10 ${playbackSpeed === s ? 'text-primary' : 'text-white'}`}
                                       >
                                           {s}x
                                       </button>
                                   ))}
                               </div>
                           )}
                       </div>

                       <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="text-white/70 hover:text-white transition-colors active:scale-90">
                            <span className="material-symbols-rounded text-2xl">forward_10</span>
                       </button>
                       
                       <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
                           <span className="material-symbols-rounded text-3xl shadow-lg">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                       </button>
                   </div>
              </div>
          </div>
      </div>
      )}

      <style>{`
          .animate-ping-once { animation: pingOnce 0.6s cubic-bezier(0, 0, 0.2, 1) forwards; }
          @keyframes pingOnce {
              0% { transform: scale(0.8); opacity: 0; }
              50% { transform: scale(1.1); opacity: 1; }
              100% { transform: scale(1); opacity: 0; }
          }
          .animate-ping-fast { animation: pingFast 0.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
          @keyframes pingFast {
              75%, 100% { transform: scale(1.5); opacity: 0; }
          }
      `}</style>
    </div>
  );
};

export default CustomVideoPlayer;
