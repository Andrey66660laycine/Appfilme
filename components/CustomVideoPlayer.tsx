
import React, { useEffect, useState } from 'react';
import { tmdb } from '../services/tmdbService';
import { Movie } from '../types';

interface CustomVideoPlayerProps {
  src: string;
  onClose: () => void;
  onErrorFallback: () => void; 
  onPlayerStable?: () => void; 
  title?: string;
  profileId?: string;
  tmdbId?: number;
  type?: 'movie' | 'tv';
  season?: number;
  episode?: number;
  initialTime?: number;
  nextEpisode?: { season: number; episode: number; title?: string; onPlay: () => void };
  recommendations?: Movie[];
  onPlayRelated?: (movie: Movie) => void;
}

// URL do seu player hospedado no Netlify
const BRIDGE_PLAYER_URL = "https://playervoidmax.netlify.app/"; 

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ 
    src, onClose, title = "Reproduzindo",
    tmdbId, type, season, episode, initialTime = 0
}) => {
  const [iframeUrl, setIframeUrl] = useState<string>('');

  useEffect(() => {
      // Constrói a URL com todos os parâmetros necessários para o player externo funcionar
      const params = new URLSearchParams();
      
      // 1. O Link do Vídeo (Sniffed)
      params.append('url', src); 
      
      // 2. Metadados Básicos
      params.append('title', title);
      if (tmdbId) params.append('tmdb', String(tmdbId));
      if (type) params.append('type', type);
      if (season) params.append('season', String(season));
      if (episode) params.append('episode', String(episode));
      if (initialTime > 0) params.append('start', String(initialTime));

      // 3. Tenta pegar a imagem de fundo para passar pro player (evita tela preta inicial)
      const poster = tmdb.getBackdropUrl('', 'w1280'); 
      params.append('poster', poster);

      setIframeUrl(`${BRIDGE_PLAYER_URL}?${params.toString()}`);

      // Força paisagem no Android
      if (window.Android?.setOrientation) {
          window.Android.setOrientation('landscape');
      }

      // Cleanup ao fechar
      return () => {
          if (window.Android?.setOrientation) {
              window.Android.setOrientation('portrait');
          }
      };
  }, [src, title, tmdbId, type, season, episode, initialTime]);

  if (!iframeUrl) return <div className="fixed inset-0 bg-black z-[9999]" />;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col animate-fade-in">
        
        {/* BOTÃO VOLTAR (Overlay Nativo do React) */}
        {/* Mantemos este botão aqui caso o iframe trave ou o usuário queira sair forçadamente */}
        <div className="absolute top-0 left-0 w-full p-4 z-50 pointer-events-none">
            <button 
                onClick={onClose} 
                className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors shadow-lg active:scale-90"
            >
                <span className="material-symbols-rounded">arrow_back</span>
            </button>
        </div>

        {/* IFRAME PONTE */}
        <iframe 
            src={iframeUrl} 
            className="w-full h-full border-none bg-black"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            title="Void Player Bridge"
            referrerPolicy="no-referrer"
        />
    </div>
  );
};

export default CustomVideoPlayer;
