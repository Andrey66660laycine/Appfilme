
import React, { useEffect, useState, useRef } from 'react';
import { DownloadItem } from '../types';
import { tmdb } from '../services/tmdbService';

const Downloads: React.FC = () => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState("Calculando...");
  const isMounted = useRef(true);

  // Função para enriquecer os dados com imagens do TMDB se faltarem
  const enrichDownloadsWithImages = async (list: DownloadItem[]) => {
      const enriched = await Promise.all(list.map(async (item) => {
          // Se já tem poster e parece uma URL válida ou caminho local, mantém
          if (item.poster && item.poster.length > 5) return item;

          // Se não tem poster, mas tem ID (que é o TMDB ID), busca na API
          if (item.id) {
              try {
                  // Tenta buscar como TV primeiro se for type tv ou indefinido (comum em animes)
                  let data: any = null;
                  if (item.type === 'tv' || item.season) {
                      data = await tmdb.getTVDetails(item.id);
                  } else {
                      data = await tmdb.getMovieDetails(item.id);
                  }

                  if (data && data.poster_path) {
                      return { ...item, poster: data.poster_path };
                  }
              } catch (e) {
                  console.warn("Falha ao buscar imagem para download:", item.title);
              }
          }
          return item;
      }));
      
      if (isMounted.current) {
          setDownloads(enriched);
      }
  };

  useEffect(() => {
    isMounted.current = true;

    // 1. Define a função que o Android vai chamar
    window.updateDownloadList = (jsonString: string) => {
        if (!isMounted.current) return;
        // console.log("Recebido do Android:", jsonString);
        try {
            const list = JSON.parse(jsonString);
            if (Array.isArray(list)) {
                // Primeiro define o que veio (para ser rápido)
                setDownloads(list);
                // Depois tenta buscar as imagens que faltam
                enrichDownloadsWithImages(list);
            }
        } catch (e) {
            console.error("Erro ao ler JSON de downloads:", e);
        } finally {
            setLoading(false);
        }
    };

    // 2. Solicita a lista ao Android
    if (window.Android && window.Android.getDownloads) {
        try {
            window.Android.getDownloads();
        } catch(e) {
            console.error("Erro ao chamar Android.getDownloads:", e);
            setLoading(false);
        }
    } else {
        // Modo Debug/Navegador
        setTimeout(() => {
            if (isMounted.current) {
                const mockList: any[] = [
                    {
                        id: "46260", // Naruto Shippuden ID
                        title: "Naruto (Teste Sem Imagem)",
                        type: 'tv', season: 1, episode: 1, 
                        progress: 32, status: 'downloading', size: "269 MB",
                        poster: "" // Simulando sem imagem
                    },
                    {
                        id: "550", 
                        title: "Clube da Luta", 
                        poster: "/pB8BM7r0OpYsh87sjZ9aD06CtO.jpg", 
                        type: 'movie', progress: 100, status: 'completed', path: '/local/path', size: "1.2 GB"
                    }
                ];
                setDownloads(mockList);
                enrichDownloadsWithImages(mockList);
                setLoading(false);
                setStorageInfo("Demonstração (PC)");
            }
        }, 1000);
    }

    const safetyTimeout = setTimeout(() => {
        if (isMounted.current && loading) {
            setLoading(false); 
        }
    }, 3000);

    return () => {
        isMounted.current = false;
        clearTimeout(safetyTimeout);
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
              setDownloads(prev => prev.filter(d => d.id !== item.id));
          } else {
              setDownloads(prev => prev.filter(d => d.id !== item.id));
          }
      }
  };

  const getPosterUrl = (path: string) => {
      if (!path) return "https://via.placeholder.com/200x300/1a1a1a/ffffff?text=No+Cover";
      if (path.startsWith('http') || path.startsWith('file://') || path.startsWith('content://')) return path;
      return `https://image.tmdb.org/t/p/w200${path}`;
  };

  return (
    <div className="min-h-screen bg-background-dark pb-32 animate-fade-in relative overflow-hidden text-white">
        
        {/* Background Mesh Dark */}
        <div className="absolute inset-0 bg-[#050505]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black pointer-events-none"></div>

        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-background-dark/95 backdrop-blur-xl border-b border-white/5 px-6 py-5">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-display font-bold text-white tracking-tight flex items-center gap-2">
                        Downloads
                        {loading && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></div>}
                    </h1>
                    <p className="text-white/30 text-[10px] font-medium mt-1 uppercase tracking-wider">
                        Disponível Offline
                    </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                    <span className="material-symbols-rounded text-white/50 text-lg">cloud_download</span>
                </div>
            </div>
        </header>

        {/* LIST */}
        <main className="max-w-3xl mx-auto px-4 py-6">
            
            {loading && downloads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
            ) : downloads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-slide-up">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                        <span className="material-symbols-rounded text-3xl text-white/20">download_off</span>
                    </div>
                    <h3 className="text-white font-bold text-base">Nada por aqui</h3>
                    <p className="text-white/40 text-xs mt-2 max-w-xs leading-relaxed">
                        Baixe seus animes e séries para assistir sem internet.
                    </p>
                </div>
            ) : (
                <div className="space-y-3 animate-slide-up">
                    {downloads.map((item) => (
                        <div key={item.id} className="group relative bg-[#121212] border border-white/5 rounded-xl p-3 flex gap-4 overflow-hidden active:scale-[0.98] transition-all">
                            
                            {/* Poster */}
                            <div className="relative w-[70px] aspect-[2/3] rounded bg-black shadow-lg overflow-hidden shrink-0">
                                <img src={getPosterUrl(item.poster)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={item.title} />
                                {item.status === 'downloading' && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 flex flex-col justify-center min-w-0 py-1">
                                <h3 className="text-white font-bold text-sm truncate pr-8">{item.title}</h3>
                                
                                {(item.type === 'tv' || item.season) && (
                                    <p className="text-white/40 text-[10px] font-medium mt-0.5">T{item.season} E{item.episode}</p>
                                )}
                                
                                <div className="mt-auto pt-2">
                                    {item.status === 'completed' ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] bg-white/5 text-white/50 px-1.5 py-0.5 rounded">{item.size || 'HD'}</span>
                                            <span className="text-[9px] text-green-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                                <span className="material-symbols-rounded text-[12px]">check</span> Baixado
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-[140px]">
                                            <div className="flex justify-between text-[9px] text-white/50 mb-1 font-bold">
                                                <span>{item.status === 'paused' ? 'PAUSADO' : 'BAIXANDO...'}</span>
                                                <span>{item.progress}%</span>
                                            </div>
                                            <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className={`h-full transition-all duration-300 ${item.status === 'error' ? 'bg-red-500' : 'bg-white'}`} style={{ width: `${item.progress}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col justify-between items-end">
                                <button onClick={() => handleDelete(item)} className="p-2 text-white/20 hover:text-red-500 transition-colors">
                                    <span className="material-symbols-rounded text-lg">delete</span>
                                </button>

                                {item.status === 'completed' && (
                                    <button onClick={() => handlePlayOffline(item)} className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shadow-lg">
                                        <span className="material-symbols-rounded fill-1 text-lg">play_arrow</span>
                                    </button>
                                )}
                                
                                {item.status === 'error' && (
                                     <button className="w-8 h-8 text-red-500 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-rounded text-lg">error</span>
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
