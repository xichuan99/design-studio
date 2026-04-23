import html
import io
import zipfile
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

from app.schemas.carousel import CarouselBrandTokens, CarouselExportRequest, CarouselSlide


_LIGHT_SLIDE_TYPES = {"hero", "features", "how_to", "proof"}
_GRADIENT_SLIDE_TYPES = {"solution", "cta", "offer"}


def _load_font(size: int, bold: bool = False):
    font_names = [
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for font_name in font_names:
        try:
            return ImageFont.truetype(font_name, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.lstrip("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def _interpolate_rgb(left: tuple[int, int, int], right: tuple[int, int, int], ratio: float) -> tuple[int, int, int]:
    return tuple(round(left[i] + (right[i] - left[i]) * ratio) for i in range(3))


def _slide_background(slide_type: str, tokens: CarouselBrandTokens, width: int, height: int) -> Image.Image:
    if slide_type in _GRADIENT_SLIDE_TYPES:
        image = Image.new("RGB", (width, height), _hex_to_rgb(tokens.dark))
        draw = ImageDraw.Draw(image)
        start = _hex_to_rgb(tokens.dark)
        end = _hex_to_rgb(tokens.light)
        for row in range(height):
            color = _interpolate_rgb(start, end, row / max(1, height - 1))
            draw.line([(0, row), (width, row)], fill=color)
        return image

    color = tokens.light_bg if slide_type in _LIGHT_SLIDE_TYPES else tokens.dark_bg
    return Image.new("RGB", (width, height), _hex_to_rgb(color))


def _text_color(slide_type: str, tokens: CarouselBrandTokens) -> tuple[int, int, int]:
    if slide_type in _LIGHT_SLIDE_TYPES:
        return _hex_to_rgb(tokens.dark)
    return (255, 255, 255)


def _draw_wrapped_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font,
    fill: tuple[int, int, int],
    left: int,
    top: int,
    max_width: int,
    line_spacing: int,
) -> int:
    sanitized = html.unescape(text).strip()
    words = sanitized.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        candidate_width = draw.textbbox((0, 0), candidate, font=font)[2]
        if candidate_width <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)

    cursor = top
    for line in lines:
        draw.text((left, cursor), line, font=font, fill=fill)
        line_box = draw.textbbox((left, cursor), line, font=font)
        cursor += (line_box[3] - line_box[1]) + line_spacing
    return cursor


def render_carousel_slide(
    slide: CarouselSlide,
    tokens: CarouselBrandTokens,
    brand_name: str,
    ig_handle: Optional[str],
    total_slides: int,
) -> bytes:
    width = 1080
    height = 1350
    image = _slide_background(slide.type, tokens, width, height)
    draw = ImageDraw.Draw(image)
    text_fill = _text_color(slide.type, tokens)
    accent_fill = _hex_to_rgb(tokens.primary)

    heading_font = _load_font(70, bold=True)
    body_font = _load_font(34)
    small_font = _load_font(24, bold=True)
    cta_font = _load_font(28, bold=True)

    left = 90
    max_width = width - 2 * left

    draw.text((left, 78), brand_name, font=small_font, fill=text_fill)
    if ig_handle:
        draw.text((width - 320, 82), ig_handle, font=small_font, fill=text_fill)

    draw.rounded_rectangle((left, 132, left + 150, 176), radius=18, outline=accent_fill, width=3)
    draw.text((left + 18, 142), slide.type.replace("_", " ").upper(), font=small_font, fill=accent_fill)

    cursor = _draw_wrapped_text(draw, slide.headline, heading_font, text_fill, left, 250, max_width, 12)
    cursor += 28
    cursor = _draw_wrapped_text(draw, slide.body, body_font, text_fill, left, cursor, max_width, 10)

    if slide.cta:
        cta_top = min(height - 200, cursor + 36)
        cta_width = draw.textbbox((0, 0), slide.cta, font=cta_font)[2] + 54
        draw.rounded_rectangle(
            (left, cta_top, left + cta_width, cta_top + 68),
            radius=24,
            fill=accent_fill,
        )
        draw.text((left + 24, cta_top + 18), slide.cta, font=cta_font, fill=(255, 255, 255))

    progress_top = height - 46
    draw.rounded_rectangle((left, progress_top, width - left, progress_top + 12), radius=6, fill=(255, 255, 255, 60))
    progress_width = round((width - 2 * left) * (slide.index / total_slides))
    draw.rounded_rectangle((left, progress_top, left + progress_width, progress_top + 12), radius=6, fill=accent_fill)
    draw.text((width - 170, height - 90), f"{slide.index}/{total_slides}", font=small_font, fill=text_fill)

    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def export_carousel_zip(request: CarouselExportRequest) -> bytes:
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, mode="w", compression=zipfile.ZIP_DEFLATED) as zip_file:
        for slide in request.slides:
            image_bytes = render_carousel_slide(
                slide,
                request.brand_tokens,
                request.brand_name,
                request.ig_handle,
                len(request.slides),
            )
            zip_file.writestr(f"slide-{slide.index:02d}.png", image_bytes)
    archive.seek(0)
    return archive.getvalue()
