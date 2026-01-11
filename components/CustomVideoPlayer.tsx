
import React, { useRef, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { tmdb } from '../services/tmdbService';
import { subtitleService } from '../services/subtitleService';
import { Movie, Episode, SubtitleCue, SubtitleResult } from '../types';
import Hls from 'hls.js';

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
  const hlsRef = useRef<Hls | null>(null);
  
  // Player States
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showUnlockButton, setShowUnlockButton] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [errorStatus, setErrorStatus] = useState<string>("");
  
  // Subtitle States
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string>("");
  const [isSubtitleEnabled, setIsSubtitleEnabled] = useState(false);
  const [subtitleOffset, setSubtitleOffset] = useState(0);
  const [showSubtitleModal, setShowSubtitleModal] = useState(false);
  const [subtitleSearchResults, setSubtitleSearchResults] = useState<SubtitleResult[]>([]);
  const [isSearchingSubs, setIsSearchingSubs] = useState(false);
  
  // Data
  const [seasonEpisodes, setSeasonEpisodes] = useState<Episode[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Volume & Brightness
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [gestureIndicator, setGestureIndicator] = useState<{ type: 'volume' | 'brightness', value: number } | null>(null);

  // Refs
  const controlsTimeoutRef = useRef<number | null>(null);
  const lockTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  // --- NATIVE BRIDGE LIFECYCLE ---
  useEffect(() => {
      if (window.Android) {
          try {
              if (window.Android.setOrientation) window.Android.setOrientation('landscape');
              if (window.Android.stopSniffer) window.Android.stopSniffer(); 
          } catch(e) { console.error("Erro na bridge nativa (mount):", e); }
      }

      return () => {
          if (window.Android) {
              try {
                  if (window.Android.setOrientation) window.Android.setOrientation('portrait');
                  if (window.Android.startSniffer) window.Android.startSniffer();
                  if (window.Android.onPlayerClosed) window.Android.onPlayerClosed();
              } catch(e) { console.error("Erro na bridge nativa (unmount):", e); }
          }
      };
  }, []);

  // --- CONTROLS VISIBILITY ---
  const showControlsTemporarily = () => {
      if (isLocked) {
          setShowUnlockButton(true);
          if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
          lockTimeoutRef.current = window.setTimeout(() => setShowUnlockButton(false), 2500);
          return;
      }

      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (playing && !showSidePanel && !showSubtitleModal) {
          controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 2500);
      }
  };

  useEffect(() => {
      showControlsTemporarily();
      const onInt = () => showControlsTemporarily();
      window.addEventListener('mousemove', onInt);
      window.addEventListener('touchstart', onInt);
      window.addEventListener('click', onInt);
      
      return () => {
          window.removeEventListener('mousemove', onInt);
          window.removeEventListener('touchstart', onInt);
          window.removeEventListener('click', onInt);
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
          if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
      };
  }, [playing, isLocked, showSidePanel, showSubtitleModal]);

  // --- DATA LOADING ---
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
  }, [tmdbId, type, season, episode]);

  // --- HLS VIDEO SETUP ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setErrorStatus("");
    setHasResumed(false);
    
    // Suporte explícito a .txt como master playlist (comum em servidores de sniffer)
    const isTxtHls = src.includes('.txt') || src.includes('master.txt');
    const isStandardHls = src.includes('.m3u8') || src.includes('/hls/');
    const shouldUseHlsJs = isTxtHls || isStandardHls;

    const attemptResume = () => {
        if (!hasResumed && initialTime > 10) {
            video.currentTime = initialTime;
            setHasResumed(true);
        }
    };

    const handleHlsError = (event: any, data: any) => {
        // Ignora erros não fatais
        if (!data.fatal) return;

        console.warn(`⚠️ HLS Fatal Error: ${data.type}`);
        
        const tryRecover = () => {
            if (retryCount < 4) { // Aumentado para 4 tentativas (Modo agressivo)
                setRetryCount(prev => prev + 1);
                console.log(`🔄 Tentando reconectar (Tentativa ${retryCount + 1})...`);
                
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    setErrorStatus("Reconectando (CORS Bypass)...");
                    hlsRef.current?.startLoad();
                } else {
                    hlsRef.current?.recoverMediaError();
                }
            } else {
                setErrorStatus("Falha Crítica. Tentando Embed...");
                onErrorFallback();
            }
        };

        switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
                tryRecover();
                break;
            case Hls.ErrorTypes.MEDIA_ERROR:
                hlsRef.current?.recoverMediaError();
                break;
            default:
                // Tenta reinicializar do zero
                hlsRef.current?.destroy();
                initHls(); 
                break;
        }
    };

    const initHls = () => {
        if (Hls.isSupported() && shouldUseHlsJs) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                // Buffer mais agressivo para .txt/hls instáveis
                maxBufferLength: 60, 
                maxMaxBufferLength: 600,
                startLevel: -1, 
                // Timeouts rápidos para falhar logo e tentar outro método se necessário
                manifestLoadingTimeOut: 15000, 
                manifestLoadingMaxRetry: 4,
                levelLoadingMaxRetry: 4,
                fragLoadingMaxRetry: 4,
                // Tenta forçar xhr com credenciais se falhar (às vezes ajuda com CORS)
                xhrSetup: (xhr, url) => {
                    if (isTxtHls && retryCount > 1) {
                        xhr.withCredentials = false; // Alterna comportamento na tentativa 2+
                    }
                }
            });

            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log("✅ HLS Manifest Parsed");
                setErrorStatus("");
                attemptResume();
                video.play().catch(e => console.log("Autoplay blocked:", e));
            });

            hls.on(Hls.Events.ERROR, handleHlsError);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari / Native HLS
            video.src = src;
            video.addEventListener('loadedmetadata', attemptResume);
            video.play().catch(() => {});
        } else {
            // Direct file (mp4, mkv) ou navegador sem suporte HLS
            video.src = src;
            video.load();
            video.play().catch(() => {});
        }
    };

    initHls();

    const onPlay = () => { 
        setPlaying(true); 
        setIsLoading(false);
        setErrorStatus("");
        if (onPlayerStable) onPlayerStable();
        try { if(window.Android?.onVideoPlaying) window.Android.onVideoPlaying(src); } catch(e){}
    };
    const onPause = () => setPlaying(false);
    
    const onTimeUpdate = () => {
        const time = video.currentTime;
        setCurrentTime(time);
        if(video.duration) setDuration(video.duration);

        if (isSubtitleEnabled && subtitles.length > 0) {
            const adjustedTime = time + subtitleOffset;
            const currentCue = subtitles.find(cue => adjustedTime >= cue.start && adjustedTime <= cue.end);
            setActiveSubtitle(currentCue ? currentCue.text : "");
        } else {
            setActiveSubtitle("");
        }
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
        if (hlsRef.current) {
            hlsRef.current.destroy();
        }
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        setRetryCount(0);
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

  const handleTouchStart = (e: React.TouchEvent) => {
      if (isLocked) {
          showControlsTemporarily();
          return;
      }
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartRef.current || isLocked) return;
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      
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
      if (!t || isNaN(t)) return "0:00";
      const m = Math.floor((t % 3600) / 60);
      const s = Math.floor(t % 60);
      const h = Math.floor(t / 3600);
      if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
      return `${m}:${s.toString().padStart(2,'0')}`;
  };

  // --- SUBTITLE HANDLERS ---
  const handleSearchSubtitles = async () => {
      if (!tmdbId) return;
      setIsSearchingSubs(true);
      try {
          const results = await subtitleService.searchSubtitles(tmdbId, season, episode);
          setSubtitleSearchResults(results);
      } catch (e) {
          console.error(e);
      } finally {
          setIsSearchingSubs(false);
      }
  };

  const handleSelectSubtitle = async (url: string) => {
      setIsSearchingSubs(true);
      try {
          const cues = await subtitleService.parseSubtitle(url);
          setSubtitles(cues);
          setIsSubtitleEnabled(true);
          setShowSubtitleModal(false);
      } catch (e) {
          alert("Erro ao carregar legenda");
      } finally {
          setIsSearchingSubs(false);
      }
  };

  const handleDownload = () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const meta = JSON.stringify({ id: String(tmdbId || 0), title: title, type: type, season: season, episode: episode });
    if (window.Android?.download) { window.Android.download(src, meta); setTimeout(onClose, 1000); }
    else { setIsDownloading(false); alert("Download disponível no App Android"); }
  };

  const handleCast = () => {
      if (window.Android?.castVideo) window.Android.castVideo(src, title);
      else alert("Transmitir disponível no App Android");
  };

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().catch(console.log);
          if (window.Android?.setOrientation) window.Android.setOrientation('landscape');
      } else {
          document.exitFullscreen();
      }
  };

  return (
    <div 
        ref={containerRef}
        className="fixed inset-0 z-[9999] bg-black text-white font-body select-none overflow-hidden"
        style={{ filter: `brightness(${brightness})` }}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
    >
        <video 
            ref={videoRef} 
            className={`w-full h-full object-${fitMode} transition-all duration-300`} 
            playsInline 
            crossOrigin="anonymous" // Ajuda com alguns problemas de CORS
        />

        {/* SUBTITLE OVERLAY */}
        {isSubtitleEnabled && activeSubtitle && (
            <div className="absolute bottom-20 md:bottom-24 left-0 w-full flex justify-center z-10 px-8 pointer-events-none">
                <div className="bg-black/60 text-[#ffff00] text-center px-4 py-2 rounded-lg text-lg md:text-xl font-medium drop-shadow-md backdrop-blur-sm leading-tight max-w-[80%] whitespace-pre-line animate-fade-in-up">
                    {activeSubtitle}
                </div>
            </div>
        )}

        {/* LOADING & ERROR */}
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 bg-black/40 backdrop-blur-sm animate-fade-in">
                 <div className="flex flex-col items-center gap-4">
                     <div className="w-16 h-16 border-4 border-white/10 border-t-primary rounded-full animate-spin shadow-[0_0_30px_rgba(242,13,242,0.4)]"></div>
                     <p className="text-white/60 text-xs font-bold tracking-[0.2em] animate-pulse">
                         {errorStatus || "CARREGANDO"}
                     </p>
                     {retryCount > 0 && <p className="text-yellow-400 text-xs font-mono">Tentativa {retryCount}/4</p>}
                 </div>
            </div>
        )}

        {/* GESTURE INDICATOR */}
        {gestureIndicator && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-xl rounded-3xl p-8 flex flex-col items-center gap-6 animate-fade-in z-50 border border-white/10 shadow-2xl">
                <span className="material-symbols-rounded text-5xl text-white drop-shadow-md">
                    {gestureIndicator.type === 'volume' ? 'volume_up' : 'brightness_6'}
                </span>
                <div className="w-1.5 h-32 bg-white/20 rounded-full overflow-hidden relative">
                    <div className="absolute bottom-0 w-full bg-white transition-all duration-75 shadow-[0_0_10px_white]" style={{ height: `${(gestureIndicator.type === 'brightness' ? (gestureIndicator.value - 0.2)/(1.3) : gestureIndicator.value) * 100}%` }}></div>
                </div>
            </div>
        )}

        {/* LOCKED OVERLAY */}
        {isLocked && (
             <div className={`absolute top-12 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-300 ${showUnlockButton ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                 <button onClick={() => setIsLocked(false)} className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-3 rounded-full flex items-center gap-3 shadow-2xl hover:bg-white/20 transition-colors">
                     <span className="material-symbols-rounded text-white fill-1">lock</span>
                     <span className="text-white text-xs font-bold uppercase tracking-wider">Toque para Desbloquear</span>
                 </button>
             </div>
        )}

        {/* CONTROLS UI */}
        {!isLocked && (
            <div className={`absolute inset-0 z-40 flex flex-col justify-between transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                
                {/* HEADER */}
                <div className="p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center transition-all backdrop-blur-md group">
                            <span className="material-symbols-rounded text-white group-hover:-translate-x-1 transition-transform">arrow_back</span>
                        </button>
                        <div>
                            <h2 className="text-base font-bold text-white drop-shadow-md line-clamp-1">{title}</h2>
                            {type === 'tv' && <p className="text-xs text-white/70 font-medium tracking-wide">TEMPORADA {season} • EPISÓDIO {episode}</p>}
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        {/* CC Button */}
                        <button onClick={() => { setShowSubtitleModal(true); handleSearchSubtitles(); }} className={`w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center transition-all backdrop-blur-md ${isSubtitleEnabled ? 'text-primary border-primary/50' : 'text-white'}`}>
                             <span className="material-symbols-rounded">closed_caption</span>
                        </button>
                        
                        <button onClick={handleCast} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center transition-all backdrop-blur-md">
                             <span className="material-symbols-rounded">cast</span>
                        </button>
                        <button onClick={() => setShowSidePanel(true)} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center transition-all backdrop-blur-md relative">
                             <span className="material-symbols-rounded">playlist_play</span>
                        </button>
                        <button onClick={() => setIsLocked(true)} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center transition-all backdrop-blur-md">
                             <span className="material-symbols-rounded">lock_open</span>
                        </button>
                    </div>
                </div>

                {/* CENTER PLAY */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="flex items-center gap-16 pointer-events-auto">
                        <button onClick={() => seek(-10)} className="p-6 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-all transform hover:scale-110">
                            <span className="material-symbols-rounded text-6xl">replay_10</span>
                        </button>
                        
                        <button onClick={() => playing ? videoRef.current?.pause() : videoRef.current?.play()} className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:scale-110 hover:bg-primary hover:border-primary transition-all shadow-[0_0_40px_rgba(0,0,0,0.5)] group">
                            <span className="material-symbols-rounded text-7xl fill-1 ml-1 text-white group-hover:text-black transition-colors">{playing ? 'pause' : 'play_arrow'}</span>
                        </button>
                        
                        <button onClick={() => seek(10)} className="p-6 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-all transform hover:scale-110">
                            <span className="material-symbols-rounded text-6xl">forward_10</span>
                        </button>
                     </div>
                </div>

                {/* BOTTOM FLOATING BAR */}
                <div className="p-4 md:p-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                     <div className="bg-[#0f0f0f]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl max-w-5xl mx-auto w-full relative overflow-hidden">
                         
                         {/* TIME SLIDER */}
                         <div className="flex items-center gap-4 mb-4 text-xs font-bold text-white/70 font-mono">
                             <span>{formatTime(currentTime)}</span>
                             <div className="relative flex-1 h-1.5 group cursor-pointer">
                                 <input 
                                    type="range" min="0" max={duration || 100} step="0.1" 
                                    value={currentTime} 
                                    onChange={(e) => { if(videoRef.current) videoRef.current.currentTime = Number(e.target.value); setCurrentTime(Number(e.target.value)); }} 
                                    className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer" 
                                 />
                                 <div className="w-full h-full bg-white/10 rounded-full overflow-hidden">
                                     <div className="h-full bg-gradient-to-r from-primary to-purple-500 relative transition-all shadow-[0_0_15px_#f20df2]" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}>
                                         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform border-2 border-primary"></div>
                                     </div>
                                 </div>
                             </div>
                             <span>{formatTime(duration)}</span>
                         </div>

                         {/* ACTIONS ROW */}
                         <div className="flex justify-between items-center">
                             <div className="flex gap-2">
                                 <button onClick={() => setFitMode(f => f === 'contain' ? 'cover' : 'contain')} className="h-10 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold flex items-center gap-2 hover:text-white transition-colors">
                                     <span className="material-symbols-rounded text-lg">{fitMode === 'contain' ? 'fit_screen' : 'crop_free'}</span> Aspecto
                                 </button>
                                 <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="h-10 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold flex items-center gap-2 hover:text-white transition-colors relative">
                                     <span className="material-symbols-rounded text-lg">slow_motion_video</span> {playbackSpeed}x
                                     {showSpeedMenu && (
                                         <div className="absolute bottom-full left-0 mb-3 bg-[#1a1a1a] border border-white/10 rounded-xl p-1 shadow-xl flex flex-col gap-1 w-24 overflow-hidden">
                                             {[0.5, 1.0, 1.25, 1.5, 2.0].map(s => (
                                                 <div key={s} onClick={() => { if(videoRef.current) videoRef.current.playbackRate = s; setPlaybackSpeed(s); }} className={`px-3 py-2 hover:bg-white/10 rounded-lg text-center text-xs font-bold ${playbackSpeed === s ? 'text-primary bg-white/5' : 'text-white'}`}>{s}x</div>
                                             ))}
                                         </div>
                                     )}
                                 </button>
                             </div>
                             
                             <div className="flex gap-3">
                                  {nextEpisode && (duration - currentTime < 180) && (
                                      <button onClick={nextEpisode.onPlay} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-xs font-bold hover:scale-105 transition-transform animate-pulse shadow-lg">
                                          Próximo Ep <span className="material-symbols-rounded text-base">skip_next</span>
                                      </button>
                                  )}
                                  <button onClick={handleDownload} className={`w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors ${isDownloading ? 'text-primary animate-pulse' : 'text-white/70 hover:text-white'}`}>
                                      <span className="material-symbols-rounded">download</span>
                                  </button>
                                  <button onClick={toggleFullscreen} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                                      <span className="material-symbols-rounded">fullscreen</span>
                                  </button>
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        )}
        
        {/* SIDE PANEL (Episodes) */}
        <div className={`absolute top-0 right-0 h-full w-96 bg-[#0f0f0f]/95 backdrop-blur-2xl border-l border-white/10 z-[60] transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${showSidePanel ? 'translate-x-0' : 'translate-x-full'} flex flex-col shadow-2xl`}>
             <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                 <h3 className="font-display font-bold text-lg text-white">Episódios</h3>
                 <button onClick={() => setShowSidePanel(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"><span className="material-symbols-rounded">close</span></button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                 {type === 'tv' ? seasonEpisodes.map(ep => (
                     <div key={ep.id} onClick={() => { if(onPlayRelated) onPlayRelated({ id: Number(tmdbId), media_type:'tv', title:'', episode_number: ep.episode_number } as any); setShowSidePanel(false); }} className={`p-3 flex gap-4 rounded-xl hover:bg-white/5 cursor-pointer transition-all border ${ep.episode_number === episode ? 'bg-primary/10 border-primary/50' : 'border-transparent hover:border-white/10'}`}>
                         <div className="w-32 aspect-video bg-black rounded-lg overflow-hidden relative shadow-lg">
                             {ep.still_path ? <img src={tmdb.getBackdropUrl(ep.still_path, 'w300')} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-white/5"></div>}
                             {ep.episode_number === episode && (
                                 <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
                                     <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                         <span className="material-symbols-rounded text-white text-sm fill-1">play_arrow</span>
                                     </div>
                                 </div>
                             )}
                         </div>
                         <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                             <p className={`text-sm font-bold truncate leading-tight ${ep.episode_number === episode ? 'text-primary' : 'text-white'}`}>{ep.episode_number}. {ep.name}</p>
                             <p className="text-[10px] text-white/40 font-medium uppercase tracking-wide">{ep.runtime || 24} MIN</p>
                         </div>
                     </div>
                 )) : (
                     <div className="p-8 text-center text-white/30 text-sm flex flex-col items-center gap-4">
                         <span className="material-symbols-rounded text-4xl">movie</span>
                         Lista de episódios disponível apenas para séries.
                     </div>
                 )}
             </div>
        </div>

        {/* SUBTITLE MODAL */}
        {showSubtitleModal && (
            <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h2 className="text-xl font-display font-bold text-white">Legendas</h2>
                        <button onClick={() => setShowSubtitleModal(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center"><span className="material-symbols-rounded">close</span></button>
                    </div>
                    
                    <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                        
                        {/* Toggle */}
                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                            <span className="font-bold text-sm">Exibir Legendas</span>
                            <div 
                                onClick={() => setIsSubtitleEnabled(!isSubtitleEnabled)}
                                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${isSubtitleEnabled ? 'bg-primary' : 'bg-white/20'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isSubtitleEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                        </div>

                        {/* Sync Control */}
                        <div>
                            <p className="text-xs font-bold text-white/50 uppercase mb-3 tracking-wide">Sincronização</p>
                            <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/5">
                                <button onClick={() => setSubtitleOffset(prev => prev - 0.5)} className="p-2 hover:bg-white/10 rounded-lg"><span className="material-symbols-rounded">remove</span></button>
                                <div className="flex-1 text-center font-mono text-sm">
                                    {subtitleOffset > 0 ? '+' : ''}{subtitleOffset.toFixed(1)}s
                                </div>
                                <button onClick={() => setSubtitleOffset(prev => prev + 0.5)} className="p-2 hover:bg-white/10 rounded-lg"><span className="material-symbols-rounded">add</span></button>
                            </div>
                        </div>

                        {/* Search Results */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-xs font-bold text-white/50 uppercase tracking-wide">Disponível Online</p>
                                <button onClick={handleSearchSubtitles} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                                    <span className="material-symbols-rounded text-sm">refresh</span> Recarregar
                                </button>
                            </div>
                            
                            {isSearchingSubs ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : subtitleSearchResults.length > 0 ? (
                                <div className="space-y-2">
                                    {subtitleSearchResults.map(sub => (
                                        <button 
                                            key={sub.id} 
                                            onClick={() => handleSelectSubtitle(sub.url)}
                                            className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/50 transition-all flex items-center justify-between group"
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-white">{sub.language}</p>
                                                <p className="text-[10px] text-white/40 truncate max-w-[200px]">{sub.filename}</p>
                                            </div>
                                            <span className="material-symbols-rounded text-white/20 group-hover:text-primary">download</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-white/30 text-xs">
                                    Nenhuma legenda encontrada.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default CustomVideoPlayer;
