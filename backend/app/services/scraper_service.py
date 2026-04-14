from bs4 import BeautifulSoup
import logging
from urllib.parse import urljoin
from typing import Dict, Any

from app.core.http_client import create_async_client


async def scrape_brand_info(url: str) -> Dict[str, Any]:
    """
    Scrapes a website URL to find its logo and brand name.
    """
    if not url.startswith("http"):
        url = "https://" + url

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        async with create_async_client(
            headers=headers, follow_redirects=True, timeout=15.0
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text

        soup = BeautifulSoup(html, "html.parser")

        # 1. Try to find Brand Name
        title = soup.title.string if soup.title else ""
        brand_name = (
            title.split("|")[0].split("-")[0].strip() if title else "Extracted Brand"
        )

        # 2. Try to find Logo URL
        logo_url = None

        # Priority 1: og:image often used as logo representation
        og_image = soup.find("meta", property="og:image")
        if og_image and og_image.get("content"):
            logo_url = og_image["content"]

        # Priority 2: Look for img tag that explicitly says "logo"
        if not logo_url:
            for img in soup.find_all("img"):
                alt = img.get("alt", "").lower()
                src = img.get("src", "").lower()
                classes = " ".join(img.get("class", [])).lower()
                img_id = img.get("id", "").lower()

                if (
                    "logo" in alt
                    or "logo" in src
                    or "logo" in classes
                    or "logo" in img_id
                ):
                    logo_url = img.get("src")
                    break

        # Priority 3: Check link rel icon (favicon/app icon) as last resort
        if not logo_url:
            # specifically look for larger icons
            apple_icon = soup.find("link", rel="apple-touch-icon")
            if apple_icon and apple_icon.get("href"):
                logo_url = apple_icon["href"]
            else:
                icon = soup.find("link", rel=lambda r: r and "icon" in r.lower())
                if icon and icon.get("href"):
                    logo_url = icon["href"]

        # Make absolute URL
        if (
            logo_url
            and not logo_url.startswith("http")
            and not logo_url.startswith("data:")
        ):
            logo_url = urljoin(url, logo_url)

        return {"name": brand_name, "logo_url": logo_url}

    except Exception as e:
        logging.error(f"Scraping failed for {url}: {e}")
        raise ValueError(f"Failed to scrape website: {str(e)}")

