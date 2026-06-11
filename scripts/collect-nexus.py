import csv
import datetime as dt
import json
import os
import re
import ssl
import sys
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "assets" / "data" / "nexus-mods.json"
HISTORY_PATH = ROOT / "assets" / "data" / "nexus-history.csv"
LATEST_PATH = ROOT / "assets" / "data" / "nexus-latest.json"

FIELDS = [
    "date",
    "platform",
    "mod_id",
    "mod_name",
    "mod_url",
    "image_url",
    "total_downloads",
    "unique_downloads",
    "daily_downloads",
    "likes",
    "views",
    "notes",
]


def now_utc():
    return dt.datetime.now(dt.timezone.utc)


def today():
    return now_utc().astimezone().date().isoformat()


def iso_now():
    return now_utc().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def number(value, default=0):
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip().replace(",", "")
    match = re.match(r"^([0-9]+(?:\.[0-9]+)?)([kmb])?$", text, re.I)
    if match:
        multipliers = {"k": 1000, "m": 1000000, "b": 1000000000}
        return int(float(match.group(1)) * multipliers.get((match.group(2) or "").lower(), 1))
    digits = re.sub(r"[^0-9]", "", text)
    return int(digits) if digits else default


def request_json(url, api_key):
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "TownGG portfolio stats collector",
            "apikey": api_key,
        },
    )
    with urllib.request.urlopen(req, timeout=30, context=ssl.create_default_context()) as response:
        return json.loads(response.read().decode("utf-8", "replace"))


def read_history():
    if not HISTORY_PATH.exists():
        return []
    with HISTORY_PATH.open("r", newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_history(rows):
    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    with HISTORY_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def write_latest(rows, updated_at):
    latest = {
        "updatedAt": updated_at,
        "mods": [
            {
                "platform": row.get("platform", "nexus"),
                "mod_id": str(row.get("mod_id", "")),
                "mod_name": row.get("mod_name", ""),
                "mod_url": row.get("mod_url", ""),
                "image_url": row.get("image_url", ""),
                "total_downloads": number(row.get("total_downloads")),
                "unique_downloads": number(row.get("unique_downloads")),
                "daily_downloads": number(row.get("daily_downloads")),
                "likes": number(row.get("likes")),
                "views": number(row.get("views")),
            }
            for row in rows
        ],
    }
    LATEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    LATEST_PATH.write_text(json.dumps(latest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def latest_previous(rows, platform, mod_id, date):
    candidates = [
        row for row in rows
        if row.get("platform") == platform and row.get("mod_id") == str(mod_id) and row.get("date", "") < date
    ]
    return sorted(candidates, key=lambda row: row["date"])[-1] if candidates else None


def normalize(row, previous_rows, date):
    previous = latest_previous(previous_rows, row["platform"], row["mod_id"], date)
    previous_total = number(previous.get("total_downloads")) if previous else None
    total = number(row.get("total_downloads"))
    normalized = {field: "" for field in FIELDS}
    normalized.update(row)
    normalized["date"] = date
    normalized["total_downloads"] = total
    normalized["unique_downloads"] = number(row.get("unique_downloads"))
    normalized["daily_downloads"] = max(0, total - previous_total) if previous_total is not None else 0
    normalized["likes"] = number(row.get("likes"))
    normalized["views"] = number(row.get("views"))
    return normalized


def main():
    api_key = os.environ.get("NEXUS_API_KEY", "").strip()
    if not api_key:
        print("NEXUS_API_KEY is not set.")
        sys.exit(2)

    date = sys.argv[1] if len(sys.argv) > 1 else today()
    updated_at = iso_now()
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    previous_rows = read_history()
    fresh_rows = []

    for mod in config.get("mods", []):
        url = f"https://api.nexusmods.com/v1/games/{mod['game']}/mods/{mod['mod_id']}.json"
        try:
            item = request_json(url, api_key)
        except Exception as exc:
            print(f"Failed to collect {mod['mod_id']}: {exc}")
            continue
        fresh_rows.append({
            "platform": "nexus",
            "mod_id": str(mod["mod_id"]),
            "mod_name": item.get("name") or mod.get("name", ""),
            "mod_url": mod.get("url", ""),
            "image_url": item.get("picture_url", ""),
            "total_downloads": item.get("total_downloads") or item.get("downloads") or item.get("mod_downloads"),
            "unique_downloads": item.get("unique_downloads") or item.get("mod_unique_downloads"),
            "likes": item.get("endorsement_count") or item.get("endorsements"),
            "views": item.get("views"),
            "notes": "Collected via Nexus Mods API.",
        })

    if not fresh_rows:
        print("No fresh rows collected.")
        sys.exit(2)

    normalized = [normalize(row, previous_rows, date) for row in fresh_rows]
    kept = [
        row for row in previous_rows
        if not any(row.get("date") == date and row.get("platform") == new["platform"] and row.get("mod_id") == new["mod_id"] for new in normalized)
    ]
    write_history(kept + normalized)
    write_latest(normalized, updated_at)
    print(f"Saved {len(normalized)} rows to {HISTORY_PATH}")
    print(f"Saved latest snapshot to {LATEST_PATH}")


if __name__ == "__main__":
    main()
