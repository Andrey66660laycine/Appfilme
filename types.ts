
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
  progress?: number; 
  duration?: number; 
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
  is_premium: boolean; 
  total_watch_time: number;
  total_movies_watched: number;
  total_episodes_watched: number;
}

export interface DownloadItem {
    id: string;
    tmdbId?: number;
    title: string;
    type: 'movie' | 'tv';
    season?: number;
    episode?: number;
    poster: string;
    backdrop?: string;
    status: 'pending' | 'downloading' | 'completed' | 'error' | 'paused';
    progress: number;
    path?: string;
    size?: string;
    localFilename?: string;
}

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export interface SubtitleResult {
  id: string;
  language: string;
  format: string;
  filename: string;
  url: string;
}

declare global {
  interface Window {
    receberVideo: (url: string) => void;
    updateDownloadList: (jsonString: string) => void;
    Android?: {
        download: (url: string, jsonMetadata: string) => void;
        castVideo: (url: string, title: string) => void;
        setOrientation: (orientation: 'landscape' | 'portrait' | 'auto') => void;
        stopSniffer: () => void;  
        startSniffer: () => void; 
        onVideoPlaying?: (url: string) => void;
        onPlayerClosed?: () => void;
        getDownloads: () => void; 
        deleteDownload: (id: string) => void; 
        playOffline: (path: string) => void; 
    };
    onVideoDetected: (url: string) => void;
    Hls: any;
  }
}