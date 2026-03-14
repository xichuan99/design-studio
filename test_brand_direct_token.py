import urllib.request
import urllib.error
import json
import jwt
from datetime import datetime, timedelta

# Create a valid token
secret = "your_super_secret_key_here_for_dev"
user_id = "123e4567-e89b-12d3-a456-426614174000" # Some valid UUID

token_data = {
    "sub": user_id,
    "exp": datetime.utcnow() + timedelta(minutes=60)
}
token = jwt.encode(token_data, secret, algorithm="HS256")
print("Generated local token")

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}
payload = json.dumps({
    "name": "Test API Kit",
    "logo_url": None,
    "colors": [
        {"hex": "#FF0000", "name": "Merah", "role": "primary"}
    ]
}).encode('utf-8')

try:
    req = urllib.request.Request('http://localhost:8000/api/brand-kits', data=payload, headers=headers)
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Response:", response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(e.read().decode())
except urllib.error.URLError as e:
    print(f"URL Error: {e.reason}")
