import type { ComparisonResult, Listing } from "./types"

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"

export const fallbackListings: Listing[] = [
  {
    id: "104203099",
    name: "Calle de Benet Mercadé, 31",
    neighborhood: "Gràcia",
    price: 250000,
    size_m2: 50,
    rooms: 1,
    lat: 41.4009,
    lon: 2.1573,
    image: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "102744642",
    name: "Calle de la Riera de Sant Miquel, 72",
    neighborhood: "Gràcia",
    price: 277000,
    size_m2: 46,
    rooms: 2,
    lat: 41.3988,
    lon: 2.1532,
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "104311505",
    name: "Calle de Pau Alsina, 37",
    neighborhood: "Gràcia",
    price: 280000,
    size_m2: 76,
    rooms: 3,
    lat: 41.4051,
    lon: 2.1631,
    image: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "103293262",
    name: "Calle de Pallars, 302",
    neighborhood: "Poblenou",
    price: 220000,
    size_m2: 47,
    rooms: 2,
    lat: 41.407,
    lon: 2.2041,
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "100941678",
    name: "Calle de Bac de Roda, 28",
    neighborhood: "Poblenou",
    price: 274000,
    size_m2: 54,
    rooms: 2,
    lat: 41.3996,
    lon: 2.2051,
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "95520767",
    name: "Gran Via de les Corts Catalanes, 1012",
    neighborhood: "Poblenou",
    price: 185000,
    size_m2: 75,
    rooms: 3,
    lat: 41.4143,
    lon: 2.2057,
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=160&q=80"
  }
]

export async function getListings(): Promise<Listing[]> {
  try {
    const response = await fetch(`${BASE}/listings`)

    if (!response.ok) {
      throw new Error("Failed to load listings")
    }

    return response.json()
  } catch {
    return fallbackListings
  }
}

export async function analyzeListings(
  listingIds: string[]
): Promise<ComparisonResult> {
  const response = await fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      listing_ids: listingIds
    })
  })

  if (!response.ok) {
    let message = "Analysis failed"

    try {
      const payload = await response.json()
      if (typeof payload.detail === "string") {
        message = payload.detail
      }
    } catch {
      // Keep the generic message if the backend did not return JSON.
    }

    throw new Error(message)
  }

  return response.json()
}
