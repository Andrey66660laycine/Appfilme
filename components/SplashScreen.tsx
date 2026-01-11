
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [exiting, setExiting] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Phase 1: Logo Fade In
    setTimeout(() => setPhase(1), 500); 
    
    // Phase 2: Text Reveal
    setTimeout(() => setPhase(2), 1200);

    // Phase 3: Exit
    const timer = setTimeout(() => {
      setExiting(true); 
      setTimeout(onFinish, 1000); 
    }, 4000); 

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#000000] flex flex-col items-center justify-center overflow-hidden transition-all duration-1000 ease-in-out ${exiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'}`}>
      
      {/* --- VOID ATMOSPHERE --- */}
      {/* A single subtle light source from bottom */}
      <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[80vw] h-[40vh] bg-primary/5 blur-[120px] rounded-full transition-opacity duration-1000" style={{ opacity: phase >= 1 ? 1 : 0 }}></div>
      
      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        
        {/* SYMBOL */}
        <div className={`relative w-20 h-20 mb-10 transition-all duration-[2s] cubic-bezier(0.16, 1, 0.3, 1) ${phase >= 1 ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-10 blur-md'}`}>
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <path 
                    d="M 50 15 L 85 85 L 15 85 Z" 
                    stroke="white" 
                    strokeWidth="1.5" 
                    fill="black"
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="animate-pulse-slow"
                />
                <circle cx="50" cy="58" r="8" className="fill-white animate-ping-slow" style={{ animationDuration: '3s' }} />
            </svg>
        </div>

        {/* TEXT */}
        <div className={`flex flex-col items-center gap-2 transition-all duration-[1.5s] delay-300 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
            <h1 className="font-display font-bold text-lg tracking-[0.8em] text-white/80 uppercase ml-4">
                VOID
            </h1>
            <p className="text-[9px] text-white/20 tracking-[0.4em] uppercase font-light">
                Cinematic Experience
            </p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
