
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
      setTimeout(onFinish, 800); // Tempo da animação de saída
    }, 3000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-all duration-800 ease-in-out ${exiting ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] animate-pulse-slow"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Animation */}
        <div className="relative mb-6">
            <div className="w-24 h-24 border-2 border-white/10 rounded-full flex items-center justify-center relative overflow-hidden animate-spin-slow">
                 <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
                 <span className="material-symbols-rounded text-5xl text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse">play_arrow</span>
            </div>
        </div>

        <h1 className="font-display font-bold text-5xl tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600 animate-slide-up">
            VOID
        </h1>
        <p className="text-white/40 text-[10px] tracking-[0.6em] uppercase mt-2 animate-fade-in" style={{animationDelay: '0.5s'}}>
            Cinematic Experience
        </p>

        {/* Loading Bar */}
        <div className="mt-12 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary shadow-[0_0_10px_#f20df2] animate-progress-indeterminate"></div>
        </div>
      </div>
      
      <style>{`
        .animate-spin-slow { animation: spin 8s linear infinite; }
        .animate-progress-indeterminate {
            animation: progress 2s ease-in-out infinite;
            width: 50%;
        }
        @keyframes progress {
            0% { transform: translateX(-150%); }
            100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
