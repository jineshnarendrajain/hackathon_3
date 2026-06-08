import csv
import hashlib
import math
import re
import unicodedata
from pathlib import Path


ROOT_PATH = Path(__file__).resolve().parent
DATA_SOURCES = [
    {
        "path": ROOT_PATH / "clean_data.csv",
        "address": "address",
        "city": "city",
        "neighborhood": "neighborhood",
        "price": "price",
        "size": "sq_m_built",
        "rooms": "n_bedrooms",
    },
    {
        "path": ROOT_PATH / "raw_data.csv",
        "address": "title",
        "city": None,
        "neighborhood": "neighborhood",
        "price": "price",
        "size": "info_features",
        "rooms": "info_features",
    },
    {
        "path": ROOT_PATH / "structured_dataw_description.csv",
        "address": "adress",
        "city": "city",
        "neighborhood": "neighborhood",
        "price": "price",
        "size": "sq_m_built",
        "rooms": "n_bedrooms",
    },
]
MAX_LISTINGS = 360
MAX_PER_NEIGHBORHOOD = 6

IMAGES = [
    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=160&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=160&q=80",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=160&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=160&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=160&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=160&q=80",
]

# clean_data.csv has street addresses but no lat/lon. These approximate centers
# spread listings across Barcelona until exact address geocoding is added.
NEIGHBORHOOD_CENTERS = {
    "ciutat vella": (41.3834, 2.1762),
    "el raval": (41.3796, 2.1699),
    "el gotic": (41.3839, 2.1763),
    "sant pere - santa caterina i la ribera": (41.3861, 2.1814),
    "la barceloneta": (41.3800, 2.1899),
    "eixample": (41.3918, 2.1649),
    "la dreta de l'eixample": (41.3948, 2.1688),
    "l'antiga esquerra de l'eixample": (41.3895, 2.1547),
    "la nova esquerra de l'eixample": (41.3826, 2.1484),
    "sant antoni": (41.3788, 2.1618),
    "la sagrada familia": (41.4042, 2.1744),
    "el fort pienc": (41.3953, 2.1799),
    "sants-montjuic": (41.3726, 2.1546),
    "sants": (41.3754, 2.1384),
    "sants - badal": (41.3714, 2.1277),
    "hostafrancs": (41.3760, 2.1431),
    "la bordeta": (41.3686, 2.1379),
    "el poble sec - parc de montjuic": (41.3710, 2.1622),
    "la font de la guatlla": (41.3698, 2.1474),
    "la marina del port": (41.3595, 2.1390),
    "la marina del prat vermell": (41.3477, 2.1455),
    "les corts": (41.3866, 2.1344),
    "la maternitat i sant ramon": (41.3797, 2.1199),
    "pedralbes": (41.3897, 2.1130),
    "sarria-sant gervasi": (41.4020, 2.1307),
    "sarria": (41.3994, 2.1214),
    "sant gervasi - galvany": (41.3972, 2.1456),
    "sant gervasi - la bonanova": (41.4058, 2.1347),
    "les tres torres": (41.3977, 2.1300),
    "el putxet i el farro": (41.4076, 2.1450),
    "vallvidrera - el tibidabo i les planes": (41.4190, 2.1002),
    "vila de gracia": (41.4012, 2.1572),
    "gracia": (41.4050, 2.1536),
    "el camp d'en grassot i gracia nova": (41.4064, 2.1634),
    "la salut": (41.4144, 2.1544),
    "el coll": (41.4180, 2.1470),
    "vallcarca i els penitents": (41.4128, 2.1435),
    "horta guinardo": (41.4185, 2.1677),
    "el guinardo": (41.4182, 2.1745),
    "el baix guinardo": (41.4096, 2.1679),
    "can baro": (41.4144, 2.1624),
    "el carmel": (41.4214, 2.1549),
    "la teixonera": (41.4230, 2.1465),
    "horta": (41.4367, 2.1598),
    "la font d'en fargues": (41.4255, 2.1652),
    "sant genis dels agudells - montbau": (41.4277, 2.1395),
    "sant genis dels agadells - montbau": (41.4277, 2.1395),
    "la vall d'hebron - la clota": (41.4291, 2.1485),
    "nou barris": (41.4432, 2.1760),
    "vilapicina i la torre llobeta": (41.4318, 2.1746),
    "porta": (41.4353, 2.1773),
    "can peguera - el turo de la peira": (41.4324, 2.1668),
    "la prosperitat": (41.4423, 2.1828),
    "verdun": (41.4427, 2.1755),
    "les roquetes": (41.4481, 2.1752),
    "canyelles": (41.4457, 2.1635),
    "la guineueta": (41.4383, 2.1696),
    "ciutat meridiana - torre baro - vallbona": (41.4614, 2.1806),
    "la trinitat nova": (41.4491, 2.1840),
    "sant andreu": (41.4354, 2.1898),
    "la sagrera": (41.4243, 2.1907),
    "navas": (41.4176, 2.1857),
    "el congres i els indians": (41.4249, 2.1803),
    "la trinitat vella": (41.4493, 2.1935),
    "el bon pastor": (41.4376, 2.2037),
    "baro de viver": (41.4490, 2.1994),
    "sant marti": (41.4145, 2.1993),
    "el camp de l'arpa del clot": (41.4110, 2.1825),
    "el clot": (41.4106, 2.1906),
    "sant marti de provencals": (41.4198, 2.1990),
    "la verneda i la pau": (41.4241, 2.2045),
    "el besos": (41.4181, 2.2156),
    "el poblenou": (41.4026, 2.2020),
    "diagonal mar i el front maritim del poblenou": (41.4072, 2.2157),
    "provencals del poblenou": (41.4132, 2.2050),
    "la vila olimpica del poblenou": (41.3915, 2.1952),
    "el parc i la llacuna del poblenou": (41.3981, 2.1906),
}


def _bbox(lat, lon, half_m=60):
    dlat = half_m / 111_320
    dlon = half_m / (111_320 * math.cos(math.radians(lat)))
    lo, hi = lon - dlon, lon + dlon
    la, la2 = lat - dlat, lat + dlat
    return {
        "type": "Polygon",
        "coordinates": [[[lo, la], [hi, la], [hi, la2], [lo, la2], [lo, la]]],
    }


def _normalize(value):
    return (
        unicodedata.normalize("NFKD", value or "")
        .encode("ascii", "ignore")
        .decode()
        .lower()
        .strip()
    )


def _to_int(value):
    return int(float(str(value).replace(",", "").strip()))


def _first_int(value):
    match = re.search(r"\d+", value or "")
    if not match:
        raise ValueError
    return int(match.group())


def _field(row, name):
    if not name:
        return ""
    return (row.get(name) or "").strip()


def _address_from_title(title):
    title = title.strip()
    marker = " for sale in "
    if marker in title:
        return title.split(marker, 1)[1].strip()
    return title


def _city_from_row(row, source):
    city = _field(row, source["city"])
    if city:
        return city

    neighborhood = _field(row, source["neighborhood"])
    if "," not in neighborhood:
        return ""
    return neighborhood.rsplit(",", 1)[1].strip()


def _neighborhood_from_row(row, source):
    neighborhood = _field(row, source["neighborhood"])
    if "," in neighborhood:
        return neighborhood.rsplit(",", 1)[0].strip()
    return neighborhood


def _size_from_row(row, source):
    value = _field(row, source["size"])
    try:
        return _to_int(value)
    except ValueError:
        return _first_int(value)


def _rooms_from_row(row, source):
    value = _field(row, source["rooms"])
    try:
        return _to_int(value)
    except ValueError:
        match = re.search(r"(\d+)\s*bed", value, re.IGNORECASE)
        if not match:
            raise ValueError
        return int(match.group(1))


def _normalize_row(row, source):
    address = _field(row, source["address"])
    if source["address"] == "title":
        address = _address_from_title(address)

    return {
        "id": _field(row, "id"),
        "address": address,
        "neighborhood": _neighborhood_from_row(row, source),
        "city": _city_from_row(row, source),
        "price": _field(row, source["price"]),
        "sq_m_built": _field(row, source["size"]),
        "n_bedrooms": _field(row, source["rooms"]),
    }


def _listing_name(row):
    address = row["address"].strip()
    return address[0].upper() + address[1:] if address else row["neighborhood"]


def _center_for(neighborhood):
    normalized = _normalize(neighborhood)
    if normalized in NEIGHBORHOOD_CENTERS:
        return NEIGHBORHOOD_CENTERS[normalized]

    digest = hashlib.sha256(normalized.encode("utf-8")).digest()
    lat = 41.345 + (int.from_bytes(digest[:4], "big") / 0xFFFFFFFF) * 0.120
    lon = 2.095 + (int.from_bytes(digest[4:8], "big") / 0xFFFFFFFF) * 0.135
    return lat, lon


def _stable_offset(seed, scale=0.0065):
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    x = int.from_bytes(digest[:4], "big") / 0xFFFFFFFF
    y = int.from_bytes(digest[4:8], "big") / 0xFFFFFFFF
    return (x - 0.5) * scale, (y - 0.5) * scale


def _coordinates_for(row):
    lat, lon = _center_for(row["neighborhood"])
    lat_offset, lon_offset = _stable_offset(f"{row['id']}:{row['address']}")
    return lat + lat_offset, lon + lon_offset


def _is_usable(row):
    if row["city"] != "Barcelona":
        return False

    try:
        price = _to_int(row["price"])
        size = _size_from_row(row, {"size": "sq_m_built"})
        rooms = _rooms_from_row(row, {"rooms": "n_bedrooms"})
    except ValueError:
        return False

    return (
        row["address"].strip()
        and 120_000 <= price <= 1_200_000
        and 35 <= size <= 180
        and 1 <= rooms <= 5
    )


def _load_rows():
    best_source = None
    best_rows = []
    best_rank = (-1, -1)

    for source in DATA_SOURCES:
        with source["path"].open("r", encoding="utf-8-sig", newline="") as file:
            rows = [
                normalized
                for row in csv.DictReader(file)
                if (normalized := _normalize_row(row, source)) and _is_usable(normalized)
            ]

        center_matches = sum(
            _normalize(row["neighborhood"]) in NEIGHBORHOOD_CENTERS for row in rows
        )
        rank = (center_matches, len(rows))
        if rank > best_rank:
            best_source = source
            best_rows = rows
            best_rank = rank

    if best_source is None:
        return []

    deduped = {}
    for row in best_rows:
        deduped.setdefault(row["id"], row)

    return list(deduped.values())


def _select_rows(rows):
    selected = []
    neighborhoods = sorted({row["neighborhood"] for row in rows})

    for neighborhood in neighborhoods:
        neighborhood_rows = [row for row in rows if row["neighborhood"] == neighborhood]
        neighborhood_rows.sort(key=lambda row: (_to_int(row["price"]), _to_int(row["sq_m_built"])))
        selected.extend(neighborhood_rows[:MAX_PER_NEIGHBORHOOD])

    selected.sort(key=lambda row: (row["neighborhood"], _to_int(row["price"]), row["id"]))
    return selected[:MAX_LISTINGS]


def _to_listing(row, index):
    lat, lon = _coordinates_for(row)
    return {
        "id": row["id"],
        "name": _listing_name(row),
        "neighborhood": row["neighborhood"],
        "price": _to_int(row["price"]),
        "size_m2": _to_int(row["sq_m_built"]),
        "rooms": _to_int(row["n_bedrooms"]),
        "lat": lat,
        "lon": lon,
        "image": IMAGES[index % len(IMAGES)],
        "polygon": _bbox(lat, lon),
        "source_neighborhood": row["neighborhood"],
        "source_address": row["address"],
    }


def _load_listings():
    return [_to_listing(row, index) for index, row in enumerate(_select_rows(_load_rows()))]


LISTINGS = _load_listings()
LISTINGS_BY_ID = {listing["id"]: listing for listing in LISTINGS}
