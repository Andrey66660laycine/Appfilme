
export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  media_type?: 'movie' | 'tv';
}

export interface MovieDetails extends Movie {
  genres: { id: number; name: string }[];
  runtime: number;
  tagline: string;
  status: string;
  imdb_id: string;
  // Campos de tempo para filmes
  opening_credits_start_time?: number;
  opening_credits_end_time?: number;
  end_credits_start_time?: number;
}

export interface Series extends Movie {
  name: string;
  first_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
}

export interface SeriesDetails extends Series {
  genres: { id: number; name: string }[];
  tagline: string;
  status: string;
  seasons: SeasonInfo[];
}

export interface SeasonInfo {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
  episode_count: number;
  air_date: string;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  still_path: string;
  air_date: string;
  episode_number: number;
  runtime: number;
  // Campos de tempo da API TMDB
  opening_credits_start_time?: number;
  opening_credits_end_time?: number;
  recap_start_time?: number;
  recap_end_time?: number;
  end_credits_start_time?: number;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string;
}

export interface WatchHistoryItem {
  id: number | string;
  tmdb_id?: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path: string;
  backdrop_path: string;
  timestamp: number;
  season?: number;
  episode?: number;
  vote_average: number;
  progress?: number; // Segundos assistidos
  duration?: number; // Duração total em segundos
}

export interface LibraryItem {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  total_episodes?: number; 
  addedAt: number;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  avatar: string;
  is_kid: boolean;
  is_premium: boolean; // Novo campo
  total_watch_time: number;
  total_movies_watched: number;
  total_episodes_watched: number;
}

export interface DownloadItem {
    id: string;             // ID único (Geralmente o TMDB ID como string)
    tmdbId?: number;        // Opcional se id já for o tmdbId
    title: string;
    type: 'movie' | 'tv';
    season?: number;
    episode?: number;
    poster: string;         // URL ou Path do Poster
    backdrop?: string;      // URL ou Path do Backdrop
    
    // Campos controlados pelo Android
    status: 'pending' | 'downloading' | 'completed' | 'error' | 'paused';
    progress: number;       // 0 a 100
    path?: string;          // Caminho absoluto do arquivo local
    size?: string;          // Ex: "1.2 GB"
    localFilename?: string; // Nome do arquivo físico
}

declare global {
  interface Window {
    // Função chamada pelo Java/Android para injetar o vídeo (Entrada)
    receberVideo: (url: string) => void;
    
    // Função chamada pelo Android para atualizar a lista de downloads
    updateDownloadList: (jsonString: string) => void;

    // Interface para chamar funções do Android (Saída)
    Android?: {
        // Envia (URL do Vídeo, JSON String com metadados)
        download: (url: string, jsonMetadata: string) => void;
        
        // Método novo para Cast Nativo
        castVideo: (url: string, title: string) => void;
        
        // Controle de Orientação
        setOrientation: (orientation: 'landscape' | 'portrait' | 'auto') => void;

        // Controle de Sniffer (Captura de links)
        stopSniffer: () => void;  // "Já peguei o link, pode parar"
        startSniffer: () => void; // "Parei de assistir, volta a capturar"

        // Avisa o app nativo que o link foi pego e o player iniciou (para parar sniffers - legado)
        onVideoPlaying?: (url: string) => void;
        // Avisa o app nativo que o player fechou (para retomar sniffers se necessário - legado)
        onPlayerClosed?: () => void;
        
        // --- DOWNLOADS OFFLINE ---
        getDownloads: () => void; // Solicita a lista
        deleteDownload: (id: string) => void; // Apaga arquivo
        playOffline: (path: string) => void; // Abre player offline nativo
    };
    
    onVideoDetected: (url: string) => void;
    Hls: any;
  }
}
