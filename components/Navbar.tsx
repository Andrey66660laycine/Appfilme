
import React, { useState } from 'react';

interface NavbarProps {
  onSearch: (query: string) => void;
  onGoHome: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearch, onGoHome }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-morphism px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* NEW LOGO: VM Monogram + Text */}
        <div 
          onClick={onGoHome}
          className="group cursor-pointer flex items-center gap-3"
        >
          {/* Mini SVG Logo */}
          <div className="w-10 h-8 relative transition-transform duration-300 group-hover:scale-110">
            <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(242,13,242,0.6)]">
                <defs>
                    <linearGradient id="navGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="50%" stopColor="#f20df2" />
                        <stop offset="100%" stopColor="#00d4ff" />
                    </linearGradient>
                </defs>
                <path 
                    d="M 20 20 L 55 110 L 95 30 Q 120 0 145 30 L 145 110" 
                    stroke="url(#navGradient)" 
                    strokeWidth="25" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    fill="none"
                />
                <path 
                    d="M 110 65 L 135 80 L 110 95 Z" 
                    fill="#00d4ff" 
                />
            </svg>
          </div>

          <div className="flex flex-col leading-none">
             <span className="font-display font-bold text-xl tracking-[0.2em] text-white drop-shadow-sm group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-primary transition-all duration-500 uppercase">
               VOID
             </span>
             <div className="flex items-center gap-1">
                 <div className="h-[1px] w-full bg-primary/50"></div>
                 <span className="font-display font-bold text-[9px] tracking-[0.3em] text-white/50 uppercase group-hover:text-primary transition-colors duration-300">
                   MAX
                 </span>
             </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full bg-black/40 border border-white/10 rounded-full px-5 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-sm placeholder-white/30 text-white font-light shadow-inner"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
            <span className="material-symbols-rounded text-xl">search</span>
          </button>
        </form>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
          <button onClick={onGoHome} className="hover:text-white transition-colors text-xs uppercase tracking-widest hover:shadow-[0_0_10px_rgba(255,255,255,0.3)]">Início</button>
          <button onClick={() => window.location.hash = '#/ai-guide'} className="hover:text-white transition-colors flex items-center gap-2 text-xs uppercase tracking-widest group">
            <span className="w-1.5 h-1.5 rounded-full bg-primary group-hover:shadow-[0_0_10px_#f20df2] transition-shadow"></span>
            AI Guide
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
