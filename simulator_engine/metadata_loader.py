import json
import os
from db.mongo_client import metadata

METADATA_DIR = "metadata"

documents = []

for filename in os.listdir(METADATA_DIR):
    if not filename.endswith("_metadata.json"):
        continue

    filepath = os.path.join(METADATA_DIR, filename)

    with open(filepath, "r") as f:
        data = json.load(f)

    for symbol, info in data.items():
        doc = info.copy()
        doc["symbol"] = symbol
        documents.append(doc)

# early-stage clean insert
metadata.delete_many({})
metadata.insert_many(documents)

print(f"Inserted {len(documents)} metadata records")
