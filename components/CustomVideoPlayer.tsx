
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
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  
  // UI Panels
  const [showSidePanel, setShowSidePanel] = useState(false); // Lista de Episodios/Relacionados
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  
  // Settings
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1);

  // Gestures & Feedback
  const [doubleTapAnimation, setDoubleTapAnimation] = useState<'left' | 'right' | null>(null);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [volumeIndicator, setVolumeIndicator] = useState<number | null>(null);
  
  // Data
  const [mediaDetails, setMediaDetails] = useState<any>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  // --- SAVE PROGRESS ---
  const saveProgress = useCallback(async (force = false) => {
      if (!videoRef.current || !profileId || !tmdbId || !type) return;
      
      const ct = videoRef.current.currentTime;
      const dur = videoRef.current.duration;
      
      if (!dur || isNaN(dur)) return;

      const isFinished = (ct > dur * 0.95);
      const progressToSave = isFinished ? dur : ct;

      if (ct > 5 || force) {
          await storageService.updateProgress(
              profileId, tmdbId, type, progressToSave, dur, season, episode,
              mediaDetails ? {
                  title: mediaDetails.title || mediaDetails.name,
                  poster_path: mediaDetails.poster_path,
                  backdrop_path: mediaDetails.backdrop_path,
                  vote_average: mediaDetails.vote_average
              } : { title: title }
          );
      }
  }, [profileId, tmdbId, type, season, episode, mediaDetails, title]);

  useEffect(() => {
      const interval = setInterval(() => saveProgress(), 10000); 
      return () => {
          clearInterval(interval);
          saveProgress(true);
      };
  }, [saveProgress]);

  useEffect(() => {
      if (!playing) saveProgress(true);
  }, [playing, saveProgress]);

  // --- INIT ---
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
    setShowSidePanel(false);
    
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
            // NOTIFY ANDROID APP
            if (window.Android && window.Android.onVideoPlaying) {
                try { window.Android.onVideoPlaying(src); } catch(e) {}
            }
        }).catch(() => setPlaying(false));
    };

    const handlePlaying = () => { setIsLoading(false); setPlaying(true); if(onPlayerStable) onPlayerStable(); };
    const handlePause = () => setPlaying(false);
    const handleError = () => {
        console.warn("Player Error, calling fallback");
        if(onErrorFallback) onErrorFallback();
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('waiting', () => setIsLoading(true));
    video.addEventListener('canplay', () => setIsLoading(false));
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

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
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('error', handleError);
    };
  }, [src]);

  // --- CONTROLS ---
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

  const resetControlsTimeout = useCallback(() => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (playing && !isLocked && !showSidePanel) {
          controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 4000);
      }
  }, [playing, isLocked, showSidePanel]);

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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      setVolume(vol);
      if (videoRef.current) videoRef.current.volume = vol;
      setVolumeIndicator(Math.round(vol * 100));
      setTimeout(() => setVolumeIndicator(null), 1000);
      resetControlsTimeout();
  };

  // --- CAST (TRANSMITIR) ---
  const handleCast = () => {
      // 1. Tenta Android Native Cast
      if (window.Android && window.Android.castVideo) {
          try {
              window.Android.castVideo(src, title || "Video");
              return;
          } catch(e) { console.error("Android Cast falhou", e); }
      }
      
      // 2. Fallback: Browser Alert (ou implementação futura de ChromeCast)
      alert("Para transmitir, use o ícone de transmissão do seu navegador ou do aplicativo nativo.");
  };

  const handleDownload = () => {
      if (isDownloading) return;
      setIsDownloading(true);
      
      // Lógica de download simplificada para brevidade, mantendo compatibilidade
      const safeTmdbId = tmdbId || 0;
      const safeType = type === 'tv' ? 'tv' : 'movie'; 
      const posterUrl = mediaDetails?.poster_path ? tmdb.getPosterUrl(mediaDetails.poster_path, 'w500') : '';
      const payload = {
          id: String(safeTmdbId), title: title || "Video", type: safeType,
          season: safeType === 'tv' ? (season || 0) : 0, episode: safeType === 'tv' ? (episode || 0) : 0,
          poster: posterUrl, backdrop: mediaDetails?.backdrop_path ? tmdb.getBackdropUrl(mediaDetails.backdrop_path, 'w780') : ''
      };

      try {
          if (window.Android && window.Android.download) {
              window.Android.download(src, JSON.stringify(payload));
              setTimeout(() => { onClose(); if(window.Android?.onPlayerClosed) window.Android.onPlayerClosed(); }, 1500);
          } else {
              const a = document.createElement('a'); a.href = src; a.target = '_blank'; a.download = title || 'video';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              setIsDownloading(false);
          }
      } catch (e) { setIsDownloading(false); }
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
      className="fixed inset-0 z-[9999] bg-black overflow-hidden select-none font-body group"
      onTouchEnd={handleTouchEnd}
      style={{ filter: `brightness(${brightness})` }}
    >
      <video
        ref={videoRef}
        className={`w-full h-full object-${fitMode} transition-all duration-300`}
        onTimeUpdate={() => { if(videoRef.current) setCurrentTime(videoRef.current.currentTime); }}
        playsInline
      />

      {/* GESTURE ANIMATIONS */}
      {doubleTapAnimation && (
          <div className={`absolute top-1/2 -translate-y-1/2 ${doubleTapAnimation === 'left' ? 'left-20' : 'right-20'} z-50 flex flex-col items-center pointer-events-none animate-ping-once`}>
               <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-2">
                   <span className="material-symbols-rounded text-white text-3xl">{doubleTapAnimation === 'left' ? 'replay_10' : 'forward_10'}</span>
               </div>
               <span className="text-white font-bold text-xs shadow-black drop-shadow-md">10s</span>
          </div>
      )}

      {/* VOLUME INDICATOR */}
      {volumeIndicator !== null && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md p-4 rounded-xl flex flex-col items-center animate-fade-in z-50">
              <span className="material-symbols-rounded text-white text-3xl mb-2">{volume > 0.5 ? 'volume_up' : volume > 0 ? 'volume_down' : 'volume_off'}</span>
              <div className="h-1 w-20 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${volumeIndicator}%` }}></div>
              </div>
          </div>
      )}

      {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div className="w-16 h-16 border-4 border-white/20 border-t-primary rounded-full animate-spin"></div>
          </div>
      )}

      {isLocked && (
          <button onClick={() => setIsLocked(false)} className="absolute top-10 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full flex items-center gap-2 z-50 animate-pulse">
              <span className="material-symbols-rounded text-white">lock</span>
              <span className="text-white text-xs font-bold uppercase">Destravar</span>
          </button>
      )}

      {/* SIDE PANEL (Episodes/Related) */}
      <div className={`absolute top-0 right-0 bottom-0 w-80 bg-[#121212]/95 backdrop-blur-xl border-l border-white/10 z-[60] transition-transform duration-300 transform ${showSidePanel ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">{type === 'tv' ? 'Episódios' : 'Recomendações'}</h3>
              <button onClick={() => setShowSidePanel(false)} className="text-white/50 hover:text-white"><span className="material-symbols-rounded">close</span></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {nextEpisode && (
                  <div onClick={() => { nextEpisode.onPlay(); setShowSidePanel(false); }} className="bg-primary/20 border border-primary/50 p-3 rounded-lg cursor-pointer hover:bg-primary/30 transition-colors">
                      <p className="text-primary text-xs font-bold uppercase mb-1">A Seguir</p>
                      <p className="text-white font-medium text-sm">{nextEpisode.title}</p>
                  </div>
              )}
              {recommendations?.map(item => (
                  <div key={item.id} onClick={() => { onPlayRelated && onPlayRelated(item); setShowSidePanel(false); }} className="flex gap-3 items-center cursor-pointer group">
                      <div className="w-20 aspect-video bg-gray-800 rounded overflow-hidden relative">
                          <img src={tmdb.getBackdropUrl(item.backdrop_path, 'w300')} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center"><span className="material-symbols-rounded text-white opacity-0 group-hover:opacity-100 text-xl drop-shadow-md">play_arrow</span></div>
                      </div>
                      <div className="flex-1">
                          <p className="text-white text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{item.title || (item as any).name}</p>
                          <p className="text-white/40 text-xs">{(item.vote_average || 0).toFixed(1)} ★</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* CONTROLS OVERLAY */}
      {!isLocked && (
        <div className={`absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'} flex flex-col justify-between z-40`}>
            
            {/* TOP BAR */}
            <div className="flex items-center justify-between p-4 pt-6 md:p-8">
                <div className="flex items-center gap-4">
                    <button onClick={handleClosePlayer} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-rounded text-white text-3xl">arrow_back</span>
                    </button>
                    <div className="max-w-[200px] md:max-w-md">
                        <h2 className="text-white font-bold text-base line-clamp-1 drop-shadow-md">{title}</h2>
                        {(season && episode) && <p className="text-white/60 text-xs">S{season}:E{episode}</p>}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* CAST BUTTON - RESTORED & PROMINENT */}
                    <button onClick={handleCast} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors" title="Transmitir">
                        <span className="material-symbols-rounded text-2xl">cast</span>
                    </button>
                    
                    <button onClick={handleDownload} className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isDownloading ? 'text-primary animate-pulse' : 'text-white hover:bg-white/10'}`}>
                        <span className="material-symbols-rounded text-2xl">download</span>
                    </button>
                    
                    <button onClick={() => setShowSidePanel(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white relative">
                        <span className="material-symbols-rounded text-2xl">playlist_play</span>
                        {nextEpisode && <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></div>}
                    </button>

                    <button onClick={() => setIsLocked(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white">
                        <span className="material-symbols-rounded text-2xl">lock_open</span>
                    </button>
                </div>
            </div>

            {/* SIDE SLIDERS (Desktop/Large Screens) */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 h-32 w-1.5 bg-white/20 rounded-full hidden md:block group/brightness">
                <div className="absolute bottom-0 left-0 w-full bg-white rounded-full transition-all" style={{ height: `${brightness * 50}%` }}></div>
                <input type="range" min="0.5" max="1.5" step="0.1" value={brightness} onChange={(e) => setBrightness(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-white/0 group-hover/brightness:text-white/80 text-xs font-bold transition-opacity material-symbols-rounded">brightness_6</span>
            </div>

            <div className="absolute right-4 top-1/2 -translate-y-1/2 h-32 w-1.5 bg-white/20 rounded-full hidden md:block group/volume">
                <div className="absolute bottom-0 left-0 w-full bg-primary rounded-full transition-all" style={{ height: `${volume * 100}%` }}></div>
                <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolumeChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-white/0 group-hover/volume:text-white/80 text-xs font-bold transition-opacity material-symbols-rounded">volume_up</span>
            </div>

            {/* CENTER CONTROLS */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8 pointer-events-auto">
                <button onClick={() => skip(-10)} className="text-white/70 hover:text-white transition-transform hover:scale-110 active:scale-95"><span className="material-symbols-rounded text-5xl">replay_10</span></button>
                
                {!isLoading ? (
                    <button onClick={togglePlay} className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-all hover:scale-110 active:scale-95 group">
                        <span className="material-symbols-rounded text-6xl text-white fill-1 ml-1">{playing ? 'pause' : 'play_arrow'}</span>
                    </button>
                ) : (
                    <div className="w-20 h-20 flex items-center justify-center"><div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div></div>
                )}

                <button onClick={() => skip(10)} className="text-white/70 hover:text-white transition-transform hover:scale-110 active:scale-95"><span className="material-symbols-rounded text-5xl">forward_10</span></button>
            </div>

            {/* BOTTOM BAR */}
            <div className="p-4 pb-8 md:p-8 pointer-events-auto bg-gradient-to-t from-black/90 to-transparent">
                <div className="flex items-center justify-between text-xs font-bold text-white/80 mb-3 px-1 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
                
                {/* SEEKBAR */}
                <div className="relative h-6 group flex items-center cursor-pointer mb-2">
                    <input 
                        type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} 
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                    />
                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative group-hover:h-1.5 transition-all">
                         <div className="h-full bg-gradient-to-r from-primary to-purple-500 relative transition-all shadow-[0_0_10px_#f20df2]" style={{ width: `${(currentTime / duration) * 100}%` }}>
                             <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover:scale-150 transition-transform"></div>
                         </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setFitMode(prev => prev === 'contain' ? 'cover' : 'contain')} className="text-white/70 hover:text-white flex items-center gap-1 text-xs font-bold bg-white/5 px-2 py-1 rounded hover:bg-white/10 transition-colors">
                            <span className="material-symbols-rounded text-sm">{fitMode === 'contain' ? 'fit_screen' : 'crop_free'}</span>
                            <span className="hidden sm:inline">Aspecto</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-4 relative">
                        <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="text-white font-bold text-xs hover:text-primary transition-colors flex items-center gap-1">
                            {playbackSpeed}x <span className="material-symbols-rounded text-sm">speed</span>
                        </button>
                        
                        {showSpeedMenu && (
                            <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden w-20 animate-fade-in-up shadow-xl z-50">
                                {[0.5, 1.0, 1.25, 1.5, 2.0].map(s => (
                                    <button key={s} onClick={() => { if(videoRef.current) videoRef.current.playbackRate = s; setPlaybackSpeed(s); setShowSpeedMenu(false); }} className={`block w-full py-2 hover:bg-white/10 text-xs font-bold ${playbackSpeed === s ? 'text-primary' : 'text-white'}`}>
                                        {s}x
                                    </button>
                                ))}
                            </div>
                        )}

                        <button onClick={() => { if (!document.fullscreenElement) containerRef.current?.requestFullscreen(); else document.exitFullscreen(); }} className="text-white hover:text-white/80 transition-transform active:scale-90">
                            <span className="material-symbols-rounded text-2xl">fullscreen</span>
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
