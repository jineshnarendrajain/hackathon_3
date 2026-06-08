import type { Listing } from "@/lib/types"

interface ListingPinProps {
  listing: Listing
  selected: boolean
}

function formatPinPrice(price: number) {
  return `€${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k`
}

function isPoblenou(neighborhood: string) {
  return neighborhood.toLowerCase().includes("poblenou")
}

function pinColor(neighborhood: string) {
  if (neighborhood.toLowerCase().includes("gràcia") || neighborhood.toLowerCase().includes("gracia")) {
    return "#639922"
  }

  if (isPoblenou(neighborhood)) {
    return "#185FA5"
  }

  const colors = ["#7C3AED", "#B45309", "#0F766E", "#BE123C", "#4B5563", "#C2410C"]
  let hash = 0
  for (let index = 0; index < neighborhood.length; index += 1) {
    hash = (hash + neighborhood.charCodeAt(index) * (index + 1)) % colors.length
  }
  return colors[hash]
}

export default function ListingPin({ listing, selected }: ListingPinProps) {
  const background = pinColor(listing.neighborhood)

  return (
    <div
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[11px] font-semibold text-white transition-transform ${
        selected ? "animate-pinPulse scale-[1.15] border-[3px] border-[#FFD700]" : "border-2 border-white"
      }`}
      style={{ backgroundColor: background }}
      aria-label={`${listing.name}, ${formatPinPrice(listing.price)}`}
    >
      {formatPinPrice(listing.price)}
    </div>
  )
}
