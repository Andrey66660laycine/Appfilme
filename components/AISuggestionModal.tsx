
import React, { useState, useEffect } from 'react';
import { tmdb } from '../services/tmdbService';
import { Movie, WatchHistoryItem } from '../types';

interface AISuggestionModalProps {
  onClose: () => void;
  onPlay: (movie: Movie) => void;
  history: WatchHistoryItem[];
  isKid: boolean;
}

const STEPS = [
    { text: "Conectando à Neural Net...", icon: "hub" },
    { text: "Analisando seu histórico...", icon: "history" },
    { text: "Filtrando conteúdo já assistido...", icon: "filter_alt_off" }, 
    { text: "Buscando alta avaliação crítica...", icon: "star" },
    { text: "Identificando Padrões de Gosto...", icon: "fingerprint" },
    { text: "Finalizando Match...", icon: "check_circle" }
];

const AISuggestionModal: React.FC<AISuggestionModalProps> = ({ onClose, onPlay, history, isKid }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sequência de animação de "loading"
    if (stepIndex < STEPS.length - 1) {
      const timeout = setTimeout(() => {
        setStepIndex(prev => prev + 1);
      }, 800); // 800ms por passo
      return () => clearTimeout(timeout);
    } else {
      // Quando terminar os passos visuais, tenta mostrar o resultado
      if (result) {
          setTimeout(() => setLoading(false), 500);
      }
    }
  }, [stepIndex, result]);

  useEffect(() => {
    findMatch();
  }, []);

  const findMatch = async () => {
      try {
        setResult(null); // Limpa resultado anterior se houver
        setLoading(true); // Garante estado de loading
        setStepIndex(0); // Reseta passos visuais

        // 1. Prepara Lista de Exclusão (Tudo que o usuário já viu)
        // Usamos um Set para busca O(1) e garantimos que IDs sejam números
        const watchedIds = new Set(history.map(h => Number(h.id)));

        let candidates: Movie[] = [];
        
        // 2. Estratégia A: Recomendações baseadas no Histórico
        if (history.length > 0) {
            // Pega um item aleatório do histórico (top 15 recentes) para variar a semente
            const recentHistory = history.slice(0, 15);
            const randomHistoryItem = recentHistory[Math.floor(Math.random() * recentHistory.length)];
            
            if (randomHistoryItem) {
                const recs = await tmdb.getRecommendations(String(randomHistoryItem.id), randomHistoryItem.type);
                candidates = [...candidates, ...recs];
            }
        }

        // 3. Estratégia B: Trending (Sempre buscar para ter um pool de reserva)
        // Buscamos tanto filmes quanto séries para ter variedade
        const [trendingMovies, trendingTV] = await Promise.all([
            tmdb.getTrending('movie', isKid),
            tmdb.getTrending('tv', isKid)
        ]);
        candidates = [...candidates, ...trendingMovies, ...trendingTV];

        // 4. O FILTRO DE OURO (Crucial para não repetir)
        // Filtramos qualquer coisa que esteja no Set de assistidos
        let pool = candidates.filter(item => {
            if (!item.id) return false;
            const itemId = Number(item.id);
            
            // Exclui assistidos
            if (watchedIds.has(itemId)) return false;
            
            // Filtro básico de qualidade e data (Relaxado um pouco para garantir resultados)
            const releaseDate = item.release_date || (item as any).first_air_date || '';
            const year = parseInt(releaseDate.split('-')[0] || '0');
            const rating = item.vote_average || 0;
            
            // Aceita conteúdo pós-2010 com nota razoável
            return year >= 2010 && rating >= 6.0;
        });

        // 5. Remove Duplicatas (candidatos podem aparecer em ambas as estratégias)
        pool = Array.from(new Map(pool.map(item => [item.id, item])).values());

        // 6. Seleção Final
        let chosenOne: Movie;

        if (pool.length > 0) {
            // Pega um aleatório do pool filtrado
            chosenOne = pool[Math.floor(Math.random() * pool.length)];
        } else {
            // FALLBACK DE ÚLTIMO RECURSO
            // Se o usuário viu TUDO do pool (improvável), pegamos o trending fresco
            // mas AINDA ASSIM filtramos o que ele já viu.
            const freshTrending = await tmdb.getTrending('all', isKid);
            const freshPool = freshTrending.filter(item => !watchedIds.has(Number(item.id)));
            
            if (freshPool.length > 0) {
                 // Pega aleatório do fallback filtrado
                 chosenOne = freshPool[Math.floor(Math.random() * freshPool.length)];
            } else {
                 // Se realmente não tem nada (conta nova ou viu tudo do TMDB), 
                 // pega o top 2 ou 3 para não ser sempre o #1
                 const randomIndex = Math.floor(Math.random() * Math.min(freshTrending.length, 5));
                 chosenOne = freshTrending[randomIndex] || freshTrending[0];
            }
        }

        // Garante media_type se vier do trending genérico
        if (!chosenOne.media_type) {
            chosenOne.media_type = (chosenOne as any).name ? 'tv' : 'movie';
        }

        // Define o resultado. O useEffect vai lidar com o loading state
        setResult(chosenOne);

      } catch (e) {
          console.error("Erro na AI:", e);
          onClose(); // Fecha se der erro grave
      }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in font-display">
        
        {/* Background Ambient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] animate-pulse-slow"></div>
            {result && !loading && (
                 <div className="absolute inset-0 bg-cover bg-center opacity-20 scale-110 blur-md transition-all duration-1000" style={{ backgroundImage: `url(${tmdb.getBackdropUrl(result.backdrop_path)})` }}></div>
            )}
        </div>

        <div className="relative z-10 w-full max-w-md">
            
            {/* VIEW: LOADING / ANALYZING */}
            {loading && (
                <div className="flex flex-col items-center justify-center text-center space-y-8">
                    <div className="relative">
                        {/* Orbit Circles */}
                        <div className="absolute inset-0 border-4 border-white/5 rounded-full w-32 h-32 animate-spin-slow"></div>
                        <div className="absolute inset-0 border-t-4 border-primary rounded-full w-32 h-32 animate-spin"></div>
                        
                        <div className="w-32 h-32 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(242,13,242,0.3)]">
                            <span className="material-symbols-rounded text-5xl text-white animate-pulse">{STEPS[stepIndex]?.icon || 'hourglass_empty'}</span>
                        </div>
                    </div>

                    <div className="space-y-2 h-20">
                        <h2 className="text-2xl font-bold text-white tracking-tight animate-text-slide">
                            {STEPS[stepIndex]?.text || "Processando..."}
                        </h2>
                        <div className="flex justify-center gap-1">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW: RESULT MATCH */}
            {!loading && result && (
                <div className="bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-pop-in relative group">
                    {/* Confetti / Sparkle Effect (CSS only) */}
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black/80 pointer-events-none"></div>

                    <div className="relative aspect-[2/3] w-full max-h-[60vh] overflow-hidden">
                        <img src={tmdb.getPosterUrl(result.poster_path, 'original')} className="w-full h-full object-cover" alt="Match" />
                        
                        {/* Match Badge */}
                        <div className="absolute top-4 right-4 bg-white text-black px-3 py-1 rounded-full font-bold text-xs shadow-lg flex items-center gap-1 animate-bounce">
                            <span className="material-symbols-rounded text-sm fill-1 text-green-600">verified</span>
                            99% MATCH
                        </div>

                        {/* Content Overlay */}
                        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent pt-20">
                            <h3 className="text-white/60 text-xs font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                AI Recomendou para você
                            </h3>
                            <h1 className="text-3xl md:text-4xl font-bold text-white leading-none mb-2 drop-shadow-md">
                                {result.title || (result as any).name}
                            </h1>
                            <div className="flex items-center gap-3 text-sm text-white/80 mb-4 font-body font-medium">
                                <span className="text-green-400 font-bold">{(result.vote_average).toFixed(1)} Nota</span>
                                <span>•</span>
                                <span>{(result.release_date || (result as any).first_air_date || '').split('-')[0]}</span>
                                <span>•</span>
                                <span>{result.media_type === 'tv' ? 'Série' : 'Filme'}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                                <button 
                                    onClick={() => onPlay(result)} 
                                    className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-rounded fill-1">play_arrow</span>
                                    Assistir Agora
                                </button>
                                <button 
                                    onClick={findMatch} 
                                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-rounded">refresh</span>
                                    Tentar Outro
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Close Button */}
                    <button onClick={onClose} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10 z-50">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
            )}
        </div>
        
        <style>{`
            .animate-spin-slow { animation: spin 8s linear infinite; }
            .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            @keyframes popIn {
                0% { opacity: 0; transform: scale(0.8) translateY(20px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
        `}</style>
    </div>
  );
};

export default AISuggestionModal;
