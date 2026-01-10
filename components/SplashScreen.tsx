
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [exiting, setExiting] = useState(false);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    // Sequência de Animação
    setTimeout(() => setReveal(true), 500); // Demora um pouco mais

    const timer = setTimeout(() => {
      setExiting(true); // Inicia saída
      setTimeout(onFinish, 1200); // Transição mais lenta
    }, 4000); // Tempo total maior

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden transition-all duration-[1200ms] cubic-bezier(0.22, 1, 0.36, 1) ${exiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}>
      
      {/* --- ATMOSPHERE --- */}
      
      {/* Background Noise */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay pointer-events-none"></div>

      {/* Deep Shadow Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] z-0"></div>

      {/* The Abyss Light (Muito mais sutil e escuro) */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vw] bg-[#2e022e] rounded-full blur-[120px] transition-all duration-[4s] ease-out ${reveal ? 'opacity-30 scale-100' : 'opacity-0 scale-50'}`}></div>

      {/* --- CONTENT --- */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* LOGO CONTAINER */}
        <div className={`relative w-64 h-48 md:w-80 md:h-60 mb-8 flex items-center justify-center transition-all duration-[2.5s] ${reveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            
            <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl animate-breathe">
                <defs>
                    <linearGradient id="darkNeon" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#1a0b2e" /> 
                        <stop offset="50%" stopColor="#4a044a" /> {/* Roxo Escuro */}
                        <stop offset="100%" stopColor="#1a0b2e" />
                    </linearGradient>
                    <filter id="shadowGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#4a044a" floodOpacity="0.2"/>
                    </filter>
                </defs>

                <g style={{ filter: 'url(#shadowGlow)' }}>
                    {/* VM Symbol */}
                    <path 
                        d="M 20 20 L 55 110 L 95 30 Q 120 0 145 30 L 145 110" 
                        stroke="url(#darkNeon)" 
                        strokeWidth="12" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        fill="none"
                        className="animate-path-draw"
                    />
                    {/* Play Triangle */}
                    <path 
                        d="M 110 65 L 135 80 L 110 95 Z" 
                        fill="#e0e0e0" 
                        className="animate-fade-in-delayed"
                    />
                </g>
            </svg>
        </div>

        {/* TITLE - Minimalist */}
        <div className={`flex flex-col items-center transition-all duration-[2s] delay-500 ${reveal ? 'opacity-100' : 'opacity-0'}`}>
            <h1 className="font-display font-bold text-4xl md:text-5xl tracking-[0.3em] text-[#e0e0e0] mix-blend-screen drop-shadow-lg uppercase">
                VOID
            </h1>
        </div>
      </div>

      {/* MINIMAL LOADING LINE (Muito fino e sutil) */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/5">
          <div className="h-full bg-[#4a044a] shadow-[0_0_10px_#4a044a] animate-progress-line"></div>
      </div>

      <style>{`
        .animate-breathe { animation: breathe 6s ease-in-out infinite; }
        @keyframes breathe {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(74,4,74,0.1)); }
            50% { transform: scale(1.02); filter: drop-shadow(0 0 20px rgba(74,4,74,0.3)); }
        }

        .animate-path-draw {
            stroke-dasharray: 400;
            stroke-dashoffset: 400;
            animation: drawPath 3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes drawPath {
            to { stroke-dashoffset: 0; }
        }

        .animate-fade-in-delayed {
            opacity: 0;
            animation: fadeInSimple 1.5s ease-out 1.5s forwards;
        }
        @keyframes fadeInSimple {
            to { opacity: 0.8; }
        }

        .animate-progress-line {
            width: 0%;
            animation: progressWidth 4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes progressWidth {
            0% { width: 0%; opacity: 0; }
            20% { opacity: 1; }
            100% { width: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
