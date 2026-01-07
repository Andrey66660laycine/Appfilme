
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Tempo total da splash screen (Sincronizado com o CSS)
    // 0s: Início
    // 3.5s: Fim da animação de entrada/brilho
    // 4.0s: Saída
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onFinish, 800); // Tempo da transição de saída
    }, 4200);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden transition-all duration-1000 cubic-bezier(0.7, 0, 0.3, 1) ${exiting ? 'opacity-0 scale-110 blur-xl pointer-events-none' : 'opacity-100 scale-100'}`}>
      
      {/* BACKGROUND ATMOSPHERE */}
      <div className="absolute inset-0 bg-radial-gradient from-[#1a0b2e] to-[#000000] opacity-60"></div>
      
      {/* GRID PATTERN (Subtle Tech feel) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]"></div>

      {/* --- LOGO CONTAINER --- */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* SVG LOGO */}
        <div className="relative w-64 h-48 md:w-80 md:h-60 mb-8">
            <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,200,255,0.3)]">
                <defs>
                    {/* NEON GRADIENT: Roxo (Primary) para Azul Ciano (Novo estilo da imagem) */}
                    <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7c3aed" /> {/* Deep Purple */}
                        <stop offset="40%" stopColor="#f20df2" /> {/* Primary Pink */}
                        <stop offset="100%" stopColor="#00d4ff" /> {/* Cyan Blue */}
                    </linearGradient>
                    
                    {/* GLOW FILTER */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {/* THE "VM" WAVE PATH */}
                {/* Caminho desenhado para imitar o V conectado ao M fluido da imagem */}
                <path 
                    d="M 20 20 L 55 110 L 95 30 Q 120 0 145 30 L 145 110" 
                    stroke="url(#neonGradient)" 
                    strokeWidth="12" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    fill="none"
                    className="logo-path"
                    style={{filter: 'url(#glow)'}}
                />

                {/* THE PLAY TRIANGLE (Inside the M arch) */}
                <path 
                    d="M 105 60 L 135 80 L 105 100 Z" 
                    fill="#00d4ff" 
                    className="play-icon"
                    style={{filter: 'url(#glow)'}}
                />
            </svg>
        </div>

        {/* TEXT LOGO */}
        <div className="text-center relative">
            <h1 className="font-display font-black text-5xl md:text-6xl tracking-[0.2em] text-white overflow-hidden leading-tight mix-blend-screen">
                <span className="inline-block animate-slide-up-char" style={{animationDelay: '1.8s'}}>V</span>
                <span className="inline-block animate-slide-up-char" style={{animationDelay: '1.9s'}}>O</span>
                <span className="inline-block animate-slide-up-char" style={{animationDelay: '2.0s'}}>I</span>
                <span className="inline-block animate-slide-up-char" style={{animationDelay: '2.1s'}}>D</span>
                <span className="inline-block w-4"></span>
                <span className="inline-block animate-slide-up-char" style={{animationDelay: '2.2s'}}>M</span>
                <span className="inline-block animate-slide-up-char" style={{animationDelay: '2.3s'}}>A</span>
                <span className="inline-block animate-slide-up-char" style={{animationDelay: '2.4s'}}>X</span>
            </h1>
            
            {/* REFLECTION / SHINE BAR */}
            <div className="w-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto mt-4 animate-expand-line shadow-[0_0_10px_#00d4ff]"></div>
        </div>
      </div>

      {/* CSS ANIMATIONS */}
      <style>{`
        .bg-radial-gradient {
            background: radial-gradient(circle at center, #1a0b2e 0%, #000000 100%);
        }

        /* --- LOGO DRAWING ANIMATION --- */
        .logo-path {
            stroke-dasharray: 400; /* Comprimento aproximado da linha */
            stroke-dashoffset: 400;
            animation: drawLine 2.5s cubic-bezier(0.5, 0, 0.2, 1) forwards, neonPulse 3s infinite alternate 2.5s;
        }

        @keyframes drawLine {
            0% { stroke-dashoffset: 400; opacity: 0; }
            10% { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 1; }
        }

        @keyframes neonPulse {
            0% { filter: drop-shadow(0 0 2px rgba(242, 13, 242, 0.5)); stroke-width: 12; }
            100% { filter: drop-shadow(0 0 15px rgba(0, 212, 255, 0.8)); stroke-width: 13; }
        }

        /* --- PLAY ICON POP --- */
        .play-icon {
            opacity: 0;
            transform-origin: center;
            transform: scale(0);
            animation: popIcon 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards 1.5s;
        }

        @keyframes popIcon {
            0% { opacity: 0; transform: scale(0) rotate(-45deg); }
            100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        /* --- TEXT ANIMATIONS --- */
        .animate-slide-up-char {
            opacity: 0;
            transform: translateY(40px);
            animation: slideUpChar 0.6s cubic-bezier(0.2, 1, 0.3, 1) forwards;
        }

        @keyframes slideUpChar {
            to { opacity: 1; transform: translateY(0); }
        }

        .animate-expand-line {
            animation: expandLine 1s cubic-bezier(0.2, 1, 0.3, 1) forwards 2.5s;
        }

        @keyframes expandLine {
            0% { w: 0; opacity: 0; }
            100% { width: 100px; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
