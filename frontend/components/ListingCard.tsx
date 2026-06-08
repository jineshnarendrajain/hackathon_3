import type { Listing } from "@/lib/types"

interface ListingCardProps {
  listing: Listing
  onRemove: (listingId: string) => void
}

function neighborhoodClasses(neighborhood: string) {
  const isPoblenou = neighborhood.toLowerCase().includes("poblenou")
  return isPoblenou
    ? "bg-livably-blueLight text-livably-blue"
    : "bg-livably-greenLight text-livably-green"
}

export default function ListingCard({ listing, onRemove }: ListingCardProps) {
  return (
    <article className="relative flex h-[76px] w-[280px] items-center gap-3 rounded-[10px] border border-livably-border bg-white p-3">
      <img
        src={listing.image}
        alt=""
        className="h-10 w-10 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-livably-text">{listing.name}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${neighborhoodClasses(listing.neighborhood)}`}>
            {listing.neighborhood}
          </span>
          <span className="text-xs text-livably-muted">€{listing.price.toLocaleString("en-US")}</span>
        </div>
      </div>
      <button
        type="button"
        className="absolute right-2 top-1 flex h-6 w-6 items-center justify-center rounded-md text-livably-muted hover:bg-livably-surface hover:text-livably-text"
        onClick={() => onRemove(listing.id)}
        aria-label={`Remove ${listing.name}`}
      >
        ×
      </button>
    </article>
  )
}
