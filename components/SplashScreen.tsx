
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [exiting, setExiting] = useState(false);
  const [stars, setStars] = useState<{top: string, left: string, delay: string, size: string}[]>([]);

  useEffect(() => {
    // Gerar estrelas aleatórias para o fundo "Void"
    const newStars = Array.from({ length: 50 }).map(() => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        size: `${Math.random() * 2 + 1}px`
    }));
    setStars(newStars);

    // Sequência de Tempo
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onFinish, 1000); // Tempo da transição de saída (zoom out)
    }, 4500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#000000] flex flex-col items-center justify-center overflow-hidden transition-all duration-1000 cubic-bezier(0.85, 0, 0.15, 1) ${exiting ? 'opacity-0 scale-150 blur-2xl pointer-events-none' : 'opacity-100 scale-100'}`}>
      
      {/* --- ATMOSPHERE LAYERS --- */}
      
      {/* 1. Deep Space Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a0526_0%,#000000_100%)]"></div>
      
      {/* 2. Moving Stars (The Void) */}
      <div className="absolute inset-0 z-0 opacity-60">
        {stars.map((star, i) => (
            <div 
                key={i} 
                className="absolute bg-white rounded-full animate-twinkle"
                style={{
                    top: star.top, 
                    left: star.left, 
                    width: star.size, 
                    height: star.size,
                    animationDelay: star.delay
                }}
            />
        ))}
      </div>

      {/* 3. Subtle Grid Floor (Cyberpunk feel) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(242,13,242,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)] transform perspective-[500px] rotate-x-12 opacity-40"></div>

      {/* --- MAIN LOGO COMPOSITION --- */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* SVG CONTAINER */}
        <div className="relative w-[340px] h-[260px] mb-6 filter drop-shadow-[0_0_0px_rgba(0,0,0,0)]">
            <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
                <defs>
                    {/* GRADIENT FOR GLOW */}
                    <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7c3aed" /> {/* Purple */}
                        <stop offset="50%" stopColor="#f20df2" /> {/* Magenta */}
                        <stop offset="100%" stopColor="#00d4ff" /> {/* Cyan */}
                    </linearGradient>
                    
                    {/* SUPER GLOW FILTER */}
                    <filter id="superGlow" height="300%" width="300%" x="-75%" y="-75%">
                        <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                        <feGaussianBlur stdDeviation="12" result="coloredBlur2" in="SourceGraphic"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="coloredBlur2" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* LAYER 1: THE GLOW (Blurred, Color) - Draws first */}
                <path 
                    d="M 20 20 L 55 110 L 95 30 Q 120 0 145 30 L 145 110" 
                    stroke="url(#neonGradient)" 
                    strokeWidth="14" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    fill="none"
                    className="draw-path opacity-60"
                    style={{filter: 'blur(8px)'}}
                />

                {/* LAYER 2: THE TUBE (Sharp, White-ish) - Draws second with flicker */}
                <path 
                    d="M 20 20 L 55 110 L 95 30 Q 120 0 145 30 L 145 110" 
                    stroke="#fff" 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    fill="none"
                    className="draw-path neon-flicker"
                />
                
                {/* PLAY ICON (The "V" inset) */}
                <g className="play-icon-group">
                    {/* Glow */}
                    <path d="M 105 60 L 135 80 L 105 100 Z" fill="#00d4ff" filter="blur(6px)" opacity="0.6" />
                    {/* Core */}
                    <path d="M 105 60 L 135 80 L 105 100 Z" fill="#e0faff" />
                </g>
            </svg>

            {/* Sparkle Effect at the end of the M */}
            <div className="absolute top-[72%] right-[26%] w-1 h-1 bg-white rounded-full shadow-[0_0_20px_10px_rgba(0,212,255,0.8)] animate-spark-flash opacity-0"></div>
        </div>

        {/* TEXT LOGO - CINEMATIC REVEAL */}
        <div className="relative overflow-hidden">
            <h1 className="font-display font-black text-6xl md:text-7xl tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 animate-text-reveal opacity-0" style={{ textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                VOID MAX
            </h1>
            
            {/* Energy Line */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#f20df2] to-transparent animate-energy-line opacity-0 w-full"></div>
        </div>
      </div>

      {/* --- CSS ANIMATIONS (Injected) --- */}
      <style>{`
        /* 1. Drawing the Line */
        .draw-path {
            stroke-dasharray: 450;
            stroke-dashoffset: 450;
            animation: drawStroke 2s cubic-bezier(0.6, 0, 0.2, 1) forwards;
        }

        @keyframes drawStroke {
            0% { stroke-dashoffset: 450; }
            100% { stroke-dashoffset: 0; }
        }

        /* 2. Realistic Neon Ignition (Flicker) */
        .neon-flicker {
            animation: 
                drawStroke 2s cubic-bezier(0.6, 0, 0.2, 1) forwards,
                ignite 3s linear forwards 1.8s; /* Starts after drawing */
        }

        @keyframes ignite {
            0%, 2%, 4%, 6% { opacity: 0.1; stroke: #444; } /* Off */
            1%, 3%, 5% { opacity: 0.8; stroke: #fff; } /* Flash */
            7% { opacity: 0.1; stroke: #444; }
            8%, 20% { opacity: 1; stroke: #fff; filter: drop-shadow(0 0 5px #fff); } /* On */
            21% { opacity: 0.5; }
            22%, 100% { opacity: 1; stroke: #fff; filter: drop-shadow(0 0 10px #f20df2); } /* Stable On */
        }

        /* 3. Play Icon Pop */
        .play-icon-group {
            opacity: 0;
            transform-origin: 120px 80px;
            transform: scale(0);
            animation: iconPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards 2.2s;
        }

        @keyframes iconPop {
            to { opacity: 1; transform: scale(1); }
        }

        /* 4. Text Cinematic Reveal */
        .animate-text-reveal {
            animation: textReveal 1.5s cubic-bezier(0.2, 1, 0.3, 1) forwards 2s;
        }

        @keyframes textReveal {
            0% { opacity: 0; letter-spacing: 0.5em; filter: blur(10px); transform: scale(1.1); }
            100% { opacity: 1; letter-spacing: 0.2em; filter: blur(0px); transform: scale(1); }
        }

        /* 5. Energy Line Expansion */
        .animate-energy-line {
            animation: expandLine 1s ease-out forwards 2.5s;
        }

        @keyframes expandLine {
            0% { width: 0; opacity: 0; }
            50% { opacity: 1; }
            100% { width: 60%; opacity: 0.5; }
        }

        /* 6. Spark Flash at end of path */
        .animate-spark-flash {
            animation: spark 0.4s ease-out forwards 1.8s;
        }

        @keyframes spark {
            0% { opacity: 0; transform: scale(0); }
            50% { opacity: 1; transform: scale(2); }
            100% { opacity: 0; transform: scale(0); }
        }

        /* 7. Background Twinkle */
        @keyframes twinkle {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.5); }
        }
        .animate-twinkle {
            animation: twinkle 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
