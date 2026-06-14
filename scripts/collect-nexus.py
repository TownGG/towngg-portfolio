import csv
import datetime as dt
import json
import os
import re
import ssl
import sys
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "assets" / "data" / "nexus-mods.json"
HISTORY_PATH = ROOT / "assets" / "data" / "nexus-history.csv"
LATEST_PATH = ROOT / "assets" / "data" / "nexus-latest.json"

DEFAULT_DISCOVERY_GAME = "starfield"
DEFAULT_DISCOVERY_AUTHOR = "TownGG"
DEFAULT_DISCOVERY_PERIOD = "1m"

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


def nexus_mod_url(game, mod_id):
    return f"https://www.nexusmods.com/{game}/mods/{mod_id}"


def read_config():
    if not CONFIG_PATH.exists():
        return {"mods": []}
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def write_config(config):
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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


def candidate_list(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("mods", "results", "data", "items"):
            if isinstance(payload.get(key), list):
                return payload[key]
    return []


def candidate_mod_id(item):
    for key in ("mod_id", "modId", "id"):
        value = item.get(key) if isinstance(item, dict) else None
        if value:
            return str(value)
    return ""


def strings_from_value(value):
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, (int, float)):
        return [str(value)]
    if isinstance(value, dict):
        strings = []
        for key in ("name", "username", "user_name", "member_name", "display_name", "author"):
            if key in value:
                strings.extend(strings_from_value(value.get(key)))
        return strings
    if isinstance(value, list):
        strings = []
        for item in value:
            strings.extend(strings_from_value(item))
        return strings
    return []


def author_strings(item):
    if not isinstance(item, dict):
        return []
    fields = (
        "author",
        "user",
        "uploader",
        "uploaded_by",
        "uploaded_by_name",
        "username",
        "member_name",
        "owner",
        "submitted_by",
    )
    strings = []
    for field in fields:
        if field in item:
            strings.extend(strings_from_value(item.get(field)))
    return strings


def is_author_match(item, author_name):
    target = str(author_name or "").strip().lower()
    if not target:
        return False
    for value in author_strings(item):
        text = str(value or "").strip().lower()
        if text == target:
            return True
    return False


def discover_author_mods(api_key, config_mods):
    author_name = os.environ.get("NEXUS_AUTHOR_NAME", DEFAULT_DISCOVERY_AUTHOR).strip()
    game = os.environ.get("NEXUS_DISCOVERY_GAME", DEFAULT_DISCOVERY_GAME).strip() or DEFAULT_DISCOVERY_GAME
    period = os.environ.get("NEXUS_DISCOVERY_PERIOD", DEFAULT_DISCOVERY_PERIOD).strip() or DEFAULT_DISCOVERY_PERIOD
    enabled = os.environ.get("NEXUS_AUTO_DISCOVER", "true").strip().lower() not in {"0", "false", "no", "off"}

    if not enabled or not author_name:
        return []

    known_ids = {str(mod.get("mod_id")) for mod in config_mods if mod.get("mod_id")}
    updated_url = f"https://api.nexusmods.com/v1/games/{game}/mods/updated.json?period={urllib.parse.quote(period)}"

    try:
        updated_payload = request_json(updated_url, api_key)
    except Exception as exc:
        print(f"Nexus discovery skipped: {exc}")
        return []

    discovered = []
    seen_ids = set()
    for item in candidate_list(updated_payload):
        if not isinstance(item, dict):
            continue
        mod_id = candidate_mod_id(item)
        if not mod_id or mod_id in known_ids or mod_id in seen_ids:
            continue
        seen_ids.add(mod_id)

        detail_url = f"https://api.nexusmods.com/v1/games/{game}/mods/{mod_id}.json"
        try:
            detail = request_json(detail_url, api_key)
        except Exception as exc:
            print(f"Failed to inspect discovered candidate {mod_id}: {exc}")
            continue

        if not (is_author_match(item, author_name) or is_author_match(detail, author_name)):
            continue

        discovered.append({
            "game": game,
            "mod_id": mod_id,
            "name": detail.get("name") or item.get("name") or f"Nexus Mod {mod_id}",
            "url": nexus_mod_url(game, mod_id),
        })

    return discovered


def merge_discovered_mods(config, discovered):
    mods = list(config.get("mods", []))
    known_ids = {str(mod.get("mod_id")) for mod in mods if mod.get("mod_id")}
    added = []

    for mod in discovered:
        mod_id = str(mod.get("mod_id", ""))
        if not mod_id or mod_id in known_ids:
            continue
        mods.append(mod)
        known_ids.add(mod_id)
        added.append(mod)

    if added:
        config["mods"] = mods
        write_config(config)
        for mod in added:
            print(f"Discovered Nexus mod {mod['mod_id']}: {mod.get('name', '')}")

    return mods, added


def row_from_item(mod, item):
    mod_id = str(mod["mod_id"])
    game = mod.get("game", DEFAULT_DISCOVERY_GAME)
    return {
        "platform": "nexus",
        "mod_id": mod_id,
        "mod_name": item.get("name") or mod.get("name", ""),
        "mod_url": mod.get("url") or nexus_mod_url(game, mod_id),
        "image_url": item.get("picture_url", ""),
        "total_downloads": item.get("total_downloads") or item.get("downloads") or item.get("mod_downloads"),
        "unique_downloads": item.get("unique_downloads") or item.get("mod_unique_downloads"),
        "likes": item.get("endorsement_count") or item.get("endorsements"),
        "views": item.get("views"),
        "notes": "Collected via Nexus Mods API.",
    }


def main():
    api_key = os.environ.get("NEXUS_API_KEY", "").strip()
    if not api_key:
        print("NEXUS_API_KEY is not set.")
        sys.exit(2)

    date = sys.argv[1] if len(sys.argv) > 1 else today()
    updated_at = iso_now()
    config = read_config()
    config_mods = list(config.get("mods", []))
    discovered = discover_author_mods(api_key, config_mods)
    mods, added = merge_discovered_mods(config, discovered)
    previous_rows = read_history()
    fresh_rows = []

    for mod in mods:
        url = f"https://api.nexusmods.com/v1/games/{mod['game']}/mods/{mod['mod_id']}.json"
        try:
            item = request_json(url, api_key)
        except Exception as exc:
            print(f"Failed to collect {mod['mod_id']}: {exc}")
            continue
        fresh_rows.append(row_from_item(mod, item))

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
    if added:
        print(f"Added {len(added)} discovered Nexus mod(s) to {CONFIG_PATH}")


if __name__ == "__main__":
    main()
