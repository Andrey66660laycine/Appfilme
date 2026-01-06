
import React, { useEffect, useState, useContext } from 'react';
import { storageService } from '../services/storageService';
import { LibraryItem } from '../types';
import { tmdb } from '../services/tmdbService';
import { ProfileContext } from '../App';

interface LibraryProps {
  onMovieClick: (id: number, type?: 'movie' | 'tv') => void;
}

const Library: React.FC<LibraryProps> = ({ onMovieClick }) => {
  const currentProfile = useContext(ProfileContext);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<LibraryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'movie' | 'series' | 'unwatched'>('all');
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  useEffect(() => {
    loadLibrary();
  }, [currentProfile]);

  useEffect(() => {
    applyFilter();
  }, [filter, items, progressMap]);

  const loadLibrary = async () => {
    if (!currentProfile) return;
    const lib = await storageService.getLibrary(currentProfile.id);
    setItems(lib);
    
    // Calculate progress for each item
    const newProgressMap: Record<string, number> = {};
    
    await Promise.all(lib.map(async (item) => {
        const key = `${item.type}-${item.id}`;
        const prog = await storageService.getProgress(currentProfile.id, item.id, item.type);
        newProgressMap[key] = prog;
    }));
    
    setProgressMap(newProgressMap);
  };

  const applyFilter = () => {
    let result = items;
    if (filter === 'movie') result = items.filter(i => i.type === 'movie');
    if (filter === 'series') result = items.filter(i => i.type === 'tv');
    if (filter === 'unwatched') {
        result = items.filter(i => {
            const prog = progressMap[`${i.type}-${i.id}`] || 0;
            return prog === 0;
        });
    }
    setFilteredItems(result);
  };

  const toggleManageMode = () => {
    setIsManageMode(!isManageMode);
    setSelectedIds(new Set());
  };

  const handleCardClick = (item: LibraryItem) => {
    if (isManageMode) {
      const key = `${item.type}-${item.id}`;
      const newSelected = new Set(selectedIds);
      if (newSelected.has(key)) {
        newSelected.delete(key);
      } else {
        newSelected.add(key);
      }
      setSelectedIds(newSelected);
    } else {
      onMovieClick(item.id, item.type);
    }
  };

  const selectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      const newSelected = new Set<string>();
      filteredItems.forEach(i => newSelected.add(`${i.type}-${i.id}`));
      setSelectedIds(newSelected);
    }
  };

  const deleteSelected = async () => {
    if (!currentProfile) return;
    const idsToDelete = Array.from(selectedIds);
    
    for (const key of idsToDelete) {
        const item = items.find(i => `${i.type}-${i.id}` === key);
        if (item) {
            await storageService.removeFromLibrary(currentProfile.id, item.id, item.type);
        }
    }
    
    setIsManageMode(false);
    loadLibrary(); // Reload
  };

  return (
    <div className="min-h-screen pb-32 bg-background-dark relative overflow-hidden">
      
      {/* INJECTED STYLES FROM DESIGN */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .mesh-gradient {
            background: radial-gradient(at 0% 0%, rgba(242, 13, 242, 0.15) 0px, transparent 50%),
                        radial-gradient(at 100% 0%, rgba(88, 28, 135, 0.15) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(242, 13, 242, 0.05) 0px, transparent 50%),
                        radial-gradient(at 0% 100%, rgba(15, 23, 42, 0.15) 0px, transparent 50%);
            background-color: #050505;
        }

        .glass-nav-lib {
            background: rgba(5, 5, 5, 0.7);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .custom-checkbox {
            appearance: none;
            background-color: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            display: grid;
            place-content: center;
            transition: all 0.2s ease;
        }
        .custom-checkbox::before {
            content: "";
            width: 10px;
            height: 10px;
            border-radius: 50%;
            transform: scale(0);
            transition: 0.2s transform ease-in-out;
            box-shadow: inset 1em 1em white;
        }
        .custom-checkbox:checked {
            background-color: #f20df2;
            border-color: #f20df2;
        }
        .custom-checkbox:checked::before {
            transform: scale(1);
        }
      `}</style>

      {/* BACKGROUND */}
      <div className="fixed inset-0 mesh-gradient pointer-events-none z-0"></div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 glass-nav-lib px-4 py-4 md:py-6 transition-all duration-300">
        <div className="max-w-6xl mx-auto flex flex-col gap-5">
            
            {/* Top Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="font-display font-bold text-3xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Minha Biblioteca</h1>
                    <span className="bg-white/5 text-primary text-xs font-bold px-2.5 py-1 rounded-full border border-white/5 shadow-inner">
                        {filteredItems.length}
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={toggleManageMode} className={`px-5 py-2 rounded-full border text-sm font-medium transition-all active:scale-95 flex items-center gap-2 ${isManageMode ? 'bg-primary border-primary text-white' : 'bg-white/5 hover:bg-white/10 border-white/5 text-white'}`}>
                        <span className="material-symbols-rounded text-lg">tune</span>
                        <span>{isManageMode ? 'Concluir' : 'Gerir'}</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between overflow-x-auto hide-scrollbar pb-1">
                <div className="flex gap-2 p-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-md">
                    <button onClick={() => setFilter('all')} className={`relative px-5 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'all' ? 'text-black bg-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                        Tudo
                    </button>
                    <button onClick={() => setFilter('movie')} className={`relative px-5 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'movie' ? 'text-black bg-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                        Filmes
                    </button>
                    <button onClick={() => setFilter('series')} className={`relative px-5 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'series' ? 'text-black bg-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                        Séries
                    </button>
                    <button onClick={() => setFilter('unwatched')} className={`relative px-5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${filter === 'unwatched' ? 'text-black bg-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                        {filter !== 'unwatched' && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
                        Não Vistos
                    </button>
                </div>
            </div>
        </div>
      </header>

      {/* CONTENT GRID */}
      <main className="max-w-6xl mx-auto px-4 py-6 relative z-10">
          
          {filteredItems.length === 0 ? (
             /* EMPTY STATE */
             <div className="min-h-[50vh] flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="relative w-40 h-40 mb-6">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse-slow"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-rounded text-[80px] text-white/10 rotate-12">bookmark_border</span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-rounded text-[50px] text-white/30 -rotate-12 translate-x-4 translate-y-4">movie</span>
                    </div>
                </div>
                <h2 className="text-2xl font-display font-bold text-white mb-2">Sua biblioteca está vazia</h2>
                <p className="text-white/40 text-sm max-w-sm mb-8 leading-relaxed">
                   {filter !== 'all' ? 'Nenhum item encontrado neste filtro.' : 'Parece que ainda não guardou nada. Explore os títulos e adicione os seus favoritos para vê-los aqui.'}
                </p>
            </div>
          ) : (
             /* GRID */
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {filteredItems.map((item, index) => {
                    const progress = progressMap[`${item.type}-${item.id}`] || 0;
                    const isSelected = selectedIds.has(`${item.type}-${item.id}`);
                    
                    return (
                        <div 
                            key={`${item.type}-${item.id}`}
                            onClick={() => handleCardClick(item)}
                            className={`poster-card relative group aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ring-1 bg-surface-light animate-slide-up-fade ${isManageMode ? 'scale-[0.95]' : ''} ${isSelected ? 'ring-2 ring-primary shadow-lg' : 'ring-white/5 hover:ring-white/20 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]'} ${isManageMode && !isSelected ? 'brightness-75' : ''}`}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <img src={tmdb.getPosterUrl(item.poster_path)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />

                            {/* Selection Overlay (Manage Mode) */}
                            <div className={`selection-overlay absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-none transition-opacity duration-300 z-30 flex items-center justify-center ${isManageMode ? 'opacity-100' : 'opacity-0'}`}>
                                <input type="checkbox" checked={isSelected} readOnly className="custom-checkbox w-8 h-8 pointer-events-none" />
                            </div>

                            {/* Hover Actions (Normal Mode) */}
                            {!isManageMode && (
                                <div className="poster-overlay absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-300 flex flex-col justify-center items-center p-3 z-20 group-hover:opacity-100">
                                    <button className="w-12 h-12 rounded-full bg-primary hover:bg-primary-hover text-white shadow-[0_0_15px_#f20df2] flex items-center justify-center transition-all hover:scale-110 active:scale-95">
                                        <span className="material-symbols-rounded text-3xl ml-1">play_arrow</span>
                                    </button>
                                </div>
                            )}

                            {/* Tags */}
                            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                                {progress >= 100 && (
                                    <span className="bg-green-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg tracking-wider border border-white/10">VISTO</span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="poster-info absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-20 transform translate-y-2 opacity-90 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                                <h3 className="font-bold text-white text-sm leading-tight line-clamp-1 mb-1 drop-shadow-md">{item.title}</h3>
                                <div className="flex items-center gap-2 text-[10px] text-white/60 font-medium">
                                    <span>{item.type === 'movie' ? 'Filme' : 'Série'}</span>
                                    <span>•</span>
                                    <span>{item.release_date ? item.release_date.split('-')[0] : 'N/A'}</span>
                                </div>
                                
                                {/* Progress Bar */}
                                {item.type === 'tv' && progress > 0 && progress < 100 && (
                                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-2">
                                        <div className="h-full bg-primary shadow-[0_0_8px_#f20df2]" style={{ width: `${progress}%` }}></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
             </div>
          )}
      </main>

      {/* BULK ACTION BAR */}
      <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${isManageMode && selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0'}`}>
          <div className="bg-surface-light/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 pl-6 flex items-center gap-6">
            <div className="flex items-center gap-2">
                <span className="text-primary font-bold text-lg font-display">{selectedIds.size}</span>
                <span className="text-xs text-white/50 uppercase tracking-wide font-medium">Selecionados</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div className="flex gap-2">
                <button onClick={selectAll} className="p-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors" title="Selecionar Tudo">
                    <span className="material-symbols-rounded">select_all</span>
                </button>
                <button onClick={deleteSelected} className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl font-bold transition-all text-sm flex items-center gap-2">
                    <span className="material-symbols-rounded">delete</span>
                    Remover
                </button>
            </div>
        </div>
      </div>

    </div>
  );
};

export default Library;
