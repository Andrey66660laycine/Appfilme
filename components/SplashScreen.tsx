
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onFinish, 800);
    }, 4000); // 4 segundos de show

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#030303] flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ease-in-out ${exiting ? 'opacity-0 scale-110 blur-xl pointer-events-none' : 'opacity-100 scale-100'}`}>
      
      {/* --- LAYER 1: THE VOID ATMOSPHERE --- */}
      {/* Deep dark textured background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
      
      {/* Dynamic Fog/Smoke */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-10"></div>
      <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.15)_0%,transparent_50%)] animate-pulse-slow opacity-60"></div>
      
      {/* Heavy Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#000000_90%)] z-20"></div>

      {/* --- LAYER 2: THE GLITCH LOGO --- */}
      <div className="relative z-30 flex flex-col items-center scale-110 md:scale-125">
        
        {/* Container with Glitch Shake Animation */}
        <div className="relative w-[300px] h-[220px] mb-8 animate-glitch-shake">
            
            {/* SHADOW/GLOW BEHIND */}
            <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full animate-pulse-fast opacity-50"></div>

            <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible relative">
                <defs>
                    <linearGradient id="darkNeon" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#d946ef" /> {/* Fuchsia */}
                        <stop offset="50%" stopColor="#8b5cf6" /> {/* Violet */}
                        <stop offset="100%" stopColor="#0ea5e9" /> {/* Sky */}
                    </linearGradient>
                    
                    {/* Hard Glow Filter */}
                    <filter id="hardGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feOffset dx="0" dy="0" result="offsetblur"/>
                        <feFlood floodColor="#f20df2" floodOpacity="0.8"/>
                        <feComposite in2="offsetblur" operator="in"/>
                        <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {/* 1. RGB SPLIT LAYERS (The Glitch Effect) */}
                <path d="M 20 20 L 55 110 L 95 30 Q 120 0 145 30 L 145 110" stroke="red" strokeWidth="8" fill="none" className="opacity-0 animate-glitch-red mix-blend-screen" />
                <path d="M 20 20 L 55 110 L 95 30 Q 120 0 145 30 L 145 110" stroke="cyan" strokeWidth="8" fill="none" className="opacity-0 animate-glitch-blue mix-blend-screen" />

                {/* 2. MAIN LOGO PATH (Stroke Animation) */}
                <path 
                    d="M 20 20 L 55 110 L 95 30 Q 120 0 145 30 L 145 110" 
                    stroke="url(#darkNeon)" 
                    strokeWidth="10" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    fill="none"
                    className="animate-draw-snap"
                    style={{filter: 'url(#hardGlow)'}}
                />

                {/* 3. PLAY ICON (Aggressive Pop) */}
                <path 
                    d="M 105 60 L 135 80 L 105 100 Z" 
                    fill="#fff" 
                    className="animate-pop-flash"
                    style={{filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.8))'}}
                />
            </svg>
        </div>

        {/* --- LAYER 3: TEXT --- */}
        <div className="relative overflow-hidden">
            <h1 className="font-display font-black text-6xl md:text-7xl tracking-[0.3em] text-white opacity-0 animate-text-flicker mix-blend-overlay">
                VOID MAX
            </h1>
            {/* The "Scanner" Line */}
            <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 animate-scan-pass"></div>
        </div>

      </div>

      {/* --- CSS INJECTION --- */}
      <style>{`
        /* 1. AGGRESSIVE DRAWING */
        .animate-draw-snap {
            stroke-dasharray: 450;
            stroke-dashoffset: 450;
            animation: snapDraw 2.5s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }
        @keyframes snapDraw {
            0% { stroke-dashoffset: 450; opacity: 0; }
            10% { opacity: 1; }
            40% { stroke-dashoffset: 100; } /* Pause briefly */
            100% { stroke-dashoffset: 0; opacity: 1; }
        }

        /* 2. RGB GLITCH EFFECT */
        .animate-glitch-red { animation: glitchRed 2.5s steps(2, end) infinite; }
        .animate-glitch-blue { animation: glitchBlue 2.5s steps(2, end) infinite; }

        @keyframes glitchRed {
            0%, 80%, 100% { opacity: 0; transform: translate(0); }
            81% { opacity: 1; transform: translate(-4px, 2px); }
            83% { opacity: 0; transform: translate(0); }
            86% { opacity: 1; transform: translate(3px, -1px); }
            90% { opacity: 0; }
        }
        @keyframes glitchBlue {
            0%, 82%, 100% { opacity: 0; transform: translate(0); }
            83% { opacity: 1; transform: translate(4px, -2px); }
            85% { opacity: 0; transform: translate(0); }
            88% { opacity: 1; transform: translate(-3px, 1px); }
            92% { opacity: 0; }
        }

        /* 3. SHAKE */
        .animate-glitch-shake {
            animation: shake 3s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
            0%, 80% { transform: translate3d(0, 0, 0); }
            81% { transform: translate3d(-1px, 0, 0); }
            82% { transform: translate3d(2px, 0, 0); }
            83% { transform: translate3d(-4px, 0, 0); }
            84% { transform: translate3d(4px, 0, 0); }
            85% { transform: translate3d(-1px, 0, 0); }
            90%, 100% { transform: translate3d(0, 0, 0); }
        }

        /* 4. TEXT FLICKER (Broken Neon Bulb) */
        .animate-text-flicker {
            animation: textFlicker 3s linear forwards;
        }
        @keyframes textFlicker {
            0% { opacity: 0; letter-spacing: 1em; filter: blur(10px); }
            40% { opacity: 0.2; letter-spacing: 0.5em; filter: blur(5px); }
            45% { opacity: 0.8; }
            50% { opacity: 0.1; }
            55% { opacity: 1; text-shadow: 0 0 20px rgba(255,255,255,0.8); }
            60% { opacity: 0.4; }
            70% { opacity: 1; letter-spacing: 0.3em; filter: blur(0); text-shadow: 0 0 10px rgba(255,255,255,0.5); }
            100% { opacity: 1; letter-spacing: 0.3em; text-shadow: 0 0 0 transparent; }
        }

        /* 5. PLAY POP */
        .animate-pop-flash {
            opacity: 0;
            transform-origin: 120px 80px;
            animation: popFlash 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards 2s;
        }
        @keyframes popFlash {
            0% { opacity: 0; transform: scale(0) rotate(45deg); }
            50% { opacity: 1; transform: scale(1.5) rotate(0); fill: #fff; }
            100% { opacity: 1; transform: scale(1); fill: #00d4ff; }
        }

        /* 6. SCAN PASS */
        .animate-scan-pass {
            animation: scanPass 2s ease-in-out forwards 2s;
        }
        @keyframes scanPass {
            0% { left: -100%; opacity: 0; }
            50% { opacity: 1; }
            100% { left: 200%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
