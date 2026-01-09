
import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  
  // --- STATES ---
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
  
  // Volume & Brightness (Gestures)
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [gestureIndicator, setGestureIndicator] = useState<{ type: 'volume' | 'brightness', value: number } | null>(null);

  // Gestures Animation
  const [doubleTapAnim, setDoubleTapAnim] = useState<{ side: 'left' | 'right' } | null>(null);

  // Data
  const [mediaDetails, setMediaDetails] = useState<any>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<Episode[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Refs for logic
  const controlsTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number, y: number, time: number } | null>(null);
  const lastTapRef = useRef<{ time: number, x: number }>({ time: 0, x: 0 });

  // --- ANDROID INTEGRATION ---
  const handleCast = () => {
    if (window.Android && window.Android.castVideo) {
        try {
            console.log("Chamando Cast Nativo...");
            window.Android.castVideo(src, title || "Video");
            return;
        } catch (e) { console.error("Erro Cast Android", e); }
    }
    // Fallback apenas visual
    alert("Função Cast: Use o ícone de transmissão do seu sistema.");
  };

  const handleDownload = () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const meta = {
        id: String(tmdbId || 0),
        title: title || "Download",
        type: type || 'movie',
        season: season || 0,
        episode: episode || 0,
        poster: mediaDetails?.poster_path ? tmdb.getPosterUrl(mediaDetails.poster_path) : '',
        backdrop: mediaDetails?.backdrop_path ? tmdb.getBackdropUrl(mediaDetails.backdrop_path) : ''
    };

    if (window.Android && window.Android.download) {
        try {
            window.Android.download(src, JSON.stringify(meta));
            setTimeout(() => {
                 onClose(); // Fecha o player para o usuário acompanhar o download na tela de downloads
                 if(window.Android?.onPlayerClosed) window.Android.onPlayerClosed();
            }, 1000);
            return;
        } catch (e) { console.error("Download Error", e); }
    }
    
    // Browser Fallback
    const a = document.createElement('a');
    a.href = src;
    a.download = title || 'video.mp4';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setIsDownloading(false);
  };

  // --- DATA LOADING ---
  useEffect(() => {
    const loadData = async () => {
        if (!tmdbId) return;
        
        try {
            let d;
            if (type === 'movie') d = await tmdb.getMovieDetails(String(tmdbId));
            else d = await tmdb.getTVDetails(String(tmdbId));
            setMediaDetails(d);
        } catch(e) {}

        if (type === 'tv' && season) {
            try {
                const eps = await tmdb.getTVSeason(String(tmdbId), season);
                setSeasonEpisodes(eps);
            } catch(e) {}
        }
    };
    loadData();
  }, [tmdbId, type, season]);

  // --- VIDEO INIT ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    
    if (src.includes('.m3u8')) {
        video.crossOrigin = "anonymous"; 
        if (window.Hls && window.Hls.isSupported()) {
            const hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                if (initialTime > 0) video.currentTime = initialTime;
                video.play().catch(() => {});
            });
            hls.on(window.Hls.Events.ERROR, (e: any, data: any) => {
                if(data.fatal) {
                   if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
                   else onErrorFallback(); 
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            video.addEventListener('loadedmetadata', () => {
                if (initialTime > 0) video.currentTime = initialTime;
                video.play().catch(() => {});
            });
        }
    } else {
        video.src = src;
        video.load();
    }

    const onPlay = () => { 
        setPlaying(true); 
        setIsLoading(false);
        if (onPlayerStable) onPlayerStable();
        // AVISAR O APP ANDROID QUE O VÍDEO TOCOU (PARA PARAR O SNIFFER)
        if (window.Android && window.Android.onVideoPlaying) {
             try { window.Android.onVideoPlaying(src); } catch(e) {}
        }
    };

    const onPause = () => setPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onTimeUpdate = () => {
        setCurrentTime(video.currentTime);
        setDuration(video.duration || 0);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', () => {
         setDuration(video.duration);
         if (initialTime > 0 && Math.abs(video.currentTime - initialTime) > 2) {
             video.currentTime = initialTime;
         }
    });

    // Tentativa inicial de play
    video.play().catch(() => {});

    return () => {
        if (hlsRef.current) hlsRef.current.destroy();
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [src]);

  // --- PROGRESS SAVING ---
  useEffect(() => {
      const interval = setInterval(() => {
          if (videoRef.current && playing && profileId && tmdbId) {
              storageService.updateProgress(
                  profileId, tmdbId, type || 'movie', 
                  videoRef.current.currentTime, 
                  videoRef.current.duration,
                  season, episode,
                  mediaDetails ? {
                      title: mediaDetails.title || mediaDetails.name,
                      poster_path: mediaDetails.poster_path,
                      backdrop_path: mediaDetails.backdrop_path,
                      vote_average: mediaDetails.vote_average
                  } : { title }
              );
          }
      }, 5000);
      return () => clearInterval(interval);
  }, [playing, profileId, tmdbId, mediaDetails]);

  // --- CONTROLS VISIBILITY ---
  const showControlsTemporarily = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (!isLocked && playing && !showSidePanel) {
          controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 4000);
      }
  };

  useEffect(() => {
      showControlsTemporarily();
      const onMove = () => showControlsTemporarily();
      window.addEventListener('mousemove', onMove);
      window.addEventListener('click', onMove);
      return () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('click', onMove);
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      };
  }, [playing, isLocked, showSidePanel]);

  // --- GESTURES (TOUCH) ---
  const handleTouchStart = (e: React.TouchEvent) => {
      if (isLocked) return;
      touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now()
      };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartRef.current || isLocked) return;
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      
      // Se movimento vertical predominante
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
          const delta = dy / window.innerHeight; // Normalized delta
          const screenWidth = window.innerWidth;
          
          // Lado Esquerdo -> Brilho
          if (touchStartRef.current.x < screenWidth / 2) {
              let newB = brightness - delta * 1.5;
              newB = Math.max(0.2, Math.min(1.5, newB));
              setBrightness(newB);
              setGestureIndicator({ type: 'brightness', value: newB });
          } 
          // Lado Direito -> Volume
          else {
              let newV = volume - delta * 1.5;
              newV = Math.max(0, Math.min(1, newV));
              setVolume(newV);
              if (videoRef.current) videoRef.current.volume = newV;
              setGestureIndicator({ type: 'volume', value: newV });
          }
          touchStartRef.current.y = e.touches[0].clientY;
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (isLocked) {
           setShowControls(true);
           setTimeout(() => setShowControls(false), 2000);
           return;
      }

      setGestureIndicator(null);
      const now = Date.now();
      
      // Double Tap Logic
      if (lastTapRef.current && (now - lastTapRef.current.time) < 300) {
          const x = e.changedTouches[0].clientX;
          const width = window.innerWidth;
          
          if (x < width * 0.35) {
              seek(-10); // Rewind
              setDoubleTapAnim({ side: 'left' });
          } else if (x > width * 0.65) {
              seek(10); // Forward
              setDoubleTapAnim({ side: 'right' });
          } else {
              togglePlay();
          }
          setTimeout(() => setDoubleTapAnim(null), 600);
      } 
      
      lastTapRef.current = { time: now, x: e.changedTouches[0].clientX };
  };

  // --- ACTIONS ---
  const togglePlay = (e?: any) => {
      e?.stopPropagation();
      if (!videoRef.current) return;
      if (videoRef.current.paused) videoRef.current.play();
      else videoRef.current.pause();
      showControlsTemporarily();
  };

  const seek = (seconds: number) => {
      if (!videoRef.current) return;
      videoRef.current.currentTime += seconds;
      showControlsTemporarily();
  };

  const handleSliderSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (videoRef.current) videoRef.current.currentTime = val;
      setCurrentTime(val);
  };

  const formatTime = (t: number) => {
      if (!t) return "0:00";
      const h = Math.floor(t / 3600);
      const m = Math.floor((t % 3600) / 60);
      const s = Math.floor(t % 60);
      return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${m}:${s.toString().padStart(2,'0')}`;
  };

  const playEpisode = (ep: Episode) => {
      if (onPlayRelated) {
           // Simula um objeto Movie para o handler, mas injeta dados do episódio
           onPlayRelated({
               id: Number(tmdbId),
               media_type: 'tv',
               title: title || '',
               poster_path: mediaDetails?.poster_path || '',
               backdrop_path: mediaDetails?.backdrop_path || '',
               overview: '',
               release_date: '',
               vote_average: 0,
               genre_ids: [],
               ...({ season: season, episode: ep.episode_number } as any) 
           });
           setShowSidePanel(false);
      }
  };

  return (
    <div 
        ref={containerRef}
        className="fixed inset-0 z-[9999] bg-black text-white font-body select-none overflow-hidden"
        style={{ filter: `brightness(${brightness})` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={showControlsTemporarily}
    >
        <video 
            ref={videoRef}
            className={`w-full h-full object-${fitMode} transition-all duration-300`}
            playsInline
        />

        {/* --- GESTURE INDICATORS (Volume/Brilho) --- */}
        {gestureIndicator && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center gap-3 animate-fade-in z-50 pointer-events-none border border-white/10 shadow-2xl">
                <span className="material-symbols-rounded text-4xl text-primary">
                    {gestureIndicator.type === 'volume' 
                        ? (gestureIndicator.value === 0 ? 'volume_off' : 'volume_up')
                        : 'brightness_6'
                    }
                </span>
                <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-75" style={{ width: `${(gestureIndicator.type === 'brightness' ? (gestureIndicator.value - 0.2)/(1.3) : gestureIndicator.value) * 100}%` }}></div>
                </div>
            </div>
        )}

        {/* --- DOUBLE TAP ANIMATION --- */}
        {doubleTapAnim && (
            <div className={`absolute top-0 bottom-0 w-1/3 z-40 flex items-center justify-center bg-white/5 backdrop-blur-[2px] animate-pulse-fast ${doubleTapAnim.side === 'left' ? 'left-0 rounded-r-[50%]' : 'right-0 rounded-l-[50%]'}`}>
                <div className="flex flex-col items-center text-white/90 drop-shadow-lg">
                    <span className="material-symbols-rounded text-5xl">
                        {doubleTapAnim.side === 'left' ? 'fast_rewind' : 'fast_forward'}
                    </span>
                    <span className="font-bold text-sm mt-1">10s</span>
                </div>
            </div>
        )}

        {/* --- LOADING SPINNER --- */}
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                 <div className="relative flex flex-col items-center">
                     <div className="w-16 h-16 border-4 border-white/10 border-t-primary rounded-full animate-spin"></div>
                     <span className="mt-4 text-xs font-bold text-white/50 tracking-widest uppercase animate-pulse">Carregando...</span>
                 </div>
            </div>
        )}

        {/* --- SIDE PANEL (EPISODES/RECCOMENDATIONS) --- */}
        <div className={`absolute top-0 right-0 bottom-0 w-80 bg-[#0f0f0f]/95 backdrop-blur-2xl border-l border-white/10 z-[60] transform transition-transform duration-300 ${showSidePanel ? 'translate-x-0' : 'translate-x-full'} flex flex-col shadow-2xl`}>
             <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                 <h3 className="font-display font-bold text-lg">{type === 'tv' ? `Temporada ${season}` : 'Recomendados'}</h3>
                 <button onClick={() => setShowSidePanel(false)} className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"><span className="material-symbols-rounded">close</span></button>
             </div>
             <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                 {type === 'tv' ? (
                     seasonEpisodes.map(ep => (
                         <div key={ep.id} onClick={(e) => { e.stopPropagation(); playEpisode(ep); }} className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-white/10 ${ep.episode_number === episode ? 'bg-primary/20 border border-primary/40' : 'border border-transparent'}`}>
                             <div className="w-24 aspect-video bg-black rounded overflow-hidden relative shrink-0 border border-white/10">
                                 {ep.still_path ? <img src={tmdb.getBackdropUrl(ep.still_path, 'w300')} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="material-symbols-rounded text-white/20">movie</span></div>}
                                 {ep.episode_number === episode && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><span className="material-symbols-rounded text-white animate-pulse">equalizer</span></div>}
                             </div>
                             <div className="flex flex-col justify-center min-w-0">
                                 <p className={`text-sm font-bold truncate ${ep.episode_number === episode ? 'text-primary' : 'text-white'}`}>{ep.episode_number}. {ep.name}</p>
                                 <p className="text-xs text-white/40">{ep.runtime} min</p>
                             </div>
                         </div>
                     ))
                 ) : (
                     recommendations?.map(movie => (
                         <div key={movie.id} onClick={(e) => { e.stopPropagation(); if(onPlayRelated) { onPlayRelated(movie); setShowSidePanel(false); } }} className="flex gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                             <div className="w-16 aspect-[2/3] bg-black rounded overflow-hidden shrink-0 border border-white/10">
                                 <img src={tmdb.getPosterUrl(movie.poster_path)} className="w-full h-full object-cover"/>
                             </div>
                             <div className="flex flex-col justify-center">
                                 <p className="text-sm font-bold text-white line-clamp-2">{movie.title}</p>
                                 <p className="text-xs text-green-400 font-bold">{movie.vote_average.toFixed(1)} ★</p>
                             </div>
                         </div>
                     ))
                 )}
             </div>
        </div>

        {/* --- CONTROLS UI --- */}
        {!isLocked && (
            <div className={`absolute inset-0 z-40 flex flex-col justify-between bg-gradient-to-b from-black/90 via-transparent to-black/90 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                
                {/* HEADER */}
                <div className="flex items-center justify-between p-4 pt-6 md:p-6">
                    <div className="flex items-center gap-4 max-w-[60%]">
                        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                            <span className="material-symbols-rounded text-2xl">arrow_back</span>
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-base md:text-lg font-bold truncate drop-shadow-md font-display">{title}</h2>
                            {type === 'tv' && <p className="text-xs text-white/60 font-medium">Temporada {season} • Episódio {episode}</p>}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); handleCast(); }} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors" title="Transmitir">
                            <span className="material-symbols-rounded text-2xl">cast</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className={`w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors ${isDownloading ? 'text-primary animate-pulse' : 'text-white'}`} title="Baixar">
                            <span className="material-symbols-rounded text-2xl">download</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowSidePanel(true); }} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors relative" title="Lista de Episódios">
                            <span className="material-symbols-rounded text-2xl">playlist_play</span>
                            {type === 'tv' && <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></div>}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setIsLocked(true); }} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors" title="Bloquear Tela">
                            <span className="material-symbols-rounded text-2xl">lock_open</span>
                        </button>
                    </div>
                </div>

                {/* CENTER CONTROLS */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8 md:gap-16">
                    <button onClick={(e) => { e.stopPropagation(); seek(-10); }} className="group p-4 rounded-full hover:bg-white/5 transition-all active:scale-90">
                        <span className="material-symbols-rounded text-5xl opacity-70 group-hover:opacity-100 group-hover:-translate-x-1 transition-transform">replay_10</span>
                    </button>
                    
                    {!isLoading && (
                        <button onClick={togglePlay} className="group w-20 h-20 md:w-24 md:h-24 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center hover:scale-110 hover:bg-primary hover:border-primary transition-all shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                            <span className="material-symbols-rounded text-6xl fill-1 ml-1 text-white">{playing ? 'pause' : 'play_arrow'}</span>
                        </button>
                    )}

                    <button onClick={(e) => { e.stopPropagation(); seek(10); }} className="group p-4 rounded-full hover:bg-white/5 transition-all active:scale-90">
                        <span className="material-symbols-rounded text-5xl opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-transform">forward_10</span>
                    </button>
                </div>

                {/* NEXT EPISODE POPUP (Auto) */}
                {nextEpisode && (duration - currentTime < 90) && (
                    <div className="absolute bottom-32 right-6 animate-slide-up z-50">
                        <button onClick={(e) => { e.stopPropagation(); nextEpisode.onPlay(); }} className="bg-white text-black pl-5 pr-2 py-2 rounded-full font-bold flex items-center gap-3 shadow-2xl hover:scale-105 transition-transform group border-2 border-primary/20 hover:border-primary">
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[9px] text-gray-500 uppercase font-extrabold tracking-wider">A Seguir</span>
                                <span className="text-sm font-black truncate max-w-[140px]">{nextEpisode.title}</span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center group-hover:bg-primary transition-colors">
                                <span className="material-symbols-rounded text-2xl">skip_next</span>
                            </div>
                        </button>
                    </div>
                )}

                {/* FOOTER */}
                <div className="p-4 md:p-8 bg-gradient-to-t from-black via-black/90 to-transparent pt-16">
                     <div className="flex items-center justify-between text-xs font-bold text-white/70 mb-3 px-1 font-mono tracking-wider">
                         <span>{formatTime(currentTime)}</span>
                         <span>{formatTime(duration)}</span>
                     </div>
                     
                     {/* SEEKBAR */}
                     <div className="relative h-6 group flex items-center cursor-pointer mb-2" onClick={(e) => e.stopPropagation()}>
                         <input 
                            type="range" 
                            min="0" max={duration || 100} 
                            step="0.1"
                            value={currentTime} 
                            onChange={handleSliderSeek}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                         />
                         <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden relative group-hover:h-2 transition-all duration-200">
                             <div className="h-full bg-gradient-to-r from-primary to-purple-500 relative shadow-[0_0_15px_#f20df2]" style={{ width: `${(currentTime / duration) * 100}%` }}>
                                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full scale-0 group-hover:scale-100 transition-transform shadow-lg border-2 border-primary"></div>
                             </div>
                         </div>
                     </div>

                     <div className="flex justify-between items-center mt-2">
                         <div className="flex items-center gap-4">
                             <button onClick={(e) => { e.stopPropagation(); setFitMode(prev => prev === 'contain' ? 'cover' : 'contain'); }} className="text-xs font-bold text-white/70 hover:text-white flex items-center gap-1 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">
                                 <span className="material-symbols-rounded text-base">{fitMode === 'contain' ? 'fit_screen' : 'crop_free'}</span>
                                 <span className="hidden sm:inline">Aspecto</span>
                             </button>
                         </div>
                         
                         <div className="flex items-center gap-4 relative">
                             <button onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); }} className="text-xs font-bold text-white hover:text-primary transition-colors flex items-center gap-1 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full">
                                 {playbackSpeed}x <span className="material-symbols-rounded text-base">speed</span>
                             </button>
                             {showSpeedMenu && (
                                 <div className="absolute bottom-full right-0 mb-3 bg-[#1a1a1a]/95 backdrop-blur border border-white/10 rounded-xl overflow-hidden w-28 animate-fade-in-up shadow-2xl z-50 py-1">
                                     {[0.5, 1.0, 1.25, 1.5, 2.0].map(s => (
                                         <button key={s} onClick={(e) => { e.stopPropagation(); if(videoRef.current) videoRef.current.playbackRate = s; setPlaybackSpeed(s); setShowSpeedMenu(false); }} className={`block w-full py-2.5 text-center hover:bg-white/10 text-xs font-bold ${playbackSpeed === s ? 'text-primary bg-primary/10' : 'text-white'}`}>
                                             {s}x
                                         </button>
                                     ))}
                                 </div>
                             )}
                             
                             <button onClick={(e) => { e.stopPropagation(); if (!document.fullscreenElement) containerRef.current?.requestFullscreen(); else document.exitFullscreen(); }} className="text-white hover:text-white/80 transition-transform active:scale-90 p-2">
                                 <span className="material-symbols-rounded text-2xl">fullscreen</span>
                             </button>
                         </div>
                     </div>
                </div>
            </div>
        )}

        {/* LOCKED STATE */}
        {isLocked && (
             <button onClick={() => setIsLocked(false)} className="absolute top-10 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-2 rounded-full flex items-center gap-2 z-50 animate-pulse pointer-events-auto">
                 <span className="material-symbols-rounded text-white fill-1">lock</span>
                 <span className="text-white text-xs font-bold uppercase tracking-wider">Toque para Destravar</span>
             </button>
        )}
    </div>
  );
};

export default CustomVideoPlayer;
