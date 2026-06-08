export interface Listing {
  id: string
  name: string
  neighborhood: string
  price: number
  size_m2: number
  rooms: number
  lat: number
  lon: number
  image: string
}

export interface ScoredListing {
  id: string
  name: string
  neighborhood: string
  lat?: number
  lon?: number
  rooms?: number
  size_m2?: number
  comfort_score: number
  thermal_score: number
  wind_score: number
  sun_score: number
  wind_heatmap?: string
  thermal_heatmap?: string
  wind_heatmap_cells?: HeatmapCell[]
  thermal_heatmap_cells?: HeatmapCell[]
  sun_heatmap_cells?: HeatmapCell[]
  heatmap_bounds?: [number, number, number, number]
  site_polygon?: number[][]
  insights: string[]
}

export interface HeatmapCell {
  polygon: number[][]
  color: [number, number, number, number]
  value: number
}

export interface ComparisonResult {
  listings?: ScoredListing[]
  listing_a: ScoredListing
  listing_b: ScoredListing
  listing_c?: ScoredListing | null
  winner_id: string
  difference_pct: number
  summary: string
}
