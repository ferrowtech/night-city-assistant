"""
update_kb.py
Parses Cyberpunk Fandom Wiki pages and updates cyberpunk_2077_knowledge_base.json
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

WIKI_PAGES = [
    {
        "section": "iconic_weapons_wiki_update",
        "url": "https://cyberpunk.fandom.com/wiki/Iconic_weapons_(Phantom_Liberty)",
        "parser": "parse_iconic_weapons_en"
    },
    {
        "section": "quickhacks_wiki_update",
        "url": "https://cyberpunk.fandom.com/wiki/Quickhacks",
        "parser": "parse_quickhacks_en"
    },
    {
        "section": "vehicles_wiki_update",
        "url": "https://cyberpunk.fandom.com/wiki/Vehicles_(Cyberpunk_2077)",
        "parser": "parse_vehicles_en"
    }
]


def fetch_page(url: str) -> BeautifulSoup | None:
    """Fetch a wiki page and return BeautifulSoup object."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        return BeautifulSoup(response.text, "lxml")
    except Exception as e:
        print(f"  ERROR fetching {url}: {e}")
        return None


def parse_iconic_weapons_en(soup: BeautifulSoup) -> list:
    """
    Parse the Phantom Liberty iconic weapons table from the English wiki.
    Returns a list of weapon dicts with name, type, effect, how_to_get.
    """
    weapons = []
    tables = soup.find_all("table", class_=lambda c: c and "wikitable" in c)

    for table in tables:
        rows = table.find_all("tr")
        for row in rows[1:]:  # skip header
            cells = row.find_all(["td", "th"])
            if len(cells) < 3:
                continue

            # Extract name from first cell (usually contains image + text)
            name_cell = cells[0]
            name_links = name_cell.find_all("a")
            name = name_links[-1].get_text(strip=True) if name_links else name_cell.get_text(strip=True)
            name = re.sub(r'\s+', ' ', name).strip()

            # Type
            wtype = cells[1].get_text(strip=True) if len(cells) > 1 else ""

            # Effect / description
            effect = cells[2].get_text(separator=" ", strip=True) if len(cells) > 2 else ""
            effect = re.sub(r'\s+', ' ', effect)[:300]

            # Quest / acquisition (last column)
            quest_cell = cells[-1] if len(cells) >= 4 else None
            quest = ""
            if quest_cell:
                quest_links = quest_cell.find_all("a")
                if quest_links:
                    quest = quest_links[-1].get_text(strip=True)
                else:
                    quest = quest_cell.get_text(strip=True)
            quest = re.sub(r'\s+', ' ', quest)[:120]

            if name and len(name) < 60 and wtype:
                weapons.append({
                    "name": name,
                    "type": wtype,
                    "effect": effect,
                    "how_to_get": quest if quest else "See wiki for details",
                    "source": "Cyberpunk Wiki (auto-updated)",
                    "last_updated": datetime.utcnow().strftime("%Y-%m-%d")
                })

    print(f"  Parsed {len(weapons)} iconic weapons from wiki")
    return weapons


def parse_quickhacks_en(soup: BeautifulSoup) -> list:
    """
    Parse quickhacks from the English wiki.
    Returns list of quickhack dicts with name, type, RAM cost, effect.
    """
    quickhacks = []
    tables = soup.find_all("table", class_=lambda c: c and "wikitable" in c)

    for table in tables:
        rows = table.find_all("tr")
        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if len(cells) < 3:
                continue

            # Name
            name_cell = cells[0]
            name = name_cell.get_text(strip=True)
            name = re.sub(r'\s+', ' ', name).strip()

            # RAM cost
            ram = cells[1].get_text(strip=True) if len(cells) > 1 else ""

            # Effect
            effect = cells[-1].get_text(separator=" ", strip=True) if len(cells) > 2 else ""
            effect = re.sub(r'\s+', ' ', effect)[:300]

            if name and len(name) < 50:
                quickhacks.append({
                    "name": name,
                    "ram_cost_raw": ram,
                    "effect_summary": effect,
                    "source": "Cyberpunk Wiki (auto-updated)",
                    "last_updated": datetime.utcnow().strftime("%Y-%m-%d")
                })

    print(f"  Parsed {len(quickhacks)} quickhacks from wiki")
    return quickhacks


def parse_vehicles_en(soup: BeautifulSoup) -> list:
    """
    Parse vehicles list from the English wiki.
    Returns list of vehicle dicts.
    """
    vehicles = []
    tables = soup.find_all("table", class_=lambda c: c and "wikitable" in c)

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
                    "source": "Cyberpunk Wiki (auto-updated)",
                    "last_updated": datetime.utcnow().strftime("%Y-%m-%d")
                })

    print(f"  Parsed {len(vehicles)} vehicles from wiki")
    return vehicles


PARSERS = {
    "parse_iconic_weapons_en": parse_iconic_weapons_en,
    "parse_quickhacks_en": parse_quickhacks_en,
    "parse_vehicles_en": parse_vehicles_en,
}


def load_knowledge_base() -> dict:
    """Load the existing knowledge base JSON."""
    try:
        with open(KB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"ERROR: {KB_FILE} not found. Make sure the script runs from repo root.")
        raise


def save_knowledge_base(kb: dict) -> None:
    """Save the updated knowledge base JSON."""
    with open(KB_FILE, "w", encoding="utf-8") as f:
        json.dump(kb, f, ensure_ascii=False, indent=2)
    size_kb = len(json.dumps(kb, ensure_ascii=False)) // 1024
    print(f"  Saved {KB_FILE} ({size_kb} KB)")


def has_changed(old_data, new_data) -> bool:
    """Check if parsed data differs meaningfully from existing."""
    return json.dumps(old_data, sort_keys=True) != json.dumps(new_data, sort_keys=True)


def main():
    print(f"=== Knowledge Base Updater — {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} ===")
    print()

    kb = load_knowledge_base()
    any_change = False

    for page in WIKI_PAGES:
        section = page["section"]
        url = page["url"]
        parser_name = page["parser"]

        print(f"Fetching: {url}")
        soup = fetch_page(url)
        if not soup:
            print(f"  Skipping {section} — fetch failed")
            print()
            continue

        parser_fn = PARSERS.get(parser_name)
        if not parser_fn:
            print(f"  ERROR: no parser named '{parser_name}'")
            continue

        new_data = parser_fn(soup)

        if not new_data:
            print(f"  No data parsed for {section} — page structure may have changed")
            print()
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
        time.sleep(2)  # be polite to the wiki servers

    if any_change:
        # Update metadata
        kb.setdefault("data_quality", {})
        kb["data_quality"]["last_auto_update"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        save_knowledge_base(kb)
        print("Knowledge base updated successfully.")
    else:
        print("No changes detected — knowledge base is up to date.")


if __name__ == "__main__":
    main()
