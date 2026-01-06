
import React, { useEffect, useState, useRef } from 'react';
import { tmdb } from '../services/tmdbService';
import { SeriesDetails, Episode, CastMember } from '../types';

interface TVDetailsProps {
  id: string;
  onPlay: (config: { type: 'tv'; id: string; season: number; episode: number }) => void;
}

const TVDetails: React.FC<TVDetailsProps> = ({ id, onPlay }) => {
  const [series, setSeries] = useState<SeriesDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isSeasonMenuOpen, setIsSeasonMenuOpen] = useState(false);
  const [inList, setInList] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; icon: string }>({
    visible: false,
    message: '',
    icon: 'check_circle',
  });

  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSeriesData = async () => {
      try {
        const details = await tmdb.getTVDetails(id);
        if (details) {
          setSeries(details);
          if (details.seasons && details.seasons.length > 0) {
            // Find first season that is not season 0 (specials) usually, or just take the first one
            const firstSeason = details.seasons.find(s => s.season_number === 1) || details.seasons[0];
            const seasonNum = firstSeason ? firstSeason.season_number : 1;
            setSelectedSeason(seasonNum);
            
            const epData = await tmdb.getTVSeason(id, seasonNum);
            setEpisodes(epData);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSeriesData();
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

  const handleSeasonChange = async (seasonNumber: number) => {
    setSelectedSeason(seasonNumber);
    setIsSeasonMenuOpen(false);
    try {
      const epData = await tmdb.getTVSeason(id, seasonNumber);
      setEpisodes(epData);
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (icon: string, message: string) => {
    setToast({ visible: true, message, icon });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const toggleMyList = () => {
    const newState = !inList;
    setInList(newState);
    showToast(newState ? 'playlist_add_check' : 'remove_done', newState ? 'Adicionado à Minha Lista' : 'Removido da lista');
  };

  const playEpisode = (episodeNumber: number) => {
     onPlay({
        type: 'tv',
        id: id,
        season: selectedSeason,
        episode: episodeNumber
     });
  };

  const playFirstEpisode = () => {
      // Logic to play S1E1 or the first episode of current selected season
      const episodeToPlay = episodes.length > 0 ? episodes[0].episode_number : 1;
      playEpisode(episodeToPlay);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!series) return (
    <div className="pt-24 px-6 text-center bg-background-dark min-h-screen">
      <p>Série não encontrada.</p>
      <button onClick={() => window.history.back()} className="mt-4 text-primary font-bold">Voltar</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-dark animate-fade-in pb-20 overflow-x-hidden">
      
      {/* TOAST */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-surface/90 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300 ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-[-20px] opacity-0'}`}>
        <span className="material-symbols-rounded text-primary">{toast.icon}</span>
        <span className="text-sm font-medium">{toast.message}</span>
      </div>

      {/* NAVIGATION */}
      <nav className={`fixed top-0 left-0 w-full p-4 z-40 flex justify-between items-center transition-all duration-500 ${isScrolled ? 'bg-background-dark/90 backdrop-blur-xl border-b border-white/5' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
        <button onClick={() => window.history.back()} className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <span className="material-symbols-rounded text-white">arrow_back</span>
        </button>
        <div className="flex gap-3">
          <button onClick={() => showToast('cast', 'Transmitindo...')} className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <span className="material-symbols-rounded text-white">cast</span>
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="relative w-full h-[60vh] lg:h-[70vh] overflow-hidden">
        <div 
          ref={parallaxRef}
          className="absolute inset-0 w-full h-[120%] -top-[10%] bg-cover bg-center" 
          style={{ backgroundImage: `url(${tmdb.getBackdropUrl(series.backdrop_path, 'original')})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background-dark/90 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 w-full p-6 pb-4 z-10 max-w-4xl mx-auto lg:ml-10">
          <div className="flex items-center gap-2 mb-3 animate-fade-in-up">
            <span className="text-xs font-bold text-white/60 tracking-widest uppercase">• Série Original</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-none tracking-tight drop-shadow-2xl mb-4 animate-fade-in-up">
            {series.name}
          </h1>

          <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-white/80 font-medium mb-6 animate-fade-in-up">
            <span className="text-green-400 font-bold">{Math.round(series.vote_average * 10)}% Match</span>
            <span>{series.first_air_date?.split('-')[0]}</span>
            <span className="bg-white/20 px-1.5 rounded text-xs border border-white/10">16+</span>
            <span>{series.number_of_seasons} Temporadas</span>
            <span className="border border-white/30 px-1.5 rounded text-[10px] uppercase">4K HDR</span>
          </div>

          <div className="flex gap-3 animate-fade-in-up">
            <button onClick={playFirstEpisode} className="bg-white text-black px-6 py-3 rounded-xl font-bold font-display flex items-center gap-2 hover:bg-gray-200 transition-colors active:scale-95 shadow-xl">
              <span className="material-symbols-rounded fill-1">play_arrow</span>
              Assistir
            </button>
            <button onClick={toggleMyList} className={`px-4 py-3 rounded-xl flex items-center justify-center transition active:scale-95 backdrop-blur-md border ${inList ? 'bg-primary border-primary text-white' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}>
              <span className="material-symbols-rounded">{inList ? 'check' : 'add'}</span>
            </button>
          </div>
          
          <p className="mt-4 text-white/70 text-sm line-clamp-2 max-w-lg font-light animate-fade-in-up">
            {series.overview}
          </p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-20 bg-background-dark min-h-screen -mt-2 rounded-t-3xl border-t border-white/5 shadow-[0_-10px_50px_rgba(0,0,0,1)]">
        
        {/* TABS */}
        <div className="sticky top-[72px] z-30 bg-background-dark/95 backdrop-blur-xl border-b border-white/5">
          <div className="flex px-6 gap-8 overflow-x-auto hide-scrollbar">
            <button className="py-4 text-sm font-bold text-primary border-b-2 border-primary uppercase tracking-wide">Episódios</button>
            <button className="py-4 text-sm font-bold text-white/50 border-b-2 border-transparent hover:text-white uppercase tracking-wide transition-colors">Relacionados</button>
            <button className="py-4 text-sm font-bold text-white/50 border-b-2 border-transparent hover:text-white uppercase tracking-wide transition-colors">Detalhes</button>
          </div>
        </div>

        {/* EPISODES */}
        <div className="p-6 max-w-4xl mx-auto">
            
            <div className="relative mb-6 z-20">
                <button 
                  onClick={() => setIsSeasonMenuOpen(!isSeasonMenuOpen)} 
                  className="flex items-center gap-2 text-xl font-display font-bold text-white hover:text-white/80 transition-colors"
                >
                    <span>Temporada {selectedSeason}</span>
                    <span className={`material-symbols-rounded text-2xl transition-transform ${isSeasonMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                <p className="text-xs text-white/40 mt-1">{episodes.length} Episódios</p>

                {/* Dropdown Menu */}
                {isSeasonMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-surface/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 animate-slide-down p-1 max-h-60 overflow-y-auto">
                    {series.seasons.filter(s => s.season_number > 0).map(s => (
                      <button 
                        key={s.id}
                        onClick={() => handleSeasonChange(s.season_number)} 
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg flex justify-between items-center group transition-colors ${selectedSeason === s.season_number ? 'text-primary' : 'text-white hover:bg-white/10'}`}
                      >
                        Temporada {s.season_number}
                        {selectedSeason === s.season_number && <span className="material-symbols-rounded text-sm">check</span>}
                      </button>
                    ))}
                  </div>
                )}
            </div>

            <div className="space-y-6">
                {episodes.map((ep, index) => (
                  <div key={ep.id} className="group flex flex-col sm:flex-row gap-4 p-3 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer" onClick={() => playEpisode(ep.episode_number)}>
                    <div className="relative w-full sm:w-[180px] aspect-video rounded-xl overflow-hidden bg-surface shrink-0">
                        <img 
                          src={ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : tmdb.getBackdropUrl(series.backdrop_path)} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                          alt={ep.name}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                <span className="material-symbols-rounded fill-1">play_arrow</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-1.5">
                        <div className="flex justify-between items-start">
                            <h3 className="text-white font-bold text-base leading-tight group-hover:text-primary transition-colors">{ep.episode_number}. {ep.name}</h3>
                            <button className="text-white/30 hover:text-white transition-colors p-1" onClick={(e) => { e.stopPropagation(); showToast('download', 'Baixando episódio...'); }}>
                                <span className="material-symbols-rounded text-xl">download</span>
                            </button>
                        </div>
                        <span className="text-white/40 text-xs font-medium">S{selectedSeason} E{ep.episode_number} • {ep.air_date ? new Date(ep.air_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'TBA'}</span>
                        <p className="text-white/60 text-xs leading-relaxed line-clamp-2">{ep.overview}</p>
                    </div>
                  </div>
                ))}
            </div>
            
        </div>
      </div>
    </div>
  );
};

export default TVDetails;
