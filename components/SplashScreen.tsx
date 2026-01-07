
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Sequência mais rápida e elegante
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onFinish, 800);
    }, 3500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden transition-all duration-800 cubic-bezier(0.22, 1, 0.36, 1) ${exiting ? 'opacity-0 scale-110 pointer-events-none blur-xl' : 'opacity-100 scale-100'}`}>
      
      {/* --- ATMOSPHERE (DARK MINIMALIST) --- */}
      
      {/* 1. Film Noise Texture (Premium Feel) */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-screen pointer-events-none"></div>

      {/* 2. Ambient Void Light (Subtle Pulse behind logo) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow opacity-40"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] animate-pulse-slow opacity-30" style={{ animationDelay: '1s' }}></div>

      {/* --- CONTENT --- */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* LOGO CONTAINER */}
        <div className="relative w-72 h-52 md:w-96 md:h-64 mb-8 flex items-center justify-center">
            
            <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
                <defs>
                    {/* ULTRA NEON GRADIENT */}
                    <linearGradient id="solidNeon" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7c3aed" /> {/* Deep Purple */}
                        <stop offset="50%" stopColor="#f20df2" /> {/* Neon Pink */}
                        <stop offset="100%" stopColor="#00d4ff" /> {/* Cyan */}
                    </linearGradient>

                    {/* GLOW FILTER */}
                    <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {/* THE LOGO (Solid, revealing from blur) */}
                <g className="animate-cinematic-reveal">
                    {/* The "VM" Wave Shape */}
                    <path 
                        d="M 20 20 L 55 110 L 95 30 Q 120 0 145 30 L 145 110" 
                        stroke="url(#solidNeon)" 
                        strokeWidth="22" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        fill="none"
                        style={{ filter: 'url(#softGlow)' }}
                    />
                    
                    {/* The Play Button (Triangle) */}
                    <path 
                        d="M 110 65 L 135 80 L 110 95 Z" 
                        fill="#fff" 
                        style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))' }}
                    />
                </g>

                {/* SHIMMER EFFECT (Light passing through) */}
                <rect x="0" y="0" width="200" height="150" fill="url(#shimmerGradient)" mask="url(#logoMask)" className="animate-shimmer-pass opacity-30 mix-blend-overlay"/>
            </svg>
        </div>

        {/* TEXT (Elegant Fade) */}
        <div className="flex flex-col items-center animate-fade-up-slow">
            <h1 className="font-display font-black text-5xl md:text-6xl tracking-[0.3em] text-white mix-blend-screen drop-shadow-lg">
                VOID
            </h1>
            <div className="flex items-center gap-3 w-full justify-center mt-2">
                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-white/50"></div>
                <span className="font-display text-[10px] tracking-[0.5em] text-white/50 uppercase">Cinematic</span>
                <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-white/50"></div>
            </div>
        </div>
      </div>

      {/* CSS STYLES INJECTED */}
      <style>{`
        /* 1. CINEMATIC REVEAL (Blur -> Focus) */
        .animate-cinematic-reveal {
            animation: cinematicIn 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes cinematicIn {
            0% { 
                opacity: 0; 
                filter: blur(30px) brightness(2); 
                transform: scale(0.9) translateY(20px);
            }
            100% { 
                opacity: 1; 
                filter: blur(0px) brightness(1); 
                transform: scale(1) translateY(0);
            }
        }

        /* 2. TEXT FADE UP */
        .animate-fade-up-slow {
            animation: fadeUp 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
        }

        @keyframes fadeUp {
            0% { opacity: 0; transform: translateY(10px); letter-spacing: 0.5em; }
            40% { opacity: 0; }
            100% { opacity: 1; transform: translateY(0); letter-spacing: 0.3em; }
        }

        /* 3. PULSE BACKGROUND */
        .animate-pulse-slow {
            animation: pulseDeep 6s infinite ease-in-out;
        }
        
        @keyframes pulseDeep {
            0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.5; transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
