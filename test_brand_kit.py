import asyncio
from httpx import AsyncClient

async def run_test():
    async with AsyncClient(base_url="http://localhost:8000") as client:
        # First login to get token
        login_res = await client.post("/api/auth/login", data={"username": "test@clarinovist.com", "password": "password123"})
        if login_res.status_code != 200:
            print("Login failed:", login_res.text)
            return
            
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Now try to save a brand kit
        payload = {
            "name": "Test Brand Kit",
            "logo_url": None,
            "colors": [
                {"hex": "#FF0000", "name": "Merah", "role": "primary"}
            ]
        }
        res = await client.post("/api/brand-kits", json=payload, headers=headers)
        print("Status Code:", res.status_code)
        print("Response:", res.text)

if __name__ == "__main__":
    asyncio.run(run_test())
