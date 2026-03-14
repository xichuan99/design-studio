import asyncio
from app.models.brand_kit import BrandKit
from app.schemas.brand_kit import BrandKitCreate
import json

data = {
    "name": "Test Brand Kit",
    "logo_url": None,
    "colors": [
        {"hex": "#FF0000", "name": "Merah", "role": "primary"}
    ]
}
validated = BrandKitCreate(**data)
colors_json = [c.model_dump() for c in validated.colors]
print(f"Colors JSON to be inserted: {colors_json}")
print(f"Colors Type: {type(colors_json)}")

try:
    new_kit = BrandKit(
        user_id="123e4567-e89b-12d3-a456-426614174000", # Dummy UUID
        name=validated.name,
        logo_url=validated.logo_url,
        colors=colors_json,
        is_active=True
    )
    print("SQLAlchemy model instantiated successfully.")
except Exception as e:
    print(f"Instatiation error: {e}")
