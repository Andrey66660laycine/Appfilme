
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';

interface CustomVideoPlayerProps {
  src: string;
  onClose: () => void;
  title?: string;
  // Dados para salvar progresso
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
  const hlsRef = useRef<any>(null); // Hls instance
  
  // State
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTap, setLastTap] = useState(0);
  const [doubleTapAnimation, setDoubleTapAnimation] = useState<'left' | 'right' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const controlsTimeoutRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // --- INITIALIZATION & HLS ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);

    const handleLoadedMetadata = () => {
        setDuration(video.duration);
        setIsLoading(false);
        if (initialTime > 0 && initialTime < video.duration) {
            video.currentTime = initialTime;
        }
        video.play().catch(() => console.log("Autoplay blocked"));
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = (e: any) => {
        console.error("Video Error", e);
        setIsLoading(false);
        // Não mostra erro imediatamente para streams HLS que recuperam
        if (!src.includes('.m3u8')) setError("Erro ao carregar vídeo.");
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', () => { setIsLoading(false); setPlaying(true); });
    video.addEventListener('pause', () => setPlaying(false));
    video.addEventListener('error', handleError);

    // HLS Support Logic
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
                       hls.destroy();
                       break;
                   }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari / Native HLS
            video.src = src;
        } else {
            setError("Seu navegador não suporta este formato de vídeo.");
        }
    } else {
        // MP4 / Standard
        video.src = src;
    }

    return () => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
        }
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
    };
  }, [src]);

  // --- SAVE PROGRESS (Every 10s) ---
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
      }, 10000); // 10s

      return () => {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      };
  }, [profileId, tmdbId, type, season, episode]);

  // --- CONTROLS VISIBILITY ---
  const resetControlsTimeout = useCallback(() => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (playing) {
          controlsTimeoutRef.current = window.setTimeout(() => {
              setShowControls(false);
          }, 3000);
      }
  }, [playing]);

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
      if (playing) {
          videoRef.current.pause();
      } else {
          videoRef.current.play();
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

      // Tenta usar a interface Android nativa se existir
      if (window.Android && window.Android.download) {
          try {
              window.Android.download(src, title);
              setTimeout(() => setIsDownloading(false), 2000); // Feedback visual
          } catch (e) {
              console.error("Erro ao chamar download nativo", e);
              // Fallback
              const a = document.createElement('a');
              a.href = src;
              a.download = title || 'video';
              a.click();
              setIsDownloading(false);
          }
      } else {
          // Fallback Web: abre em nova aba ou força download
          const a = document.createElement('a');
          a.href = src;
          a.target = '_blank';
          a.download = title || 'video';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => setIsDownloading(false), 1000);
      }
  };

  const formatTime = (time: number) => {
      if (isNaN(time)) return "0:00";
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      const seconds = Math.floor(time % 60);
      if (hours > 0) {
          return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      }
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // --- GESTURES ---
  const handleTouchEnd = (e: React.TouchEvent) => {
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
      className="fixed inset-0 z-[200] bg-black overflow-hidden flex flex-col justify-center font-body group select-none animate-fade-in"
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        playsInline
        crossOrigin="anonymous"
      />

      {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50">
              <span className="material-symbols-rounded text-red-500 text-5xl mb-4">error</span>
              <p className="text-white text-lg font-bold">{error}</p>
              <button onClick={onClose} className="mt-6 bg-white text-black px-6 py-2 rounded-full font-bold">Voltar</button>
          </div>
      )}

      {doubleTapAnimation && (
          <div className={`absolute top-1/2 -translate-y-1/2 ${doubleTapAnimation === 'left' ? 'left-20' : 'right-20'} z-40 flex flex-col items-center justify-center pointer-events-none animate-ping`}>
               <span className="material-symbols-rounded text-white text-5xl shadow-lg drop-shadow-md">
                   {doubleTapAnimation === 'left' ? 'replay_10' : 'forward_10'}
               </span>
               <span className="text-white font-bold text-lg drop-shadow-md">10s</span>
          </div>
      )}

      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="w-16 h-16 border-4 border-white/10 border-t-primary rounded-full animate-spin shadow-[0_0_20px_rgba(242,13,242,0.5)]"></div>
        </div>
      )}

      {/* CONTROLS OVERLAY */}
      <div className={`absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} flex flex-col justify-between p-4 md:p-8 z-20`}>
          
          {/* TOP BAR */}
          <div className="flex items-center justify-between pointer-events-auto">
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all">
                  <span className="material-symbols-rounded text-2xl">arrow_back</span>
              </button>
              <h2 className="text-white font-display font-bold text-lg drop-shadow-md tracking-wide line-clamp-1 max-w-[60%] text-center">{title}</h2>
              <button onClick={handleDownload} className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all ${isDownloading ? 'bg-primary animate-pulse' : 'bg-white/10 hover:bg-white/20'}`} title="Baixar">
                  <span className="material-symbols-rounded text-2xl">{isDownloading ? 'downloading' : 'download'}</span>
              </button>
          </div>

          {/* CENTER PLAY BUTTON (DESKTOP) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto hidden md:block">
             {!isLoading && (
                 <button onClick={togglePlay} className="w-24 h-24 rounded-full bg-black/50 hover:bg-primary/90 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all hover:scale-110 shadow-2xl">
                    <span className="material-symbols-rounded text-6xl fill-1 ml-1">{playing ? 'pause' : 'play_arrow'}</span>
                 </button>
             )}
          </div>

          {/* BOTTOM CONTROLS */}
          <div className="pointer-events-auto space-y-4">
              
              {/* PROGRESS BAR */}
              <div className="flex items-center gap-4 group/seekbar relative">
                  <span className="text-xs font-bold text-white/80 w-10 text-right font-mono">{formatTime(currentTime)}</span>
                  <div className="relative flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer group-hover/seekbar:h-2 transition-all">
                      <div className="absolute top-0 left-0 h-full bg-white/30 rounded-full transition-all" style={{ width: `${(buffered / duration) * 100}%` }}></div>
                      <div className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all relative" style={{ width: `${(currentTime / duration) * 100}%` }}>
                          <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover/seekbar:scale-100 transition-transform"></div>
                      </div>
                      <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                  <span className="text-xs font-bold text-white/80 w-10 font-mono">{formatTime(duration)}</span>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-6">
                       <button onClick={togglePlay} className="md:hidden text-white hover:text-primary transition-colors">
                           <span className="material-symbols-rounded text-4xl shadow-lg">{playing ? 'pause' : 'play_arrow'}</span>
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="text-white/70 hover:text-white transition-colors flex items-center gap-1 active:scale-90">
                            <span className="material-symbols-rounded text-3xl shadow-lg">replay_10</span>
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="text-white/70 hover:text-white transition-colors flex items-center gap-1 active:scale-90">
                            <span className="material-symbols-rounded text-3xl shadow-lg">forward_10</span>
                       </button>
                   </div>
                   <div className="flex items-center gap-4">
                       <button className="text-white/70 hover:text-white flex flex-col items-center gap-1">
                           <span className="material-symbols-rounded text-2xl">subtitles</span>
                       </button>
                       <button className="text-white/70 hover:text-white flex flex-col items-center gap-1">
                           <span className="material-symbols-rounded text-2xl">speed</span>
                       </button>
                       <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
                           <span className="material-symbols-rounded text-3xl shadow-lg">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                       </button>
                   </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default CustomVideoPlayer;
