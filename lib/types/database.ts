export type ScrapeJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type CursorState = {
  searchUrl?: string;
  processedIndexes?: number[];
  scrollAttempts?: number;
  hasMore?: boolean;
  cookies?: string;
};

export type ScrapeJob = {
  id: string;
  user_id: string;
  query: string;
  location: string;
  max_results: number;
  status: ScrapeJobStatus;
  progress: number;
  results_count: number;
  error_message: string | null;
  cursor_state: CursorState;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type Lead = {
  id: string;
  user_id: string;
  job_id: string;
  place_id: string | null;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  review_count: number | null;
  latitude: number | null;
  longitude: number | null;
  maps_url: string | null;
  category: string | null;
  hours: Record<string, unknown> | null;
  price_level: string | null;
  description: string | null;
  photos: string[] | null;
  raw_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ExtractedBusiness = {
  name: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  rating?: number | null;
  review_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  maps_url?: string | null;
  place_id?: string | null;
  category?: string | null;
  hours?: Record<string, unknown> | null;
  price_level?: string | null;
  description?: string | null;
  photos?: string[] | null;
  raw_data?: Record<string, unknown>;
};
