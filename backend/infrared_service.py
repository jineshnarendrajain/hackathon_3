import os
import base64
import hashlib

import numpy as np
from infrared_sdk import InfraredClient
from infrared_sdk.analyses.types import (
    AnalysesName,
    SolarModelRequest,
    UtciModelBaseRequest,
    UtciModelRequest,
    WindModelRequest,
)
from infrared_sdk.models import Location, TimePeriod


WIND_SPEED_MS = 4
WIND_DIRECTION_DEG = 225
UTCI_MONTH = 7
UTCI_START_HOUR = 9
UTCI_END_HOUR = 18
SUN_MONTH = 7
SUN_START_HOUR = 9
SUN_END_HOUR = 18
SUN_DAYS = 28
MIN_BALANCED_SUN_HOURS_PER_DAY = 2
MAX_BALANCED_SUN_HOURS_PER_DAY = 6
WEATHER_RADIUS_KM = 100


def _finite_values(grid):
    values = np.asarray(grid, dtype=float).ravel()
    return values[np.isfinite(values)]


def _percentage(mask):
    if mask.size == 0:
        return 0.0
    return float(np.mean(mask) * 100)


def _color(value):
    stops = [
        (43, 111, 176),
        (116, 173, 209),
        (224, 243, 248),
        (254, 224, 144),
        (244, 109, 67),
        (165, 0, 38),
    ]
    value = max(0.0, min(1.0, value))
    scaled = value * (len(stops) - 1)
    index = min(int(scaled), len(stops) - 2)
    t = scaled - index
    a = stops[index]
    b = stops[index + 1]
    rgb = tuple(round(a[channel] + (b[channel] - a[channel]) * t) for channel in range(3))
    return f"rgb({rgb[0]},{rgb[1]},{rgb[2]})"


def _color_rgba(value, alpha=185):
    stops = [
        (43, 111, 176),
        (116, 173, 209),
        (224, 243, 248),
        (254, 224, 144),
        (244, 109, 67),
        (165, 0, 38),
    ]
    value = max(0.0, min(1.0, value))
    scaled = value * (len(stops) - 1)
    index = min(int(scaled), len(stops) - 2)
    t = scaled - index
    a = stops[index]
    b = stops[index + 1]
    return [
        round(a[channel] + (b[channel] - a[channel]) * t)
        for channel in range(3)
    ] + [alpha]


def _heatmap_svg(grid, label, lower_is_better=False, size=28):
    values = np.asarray(grid, dtype=float)
    if values.ndim != 2:
        values = np.squeeze(values)
    if values.ndim != 2:
        values = values.reshape(1, -1)

    rows = np.linspace(0, values.shape[0] - 1, min(size, values.shape[0])).astype(int)
    cols = np.linspace(0, values.shape[1] - 1, min(size, values.shape[1])).astype(int)
    sampled = values[np.ix_(rows, cols)]
    finite = sampled[np.isfinite(sampled)]
    if finite.size == 0:
        finite = np.array([0.0])

    low = float(np.nanpercentile(finite, 5))
    high = float(np.nanpercentile(finite, 95))
    if high == low:
        high = low + 1

    cell = 4
    width = sampled.shape[1] * cell
    height = sampled.shape[0] * cell
    rects = []

    for row_index in range(sampled.shape[0]):
        for col_index in range(sampled.shape[1]):
            value = sampled[row_index, col_index]
            if not np.isfinite(value):
                fill = "#f3f4f6"
            else:
                normalized = (float(value) - low) / (high - low)
                if lower_is_better:
                    normalized = 1 - normalized
                fill = _color(normalized)
            rects.append(
                f'<rect x="{col_index * cell}" y="{row_index * cell}" width="{cell}" height="{cell}" fill="{fill}" />'
            )

    rect_markup = "".join(rects)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height + 18}">'
        f'<rect width="{width}" height="{height + 18}" fill="#ffffff" />'
        f"<g>{rect_markup}</g>"
        f'<text x="0" y="{height + 14}" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">{label}</text>'
        f"</svg>"
    )
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def _deck_bounds(polygon):
    ring = polygon["coordinates"][0]
    lons = [point[0] for point in ring]
    lats = [point[1] for point in ring]
    return [min(lons), min(lats), max(lons), max(lats)]


def _padded_bounds(bounds, factor=1.6):
    west, south, east, north = bounds
    lon_pad = (east - west) * (factor - 1) / 2
    lat_pad = (north - south) * (factor - 1) / 2
    return [west - lon_pad, south - lat_pad, east + lon_pad, north + lat_pad]


def _combined_bounds(*bounds_list):
    valid = [bounds for bounds in bounds_list if bounds]
    if not valid:
        return None

    return [
        min(bounds[0] for bounds in valid),
        min(bounds[1] for bounds in valid),
        max(bounds[2] for bounds in valid),
        max(bounds[3] for bounds in valid),
    ]


def _finite_window(values, padding=1):
    finite_positions = np.argwhere(np.isfinite(values))
    if finite_positions.size == 0:
        return values

    min_row, min_col = finite_positions.min(axis=0)
    max_row, max_col = finite_positions.max(axis=0)
    min_row = max(0, min_row - padding)
    min_col = max(0, min_col - padding)
    max_row = min(values.shape[0] - 1, max_row + padding)
    max_col = min(values.shape[1] - 1, max_col + padding)
    return values[min_row : max_row + 1, min_col : max_col + 1]


def _heatmap_cells(grid, bounds, lower_is_better=False, size=14):
    values = np.asarray(grid, dtype=float)
    if values.ndim != 2:
        values = np.squeeze(values)
    if values.ndim != 2:
        values = values.reshape(1, -1)
    values = _finite_window(values)

    rows = np.linspace(0, values.shape[0] - 1, min(size, values.shape[0])).astype(int)
    cols = np.linspace(0, values.shape[1] - 1, min(size, values.shape[1])).astype(int)
    sampled = values[np.ix_(rows, cols)]
    finite = sampled[np.isfinite(sampled)]
    if finite.size == 0:
        finite = np.array([0.0])

    low = float(np.nanpercentile(finite, 5))
    high = float(np.nanpercentile(finite, 95))
    if high == low:
        high = low + 1

    west, south, east, north = bounds
    lon_step = (east - west) / sampled.shape[1]
    lat_step = (north - south) / sampled.shape[0]
    cells = []

    for row_index in range(sampled.shape[0]):
        for col_index in range(sampled.shape[1]):
            value = sampled[row_index, col_index]
            if not np.isfinite(value):
                continue

            normalized = (float(value) - low) / (high - low)
            if lower_is_better:
                normalized = 1 - normalized

            x0 = west + col_index * lon_step
            x1 = x0 + lon_step
            y0 = south + row_index * lat_step
            y1 = y0 + lat_step
            cells.append(
                {
                    "polygon": [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]],
                    "color": _color_rgba(normalized),
                    "value": float(value),
                }
            )

    return cells


def _synthetic_grid(seed: str, base: float, spread: float, size=24):
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    rng_seed = int.from_bytes(digest[:8], "big") % (2**32)
    rng = np.random.default_rng(rng_seed)
    y, x = np.mgrid[0:size, 0:size]
    gradient = ((x / max(size - 1, 1)) * 0.65) + ((y / max(size - 1, 1)) * 0.35)
    noise = rng.normal(0, spread * 0.18, (size, size))
    return base + (gradient - 0.5) * spread + noise


def _fallback_analysis(polygon: dict, lat: float, lon: float, reason: Exception | None = None) -> dict:
    seed = f"{lat:.6f}:{lon:.6f}"
    site_bounds = _deck_bounds(polygon)
    display_bounds = _padded_bounds(site_bounds)

    coastal_factor = max(0.0, min(1.0, (lon - 2.10) / 0.13))
    hill_factor = max(0.0, min(1.0, (lat - 41.35) / 0.11))

    wind_base = 1.8 + coastal_factor * 1.7 + hill_factor * 0.6
    utci_base = 29.5 - coastal_factor * 1.4 + hill_factor * 0.8
    sun_base = 105 + coastal_factor * 18 - hill_factor * 10

    wind_grid = _synthetic_grid(f"{seed}:wind", wind_base, 1.8)
    utci_grid = _synthetic_grid(f"{seed}:utci", utci_base, 5.0)
    sun_grid = _synthetic_grid(f"{seed}:sun", sun_base, 45.0)

    wind_values = _finite_values(wind_grid)
    utci_values = _finite_values(utci_grid)
    sun_values = _finite_values(sun_grid)

    result = {
        "raw_wind_mean": float(np.mean(wind_values)) if wind_values.size else 0.0,
        "raw_wind_comfortable_pct": _percentage(
            (wind_values >= 1.5) & (wind_values <= 3.5)
        ),
        "raw_utci_mean": float(np.mean(utci_values)) if utci_values.size else 0.0,
        "raw_utci_comfortable_pct": _percentage(
            (utci_values >= 9) & (utci_values <= 26)
        ),
        "raw_utci_heat_stress_pct": _percentage(utci_values > 26),
        "raw_sun_mean": float(np.mean(sun_values)) if sun_values.size else 0.0,
        "raw_sun_balanced_pct": _percentage(
            (sun_values / SUN_DAYS >= MIN_BALANCED_SUN_HOURS_PER_DAY)
            & (sun_values / SUN_DAYS <= MAX_BALANCED_SUN_HOURS_PER_DAY)
        ),
        "wind_heatmap": _heatmap_svg(wind_grid, "Estimated wind"),
        "thermal_heatmap": _heatmap_svg(utci_grid, "Estimated thermal"),
        "wind_heatmap_cells": _heatmap_cells(wind_grid, site_bounds),
        "thermal_heatmap_cells": _heatmap_cells(utci_grid, site_bounds),
        "sun_heatmap_cells": _heatmap_cells(sun_grid, site_bounds),
        "heatmap_bounds": display_bounds,
        "simulation_mode": "estimated",
    }

    if reason is not None:
        result["simulation_warning"] = str(reason)

    return result


def analyze_building(polygon: dict, lat: float, lon: float) -> dict:
    api_key = os.getenv("INFRARED_API_KEY")
    if not api_key or api_key == "your_key_here":
        return _fallback_analysis(
            polygon,
            lat,
            lon,
            RuntimeError("INFRARED_API_KEY is not configured"),
        )

    client = InfraredClient(api_key=api_key)

    try:
        area = client.buildings.get_area(polygon)
        stations = client.weather.get_weather_file_from_location(
            lat=lat, lon=lon, radius=WEATHER_RADIUS_KM
        )
        station_uuid = stations[0]["uuid"]

        wind_result = client.run_area_and_wait(
            WindModelRequest(
                analysis_type=AnalysesName.wind_speed,
                wind_speed=WIND_SPEED_MS,
                wind_direction=WIND_DIRECTION_DEG,
            ),
            polygon,
            buildings=area.buildings,
        )

        tp = TimePeriod(
            start_month=UTCI_MONTH,
            start_day=1,
            start_hour=UTCI_START_HOUR,
            end_month=UTCI_MONTH,
            end_day=28,
            end_hour=UTCI_END_HOUR,
        )
        weather_data = client.weather.filter_weather_data(
            identifier=station_uuid, time_period=tp
        )
        payload = UtciModelRequest.from_weatherfile_payload(
            payload=UtciModelBaseRequest(
                analysis_type=AnalysesName.thermal_comfort_index
            ),
            location=Location(latitude=lat, longitude=lon),
            time_period=tp,
            weather_data=weather_data,
        )

        utci_result = client.run_area_and_wait(
            payload, polygon, buildings=area.buildings
        )

        sun_period = TimePeriod(
            start_month=SUN_MONTH,
            start_day=1,
            start_hour=SUN_START_HOUR,
            end_month=SUN_MONTH,
            end_day=28,
            end_hour=SUN_END_HOUR,
        )
        sun_result = client.run_area_and_wait(
            SolarModelRequest(
                analysis_type=AnalysesName.direct_sun_hours,
                latitude=lat,
                longitude=lon,
                time_period=sun_period,
            ),
            polygon,
            buildings=area.buildings,
        )

        wind_values = _finite_values(wind_result.merged_grid)
        utci_values = _finite_values(utci_result.merged_grid)
        sun_values = _finite_values(sun_result.merged_grid)

        site_bounds = _deck_bounds(polygon)
        display_bounds = _padded_bounds(site_bounds)

        return {
            "raw_wind_mean": float(np.mean(wind_values)) if wind_values.size else 0.0,
            "raw_wind_comfortable_pct": _percentage(
                (wind_values >= 1.5) & (wind_values <= 3.5)
            ),
            "raw_utci_mean": float(np.mean(utci_values)) if utci_values.size else 0.0,
            "raw_utci_comfortable_pct": _percentage(
                (utci_values >= 9) & (utci_values <= 26)
            ),
            "raw_utci_heat_stress_pct": _percentage(utci_values > 26),
            "raw_sun_mean": float(np.mean(sun_values)) if sun_values.size else 0.0,
            "raw_sun_balanced_pct": _percentage(
                (sun_values / SUN_DAYS >= MIN_BALANCED_SUN_HOURS_PER_DAY)
                & (sun_values / SUN_DAYS <= MAX_BALANCED_SUN_HOURS_PER_DAY)
            ),
            "wind_heatmap": _heatmap_svg(wind_result.merged_grid, "Wind speed"),
            "thermal_heatmap": _heatmap_svg(utci_result.merged_grid, "Thermal comfort"),
            "wind_heatmap_cells": _heatmap_cells(wind_result.merged_grid, site_bounds),
            "thermal_heatmap_cells": _heatmap_cells(utci_result.merged_grid, site_bounds),
            "sun_heatmap_cells": _heatmap_cells(sun_result.merged_grid, site_bounds),
            "heatmap_bounds": display_bounds,
            "simulation_mode": "infrared",
        }
    except Exception as error:
        return _fallback_analysis(polygon, lat, lon, error)
    finally:
        client.close()
