"""
update_kb.py
Fetches Cyberpunk Wiki pages via MediaWiki API and updates cyberpunk_2077_knowledge_base.json
Runs weekly via GitHub Actions.
"""

import json
import re
import time
import requests
from bs4 import BeautifulSoup
from datetime import datetime

KB_FILE = "cyberpunk_2077_knowledge_base.json"

HEADERS = {
    "User-Agent": "NightCityAssistant/1.0 (github.com/ferrowtech/night-city-assistant; educational bot)"
}

# Official Fandom MediaWiki API - not blocked unlike direct HTML scraping
FANDOM_API = "https://cyberpunk.fandom.com/api.php"

WIKI_PAGES = [
    {
        "section": "iconic_weapons_wiki_update",
        "page_title": "Iconic weapons (Phantom Liberty)",
        "parser": "parse_iconic_weapons_en"
    },
    {
        "section": "quickhacks_wiki_update",
        "page_title": "Quickhacks",
        "parser": "parse_quickhacks_en"
    },
    {
        "section": "vehicles_wiki_update",
        "page_title": "Vehicles (Cyberpunk 2077)",
        "parser": "parse_vehicles_en"
    }
]


def fetch_page(page_title: str) -> BeautifulSoup | None:
    """Fetch a wiki page via MediaWiki API and return BeautifulSoup of rendered HTML."""
    params = {
        "action": "parse",
        "page": page_title,
        "prop": "text",
        "format": "json",
        "disableeditsection": "true",
    }
    try:
        response = requests.get(FANDOM_API, params=params, headers=HEADERS, timeout=20)
        response.raise_for_status()
        data = response.json()
        if "error" in data:
            print(f"  API error for '{page_title}': {data['error']}")
            return None
        html = data["parse"]["text"]["*"]
        print(f"  Fetched '{page_title}' ({len(html):,} chars)")
        return BeautifulSoup(html, "lxml")
    except Exception as e:
        print(f"  ERROR fetching '{page_title}': {e}")
        return None


def parse_iconic_weapons_en(soup: BeautifulSoup) -> list:
    """Parse the Phantom Liberty iconic weapons table."""
    weapons = []
    tables = soup.find_all("table")

    for table in tables:
        rows = table.find_all("tr")
        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if len(cells) < 3:
                continue

            name_cell = cells[0]
            name_links = name_cell.find_all("a")
            name = name_links[-1].get_text(strip=True) if name_links else name_cell.get_text(strip=True)
            name = re.sub(r'\s+', ' ', name).strip()

            wtype = cells[1].get_text(strip=True) if len(cells) > 1 else ""
            effect = cells[2].get_text(separator=" ", strip=True) if len(cells) > 2 else ""
            effect = re.sub(r'\s+', ' ', effect)[:300]

            quest_cell = cells[-1] if len(cells) >= 4 else None
            quest = ""
            if quest_cell:
                quest_links = quest_cell.find_all("a")
                quest = quest_links[-1].get_text(strip=True) if quest_links else quest_cell.get_text(strip=True)
            quest = re.sub(r'\s+', ' ', quest)[:120]

            if name and len(name) < 60 and wtype:
                weapons.append({
                    "name": name,
                    "type": wtype,
                    "effect": effect,
                    "how_to_get": quest if quest else "See wiki",
                    "last_updated": datetime.utcnow().strftime("%Y-%m-%d")
                })

    print(f"  Parsed {len(weapons)} iconic weapons")
    return weapons


def parse_quickhacks_en(soup: BeautifulSoup) -> list:
    """Parse quickhacks from the wiki."""
    quickhacks = []
    tables = soup.find_all("table")

    for table in tables:
        rows = table.find_all("tr")
        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if len(cells) < 3:
                continue

            name = cells[0].get_text(strip=True)
            name = re.sub(r'\s+', ' ', name).strip()
            ram = cells[1].get_text(strip=True) if len(cells) > 1 else ""
            effect = cells[-1].get_text(separator=" ", strip=True)
            effect = re.sub(r'\s+', ' ', effect)[:300]

            if name and len(name) < 50:
                quickhacks.append({
                    "name": name,
                    "ram_cost_raw": ram,
                    "effect_summary": effect,
                    "last_updated": datetime.utcnow().strftime("%Y-%m-%d")
                })

    print(f"  Parsed {len(quickhacks)} quickhacks")
    return quickhacks


def parse_vehicles_en(soup: BeautifulSoup) -> list:
    """Parse vehicles list from the wiki."""
    vehicles = []
    tables = soup.find_all("table")

    for table in tables:
        rows = table.find_all("tr")
        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if len(cells) < 2:
                continue

            name_cell = cells[0]
            name_links = name_cell.find_all("a")
            name = name_links[0].get_text(strip=True) if name_links else name_cell.get_text(strip=True)
            name = re.sub(r'\s+', ' ', name).strip()

            vtype = cells[1].get_text(strip=True) if len(cells) > 1 else ""
            how_to_get = cells[-1].get_text(strip=True) if len(cells) > 2 else ""
            how_to_get = re.sub(r'\s+', ' ', how_to_get)[:200]

            if name and len(name) < 60:
                vehicles.append({
                    "name": name,
                    "type": vtype,
                    "how_to_get": how_to_get,
                    "last_updated": datetime.utcnow().strftime("%Y-%m-%d")
                })

    print(f"  Parsed {len(vehicles)} vehicles")
    return vehicles


PARSERS = {
    "parse_iconic_weapons_en": parse_iconic_weapons_en,
    "parse_quickhacks_en": parse_quickhacks_en,
    "parse_vehicles_en": parse_vehicles_en,
}


def load_knowledge_base() -> dict:
    try:
        with open(KB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"ERROR: {KB_FILE} not found.")
        raise


def save_knowledge_base(kb: dict) -> None:
    with open(KB_FILE, "w", encoding="utf-8") as f:
        json.dump(kb, f, ensure_ascii=False, indent=2)
    size_kb = len(json.dumps(kb, ensure_ascii=False)) // 1024
    print(f"  Saved {KB_FILE} ({size_kb} KB)")


def has_changed(old_data, new_data) -> bool:
    return json.dumps(old_data, sort_keys=True) != json.dumps(new_data, sort_keys=True)


def main():
    print(f"=== Knowledge Base Updater — {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} ===\n")

    kb = load_knowledge_base()
    any_change = False

    for page in WIKI_PAGES:
        section = page["section"]
        page_title = page["page_title"]
        parser_name = page["parser"]

        print(f"Fetching: '{page_title}'")
        soup = fetch_page(page_title)
        if not soup:
            print(f"  Skipping {section} — fetch failed\n")
            continue

        parser_fn = PARSERS.get(parser_name)
        if not parser_fn:
            print(f"  ERROR: no parser '{parser_name}'")
            continue

        new_data = parser_fn(soup)

        if not new_data:
            print(f"  No data parsed — wiki structure may have changed\n")
            time.sleep(2)
            continue

        old_data = kb.get(section, [])

        if has_changed(old_data, new_data):
            kb[section] = new_data
            print(f"  UPDATED {section}: {len(old_data)} → {len(new_data)} items")
            any_change = True
        else:
            print(f"  No changes in {section}")

        print()
        time.sleep(2)

    if any_change:
        kb.setdefault("data_quality", {})
        kb["data_quality"]["last_auto_update"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        save_knowledge_base(kb)
        print("Knowledge base updated successfully.")
    else:
        print("No changes detected — knowledge base is up to date.")


if __name__ == "__main__":
    main()
