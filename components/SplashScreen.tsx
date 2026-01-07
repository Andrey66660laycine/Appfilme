
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Tempo total da splash screen
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onFinish, 1200); // Tempo da animação de saída (sucção)
    }, 3800);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden transition-all duration-[1200ms] cubic-bezier(0.7, 0, 0.3, 1) ${exiting ? 'opacity-0 scale-[3] blur-xl' : 'opacity-100 scale-100'}`}>
      
      {/* --- COSMIC BACKGROUND --- */}
      
      {/* 1. Deep Space Base */}
      <div className="absolute inset-0 bg-[#020202]"></div>
      
      {/* 2. Starfield / Particles */}
      <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-[2px] h-[2px] bg-white rounded-full top-1/4 left-1/4 animate-float-particle opacity-40" style={{animationDelay: '0s'}}></div>
          <div className="absolute w-[3px] h-[3px] bg-white rounded-full top-3/4 left-1/3 animate-float-particle opacity-20" style={{animationDelay: '1s'}}></div>
          <div className="absolute w-[1px] h-[1px] bg-white rounded-full top-1/2 left-2/3 animate-float-particle opacity-50" style={{animationDelay: '2s'}}></div>
          <div className="absolute w-[2px] h-[2px] bg-primary rounded-full top-1/3 right-1/4 animate-float-particle opacity-30" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute w-[1px] h-[1px] bg-white rounded-full bottom-1/4 right-1/3 animate-float-particle opacity-40" style={{animationDelay: '3s'}}></div>
      </div>

      {/* 3. Nebula Glows */}
      <div className="absolute top-[-50%] left-[-20%] w-[100vw] h-[100vw] bg-purple-900/10 rounded-full blur-[150px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-50%] right-[-20%] w-[100vw] h-[100vw] bg-blue-900/10 rounded-full blur-[150px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>


      {/* --- THE EVENT HORIZON (CENTER) --- */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        
        {/* The Eclipse */}
        <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
            
            {/* Corona Glow (Back) */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-purple-500 to-blue-600 blur-[40px] opacity-40 animate-pulse-fast"></div>
            
            {/* The Ring */}
            <div className="absolute inset-0 rounded-full border-[1px] border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)] animate-spin-slow"></div>
            <div className="absolute inset-2 rounded-full border-[1px] border-white/10 border-t-primary/50 animate-spin-reverse"></div>

            {/* The Void (Black Hole Center) */}
            <div className="relative z-10 w-36 h-36 bg-black rounded-full shadow-[inset_0_0_60px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden">
                {/* Reflection effect inside the void */}
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/5 to-transparent rotate-45 animate-shimmer-fast"></div>
                
                <span className="material-symbols-rounded text-5xl text-white opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] scale-100 animate-breathing-icon">
                    play_arrow
                </span>
            </div>
        </div>

        {/* TYPOGRAPHY */}
        <div className="text-center relative z-20">
            {/* Main Title with Shimmer */}
            <h1 className="font-display font-black text-7xl md:text-8xl tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-gray-500 via-white to-gray-500 bg-[length:200%_auto] animate-text-shimmer leading-none drop-shadow-2xl">
                VOID
            </h1>
            
            {/* Subtitle with separator */}
            <div className="flex items-center justify-center gap-4 mt-6 opacity-0 animate-fade-in-up" style={{animationDelay: '0.5s'}}>
                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                <span className="text-xs md:text-sm font-display font-bold text-white tracking-[0.8em] uppercase text-shadow-glow">
                    MAX
                </span>
                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
            </div>
        </div>

      </div>
      
      {/* LOADING BAR (Minimalist) */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/5">
        <div className="h-full bg-gradient-to-r from-primary via-purple-400 to-primary w-full animate-progress-finish origin-left"></div>
      </div>

      {/* CUSTOM ANIMATIONS */}
      <style>{`
        .animate-spin-slow { animation: spin 20s linear infinite; }
        .animate-spin-reverse { animation: spin 12s linear infinite reverse; }
        .text-shadow-glow { text-shadow: 0 0 15px rgba(242, 13, 242, 0.8); }
        
        @keyframes floatParticle {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
            50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
        }
        .animate-float-particle {
            animation: floatParticle 8s ease-in-out infinite;
        }

        @keyframes textShimmer {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
        }
        .animate-text-shimmer {
            animation: textShimmer 6s linear infinite;
        }

        @keyframes shimmerFast {
            0% { transform: translateX(-100%) rotate(45deg); }
            100% { transform: translateX(100%) rotate(45deg); }
        }
        .animate-shimmer-fast {
            animation: shimmerFast 3s infinite;
        }

        @keyframes breathingIcon {
            0%, 100% { transform: scale(1); opacity: 0.8; text-shadow: 0 0 10px rgba(255,255,255,0.5); }
            50% { transform: scale(1.1); opacity: 1; text-shadow: 0 0 25px rgba(255,255,255,0.9); }
        }
        .animate-breathing-icon {
            animation: breathingIcon 4s ease-in-out infinite;
        }

        @keyframes progressFinish {
            0% { transform: scaleX(0); }
            100% { transform: scaleX(1); }
        }
        .animate-progress-finish {
            animation: progressFinish 3.5s cubic-bezier(0.2, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
