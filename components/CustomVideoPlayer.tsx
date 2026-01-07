
import React, { useRef, useState, useEffect } from 'react';

interface CustomVideoPlayerProps {
  src: string;
  onClose: () => void;
  title?: string;
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ src, onClose, title = "Reproduzindo" }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const controlsTimeoutRef = useRef<number | null>(null);

  // Auto-play on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().then(() => setPlaying(true)).catch(e => console.log("Autoplay prevented", e));
    }
  }, [src]);

  // Hide controls logic
  useEffect(() => {
    const handleActivity = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = window.setTimeout(() => {
        if (playing) setShowControls(false);
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
        container.addEventListener('mousemove', handleActivity);
        container.addEventListener('touchstart', handleActivity);
        container.addEventListener('click', handleActivity);
    }
    
    // Initial trigger
    handleActivity();

    return () => {
      if (container) {
          container.removeEventListener('mousemove', handleActivity);
          container.removeEventListener('touchstart', handleActivity);
          container.removeEventListener('click', handleActivity);
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [playing]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const skip = (seconds: number) => {
      if (videoRef.current) {
          videoRef.current.currentTime += seconds;
      }
  }

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 z-[200] bg-black overflow-hidden flex flex-col justify-center font-body group"
    >
      {/* VIDEO */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onClick={togglePlay}
        playsInline
      />

      {/* LOADING SPINNER */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-16 h-16 border-4 border-white/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}

      {/* OVERLAY CONTROLS */}
      <div className={`absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} pointer-events-none flex flex-col justify-between p-6`}>
          
          {/* HEADER */}
          <div className="flex items-center justify-between pointer-events-auto animate-slide-up">
              <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/5">
                  <span className="material-symbols-rounded text-3xl">arrow_back</span>
              </button>
              <h2 className="text-white font-bold drop-shadow-md tracking-wide line-clamp-1 max-w-[70%]">{title}</h2>
              <div className="w-12"></div> {/* Spacer */}
          </div>

          {/* CENTER PLAY BUTTON */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
             {!isLoading && (
                 <button onClick={togglePlay} className="w-20 h-20 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-[0_0_40px_rgba(242,13,242,0.4)] hover:scale-110 transition-transform active:scale-95 backdrop-blur-sm">
                    <span className="material-symbols-rounded text-5xl fill-1 ml-1">{playing ? 'pause' : 'play_arrow'}</span>
                 </button>
             )}
          </div>

          {/* CENTER ACTIONS (SKIP) */}
          <div className="absolute top-1/2 w-full left-0 px-10 sm:px-32 flex justify-between pointer-events-auto -translate-y-1/2">
             <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="text-white/50 hover:text-white transition-colors flex flex-col items-center gap-1 active:scale-90">
                 <span className="material-symbols-rounded text-4xl">replay_10</span>
             </button>
             <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="text-white/50 hover:text-white transition-colors flex flex-col items-center gap-1 active:scale-90">
                 <span className="material-symbols-rounded text-4xl">forward_10</span>
             </button>
          </div>

          {/* BOTTOM CONTROLS */}
          <div className="pointer-events-auto space-y-2 animate-slide-up">
              {/* PROGRESS BAR */}
              <div className="flex items-center gap-4 group/seekbar">
                  <span className="text-xs font-bold text-white/80 w-10 text-right">{formatTime(currentTime)}</span>
                  <div className="relative flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer group-hover/seekbar:h-2 transition-all">
                      <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all" style={{ width: `${(currentTime / duration) * 100}%` }}>
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover/seekbar:scale-125 transition-transform"></div>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max={duration || 100} 
                        value={currentTime} 
                        onChange={handleSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                  </div>
                  <span className="text-xs font-bold text-white/80 w-10">{formatTime(duration)}</span>
              </div>

              {/* ACTION BAR */}
              <div className="flex items-center justify-between pt-2">
                   <div className="flex items-center gap-4">
                       <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                           <span className="material-symbols-rounded text-2xl">{isMuted ? 'volume_off' : 'volume_up'}</span>
                       </button>
                       <div className="hidden sm:block">
                           <span className="text-xs text-white/40 uppercase font-bold tracking-widest">Void Max Player</span>
                       </div>
                   </div>

                   <div className="flex items-center gap-4">
                       <button className="text-white/70 hover:text-white transition-colors border border-white/20 px-2 py-1 rounded text-xs font-bold bg-white/5">
                           1.0x
                       </button>
                       <button className="text-white/70 hover:text-white transition-colors border border-white/20 px-2 py-1 rounded text-xs font-bold bg-white/5">
                           1080p
                       </button>
                       <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
                           <span className="material-symbols-rounded text-2xl">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                       </button>
                   </div>
              </div>
          </div>
      </div>
      
      <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #ffffff;
            cursor: pointer;
            margin-top: -6px; 
          }
      `}</style>
    </div>
  );
};

export default CustomVideoPlayer;
