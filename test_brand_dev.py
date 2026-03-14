import urllib.request
import urllib.error
import json

headers = {
    'X-User-Email': 'test2@clarinovist.com',
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
