def _clamp_score(value):
    return max(0, min(100, round(value)))


def compute_scores(raw: dict) -> dict:
    thermal_score = raw["raw_utci_comfortable_pct"]

    wind_score = raw["raw_wind_comfortable_pct"]
    if raw["raw_wind_mean"] > 6:
        wind_score *= 0.6

    sun_score = raw.get("raw_sun_balanced_pct", 100 - raw["raw_utci_heat_stress_pct"] * 1.5)

    thermal_score = _clamp_score(thermal_score)
    wind_score = _clamp_score(wind_score)
    sun_score = _clamp_score(sun_score)

    comfort_score = _clamp_score(
        thermal_score * 0.50 + wind_score * 0.30 + sun_score * 0.20
    )

    return {
        "comfort_score": comfort_score,
        "thermal_score": thermal_score,
        "wind_score": wind_score,
        "sun_score": sun_score,
    }
