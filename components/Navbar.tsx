
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
        <div 
          onClick={onGoHome}
          className="text-2xl font-bold bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform"
        >
          CineMaster AI
        </div>
        
        <form onSubmit={handleSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies..."
            className="w-full bg-white/10 border border-white/20 rounded-full px-5 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm placeholder-white/50"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/70">
          <button onClick={onGoHome} className="hover:text-white transition-colors">Trending</button>
          <button onClick={() => window.location.hash = '#/ai-guide'} className="hover:text-white transition-colors flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            AI Guide
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
