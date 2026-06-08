"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DeckAnalysisMap from "@/components/DeckAnalysisMap"
import InsightCard from "@/components/InsightCard"
import ScoreBreakdown from "@/components/ScoreBreakdown"
import ScoreGauge from "@/components/ScoreGauge"
import type { ComparisonResult, ScoredListing } from "@/lib/types"

function neighborhoodClasses(neighborhood: string) {
  const normalized = neighborhood.toLowerCase()
  if (normalized.includes("poblenou")) {
    return "bg-livably-blueLight text-livably-blue"
  }
  if (normalized.includes("gràcia") || normalized.includes("gracia")) {
    return "bg-livably-greenLight text-livably-green"
  }
  return "bg-livably-surface text-livably-muted"
}

function HeatmapPanel({ label, src }: { label: string; src?: string }) {
  return (
    <div>
      <div className="mb-2 text-[13px] font-medium text-livably-text">{label}</div>
      {src ? (
        <img
          src={src}
          alt={`${label} heatmap`}
          className="h-28 w-full rounded-md border border-livably-border object-cover"
        />
      ) : (
        <div className="flex h-28 items-center justify-center rounded-md border border-livably-border bg-livably-surface text-xs text-livably-muted">
          Heatmap unavailable
        </div>
      )}
    </div>
  )
}

function ListingResultColumn({
  listing,
  winner
}: {
  listing: ScoredListing
  winner: boolean
}) {
  return (
    <article className="rounded-[10px] border border-livably-border bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-medium text-livably-text">{listing.name}</h2>
          <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${neighborhoodClasses(listing.neighborhood)}`}>
            {listing.neighborhood}
          </span>
        </div>
        {winner ? (
          <span className="shrink-0 rounded-full bg-livably-greenLight px-3 py-1 text-xs font-medium text-livably-green">
            Best match
          </span>
        ) : null}
      </div>

      <div className={`mt-8 text-center text-5xl font-semibold ${winner ? "text-livably-green" : "text-gray-500"}`}>
        {listing.comfort_score}
        <span className="text-xl font-medium text-livably-muted"> / 100</span>
      </div>

      <div className="mt-6">
        <ScoreGauge score={listing.comfort_score} winner={winner} />
      </div>

      <div className="mt-8">
        <ScoreBreakdown
          thermal={listing.thermal_score}
          wind={listing.wind_score}
          sun={listing.sun_score}
          winner={winner}
        />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <HeatmapPanel label="Thermal" src={listing.thermal_heatmap} />
        <HeatmapPanel label="Wind" src={listing.wind_heatmap} />
      </div>

      <div className="my-6 h-px bg-livably-border" />

      <div>
        {listing.insights.slice(0, 3).map((insight) => (
          <InsightCard key={insight} insight={insight} />
        ))}
      </div>
    </article>
  )
}

export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<ComparisonResult | null>(null)

  useEffect(() => {
    const rawResult = sessionStorage.getItem("livably_result")

    if (!rawResult) {
      router.replace("/")
      return
    }

    try {
      setResult(JSON.parse(rawResult) as ComparisonResult)
    } catch {
      router.replace("/")
    }
  }, [router])

  if (!result) {
    return null
  }

  const listings =
    result.listings ??
    ([result.listing_a, result.listing_b, result.listing_c].filter(Boolean) as ScoredListing[])
  const winner = listings.find((listing) => listing.id === result.winner_id)
  const gridClass = listings.length === 3 ? "grid-cols-3" : "grid-cols-2"

  return (
    <main className="min-h-screen min-w-[768px] bg-white px-8 py-8">
      <div className="mx-auto max-w-[1200px]">
        <section className="rounded-[14px] border border-livably-green bg-white p-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-medium leading-snug text-livably-text">{result.summary}</h1>
              <p className="mt-2 text-sm text-livably-muted">
                Based on thermal comfort, wind quality, and sunlight analysis
              </p>
            </div>
            {winner ? (
              <div className="shrink-0 rounded-full bg-livably-greenLight px-3 py-1 text-xs font-medium text-livably-green">
                Best match: {winner.name}
              </div>
            ) : null}
          </div>
        </section>

        <DeckAnalysisMap listings={listings} />

        <section className={`mt-8 grid ${gridClass} gap-6`}>
          {listings.map((listing) => (
            <ListingResultColumn
              key={listing.id}
              listing={listing}
              winner={listing.id === result.winner_id}
            />
          ))}
        </section>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-8 text-sm font-medium text-livably-muted hover:text-livably-text"
        >
          ← Compare other listings
        </button>
      </div>
    </main>
  )
}
