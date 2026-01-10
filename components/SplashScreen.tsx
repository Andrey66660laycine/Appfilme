
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [exiting, setExiting] = useState(false);
  const [loadingText, setLoadingText] = useState("Inicializando Void OS...");

  useEffect(() => {
    // Sequência de texto técnico
    const texts = ["Carregando módulos...", "Sincronizando...", "Otimizando Assets...", "Pronto"];
    let i = 0;
    const interval = setInterval(() => {
        if (i < texts.length) {
            setLoadingText(texts[i]);
            i++;
        }
    }, 800);

    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onFinish, 800);
    }, 3800);

    return () => {
        clearTimeout(timer);
        clearInterval(interval);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden transition-all duration-1000 cubic-bezier(0.22, 1, 0.36, 1) ${exiting ? 'opacity-0 scale-110 pointer-events-none blur-2xl' : 'opacity-100 scale-100'}`}>
      
      {/* --- ATMOSPHERE --- */}
      
      {/* Noise Texture */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-screen pointer-events-none"></div>

      {/* Ambient Void Light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] animate-pulse-slow opacity-30"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] animate-pulse-slow opacity-20" style={{ animationDelay: '2s' }}></div>

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="particle w-1 h-1 bg-white absolute top-1/4 left-1/4 rounded-full opacity-0 animate-particle"></div>
          <div className="particle w-1 h-1 bg-white absolute top-3/4 left-3/4 rounded-full opacity-0 animate-particle" style={{animationDelay: '1s'}}></div>
          <div className="particle w-1 h-1 bg-primary absolute top-1/2 left-1/3 rounded-full opacity-0 animate-particle" style={{animationDelay: '2s'}}></div>
      </div>

      {/* --- CONTENT --- */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* LOGO CONTAINER */}
        <div className="relative w-80 h-60 md:w-[400px] md:h-[280px] mb-6 flex items-center justify-center group">
            
            {/* SCANNING BEAM EFFECT */}
            <div className="absolute inset-0 overflow-hidden rounded-full opacity-30 pointer-events-none">
                <div className="w-full h-[2px] bg-white shadow-[0_0_20px_white] absolute top-0 animate-scan"></div>
            </div>

            <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
                <defs>
                    <linearGradient id="solidNeon" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="50%" stopColor="#f20df2" />
                        <stop offset="100%" stopColor="#00d4ff" />
                    </linearGradient>
                    <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                <g className="animate-cinematic-reveal">
                    {/* VM Wave */}
                    <path 
                        d="M 20 20 L 55 110 L 95 30 Q 120 0 145 30 L 145 110" 
                        stroke="url(#solidNeon)" 
                        strokeWidth="22" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        fill="none"
                        style={{ filter: 'url(#softGlow)' }}
                    />
                    {/* Play Button */}
                    <path 
                        d="M 110 65 L 135 80 L 110 95 Z" 
                        fill="#fff" 
                        style={{ filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.9))' }}
                    />
                </g>
            </svg>
        </div>

        {/* TEXT */}
        <div className="flex flex-col items-center animate-fade-up-slow">
            <h1 className="font-display font-black text-6xl md:text-7xl tracking-[0.3em] text-white mix-blend-screen drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                VOID
            </h1>
            <div className="flex items-center gap-4 w-full justify-center mt-4">
                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-primary"></div>
                <span className="font-display text-xs tracking-[0.6em] text-primary uppercase font-bold text-glow">Cinematic</span>
                <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-primary"></div>
            </div>
        </div>
      </div>

      {/* TECH LOADER FOOTER */}
      <div className="absolute bottom-12 z-20 flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: '1.5s', animationFillMode: 'forwards' }}>
          <div className="flex gap-1 h-1">
              <div className="w-1 h-full bg-primary animate-music-bar" style={{animationDelay: '0ms'}}></div>
              <div className="w-1 h-full bg-primary animate-music-bar" style={{animationDelay: '200ms'}}></div>
              <div className="w-1 h-full bg-primary animate-music-bar" style={{animationDelay: '400ms'}}></div>
          </div>
          <span className="text-white/40 font-mono text-[10px] tracking-widest uppercase">{loadingText}</span>
      </div>

      <style>{`
        .text-glow { text-shadow: 0 0 10px rgba(242,13,242,0.6); }

        .animate-cinematic-reveal {
            animation: cinematicIn 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes cinematicIn {
            0% { opacity: 0; filter: blur(40px) brightness(3); transform: scale(0.9) translateY(30px); }
            100% { opacity: 1; filter: blur(0px) brightness(1); transform: scale(1) translateY(0); }
        }

        .animate-fade-up-slow {
            animation: fadeUp 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
        }
        @keyframes fadeUp {
            0% { opacity: 0; transform: translateY(20px); letter-spacing: 0.6em; }
            40% { opacity: 0; }
            100% { opacity: 1; transform: translateY(0); letter-spacing: 0.3em; }
        }

        .animate-pulse-slow { animation: pulseDeep 6s infinite ease-in-out; }
        @keyframes pulseDeep {
            0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.5; transform: translate(-50%, -50%) scale(1.1); }
        }

        .animate-scan { animation: scanDown 3s linear infinite; }
        @keyframes scanDown {
            0% { top: -10%; opacity: 0; }
            50% { opacity: 1; }
            100% { top: 110%; opacity: 0; }
        }

        .animate-music-bar { animation: barHeight 1s ease-in-out infinite; }
        @keyframes barHeight {
            0%, 100% { height: 4px; opacity: 0.3; }
            50% { height: 12px; opacity: 1; }
        }

        .animate-particle { animation: particleFloat 4s linear infinite; }
        @keyframes particleFloat {
            0% { transform: translateY(0) scale(0); opacity: 0; }
            50% { opacity: 0.5; }
            100% { transform: translateY(-100px) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
