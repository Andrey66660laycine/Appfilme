
import React, { useEffect, useState, useRef } from 'react';
import { tmdb } from '../services/tmdbService';
import { Movie } from '../types';

interface CollectionDetailsProps {
  id: string;
  onMovieClick: (id: number, type?: 'movie' | 'tv') => void;
}

const CollectionDetails: React.FC<CollectionDetailsProps> = ({ id, onMovieClick }) => {
  const [collection, setCollection] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCollection = async () => {
      setLoading(true);
      try {
        const data = await tmdb.getCollection(Number(id));
        if (data) {
            // Sort movies by release date
            data.parts.sort((a: any, b: any) => {
                const dateA = new Date(a.release_date || '9999-12-31').getTime();
                const dateB = new Date(b.release_date || '9999-12-31').getTime();
                return dateA - dateB;
            });
            setCollection(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchCollection();
    window.scrollTo(0,0);
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 50);
      if (parallaxRef.current) {
        parallaxRef.current.style.transform = `translate3d(0, ${scrollY * 0.4}px, 0)`;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-dark">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
  }

  if (!collection) return null;

  return (
    <div className="min-h-screen bg-background-dark animate-fade-in pb-20 overflow-x-hidden">
        
        {/* NAVIGATION HEADER */}
        <nav className={`fixed top-0 left-0 w-full p-4 z-40 flex items-center gap-4 transition-all duration-300 ${isScrolled ? 'bg-background-dark/85 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
            <button onClick={() => window.history.back()} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95">
                <span className="material-symbols-rounded text-white">arrow_back</span>
            </button>
            <span className={`text-white font-display font-bold text-lg transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0'}`}>
                {collection.name}
            </span>
        </nav>

        {/* HERO SECTION */}
        <div className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden">
            <div 
                ref={parallaxRef}
                className="absolute inset-0 w-full h-[120%] -top-[10%] bg-cover bg-center" 
                style={{ backgroundImage: `url(${tmdb.getBackdropUrl(collection.backdrop_path, 'original')})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
            
            <div className="absolute bottom-0 left-0 w-full p-6 pb-10 z-10 flex flex-col items-center text-center animate-slide-up">
                <h1 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight drop-shadow-2xl mb-4 tracking-tight">
                    {collection.name}
                </h1>
                <p className="text-white/70 text-sm md:text-base max-w-2xl line-clamp-3 font-light leading-relaxed">
                    {collection.overview}
                </p>
                <div className="mt-6 flex items-center gap-2">
                    <span className="bg-primary/20 border border-primary/30 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(242,13,242,0.3)]">
                        Coleção Completa
                    </span>
                    <span className="bg-white/10 border border-white/10 text-white px-3 py-1 rounded-full text-xs font-bold">
                        {collection.parts.length} Filmes
                    </span>
                </div>
            </div>
        </div>

        {/* MOVIES LIST */}
        <div className="max-w-6xl mx-auto px-4 py-10 relative z-20">
            <h2 className="text-2xl font-display font-bold text-white mb-8 border-l-4 border-primary pl-4">Ordem de Lançamento</h2>
            
            <div className="space-y-6">
                {collection.parts.map((movie: any, index: number) => (
                    <div 
                        key={movie.id}
                        onClick={() => onMovieClick(movie.id, 'movie')}
                        className="group relative flex flex-col md:flex-row gap-6 bg-surface border border-white/5 rounded-2xl p-4 hover:border-primary/50 transition-all cursor-pointer hover:bg-white/5 hover:scale-[1.01] overflow-hidden"
                    >
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Number Badge */}
                        <div className="absolute -left-2 -top-2 w-10 h-10 bg-primary text-white font-display font-bold text-xl flex items-center justify-center rounded-br-2xl rounded-tl-xl shadow-lg z-20">
                            {index + 1}
                        </div>

                        {/* Poster */}
                        <div className="w-full md:w-[160px] aspect-[2/3] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 z-10">
                            <img 
                                src={tmdb.getPosterUrl(movie.poster_path)} 
                                alt={movie.title} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-center z-10">
                            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-primary transition-colors">{movie.title}</h3>
                            <div className="flex items-center gap-4 text-xs font-medium text-white/50 mb-3">
                                <span className="flex items-center gap-1 text-yellow-400">
                                    <span className="material-symbols-rounded text-sm fill-1">star</span>
                                    {movie.vote_average.toFixed(1)}
                                </span>
                                <span>{movie.release_date ? movie.release_date.split('-')[0] : 'TBA'}</span>
                                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] border border-white/10 uppercase">Filme</span>
                            </div>
                            <p className="text-white/60 text-sm line-clamp-3 leading-relaxed mb-4">
                                {movie.overview || "Sem descrição disponível."}
                            </p>
                            <div className="mt-auto">
                                <span className="text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-2 transition-transform">
                                    Assistir Agora <span className="material-symbols-rounded text-sm">arrow_forward</span>
                                </span>
                            </div>
                        </div>
                        
                        {/* Backdrop Ghost (Desktop Only) */}
                        <div className="absolute right-0 top-0 w-2/3 h-full hidden md:block mask-image-gradient opacity-10 group-hover:opacity-20 transition-opacity">
                             <img src={tmdb.getBackdropUrl(movie.backdrop_path)} className="w-full h-full object-cover mix-blend-overlay" />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <style>{`
            .mask-image-gradient {
                mask-image: linear-gradient(to right, transparent, black);
                -webkit-mask-image: linear-gradient(to right, transparent, black);
            }
        `}</style>
    </div>
  );
};

export default CollectionDetails;
