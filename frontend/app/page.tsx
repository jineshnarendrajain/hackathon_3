"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import ListingCard from "@/components/ListingCard"
import Map from "@/components/Map"
import type { Listing } from "@/lib/types"

export default function HomePage() {
  const router = useRouter()
  const [selectedListings, setSelectedListings] = useState<Listing[]>([])
  const [toast, setToast] = useState("")

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 1800)
  }, [])

  const toggleListing = useCallback(
    (listing: Listing) => {
      const isSelected = selectedListings.some((selected) => selected.id === listing.id)

      if (isSelected) {
        setSelectedListings((current) => current.filter((selected) => selected.id !== listing.id))
        return true
      }

      if (selectedListings.length >= 3) {
        showToast("Max 3 selected")
        return false
      }

      setSelectedListings((current) => [...current, listing])
      return true
    },
    [selectedListings, showToast]
  )

  const removeListing = useCallback((listingId: string) => {
    setSelectedListings((current) => current.filter((listing) => listing.id !== listingId))
  }, [])

  const compare = () => {
    if (selectedListings.length < 2 || selectedListings.length > 3) {
      return
    }

    sessionStorage.setItem(
      "livably_selected_ids",
      JSON.stringify(selectedListings.map((listing) => listing.id))
    )
    router.push("/loading-screen")
  }

  return (
    <main className="flex h-screen min-w-[768px] flex-col overflow-hidden bg-white">
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-livably-border bg-white px-6">
        <div className="text-lg font-semibold text-livably-green">Livably</div>
        <div className="text-[13px] text-livably-muted">Compare by comfort, not just price</div>
      </header>

      <section className="relative min-h-0 flex-1">
        <Map selectedListings={selectedListings} onToggleListing={toggleListing} onListingsLoaded={() => undefined} />
        {toast ? (
          <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-md border border-livably-border bg-white px-4 py-2 text-[13px] text-livably-text">
            {toast}
          </div>
        ) : null}
      </section>

      <footer className="flex h-[140px] shrink-0 items-center justify-between border-t border-livably-border bg-white px-6">
        <div className="flex items-center gap-4">
          {selectedListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} onRemove={removeListing} />
          ))}
          {selectedListings.length === 0 ? (
            <div className="text-[13px] text-livably-muted">Select 2 or 3 listings on the map to compare comfort.</div>
          ) : null}
          {selectedListings.length === 1 ? (
            <div className="text-[13px] text-livably-muted">Choose one more listing.</div>
          ) : null}
          {selectedListings.length === 2 ? (
            <div className="text-[13px] text-livably-muted">Add one more listing for a 3-way comparison.</div>
          ) : null}
        </div>

        <button
          type="button"
          disabled={selectedListings.length < 2}
          onClick={compare}
          className="h-11 min-w-[132px] rounded-md bg-livably-green px-6 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Compare
        </button>
      </footer>
    </main>
  )
}
