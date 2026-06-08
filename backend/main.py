from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from infrared_service import analyze_building
from insights import generate_insights
from listings import LISTINGS, LISTINGS_BY_ID
from scoring import compute_scores


load_dotenv()

app = FastAPI(title="Livably Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://livably-frontend.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    listing_ids: list[str] | None = None
    listing_a_id: str | None = None
    listing_b_id: str | None = None


def _public_listing(listing: dict) -> dict:
    return {key: value for key, value in listing.items() if key != "polygon"}


def _scored_listing(listing: dict, raw: dict) -> dict:
    scores = compute_scores(raw)
    return {
        "id": listing["id"],
        "name": listing["name"],
        "neighborhood": listing["neighborhood"],
        "lat": listing["lat"],
        "lon": listing["lon"],
        "rooms": listing["rooms"],
        "size_m2": listing["size_m2"],
        "site_polygon": listing["polygon"]["coordinates"][0],
        **scores,
        "wind_heatmap": raw.get("wind_heatmap"),
        "thermal_heatmap": raw.get("thermal_heatmap"),
        "wind_heatmap_cells": raw.get("wind_heatmap_cells", []),
        "thermal_heatmap_cells": raw.get("thermal_heatmap_cells", []),
        "sun_heatmap_cells": raw.get("sun_heatmap_cells", []),
        "heatmap_bounds": raw.get("heatmap_bounds"),
        "insights": generate_insights(scores, raw),
    }


@app.get("/listings")
def get_listings():
    return [_public_listing(listing) for listing in LISTINGS]


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    listing_ids = request.listing_ids
    if listing_ids is None and request.listing_a_id and request.listing_b_id:
        listing_ids = [request.listing_a_id, request.listing_b_id]

    if listing_ids is None or len(listing_ids) not in (2, 3):
        raise HTTPException(status_code=400, detail="Select 2 or 3 listings")

    if len(set(listing_ids)) != len(listing_ids):
        raise HTTPException(status_code=400, detail="Listing IDs must be unique")

    listings = [LISTINGS_BY_ID.get(listing_id) for listing_id in listing_ids]
    if any(listing is None for listing in listings):
        raise HTTPException(status_code=404, detail="Listing ID not found")

    try:
        raw_results = [
            analyze_building(listing["polygon"], listing["lat"], listing["lon"])
            for listing in listings
            if listing is not None
        ]
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {error}") from error

    scored_listings = [
        _scored_listing(listing, raw)
        for listing, raw in zip(listings, raw_results)
        if listing is not None
    ]

    ranked = sorted(scored_listings, key=lambda listing: listing["comfort_score"], reverse=True)
    winner = ranked[0]
    runner_up = ranked[1]
    difference = abs(winner["comfort_score"] - runner_up["comfort_score"])

    return {
        "listings": scored_listings,
        "listing_a": scored_listings[0],
        "listing_b": scored_listings[1],
        "listing_c": scored_listings[2] if len(scored_listings) == 3 else None,
        "winner_id": winner["id"],
        "difference_pct": difference,
        "summary": f'{winner["name"]} is {difference}% more comfortable than {runner_up["name"]}',
    }
