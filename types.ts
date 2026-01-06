
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
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string;
}

export interface AIRecommendation {
  title: string;
  reason: string;
}

export interface WatchHistoryItem {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path: string;
  backdrop_path: string;
  timestamp: number;
  season?: number;
  episode?: number;
  vote_average: number;
}
