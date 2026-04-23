import json
from pathlib import Path
from db.mongo_client import metadata

BASE_DIR = Path(__file__).resolve().parent.parent
METADATA_DIR = BASE_DIR / "Data" / "metadata"
LEGACY_METADATA_DIR = BASE_DIR / "metadata"

if not METADATA_DIR.exists() and LEGACY_METADATA_DIR.exists():
    METADATA_DIR = LEGACY_METADATA_DIR

documents = []

for metadata_path in METADATA_DIR.iterdir():
    filename = metadata_path.name
    if not filename.endswith("_metadata.json"):
        continue

    with metadata_path.open("r") as f:
        data = json.load(f)

    for symbol, info in data.items():
        doc = info.copy()
        doc["symbol"] = symbol
        documents.append(doc)

# early-stage clean insert
metadata.delete_many({})
metadata.insert_many(documents)

print(f"Inserted {len(documents)} metadata records")
