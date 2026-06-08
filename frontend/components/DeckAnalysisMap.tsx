"use client"

import "maplibre-gl/dist/maplibre-gl.css"

import { MapboxOverlay } from "@deck.gl/mapbox"
import { PolygonLayer, ScatterplotLayer } from "@deck.gl/layers"
import maplibregl from "maplibre-gl"
import { useEffect, useMemo, useRef, useState } from "react"
import type { HeatmapCell, ScoredListing } from "@/lib/types"

interface DeckAnalysisMapProps {
  listings: ScoredListing[]
}

type HeatmapMode = "thermal" | "wind" | "sun"
type ViewMode = "2d" | "3d"
type FocusMode = "all" | string
type PositionedListing = ScoredListing & { lat: number; lon: number }
type SitePolygonDatum = { polygon: number[][]; listing: ScoredListing; winner: boolean }
type MassingDatum = SitePolygonDatum & { elevation: number }
type HeatmapDatum = HeatmapCell & { listing: ScoredListing }

const HEATMAP_MODES: { value: HeatmapMode; label: string }[] = [
  { value: "thermal", label: "Thermal" },
  { value: "wind", label: "Wind" },
  { value: "sun", label: "Sun" }
]

function listingCells(listing: ScoredListing, mode: HeatmapMode) {
  if (mode === "thermal") {
    return listing.thermal_heatmap_cells
  }
  if (mode === "wind") {
    return listing.wind_heatmap_cells
  }
  return listing.sun_heatmap_cells ?? listing.thermal_heatmap_cells
}

function boundsPolygon(bounds: [number, number, number, number]) {
  const [west, south, east, north] = bounds
  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south]
  ]
}

function polygonBounds(polygon: number[][]): [number, number, number, number] {
  const lons = polygon.map((point) => point[0])
  const lats = polygon.map((point) => point[1])
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
}

function insetPolygon(bounds: [number, number, number, number], xInset: number, yInset: number) {
  const [west, south, east, north] = bounds
  const width = east - west
  const height = north - south
  const x0 = west + width * xInset
  const x1 = east - width * xInset
  const y0 = south + height * yInset
  const y1 = north - height * yInset
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0]
  ]
}

function combinedCenter(listings: ScoredListing[]) {
  const positioned = listings.filter((listing) => typeof listing.lon === "number" && typeof listing.lat === "number")
  if (!positioned.length) {
    return [2.1686, 41.392] as [number, number]
  }

  const lon = positioned.reduce((sum, listing) => sum + (listing.lon ?? 0), 0) / positioned.length
  const lat = positioned.reduce((sum, listing) => sum + (listing.lat ?? 0), 0) / positioned.length
  return [lon, lat] as [number, number]
}

function combinedBounds(listings: ScoredListing[]) {
  const bounds = listings
    .map((listing) => listing.heatmap_bounds)
    .filter((bounds): bounds is [number, number, number, number] => Boolean(bounds))

  if (!bounds.length) {
    return null
  }

  return bounds.reduce(
    (acc, current) => [
      Math.min(acc[0], current[0]),
      Math.min(acc[1], current[1]),
      Math.max(acc[2], current[2]),
      Math.max(acc[3], current[3])
    ] as [number, number, number, number],
    bounds[0]
  )
}

function listingBounds(listing: ScoredListing): [number, number, number, number] | null {
  if (listing.heatmap_bounds) {
    return listing.heatmap_bounds
  }

  if (!listing.site_polygon?.length) {
    return null
  }

  const lons = listing.site_polygon.map((point) => point[0])
  const lats = listing.site_polygon.map((point) => point[1])
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
}

function boundsForFocus(listings: ScoredListing[], focus: FocusMode) {
  if (focus === "all") {
    return combinedBounds(listings)
  }

  const listing = listings.find((candidate) => candidate.id === focus)
  return listing ? listingBounds(listing) : combinedBounds(listings)
}

function fitMapToFocus(map: maplibregl.Map, listings: ScoredListing[], focus: FocusMode, view: ViewMode) {
  const bounds = boundsForFocus(listings, focus)
  const pitch = view === "3d" ? 58 : 0
  const bearing = view === "3d" ? -28 : 0

  if (!bounds) {
    map.easeTo({ center: combinedCenter(listings), zoom: 14, pitch, bearing, duration: 0 })
    return
  }

  map.fitBounds(
    [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]]
    ],
    {
      padding: focus === "all" ? 88 : 130,
      pitch,
      bearing,
      maxZoom: focus === "all" ? (view === "3d" ? 15 : 14.2) : 17.4,
      duration: 650
    }
  )

  map.easeTo({ pitch, bearing, duration: 650 })
}

export default function DeckAnalysisMap({ listings }: DeckAnalysisMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)
  const [mode, setMode] = useState<HeatmapMode>("thermal")
  const [view, setView] = useState<ViewMode>("2d")
  const [focus, setFocus] = useState<FocusMode>("all")

  const layers = useMemo(() => {
    const winnerId = listings.reduce(
      (winner, listing) => (listing.comfort_score > winner.comfort_score ? listing : winner),
      listings[0]
    )?.id

    const heatmapData = listings.flatMap((listing) => {
      const cells = listingCells(listing, mode)

      if ((focus !== "all" && listing.id !== focus) || !cells?.length) {
        return []
      }

      return cells.map((cell) => ({ ...cell, listing }))
    })

    const sitePolygons = listings.flatMap((listing) => {
      if (!listing.site_polygon) {
        return []
      }
      return [{ polygon: listing.site_polygon, listing, winner: listing.id === winnerId }]
    })

    const massingBlocks = sitePolygons.map((datum) => ({
      ...datum,
      polygon: insetPolygon(polygonBounds(datum.polygon), 0.28, 0.24),
      elevation: Math.max(75, Math.min(190, 70 + (datum.listing.rooms ?? 2) * 28 + (datum.listing.size_m2 ?? 60) * 0.55))
    }))

    const outlines = listings.flatMap((listing) => {
      if (!listing.heatmap_bounds) {
        return []
      }
      return [{ polygon: boundsPolygon(listing.heatmap_bounds), listing, winner: listing.id === winnerId }]
    })

    const points = listings.filter(
      (listing): listing is PositionedListing => typeof listing.lon === "number" && typeof listing.lat === "number"
    )

    return [
      new PolygonLayer({
        id: `${mode}-heatmap-cells`,
        data: heatmapData,
        getPolygon: (datum: HeatmapDatum) => datum.polygon,
        getFillColor: (datum: HeatmapDatum) => datum.color,
        stroked: false,
        filled: true,
        parameters: { depthTest: false }
      }),
      new PolygonLayer({
        id: "site-massing",
        data: view === "3d" ? massingBlocks : sitePolygons,
        getPolygon: (datum: MassingDatum | SitePolygonDatum) => datum.polygon,
        getFillColor: (datum: MassingDatum | SitePolygonDatum) =>
          view === "3d"
            ? datum.winner
              ? [151, 176, 109, 245]
              : [145, 157, 172, 235]
            : datum.winner
              ? [255, 255, 255, 215]
              : [255, 255, 255, 170],
        getLineColor: (datum: MassingDatum | SitePolygonDatum) => (datum.winner ? [74, 124, 22, 255] : [64, 79, 96, 255]),
        getElevation: (datum: MassingDatum | SitePolygonDatum) => ("elevation" in datum ? datum.elevation : 0),
        extruded: view === "3d",
        stroked: true,
        filled: true,
        lineWidthMinPixels: 3,
        material: {
          ambient: 0.45,
          diffuse: 0.6,
          shininess: 24,
          specularColor: [255, 255, 255]
        },
        parameters: { depthTest: view === "3d" }
      }),
      new PolygonLayer({
        id: "site-footprints",
        data: sitePolygons,
        getPolygon: (datum: SitePolygonDatum) => datum.polygon,
        stroked: true,
        filled: false,
        getLineColor: (datum: SitePolygonDatum) => (datum.winner ? [99, 153, 34, 255] : [24, 95, 165, 230]),
        lineWidthMinPixels: 2,
        parameters: { depthTest: false }
      }),
      new PolygonLayer({
        id: "heatmap-outlines",
        data: outlines,
        getPolygon: (datum: SitePolygonDatum) => datum.polygon,
        stroked: true,
        filled: false,
        getLineColor: (datum: SitePolygonDatum) => (datum.winner ? [99, 153, 34, 255] : [24, 95, 165, 230]),
        getLineWidth: 4,
        lineWidthMinPixels: 3,
        parameters: { depthTest: false }
      }),
      new ScatterplotLayer({
        id: "selected-listing-points",
        data: points,
        getPosition: (listing: PositionedListing) => [listing.lon, listing.lat],
        getRadius: 22,
        radiusUnits: "meters",
        getFillColor: (listing: ScoredListing) =>
          listing.id === listings[0]?.id ? [99, 153, 34, 230] : [24, 95, 165, 230],
        getLineColor: [255, 255, 255, 255],
        lineWidthMinPixels: 2,
        stroked: true,
        parameters: { depthTest: false }
      })
    ]
  }, [listings, mode, focus, view])

  useEffect(() => {
    if (focus === "all" || listings.some((listing) => listing.id === focus)) {
      return
    }
    setFocus("all")
  }, [focus, listings])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const center = combinedCenter(listings)
    const map = new maplibregl.Map({
      container: containerRef.current,
      center,
      zoom: 15.4,
      pitch: 0,
      bearing: 0,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
    })

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] })
    map.addControl(overlay as unknown as maplibregl.IControl)
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right")

    mapRef.current = map
    overlayRef.current = overlay

    map.on("load", () => {
      fitMapToFocus(map, listings, "all", "2d")
    })

    return () => {
      overlay.finalize()
      map.remove()
      overlayRef.current = null
      mapRef.current = null
    }
  }, [listings])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    if (map.loaded()) {
      fitMapToFocus(map, listings, focus, view)
    } else {
      map.once("load", () => fitMapToFocus(map, listings, focus, view))
    }
  }, [listings, focus, view])

  useEffect(() => {
    overlayRef.current?.setProps({ layers })
  }, [layers])

  return (
    <section className="mt-8 overflow-hidden rounded-[10px] border border-livably-border bg-white">
      <div className="flex h-14 items-center justify-between border-b border-livably-border px-4">
        <div>
          <h2 className="text-base font-medium text-livably-text">Spatial Comfort Heatmap</h2>
          <p className="text-xs text-livably-muted">
            {view === "3d" ? "Extruded site massing with raster cells" : "Top-down raster cells over the selected site area"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-livably-border p-1">
            {(["2d", "3d"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                className={`h-8 rounded px-3 text-xs font-medium uppercase ${
                  view === value ? "bg-livably-text text-white" : "text-livably-muted"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="flex rounded-md border border-livably-border p-1">
            <button
              type="button"
              onClick={() => setFocus("all")}
              className={`h-8 rounded px-3 text-xs font-medium ${
                focus === "all" ? "bg-livably-text text-white" : "text-livably-muted"
              }`}
            >
              All
            </button>
            {listings.map((listing, index) => (
              <button
                key={listing.id}
                type="button"
                onClick={() => setFocus(listing.id)}
                title={listing.name}
                className={`h-8 rounded px-3 text-xs font-medium ${
                  focus === listing.id ? "bg-livably-text text-white" : "text-livably-muted"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="flex rounded-md border border-livably-border p-1">
            {HEATMAP_MODES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`h-8 rounded px-3 text-xs font-medium ${
                  mode === value ? "bg-livably-green text-white" : "text-livably-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div ref={containerRef} className="h-[460px] w-full" />
    </section>
  )
}
