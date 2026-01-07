
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
        {/* Elegant Dark Brand */}
        <div 
          onClick={onGoHome}
          className="group cursor-pointer flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <span className="material-symbols-rounded text-white/80 text-lg">movie</span>
          </div>
          <div className="flex flex-col leading-none">
             <span className="font-display font-bold text-xl tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 drop-shadow-sm group-hover:to-white transition-all duration-500 uppercase">
               VOID
             </span>
             <span className="font-display font-light text-[10px] tracking-[0.4em] text-white/40 uppercase group-hover:text-primary transition-colors duration-300">
               MAX
             </span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full bg-black/40 border border-white/10 rounded-full px-5 py-2.5 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm placeholder-white/30 text-white font-light"
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
