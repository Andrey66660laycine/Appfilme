
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [exiting, setExiting] = useState(false);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    // Sequência de Animação
    setTimeout(() => setReveal(true), 300); // Inicia o brilho

    const timer = setTimeout(() => {
      setExiting(true); // Inicia saída
      setTimeout(onFinish, 1000); // Remove componente
    }, 3500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden transition-all duration-1000 cubic-bezier(0.22, 1, 0.36, 1) ${exiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}>
      
      {/* --- ATMOSPHERE --- */}
      
      {/* Background Noise (Subtle Texture) */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>

      {/* Deep Shadow Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-0"></div>

      {/* The Abyss Light (Dark Purple/Blue Glow behind logo) */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[100px] transition-all duration-[3s] ease-out ${reveal ? 'opacity-40 scale-100' : 'opacity-0 scale-50'}`}></div>

      {/* --- CONTENT --- */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* LOGO CONTAINER */}
        <div className={`relative w-64 h-48 md:w-80 md:h-60 mb-8 flex items-center justify-center transition-all duration-[2s] ${reveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            
            <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl animate-breathe">
                <defs>
                    {/* Darker Gradient */}
                    <linearGradient id="darkNeon" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2e1065" /> {/* Dark Violet */}
                        <stop offset="50%" stopColor="#f20df2" /> {/* Primary */}
                        <stop offset="100%" stopColor="#2e1065" />
                    </linearGradient>
                    <filter id="shadowGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#f20df2" floodOpacity="0.3"/>
                    </filter>
                </defs>

                <g style={{ filter: 'url(#shadowGlow)' }}>
                    {/* VM Symbol */}
                    <path 
                        d="M 20 20 L 55 110 L 95 30 Q 120 0 145 30 L 145 110" 
                        stroke="url(#darkNeon)" 
                        strokeWidth="18" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        fill="none"
                        className="animate-path-draw"
                    />
                    {/* Play Triangle */}
                    <path 
                        d="M 110 65 L 135 80 L 110 95 Z" 
                        fill="#fff" 
                        className="animate-fade-in-delayed"
                    />
                </g>
            </svg>
        </div>

        {/* TITLE */}
        <div className={`flex flex-col items-center transition-all duration-[2s] delay-300 ${reveal ? 'opacity-100' : 'opacity-0'}`}>
            <h1 className="font-display font-black text-6xl md:text-8xl tracking-[0.2em] text-white mix-blend-screen drop-shadow-lg">
                VOID
            </h1>
            <div className="mt-6 flex items-center gap-4 opacity-50">
                <div className={`h-[1px] bg-gradient-to-r from-transparent via-white to-transparent transition-all duration-[1.5s] ease-out ${reveal ? 'w-32' : 'w-0'}`}></div>
            </div>
        </div>
      </div>

      {/* MINIMAL LOADING LINE */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/5">
          <div className="h-full bg-primary shadow-[0_0_20px_#f20df2] animate-progress-line"></div>
      </div>

      <style>{`
        .animate-breathe { animation: breathe 4s ease-in-out infinite; }
        @keyframes breathe {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(242,13,242,0.2)); }
            50% { transform: scale(1.03); filter: drop-shadow(0 0 30px rgba(242,13,242,0.5)); }
        }

        .animate-path-draw {
            stroke-dasharray: 400;
            stroke-dashoffset: 400;
            animation: drawPath 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes drawPath {
            to { stroke-dashoffset: 0; }
        }

        .animate-fade-in-delayed {
            opacity: 0;
            animation: fadeInSimple 1s ease-out 1s forwards;
        }
        @keyframes fadeInSimple {
            to { opacity: 1; }
        }

        .animate-progress-line {
            width: 0%;
            animation: progressWidth 3.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes progressWidth {
            0% { width: 0%; opacity: 0; }
            10% { opacity: 1; }
            100% { width: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
