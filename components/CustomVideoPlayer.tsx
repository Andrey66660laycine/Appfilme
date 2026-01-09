
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';
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
  
  // Player States
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  
  // Feature States
  const [showPostPlay, setShowPostPlay] = useState(false); // RESTAURADO: Tela de fim de vídeo
  const [showNextEpButton, setShowNextEpButton] = useState(false);
  
  // UI Features
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [brightness, setBrightness] = useState(1);

  // Gestures
  const [doubleTapAnimation, setDoubleTapAnimation] = useState<'left' | 'right' | null>(null);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Data State
  const [mediaDetails, setMediaDetails] = useState<any>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  // --- SAVE PROGRESS LOGIC ---
  const saveProgress = useCallback(async (force = false) => {
      if (!videoRef.current || !profileId || !tmdbId || !type) return;
      
      const ct = videoRef.current.currentTime;
      const dur = videoRef.current.duration;
      
      if (!dur || isNaN(dur)) return;

      const isFinished = (ct > dur * 0.95);
      const progressToSave = isFinished ? dur : ct;

      if (ct > 5 || force) {
          await storageService.updateProgress(
              profileId, 
              tmdbId, 
              type, 
              progressToSave, 
              dur, 
              season, 
              episode,
              mediaDetails ? {
                  title: mediaDetails.title || mediaDetails.name,
                  poster_path: mediaDetails.poster_path,
                  backdrop_path: mediaDetails.backdrop_path,
                  vote_average: mediaDetails.vote_average
              } : { title: title }
          );
      }
  }, [profileId, tmdbId, type, season, episode, mediaDetails, title]);

  // Save loop
  useEffect(() => {
      const interval = setInterval(() => saveProgress(), 15000); 
      return () => {
          clearInterval(interval);
          saveProgress(true);
      };
  }, [saveProgress]);

  // Save on Pause/Close
  useEffect(() => {
      if (!playing) saveProgress(true);
  }, [playing, saveProgress]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const fetchDetails = async () => {
        if (!tmdbId) return;
        try {
            let d;
            if (type === 'movie') d = await tmdb.getMovieDetails(String(tmdbId));
            else d = await tmdb.getTVDetails(String(tmdbId));
            if (d) setMediaDetails(d);
        } catch(e) {}
    };
    fetchDetails();
  }, [tmdbId, type]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setShowPostPlay(false); // Reset post play on src change
    
    // Configura CrossOrigin para HLS correto
    if (src.includes('.m3u8')) video.crossOrigin = "anonymous";
    else video.removeAttribute('crossOrigin');

    const handleLoadedMetadata = () => {
        setDuration(video.duration);
        setIsLoading(false);
        if (initialTime > 0 && initialTime < video.duration) {
            video.currentTime = initialTime;
        }
        video.play().then(() => {
            setPlaying(true);
            // Avisa o App Android que o vídeo tocou (para fechar loading nativo/sniffers)
            if (window.Android && window.Android.onVideoPlaying) {
                try { window.Android.onVideoPlaying(src); } catch(e) {}
            }
        }).catch(() => setPlaying(false));
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handlePlaying = () => { setIsLoading(false); setPlaying(true); if(onPlayerStable) onPlayerStable(); };
    const handlePause = () => setPlaying(false);
    
    const handleError = () => {
        console.warn("Player Error, calling fallback");
        if (hlsRef.current) hlsRef.current.destroy();
        if(onErrorFallback) onErrorFallback();
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    // HLS Support
    if (src.includes('.m3u8') && window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls({ debug: false, enableWorker: true, lowLatencyMode: true });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
             if (initialTime > 0) video.currentTime = initialTime;
             video.play().catch(() => {});
        });
        hls.on(window.Hls.Events.ERROR, (event: any, data: any) => {
            if (data.fatal) {
                if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
                else handleError();
            }
        });
    } else {
        video.src = src;
    }

    return () => {
        if (hlsRef.current) hlsRef.current.destroy();
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('error', handleError);
    };
  }, [src]); 

  // --- CONTROLS & GESTURES ---
  const handleTouchEnd = (e: React.TouchEvent) => {
      if (isLocked) return;
      const now = Date.now();
      const tapLength = now - lastTapTime;
      
      if (tapLength < 300 && tapLength > 0) {
          const touchX = e.changedTouches[0].clientX;
          const width = window.innerWidth;
          
          if (touchX < width * 0.3) {
              skip(-10);
              setDoubleTapAnimation('left');
          } else if (touchX > width * 0.7) {
              skip(10);
              setDoubleTapAnimation('right');
          } else {
              togglePlay();
          }
          setTimeout(() => setDoubleTapAnimation(null), 600);
      } else {
          setShowControls(prev => !prev);
      }
      setLastTapTime(now);
  };

  const skip = (sec: number) => {
      if (videoRef.current) {
          videoRef.current.currentTime += sec;
          resetControlsTimeout();
      }
  };

  const togglePlay = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!videoRef.current) return;
      if (videoRef.current.paused) {
          videoRef.current.play();
          setPlaying(true);
      } else {
          videoRef.current.pause();
          setPlaying(false);
      }
      resetControlsTimeout();
  };

  const resetControlsTimeout = useCallback(() => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (playing && !isLocked && !showPostPlay) {
          controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 4000);
      }
  }, [playing, isLocked, showPostPlay]);

  useEffect(() => {
      resetControlsTimeout();
      window.addEventListener('mousemove', resetControlsTimeout);
      return () => window.removeEventListener('mousemove', resetControlsTimeout);
  }, [resetControlsTimeout]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      if (videoRef.current) {
          videoRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const handleTimeUpdate = () => {
      if(videoRef.current) {
          const ct = videoRef.current.currentTime;
          const d = videoRef.current.duration;
          setCurrentTime(ct);
          
          // Logic for Next Episode Button
          if(d > 0) {
              const remaining = d - ct;
              if (type === 'tv' && nextEpisode) {
                  if (remaining < 60 && !showNextEpButton) setShowNextEpButton(true); // Show 60s before end
                  if (remaining >= 60 && showNextEpButton) setShowNextEpButton(false);
              }

              // Logic for Post Play (Recommendations)
              if ((remaining < 5 || ct > d * 0.99) && !showPostPlay) {
                  setShowPostPlay(true);
                  setShowControls(false);
              }
          }
      }
  };

  // --- DOWNLOAD ---
  const handleDownload = () => {
      if (isDownloading) return;
      setIsDownloading(true);

      const safeTmdbId = tmdbId || 0;
      const safeType = type === 'tv' ? 'tv' : 'movie'; 
      const posterUrl = mediaDetails?.poster_path ? tmdb.getPosterUrl(mediaDetails.poster_path, 'w500') : '';
      
      const payload = {
          id: String(safeTmdbId),
          title: title || "Video",
          type: safeType,
          season: safeType === 'tv' ? (season || 0) : 0,
          episode: safeType === 'tv' ? (episode || 0) : 0,
          poster: posterUrl,
          backdrop: mediaDetails?.backdrop_path ? tmdb.getBackdropUrl(mediaDetails.backdrop_path, 'w780') : ''
      };

      try {
          if (window.Android && window.Android.download) {
              window.Android.download(src, JSON.stringify(payload));
              setTimeout(() => {
                  onClose();
                  if (window.Android?.onPlayerClosed) window.Android.onPlayerClosed();
              }, 1500);
          } else {
              // Fallback Browser Download
              const a = document.createElement('a');
              a.href = src;
              a.target = '_blank';
              a.download = title || 'video';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setIsDownloading(false);
          }
      } catch (e) { setIsDownloading(false); }
  };

  const handleCast = () => {
      if (window.Android && window.Android.castVideo) {
          try {
              window.Android.castVideo(src, title);
          } catch(e) { console.error(e); }
      } else {
          // Browser Cast simulation
          alert("Use o botão de transmitir do seu navegador ou app externo.");
      }
  };

  const handleClosePlayer = () => {
      saveProgress(true);
      if (window.Android && window.Android.onPlayerClosed) {
          try { window.Android.onPlayerClosed(); } catch(e) {}
      }
      onClose();
  };

  const formatTime = (time: number) => {
      const h = Math.floor(time / 3600);
      const m = Math.floor((time % 3600) / 60);
      const s = Math.floor(time % 60);
      return h > 0 ? `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}` : `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[9999] bg-black overflow-hidden select-none font-body"
      onTouchEnd={handleTouchEnd}
      style={{ filter: `brightness(${brightness})` }}
    >
      <video
        ref={videoRef}
        className={`w-full h-full object-${fitMode} transition-all duration-700 ease-in-out ${showPostPlay ? 'scale-75 opacity-40 blur-sm translate-y-[-10%]' : 'scale-100 opacity-100'}`}
        onTimeUpdate={handleTimeUpdate}
        playsInline
      />

      {/* DOUBLE TAP ANIMATION */}
      {doubleTapAnimation && (
          <div className={`absolute top-1/2 -translate-y-1/2 ${doubleTapAnimation === 'left' ? 'left-20' : 'right-20'} z-50 flex flex-col items-center pointer-events-none animate-ping-once`}>
               <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-2">
                   <span className="material-symbols-rounded text-white text-3xl">
                       {doubleTapAnimation === 'left' ? 'replay_10' : 'forward_10'}
                   </span>
               </div>
               <span className="text-white font-bold text-xs shadow-black drop-shadow-md">10s</span>
          </div>
      )}

      {/* LOADING */}
      {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div className="w-16 h-16 border-4 border-white/20 border-t-primary rounded-full animate-spin"></div>
          </div>
      )}

      {/* LOCKED STATE */}
      {isLocked && (
          <button onClick={() => setIsLocked(false)} className="absolute top-10 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full flex items-center gap-2 z-50 animate-pulse">
              <span className="material-symbols-rounded text-white">lock</span>
              <span className="text-white text-xs font-bold uppercase">Destravar</span>
          </button>
      )}

      {/* --- POST PLAY SCREEN (RESTAURADO) --- */}
      {showPostPlay && (
          <div className="absolute inset-x-0 bottom-0 h-[60%] z-[70] bg-gradient-to-t from-black via-black/95 to-transparent animate-slide-up flex flex-col justify-end pb-8 px-6 overflow-y-auto">
              <div className="w-full max-w-5xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                      <div>
                          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">A seguir</p>
                          <h2 className="text-2xl font-display font-bold text-white">Recomendações</h2>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => { setShowPostPlay(false); setShowControls(true); }} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-bold">
                              Voltar ao Vídeo
                          </button>
                          <button onClick={handleClosePlayer} className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-full text-sm font-bold">
                              Fechar
                          </button>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {nextEpisode && (
                          <div 
                             onClick={() => { setShowPostPlay(false); nextEpisode.onPlay(); }}
                             className="relative aspect-[16/9] rounded-xl overflow-hidden cursor-pointer group ring-2 ring-primary transition-all hover:scale-[1.02]"
                          >
                               <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                   <div className="text-center">
                                       <span className="material-symbols-rounded text-4xl text-white">play_circle</span>
                                       <p className="text-white font-bold text-sm mt-2">Próximo Episódio</p>
                                       <p className="text-white/70 text-xs">{nextEpisode.title}</p>
                                   </div>
                               </div>
                          </div>
                      )}
                      
                      {recommendations && recommendations.slice(0, nextEpisode ? 3 : 4).map((rec, i) => (
                          <div 
                             key={rec.id} 
                             onClick={() => { onPlayRelated && onPlayRelated(rec); setShowPostPlay(false); }}
                             className="relative aspect-[16/9] rounded-xl overflow-hidden cursor-pointer group ring-1 ring-white/10 hover:ring-primary/50 transition-all hover:scale-[1.02]"
                          >
                               <img src={tmdb.getBackdropUrl(rec.backdrop_path, 'w780')} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                               <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center">
                                   <span className="material-symbols-rounded text-4xl text-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100 drop-shadow-lg">play_arrow</span>
                               </div>
                               <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black to-transparent">
                                   <p className="text-white text-xs font-bold truncate">{rec.title}</p>
                               </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* CONTROLS OVERLAY */}
      {!isLocked && !showPostPlay && (
        <div className={`absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'} flex flex-col justify-between z-40`}>
            
            {/* TOP BAR */}
            <div className="flex items-center justify-between p-4 pt-6 md:p-8">
                <div className="flex items-center gap-4">
                    <button onClick={handleClosePlayer} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-rounded text-white text-3xl">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-white font-bold text-base line-clamp-1 drop-shadow-md">{title}</h2>
                        {(season && episode) && <p className="text-white/60 text-xs">S{season}:E{episode}</p>}
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <button onClick={handleCast} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white">
                        <span className="material-symbols-rounded text-2xl">cast</span>
                    </button>
                    <button onClick={handleDownload} className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isDownloading ? 'text-primary animate-pulse' : 'text-white hover:bg-white/10'}`}>
                        <span className="material-symbols-rounded text-2xl">download</span>
                    </button>
                    <button onClick={() => setFitMode(prev => prev === 'contain' ? 'cover' : 'contain')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white">
                        <span className="material-symbols-rounded text-2xl">{fitMode === 'contain' ? 'fit_screen' : 'crop_free'}</span>
                    </button>
                    <button onClick={() => setIsLocked(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white">
                        <span className="material-symbols-rounded text-2xl">lock_open</span>
                    </button>
                </div>
            </div>

            {/* CENTER PLAY BUTTON */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                {!isLoading && (
                    <button onClick={togglePlay} className="w-20 h-20 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center hover:scale-110 transition-transform group">
                        <span className="material-symbols-rounded text-5xl text-white fill-1 ml-1">{playing ? 'pause' : 'play_arrow'}</span>
                    </button>
                )}
            </div>

            {/* NEXT EPISODE POPUP (Small Button) */}
            {showNextEpButton && nextEpisode && (
                <div className="absolute bottom-24 right-6 animate-slide-up pointer-events-auto">
                    <button onClick={nextEpisode.onPlay} className="bg-white text-black pl-5 pr-3 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform group">
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[10px] text-gray-500 uppercase font-bold">A Seguir</span>
                            <span className="text-sm font-black">{nextEpisode.title}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center group-hover:bg-primary transition-colors">
                            <span className="material-symbols-rounded text-xl">skip_next</span>
                        </div>
                    </button>
                </div>
            )}

            {/* BOTTOM BAR */}
            <div className="p-4 pb-8 md:p-8 pointer-events-auto bg-gradient-to-t from-black/90 to-transparent">
                <div className="flex items-center justify-between text-xs font-bold text-white/80 mb-2 px-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
                
                {/* SEEKBAR */}
                <div className="relative h-6 group flex items-center cursor-pointer">
                    <input 
                        type="range" 
                        min="0" 
                        max={duration || 100} 
                        value={currentTime} 
                        onChange={handleSeek} 
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                    />
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden relative">
                         <div className="h-full bg-primary relative transition-all" style={{ width: `${(currentTime / duration) * 100}%` }}>
                             <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover:scale-150 transition-transform"></div>
                         </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setShowPostPlay(true)} className="text-white/70 hover:text-white flex items-center gap-1 text-xs font-bold">
                            <span className="material-symbols-rounded text-lg">grid_view</span>
                            <span className="hidden sm:inline">Episódios</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={() => skip(-10)} className="text-white hover:text-white/80"><span className="material-symbols-rounded text-3xl">replay_10</span></button>
                        <button onClick={togglePlay} className="text-white hover:text-primary"><span className="material-symbols-rounded text-4xl fill-1">{playing ? 'pause' : 'play_arrow'}</span></button>
                        <button onClick={() => skip(10)} className="text-white hover:text-white/80"><span className="material-symbols-rounded text-3xl">forward_10</span></button>
                    </div>

                    <div className="flex items-center gap-4 relative">
                        <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="bg-white/10 px-3 py-1 rounded text-xs font-bold text-white hover:bg-white/20">
                            {playbackSpeed}x
                        </button>
                        {showSpeedMenu && (
                            <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden w-20 animate-fade-in-up">
                                {[0.5, 1.0, 1.5, 2.0].map(s => (
                                    <button key={s} onClick={() => { if(videoRef.current) videoRef.current.playbackRate = s; setPlaybackSpeed(s); setShowSpeedMenu(false); }} className="block w-full py-2 hover:bg-white/10 text-white text-xs font-bold">
                                        {s}x
                                    </button>
                                ))}
                            </div>
                        )}
                        <button onClick={() => {
                             if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
                             else document.exitFullscreen();
                        }} className="text-white hover:text-white/80">
                            <span className="material-symbols-rounded text-3xl">fullscreen</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CustomVideoPlayer;
