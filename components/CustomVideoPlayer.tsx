
import React, { useRef, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { tmdb } from '../services/tmdbService';
import { Movie, Episode } from '../types';

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
    src, onClose, onErrorFallback, onPlayerStable, title = "Reproduzindo",
    profileId, tmdbId, type, season, episode, initialTime = 0,
    nextEpisode, recommendations, onPlayRelated
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);
  
  // States
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  
  // Volume & Brightness (Visuals)
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [gestureIndicator, setGestureIndicator] = useState<{ type: 'volume' | 'brightness', value: number } | null>(null);

  // Data
  const [seasonEpisodes, setSeasonEpisodes] = useState<Episode[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Refs
  const controlsTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  // --- LOGIC ---
  const handleDownload = () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const meta = JSON.stringify({
        id: String(tmdbId || 0),
        title: title || "Download",
        type: type || 'movie',
        season: season || 0,
        episode: episode || 0,
    });
    
    if (window.Android?.download) {
        window.Android.download(src, meta);
        setTimeout(() => { onClose(); if(window.Android?.onPlayerClosed) window.Android.onPlayerClosed(); }, 1000);
    } else {
        const a = document.createElement('a'); a.href = src; a.download = title || 'video.mp4';
        a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setIsDownloading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
        if (type === 'tv' && season && tmdbId) {
            try {
                const eps = await tmdb.getTVSeason(String(tmdbId), season);
                setSeasonEpisodes(eps);
            } catch(e) {}
        }
    };
    loadData();
  }, [tmdbId, type, season]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setHasResumed(false);
    
    // HLS Support Check
    const isHls = src.includes('.m3u8') || src.includes('.txt');

    const attemptResume = () => {
        if (!hasResumed && initialTime > 10) {
            video.currentTime = initialTime;
            setHasResumed(true);
        }
    };

    if (isHls && window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            attemptResume();
            video.play().catch(() => {});
        });
        hls.on(window.Hls.Events.ERROR, (_e: any, data: any) => {
            if(data.fatal) {
               if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
               else onErrorFallback(); 
            }
        });
    } else {
        video.src = src;
        video.load();
    }

    const onPlay = () => { 
        setPlaying(true); 
        setIsLoading(false);
        if (onPlayerStable) onPlayerStable();
        try { if(window.Android?.onVideoPlaying) window.Android.onVideoPlaying(src); } catch(e){}
    };
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
        setCurrentTime(video.currentTime);
        setDuration(video.duration || 0);
        // Show Skip Intro for first 5 mins
        setShowSkipIntro(video.currentTime > 30 && video.currentTime < 300);
    };
    const onLoadedMetadata = () => {
        setDuration(video.duration);
        attemptResume();
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', () => setIsLoading(true));
    video.addEventListener('playing', () => setIsLoading(false));
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
        if (hlsRef.current) hlsRef.current.destroy();
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [src]);

  // Save Progress
  useEffect(() => {
      const interval = setInterval(() => {
          if (videoRef.current && playing && profileId && tmdbId && videoRef.current.currentTime > 5) {
              storageService.updateProgress(
                  profileId, tmdbId, type || 'movie', 
                  videoRef.current.currentTime, 
                  videoRef.current.duration,
                  season, episode, { title }
              );
          }
      }, 5000); 
      return () => clearInterval(interval);
  }, [playing, profileId, tmdbId]);

  // Controls Visibility
  const showControlsTemporarily = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (!isLocked && playing && !showSidePanel) {
          controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 3500);
      }
  };

  useEffect(() => {
      showControlsTemporarily();
      const onInt = () => showControlsTemporarily();
      window.addEventListener('mousemove', onInt);
      window.addEventListener('touchstart', onInt);
      return () => {
          window.removeEventListener('mousemove', onInt);
          window.removeEventListener('touchstart', onInt);
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      };
  }, [playing, isLocked, showSidePanel]);

  // Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
      if (isLocked) return;
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartRef.current || isLocked) return;
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      
      // Vertical Gesture (Vol/Bright)
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
          const delta = dy / window.innerHeight;
          if (touchStartRef.current.x < window.innerWidth / 2) {
              let newB = brightness - delta * 1.5;
              newB = Math.max(0.2, Math.min(1.5, newB));
              setBrightness(newB);
              setGestureIndicator({ type: 'brightness', value: newB });
          } else {
              let newV = volume - delta * 1.5;
              newV = Math.max(0, Math.min(1, newV));
              setVolume(newV);
              if (videoRef.current) videoRef.current.volume = newV;
              setGestureIndicator({ type: 'volume', value: newV });
          }
          touchStartRef.current.y = e.touches[0].clientY;
      }
  };

  const handleTouchEnd = () => setGestureIndicator(null);

  const seek = (seconds: number) => {
      if (videoRef.current) {
          videoRef.current.currentTime += seconds;
          showControlsTemporarily();
      }
  };

  const formatTime = (t: number) => {
      if (!t) return "0:00";
      const m = Math.floor((t % 3600) / 60);
      const s = Math.floor(t % 60);
      return `${m}:${s.toString().padStart(2,'0')}`;
  };

  return (
    <div 
        ref={containerRef}
        className="fixed inset-0 z-[9999] bg-black text-white font-body select-none overflow-hidden"
        style={{ filter: `brightness(${brightness})` }}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
    >
        <video ref={videoRef} className={`w-full h-full object-${fitMode} transition-all duration-300`} playsInline />

        {/* LOADING */}
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 bg-black/20 backdrop-blur-sm">
                 <div className="w-16 h-16 border-4 border-white/20 border-t-primary rounded-full animate-spin shadow-lg"></div>
            </div>
        )}

        {/* GESTURE INDICATOR (IOS STYLE) */}
        {gestureIndicator && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-xl rounded-2xl p-6 flex flex-col items-center gap-4 animate-fade-in z-50 border border-white/20 shadow-2xl">
                <span className="material-symbols-rounded text-4xl text-white drop-shadow-md">
                    {gestureIndicator.type === 'volume' ? 'volume_up' : 'brightness_6'}
                </span>
                <div className="w-2 h-32 bg-white/20 rounded-full overflow-hidden relative">
                    <div className="absolute bottom-0 w-full bg-white transition-all duration-75" style={{ height: `${(gestureIndicator.type === 'brightness' ? (gestureIndicator.value - 0.2)/(1.3) : gestureIndicator.value) * 100}%` }}></div>
                </div>
            </div>
        )}

        {/* SKIP INTRO BUTTON */}
        {showSkipIntro && !isLocked && (
            <button 
                onClick={(e) => { e.stopPropagation(); seek(85); }}
                className="absolute bottom-24 right-6 z-50 bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all animate-slide-up"
            >
                Pular Abertura
                <span className="material-symbols-rounded text-lg">skip_next</span>
            </button>
        )}

        {/* CONTROLS UI */}
        {!isLocked && (
            <div className={`absolute inset-0 z-40 flex flex-col justify-between transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                
                {/* HEADER */}
                <div className="p-4 pt-6 bg-gradient-to-b from-black/90 to-transparent flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-md">
                            <span className="material-symbols-rounded text-white">arrow_back</span>
                        </button>
                        <div>
                            <h2 className="text-sm font-bold text-white drop-shadow-md">{title}</h2>
                            {type === 'tv' && <p className="text-xs text-white/70 font-medium">S{season} E{episode}</p>}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowSidePanel(true)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-md">
                             <span className="material-symbols-rounded">playlist_play</span>
                        </button>
                        <button onClick={() => setIsLocked(true)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-md">
                             <span className="material-symbols-rounded">lock_open</span>
                        </button>
                    </div>
                </div>

                {/* CENTER PLAY */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="flex items-center gap-12 pointer-events-auto">
                        <button onClick={() => seek(-10)} className="p-4 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors">
                            <span className="material-symbols-rounded text-5xl">replay_10</span>
                        </button>
                        <button onClick={() => playing ? videoRef.current?.pause() : videoRef.current?.play()} className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:scale-110 hover:bg-primary transition-all shadow-2xl">
                            <span className="material-symbols-rounded text-6xl fill-1 ml-1">{playing ? 'pause' : 'play_arrow'}</span>
                        </button>
                        <button onClick={() => seek(10)} className="p-4 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors">
                            <span className="material-symbols-rounded text-5xl">forward_10</span>
                        </button>
                     </div>
                </div>

                {/* BOTTOM FLOATING BAR */}
                <div className="p-4 md:p-8 bg-gradient-to-t from-black/90 to-transparent">
                     <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl max-w-4xl mx-auto w-full">
                         {/* TIME SLIDER */}
                         <div className="flex items-center gap-4 mb-2 text-xs font-bold text-white/70 font-mono">
                             <span>{formatTime(currentTime)}</span>
                             <div className="relative flex-1 h-1.5 group cursor-pointer">
                                 <input 
                                    type="range" min="0" max={duration || 100} step="0.1" 
                                    value={currentTime} 
                                    onChange={(e) => { if(videoRef.current) videoRef.current.currentTime = Number(e.target.value); setCurrentTime(Number(e.target.value)); }} 
                                    className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer" 
                                 />
                                 <div className="w-full h-full bg-white/20 rounded-full overflow-hidden">
                                     <div className="h-full bg-primary relative transition-all" style={{ width: `${(currentTime / duration) * 100}%` }}>
                                         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"></div>
                                     </div>
                                 </div>
                             </div>
                             <span>{formatTime(duration)}</span>
                         </div>

                         {/* ACTIONS ROW */}
                         <div className="flex justify-between items-center mt-2">
                             <div className="flex gap-4">
                                 <button onClick={() => setFitMode(f => f === 'contain' ? 'cover' : 'contain')} className="text-xs font-bold flex items-center gap-1 hover:text-primary transition-colors">
                                     <span className="material-symbols-rounded text-lg">{fitMode === 'contain' ? 'fit_screen' : 'crop_free'}</span> Aspecto
                                 </button>
                                 <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="text-xs font-bold flex items-center gap-1 hover:text-primary transition-colors relative">
                                     {playbackSpeed}x Velocidade
                                     {showSpeedMenu && (
                                         <div className="absolute bottom-full left-0 mb-2 bg-black/90 border border-white/10 rounded-lg p-1">
                                             {[0.5, 1.0, 1.25, 1.5, 2.0].map(s => (
                                                 <div key={s} onClick={() => { if(videoRef.current) videoRef.current.playbackRate = s; setPlaybackSpeed(s); }} className="px-3 py-1 hover:bg-white/20 rounded text-center">{s}x</div>
                                             ))}
                                         </div>
                                     )}
                                 </button>
                             </div>
                             
                             <div className="flex gap-4">
                                  {nextEpisode && (duration - currentTime < 180) && (
                                      <button onClick={nextEpisode.onPlay} className="flex items-center gap-2 bg-white text-black px-3 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition-transform animate-pulse">
                                          Próximo Ep <span className="material-symbols-rounded text-base">skip_next</span>
                                      </button>
                                  )}
                                  <button onClick={handleDownload} className={`hover:text-primary transition-colors ${isDownloading ? 'text-primary animate-pulse' : ''}`}>
                                      <span className="material-symbols-rounded">download</span>
                                  </button>
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        )}

        {/* LOCKED OVERLAY */}
        {isLocked && (
             <button onClick={() => setIsLocked(false)} className="absolute top-12 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-2.5 rounded-full flex items-center gap-2 z-50 animate-pulse pointer-events-auto shadow-lg">
                 <span className="material-symbols-rounded text-white fill-1">lock</span>
                 <span className="text-white text-xs font-bold uppercase tracking-wider">Desbloquear</span>
             </button>
        )}
        
        {/* SIDE PANEL (Episodes) */}
        <div className={`absolute top-0 right-0 h-full w-80 bg-[#121212]/95 backdrop-blur-2xl border-l border-white/10 z-[60] transform transition-transform duration-300 ${showSidePanel ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
             <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
                 <h3 className="font-bold">Episódios</h3>
                 <button onClick={() => setShowSidePanel(false)}><span className="material-symbols-rounded">close</span></button>
             </div>
             <div className="flex-1 overflow-y-auto p-2 space-y-2">
                 {type === 'tv' ? seasonEpisodes.map(ep => (
                     <div key={ep.id} onClick={() => { if(onPlayRelated) onPlayRelated({ id: Number(tmdbId), media_type:'tv', title:'', episode_number: ep.episode_number } as any); setShowSidePanel(false); }} className={`p-2 flex gap-3 rounded-lg hover:bg-white/5 cursor-pointer ${ep.episode_number === episode ? 'bg-primary/20 border border-primary/30' : ''}`}>
                         <div className="w-24 aspect-video bg-black rounded overflow-hidden relative">
                             {ep.still_path ? <img src={tmdb.getBackdropUrl(ep.still_path, 'w300')} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-white/5"></div>}
                             {ep.episode_number === episode && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="material-symbols-rounded text-primary animate-bounce">equalizer</span></div>}
                         </div>
                         <div className="flex-1 min-w-0 flex flex-col justify-center">
                             <p className={`text-sm font-bold truncate ${ep.episode_number === episode ? 'text-primary' : 'text-white'}`}>{ep.episode_number}. {ep.name}</p>
                             <p className="text-xs text-white/40">{ep.runtime || 24} min</p>
                         </div>
                     </div>
                 )) : (
                     <div className="p-4 text-center text-white/30 text-sm">Lista de episódios apenas para séries.</div>
                 )}
             </div>
        </div>

    </div>
  );
};

export default CustomVideoPlayer;
