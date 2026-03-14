import json
import urllib.request
import urllib.error

url = 'http://localhost:8000/api/auth/login'
payload = json.dumps({'email': 'test2@clarinovist.com', 'password': 'password123'}).encode('utf-8')
headers = {'Content-Type': 'application/json'}

try:
    req = urllib.request.Request(url, data=payload, headers=headers)
    with urllib.request.urlopen(req) as response:
        login_res = json.loads(response.read().decode())
        token = login_res['access_token']
        print(f"Token acquired")
        
        # Test Brand Kit Post
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        payload = json.dumps({
            "name": "Test Brand Kit",
            "logo_url": None,
            "colors": [
                {"hex": "#FF0000", "name": "Merah", "role": "primary"}
            ]
        }).encode('utf-8')
        
        req = urllib.request.Request('http://localhost:8000/api/brand-kits', data=payload, headers=headers)
        with urllib.request.urlopen(req) as response:
            print("Status:", response.status)
            print("Response:", response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(e.read().decode())
except urllib.error.URLError as e:
    print(f"URL Error: {e.reason}")
