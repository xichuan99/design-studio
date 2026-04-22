import colorsys

from app.schemas.carousel import CarouselBrandTokens


_FONT_PAIR_MAP = {
    "editorial": ("Playfair Display", "DM Sans"),
    "modern": ("Plus Jakarta Sans", "Plus Jakarta Sans"),
    "warm": ("Lora", "Nunito Sans"),
    "technical": ("Space Grotesk", "Space Grotesk"),
    "expressive": ("Fraunces", "Outfit"),
    "classic": ("Libre Baskerville", "Work Sans"),
    "rounded": ("Bricolage Grotesque", "Bricolage Grotesque"),
}


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.lstrip("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def _rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    return "#%02X%02X%02X" % rgb


def _adjust_lightness(hex_color: str, amount: float) -> str:
    red, green, blue = _hex_to_rgb(hex_color)
    hue, lightness, saturation = colorsys.rgb_to_hls(red / 255, green / 255, blue / 255)
    next_lightness = min(0.97, max(0.08, lightness + amount))
    next_rgb = colorsys.hls_to_rgb(hue, next_lightness, saturation)
    return _rgb_to_hex(tuple(round(channel * 255) for channel in next_rgb))


def derive_carousel_brand_tokens(primary_color: str, font_style: str) -> CarouselBrandTokens:
    heading_font, body_font = _FONT_PAIR_MAP.get(font_style, _FONT_PAIR_MAP["modern"])
    return CarouselBrandTokens(
        primary=primary_color,
        light=_adjust_lightness(primary_color, 0.18),
        dark=_adjust_lightness(primary_color, -0.22),
        light_bg=_adjust_lightness(primary_color, 0.47),
        dark_bg=_adjust_lightness(primary_color, -0.38),
        border=_adjust_lightness(primary_color, 0.38),
        heading_font=heading_font,
        body_font=body_font,
    )
