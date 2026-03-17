import pytest
from unittest.mock import patch, MagicMock
import io
from PIL import Image

from app.services.id_photo_service import generate_id_photo, generate_print_sheet


@pytest.fixture
def person_image_bytes():
    img = Image.new("RGBA", (600, 800), color=(255, 200, 200, 255))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    return img_byte_arr.getvalue()


@pytest.fixture
def id_photo_bytes():
    img = Image.new("RGB", (354, 472), color=(204, 0, 0))  # 3x4 size
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG", dpi=(300, 300))
    return img_byte_arr.getvalue()


@pytest.mark.asyncio
@patch("app.services.id_photo_service.bg_removal_service.remove_background")
@patch("app.services.id_photo_service.cv2.CascadeClassifier")
async def test_generate_id_photo_with_face(
    mock_cascade_cls, mock_remove_bg, person_image_bytes
):
    mock_remove_bg.return_value = person_image_bytes

    mock_cascade = MagicMock()
    mock_cascade.detectMultiScale.return_value = [[240, 160, 120, 160]]
    mock_cascade_cls.return_value = mock_cascade

    result = await generate_id_photo(
        b"raw_bytes", bg_color_name="blue", size_name="3x4", output_format="jpeg"
    )

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"
    assert img.size == (354, 472)
    assert img.info.get("dpi") == (300, 300)


@pytest.mark.asyncio
@patch("app.services.id_photo_service.bg_removal_service.remove_background")
@patch("app.services.id_photo_service.cv2.CascadeClassifier")
async def test_generate_id_photo_fallback_no_face(
    mock_cascade_cls, mock_remove_bg, person_image_bytes
):
    mock_remove_bg.return_value = person_image_bytes

    mock_cascade = MagicMock()
    mock_cascade.detectMultiScale.return_value = []  # No faces found
    mock_cascade_cls.return_value = mock_cascade

    result = await generate_id_photo(
        b"raw_bytes", bg_color_name="red", size_name="2x3", output_format="png"
    )

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "PNG"
    assert img.size == (236, 354)
    # PNG DPI is stored as pixels per meter, PIL might convert to float approx 300
    dpi = img.info.get("dpi")
    assert round(dpi[0]) == 300
    assert round(dpi[1]) == 300


@pytest.mark.asyncio
@patch("app.services.id_photo_service.bg_removal_service.remove_background")
@patch("app.services.id_photo_service.cv2.CascadeClassifier")
async def test_generate_id_photo_custom_size(
    mock_cascade_cls, mock_remove_bg, person_image_bytes
):
    mock_remove_bg.return_value = person_image_bytes

    mock_cascade = MagicMock()
    mock_cascade.detectMultiScale.return_value = []
    mock_cascade_cls.return_value = mock_cascade

    result = await generate_id_photo(
        b"raw_bytes",
        bg_color_name="red",
        size_name="custom",
        custom_w_cm=5.0,
        custom_h_cm=5.0,
        output_format="jpeg",
    )

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"
    # 5cm * 118.11 ≈ 590
    assert img.size == (590, 590)


@pytest.mark.asyncio
async def test_generate_id_photo_exception():
    with pytest.raises(Exception):
        await generate_id_photo(b"invalid data")


def test_generate_print_sheet(id_photo_bytes):
    result = generate_print_sheet(id_photo_bytes, output_format="jpeg")

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"
    assert img.size == (1200, 1800)
    assert img.info.get("dpi") == (300, 300)


def test_generate_print_sheet_too_large():
    huge_img = Image.new("RGB", (1300, 1900), color=(204, 0, 0))
    img_byte_arr = io.BytesIO()
    huge_img.save(img_byte_arr, format="JPEG")

    with pytest.raises(ValueError, match="Photo is too large to fit on a 4R sheet."):
        generate_print_sheet(img_byte_arr.getvalue())
