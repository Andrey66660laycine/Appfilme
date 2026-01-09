
import React, { useEffect, useState } from 'react';
import { DownloadItem } from '../types';

const Downloads: React.FC = () => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState("Calculando...");

  useEffect(() => {
    // Escuta atualizações do Android
    window.updateDownloadList = (jsonString: string) => {
        try {
            const list = JSON.parse(jsonString);
            setDownloads(list);
            setLoading(false);
        } catch (e) {
            console.error("Erro ao parsear downloads", e);
        }
    };

    // Solicita lista inicial
    if (window.Android && window.Android.getDownloads) {
        try {
            window.Android.getDownloads();
        } catch(e) {
            console.error(e);
            setLoading(false);
        }
    } else {
        // Mock data para teste no browser
        setTimeout(() => {
            setDownloads([
                {
                    id: "1", tmdbId: 550, title: "Clube da Luta", poster: "/pB8BM7r0OpYsh87sjZ9aD06CtO.jpg", 
                    type: 'movie', progress: 100, status: 'completed', path: '/local/path', size: "1.2 GB"
                },
                {
                    id: "2", tmdbId: 1399, title: "Game of Thrones", poster: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg", 
                    type: 'tv', season: 1, episode: 1, progress: 45, status: 'downloading', size: "800 MB"
                }
            ]);
            setLoading(false);
            setStorageInfo("12 GB livres");
        }, 1000);
    }

    return () => {
        // Limpeza opcional
    };
  }, []);

  const handlePlayOffline = (item: DownloadItem) => {
      if (item.status !== 'completed' || !item.path) return;
      
      if (window.Android && window.Android.playOffline) {
          window.Android.playOffline(item.path);
      } else {
          alert(`Simulação: Abrindo arquivo em ${item.path}`);
      }
  };

  const handleDelete = (item: DownloadItem) => {
      if (confirm(`Deseja apagar "${item.title}"?`)) {
          if (window.Android && window.Android.deleteDownload) {
              window.Android.deleteDownload(item.id);
              // Optimistic update
              setDownloads(prev => prev.filter(d => d.id !== item.id));
          } else {
              setDownloads(prev => prev.filter(d => d.id !== item.id));
          }
      }
  };

  const getPosterUrl = (path: string) => {
      if (path.startsWith('http')) return path;
      return `https://image.tmdb.org/t/p/w200${path}`;
  };

  return (
    <div className="min-h-screen bg-background-dark pb-32 animate-fade-in relative overflow-hidden">
        
        {/* Background Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-background-dark to-background-dark pointer-events-none"></div>

        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-background-dark/90 backdrop-blur-xl border-b border-white/5 px-6 py-5">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
                        Downloads
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    </h1>
                    <p className="text-white/40 text-xs font-medium mt-1 uppercase tracking-wider">{storageInfo}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <span className="material-symbols-rounded text-white/50">cloud_download</span>
                </div>
            </div>
        </header>

        {/* LIST */}
        <main className="max-w-3xl mx-auto px-4 py-6">
            
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : downloads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-rounded text-4xl text-white/20">download_off</span>
                    </div>
                    <h3 className="text-white font-bold text-lg">Nenhum download</h3>
                    <p className="text-white/40 text-sm mt-2 max-w-xs">Seus filmes e episódios baixados aparecerão aqui para assistir offline.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {downloads.map((item) => (
                        <div key={item.id} className="group relative bg-[#1a1a1a] border border-white/5 rounded-2xl p-3 flex gap-4 overflow-hidden hover:border-white/10 transition-all">
                            
                            {/* Poster */}
                            <div className="relative w-20 aspect-[2/3] rounded-lg overflow-hidden shrink-0 bg-black">
                                <img src={getPosterUrl(item.poster)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={item.title} />
                                {item.status === 'downloading' && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 flex flex-col justify-center min-w-0">
                                <h3 className="text-white font-bold text-sm truncate pr-8">{item.title}</h3>
                                
                                {item.type === 'tv' && (
                                    <p className="text-white/50 text-xs font-medium mt-0.5">Temp {item.season} • Ep {item.episode}</p>
                                )}
                                
                                <div className="mt-3 flex items-center gap-3">
                                    {item.status === 'completed' ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded border border-white/5">{item.size || 'Unknown'}</span>
                                            <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                <span className="material-symbols-rounded text-sm">check_circle</span> Pronto
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-[120px]">
                                            <div className="flex justify-between text-[9px] text-white/50 mb-1 font-bold">
                                                <span>BAIXANDO...</span>
                                                <span>{item.progress}%</span>
                                            </div>
                                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${item.progress}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col justify-between items-end">
                                <button onClick={() => handleDelete(item)} className="p-2 text-white/20 hover:text-red-500 hover:bg-white/5 rounded-full transition-colors">
                                    <span className="material-symbols-rounded text-lg">delete</span>
                                </button>

                                {item.status === 'completed' && (
                                    <button onClick={() => handlePlayOffline(item)} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg active:scale-95">
                                        <span className="material-symbols-rounded fill-1">play_arrow</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    </div>
  );
};

export default Downloads;
