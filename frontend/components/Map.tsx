"use client"

import "maplibre-gl/dist/maplibre-gl.css"

import maplibregl from "maplibre-gl"
import { useEffect, useRef, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { getListings } from "@/lib/api"
import type { Listing } from "@/lib/types"
import ListingPin from "./ListingPin"

interface MapProps {
  selectedListings: Listing[]
  onToggleListing: (listing: Listing) => boolean
  onListingsLoaded: (listings: Listing[]) => void
}

export default function Map({ selectedListings, onToggleListing, onListingsLoaded }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<Array<{ marker: maplibregl.Marker; root: Root }>>([])
  const onToggleRef = useRef(onToggleListing)
  const [listings, setListings] = useState<Listing[]>([])
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    onToggleRef.current = onToggleListing
  }, [onToggleListing])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [2.1686, 41.3920],
      zoom: 11.7,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
    })

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")
    map.on("load", () => setMapReady(true))

    return () => {
      markersRef.current.forEach(({ marker, root }) => {
        root.unmount()
        marker.remove()
      })
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadListings() {
      const listings = await getListings()

      if (cancelled) {
        return
      }

      setListings(listings)
      onListingsLoaded(listings)
    }

    loadListings()

    return () => {
      cancelled = true
    }
  }, [onListingsLoaded])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !mapReady) {
      return
    }

    markersRef.current.forEach(({ marker, root }) => {
      root.unmount()
      marker.remove()
    })
    markersRef.current = []

    const selectedIds = new Set(selectedListings.map((listing) => listing.id))

    listings.forEach((listing) => {
      const element = document.createElement("button")
      element.type = "button"
      element.className = "block p-0 border-0 bg-transparent"
      element.addEventListener("click", (event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggleRef.current(listing)
      })

      const root = createRoot(element)
      root.render(<ListingPin listing={listing} selected={selectedIds.has(listing.id)} />)

      const marker = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([listing.lon, listing.lat])
        .addTo(map)

      markersRef.current.push({ marker, root })
    })
  }, [listings, selectedListings, mapReady])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
