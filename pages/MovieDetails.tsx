
import React, { useEffect, useState, useRef } from 'react';
import { tmdb } from '../services/tmdbService';
import { MovieDetails as MovieDetailsType, CastMember } from '../types';

interface MovieDetailsProps {
  id: string;
  onPlay: (config: { type: 'movie'; id: string }) => void;
}

const MovieDetails: React.FC<MovieDetailsProps> = ({ id, onPlay }) => {
  const [movie, setMovie] = useState<MovieDetailsType | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'more' | 'details'>('overview');
  const [inList, setInList] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; icon: string }>({
    visible: false,
    message: '',
    icon: 'check_circle',
  });

  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [movieData, castData] = await Promise.all([
          tmdb.getMovieDetails(id),
          tmdb.getMovieCast(id)
        ]);
        setMovie(movieData);
        setCast(castData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    window.scrollTo(0, 0);
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

  const handlePlay = () => {
    if (movie && movie.imdb_id) {
        onPlay({ type: 'movie', id: movie.imdb_id });
    } else {
        showToast('error', 'ID do filme não disponível');
    }
  };

  const showToast = (icon: string, message: string) => {
    setToast({ visible: true, message, icon });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const toggleMyList = () => {
    const newState = !inList;
    setInList(newState);
    showToast(newState ? 'playlist_add_check' : 'remove_done', newState ? 'Adicionado à Minha Lista' : 'Removido da lista');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  
  if (!movie) return (
    <div className="pt-24 px-6 text-center bg-background-dark min-h-screen">
      <p>Filme não encontrado.</p>
      <button onClick={() => window.history.back()} className="mt-4 text-primary font-bold">Voltar</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-dark animate-fade-in pb-20 overflow-x-hidden">
      
      {/* TOAST NOTIFICATION */}
      <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-surface/90 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300 ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <span className="material-symbols-rounded text-primary">{toast.icon}</span>
        <span className="text-sm font-medium">{toast.message}</span>
      </div>

      {/* NAVIGATION HEADER */}
      <nav className={`fixed top-0 left-0 w-full p-4 z-40 flex justify-between items-center transition-all duration-300 ${isScrolled ? 'bg-background-dark/85 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
        <button onClick={() => window.history.back()} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95">
          <span className="material-symbols-rounded text-white">arrow_back</span>
        </button>
        <div className="flex gap-3">
          <button onClick={() => showToast('cast', 'Transmitindo para TV')} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95">
            <span className="material-symbols-rounded text-white">cast</span>
          </button>
          <button className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95">
            <span className="material-symbols-rounded text-white">more_vert</span>
          </button>
        </div>
      </nav>

      {/* HERO SECTION (Parallax) */}
      <div className="relative w-full h-[65vh] md:h-[75vh] overflow-hidden">
        <div 
          ref={parallaxRef}
          className="absolute inset-0 w-full h-[120%] -top-[10%] bg-cover bg-center" 
          style={{ backgroundImage: `url(${tmdb.getBackdropUrl(movie.backdrop_path, 'original')})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        
        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 w-full p-6 pb-2 z-10 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-white uppercase tracking-wider shadow-[0_0_10px_rgba(242,13,242,0.4)]">Destaque</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 backdrop-blur-md text-white border border-white/10">4K UHD</span>
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-[0.9] tracking-tight drop-shadow-2xl mb-2">
            {movie.title}
          </h1>
          
          <div className="flex items-center flex-wrap gap-x-3 gap-y-2 text-white/80 text-sm font-medium">
            <span className="text-green-400 font-bold flex items-center gap-1">
              <span className="material-symbols-rounded text-sm">thumb_up</span> {Math.round(movie.vote_average * 10)}%
            </span>
            <span>{movie.release_date?.split('-')[0]}</span>
            <span>{movie.runtime}m</span>
            <span className="px-1.5 border border-white/30 rounded text-[10px]">12</span>
            <span>{movie.genres?.[0]?.name}</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div className="relative px-6 -mt-2 space-y-6 bg-background-dark z-20 rounded-t-3xl pt-6 ring-1 ring-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        
        {/* ACTION BUTTONS */}
        <div className="flex flex-col gap-3">
          <button onClick={handlePlay} className="w-full bg-white text-black font-display font-bold text-lg py-3.5 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-[0.98] shadow-xl">
            <span className="material-symbols-rounded fill-1 text-3xl">play_arrow</span>
            Assistir
          </button>
          <button onClick={() => showToast('smart_display', 'Trailer em breve')} className="w-full bg-white/10 hover:bg-white/15 border border-white/5 backdrop-blur-md text-white font-display font-medium text-lg py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
            <span className="material-symbols-rounded">smart_display</span>
            Trailer
          </button>
        </div>

        {/* UTILITY ICONS */}
        <div className="flex justify-between items-center px-4 py-2">
          <button onClick={toggleMyList} className="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
            <div className={`p-2 rounded-full transition-colors ${inList ? 'bg-primary text-white' : 'text-white hover:bg-white/10'}`}>
              <span className="material-symbols-rounded text-2xl">{inList ? 'check' : 'add'}</span>
            </div>
            <span className={`text-[10px] uppercase tracking-wide transition-colors ${inList ? 'text-primary' : 'text-white/50 group-hover:text-white'}`}>
              {inList ? 'Adicionado' : 'Minha Lista'}
            </span>
          </button>
          
          <button onClick={() => showToast('thumb_up', 'Obrigado pela avaliação!')} className="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
            <div className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
              <span className="material-symbols-rounded text-2xl">thumb_up</span>
            </div>
            <span className="text-[10px] text-white/50 group-hover:text-white uppercase tracking-wide">Avaliar</span>
          </button>
          
          <button onClick={() => showToast('share', 'Link copiado!')} className="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
            <div className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
              <span className="material-symbols-rounded text-2xl">ios_share</span>
            </div>
            <span className="text-[10px] text-white/50 group-hover:text-white uppercase tracking-wide">Compartilhar</span>
          </button>
          
          <button onClick={() => showToast('downloading', 'Download iniciado...')} className="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
            <div className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
              <span className="material-symbols-rounded text-2xl">download</span>
            </div>
            <span className="text-[10px] text-white/50 group-hover:text-white uppercase tracking-wide">Baixar</span>
          </button>
        </div>

        {/* TABS SYSTEM */}
        <div className="border-b border-white/10">
          <div className="flex gap-6 overflow-x-auto hide-scrollbar">
            <button 
              onClick={() => setActiveTab('overview')} 
              className={`pb-3 text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap border-b-2 ${activeTab === 'overview' ? 'text-primary border-primary' : 'text-white/60 border-transparent'}`}
            >
              Visão Geral
            </button>
            <button 
              onClick={() => setActiveTab('more')} 
              className={`pb-3 text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap border-b-2 ${activeTab === 'more' ? 'text-primary border-primary' : 'text-white/60 border-transparent'}`}
            >
              Relacionados
            </button>
            <button 
              onClick={() => setActiveTab('details')} 
              className={`pb-3 text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap border-b-2 ${activeTab === 'details' ? 'text-primary border-primary' : 'text-white/60 border-transparent'}`}
            >
              Detalhes
            </button>
          </div>
        </div>

        {/* TAB CONTENT: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="tab-content space-y-6 animate-fade-in">
            <div>
              <p className="text-white/70 leading-relaxed text-sm font-light">
                {movie.overview}
              </p>
              <p className="text-xs text-white/40 mt-3 italic font-medium">"{movie.tagline}"</p>
            </div>

            {/* Cast */}
            <div>
              <h3 className="font-display text-white font-bold text-lg mb-3">Elenco Principal</h3>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x">
                {cast.map(person => (
                  <div key={person.id} className="flex flex-col items-center gap-2 min-w-[90px] snap-start group cursor-pointer">
                    <div className="w-[90px] h-[90px] rounded-full overflow-hidden border-2 border-white/5 group-hover:border-primary transition-all duration-300">
                      <img 
                        src={person.profile_path ? `https://image.tmdb.org/t/p/w200${person.profile_path}` : `https://picsum.photos/seed/${person.id}/200`} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        alt={person.name}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-white text-[11px] font-bold leading-tight group-hover:text-primary transition-colors">{person.name}</p>
                      <p className="text-white/40 text-[10px] mt-0.5 truncate max-w-[80px]">{person.character}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: RELACIONADOS (Placeholder) */}
        {activeTab === 'more' && (
          <div className="tab-content animate-fade-in">
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-[2/3] rounded-lg overflow-hidden bg-surface animate-pulse-fast">
                   <div className="w-full h-full bg-white/5"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB CONTENT: DETAILS */}
        {activeTab === 'details' && (
          <div className="tab-content animate-fade-in space-y-6">
             <div className="bg-surface/50 rounded-2xl p-6 border border-white/5">
                <h3 className="font-display text-white font-bold text-lg mb-6">Avaliação dos Usuários</h3>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col gap-1 items-center">
                        <p className="text-white text-5xl font-display font-black leading-none tracking-tight">{(movie.vote_average).toFixed(1)}</p>
                        <div className="flex gap-0.5 my-1">
                            <span className="material-symbols-rounded text-primary text-[18px] fill-1">star</span>
                            <span className="material-symbols-rounded text-primary text-[18px] fill-1">star</span>
                            <span className="material-symbols-rounded text-primary text-[18px] fill-1">star</span>
                            <span className="material-symbols-rounded text-primary text-[18px] fill-1">star</span>
                            <span className="material-symbols-rounded text-primary text-[18px] fill-1">star_half</span>
                        </div>
                        <p className="text-white/40 text-[10px] font-normal">Basado em TMDb</p>
                    </div>
                    <div className="flex-1 space-y-2">
                         <div className="flex items-center gap-2 text-xs">
                             <span className="text-white w-2">5</span>
                             <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                               <div className="w-[85%] h-full bg-primary rounded-full shadow-[0_0_5px_#f20df2]"></div>
                             </div>
                         </div>
                         <div className="flex items-center gap-2 text-xs">
                             <span className="text-white w-2">4</span>
                             <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                               <div className="w-[10%] h-full bg-primary/50 rounded-full"></div>
                             </div>
                         </div>
                         <div className="flex items-center gap-2 text-xs">
                             <span className="text-white w-2">3</span>
                             <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                               <div className="w-[5%] h-full bg-primary/30 rounded-full"></div>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 space-y-4">
                <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-white/50 text-sm">Gênero</span>
                    <span className="text-white text-sm text-right">{movie.genres.map(g => g.name).join(', ')}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-white/50 text-sm">Status</span>
                    <span className="text-white text-sm">{movie.status}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-white/50 text-sm">Duração</span>
                    <span className="text-white text-sm">{movie.runtime} minutos</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-white/50 text-sm">Lançamento</span>
                    <span className="text-white text-sm">{new Date(movie.release_date).toLocaleDateString('pt-BR')}</span>
                </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MovieDetails;
