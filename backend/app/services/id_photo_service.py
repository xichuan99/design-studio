import io
from typing import Optional
import numpy as np
import mediapipe as mp
from PIL import Image
import logging

from app.services import bg_removal_service

logger = logging.getLogger(__name__)

# Standard ID photo pixel sizes at 300 DPI (approximate)
ID_SIZES = {
    "2x3": (236, 354),
    "3x4": (354, 472),
    "4x6": (472, 709)
}

BG_COLORS = {
    "red": (204, 0, 0),    # Pasfoto Studio Red
    "blue": (0, 71, 171)   # Pasfoto Studio Blue
}

async def generate_id_photo(
    image_bytes: bytes,
    bg_color_name: str = "red",
    size_name: str = "3x4",
    custom_w_cm: Optional[float] = None,
    custom_h_cm: Optional[float] = None,
    output_format: str = "jpeg"
) -> bytes:
    """
    Generates a print-ready ID photo (pasfoto) at 300 DPI.
    Steps: BG removal -> Face Detection -> Face-Centered Crop -> Solid BG Fill -> Resize.
    """
    try:
        # Determine target pixel dimensions based on 300 DPI
        if size_name == "custom" and custom_w_cm and custom_h_cm:
            # 300 Px Per Inch = ~118.11 Px Per cm
            target_w = int(custom_w_cm * 118.11)
            target_h = int(custom_h_cm * 118.11)
        else:
            target_w, target_h = ID_SIZES.get(size_name, ID_SIZES["3x4"])

        bg_rgb = BG_COLORS.get(bg_color_name, BG_COLORS["red"])

        # 1. Remove background (via Fal.ai hirefnet)
        no_bg_bytes = await bg_removal_service.remove_background(image_bytes)
        person_img = Image.open(io.BytesIO(no_bg_bytes)).convert("RGBA")

        # 2. Detect face for accurate cropping
        mp_face_detection = mp.solutions.face_detection
        np_img = np.array(person_img.convert('RGB'))

        faces = []
        with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detection:
            results = face_detection.process(np_img)
            if results.detections:
                for detection in results.detections:
                    bboxC = detection.location_data.relative_bounding_box
                    ih, iw, _ = np_img.shape
                    # Convert normalized coordinates to pixel coordinates
                    x = int(bboxC.xmin * iw)
                    y = int(bboxC.ymin * ih)
                    w = int(bboxC.width * iw)
                    h = int(bboxC.height * ih)
                    faces.append((x, y, w, h))

        logger.info("Face detection found %d face(s)", len(faces))

        img_w, img_h = person_img.size
        target_aspect = target_w / target_h

        # Variables for rendering
        crop_left, crop_top, crop_right, crop_bottom = 0, 0, target_w, target_h
        person_img_scaled = person_img
        new_w, new_h = img_w, img_h

        if len(faces) > 0:
            # Get largest face (most likely the subject)
            (x, y, w, h) = max(faces, key=lambda f: f[2] * f[3])

            # Standard Pasfoto: Face height is ~50-60% of total image height
            desired_face_h = int(target_h * 0.55)
            scale = desired_face_h / max(h, 1) # prevent div by zero

            new_w = int(img_w * scale)
            new_h = int(img_h * scale)
            person_img_scaled = person_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

            # Recalculate face box relative to new scaled dimensions
            scaled_x, scaled_y, scaled_w, _ = int(x * scale), int(y * scale), int(w * scale), int(h * scale)

            # Position face: horizontally centered, vertically with ~12% clearance at the top
            crop_top = scaled_y - int(target_h * 0.12)
            crop_bottom = crop_top + target_h

            crop_left = scaled_x + (scaled_w // 2) - (target_w // 2)
            crop_right = crop_left + target_w

        else:
            # FALLBACK: if face detection fails, do a standard top-center crop fit
            img_aspect = img_w / img_h
            if img_aspect > target_aspect:
                new_h = target_h
                new_w = int(target_h * img_aspect)
                person_img_scaled = person_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                crop_top = 0
                crop_left = (new_w - target_w) // 2
            else:
                new_w = target_w
                new_h = int(target_w / img_aspect)
                person_img_scaled = person_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                crop_left = 0
                crop_top = int(new_h * 0.05) # Assume top of head is 5% down

            crop_right = crop_left + target_w
            crop_bottom = crop_top + target_h

        # 3. Create infinite transparent canvas to avoid out-of-bounds crops
        canvas_w = max(new_w, target_w * 3)
        canvas_h = max(new_h, target_h * 3)
        # Shift coordinate center so we don't accidentally crop negative coords
        shift_x = target_w
        shift_y = target_h

        canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        canvas.paste(person_img_scaled, (shift_x, shift_y))

        # Adjust crop coordinates given the shift
        adj_crop_left = crop_left + shift_x
        adj_crop_top = crop_top + shift_y
        adj_crop_right = crop_right + shift_x
        adj_crop_bottom = crop_bottom + shift_y

        # Execute crop
        cropped_person = canvas.crop((adj_crop_left, adj_crop_top, adj_crop_right, adj_crop_bottom))

        # 4. Fill with requested solid background color
        final_img = Image.new("RGB", (target_w, target_h), bg_rgb)
        final_img.paste(cropped_person, (0, 0), cropped_person)

        # 5. Export as print-ready output at 300 DPI
        out_buffer = io.BytesIO()
        if output_format.lower() == "png":
            final_img.save(out_buffer, format="PNG", dpi=(300, 300))
        else:
            final_img.save(out_buffer, format="JPEG", quality=100, dpi=(300, 300))
        return out_buffer.getvalue()

    except Exception as e:
        logger.exception(f"Failed to generate ID photo: {str(e)}")
        raise

def generate_print_sheet(photo_bytes: bytes, output_format: str = "jpeg") -> bytes:
    """
    Tiles the ID photo onto a 4R print sheet (4x6 inches / 10x15 cm) at 300 DPI.
    Sheet dimensions: 1200x1800 pixels.
    """
    try:
        sheet_w, sheet_h = 1200, 1800  # 4R at 300 DPI (portrait)
        sheet = Image.new("RGB", (sheet_w, sheet_h), (255, 255, 255))

        photo = Image.open(io.BytesIO(photo_bytes)).convert("RGB")
        pw, ph = photo.size

        margin = 60  # 5mm at 300 DPI (0.2 * 300)
        spacing = 24  # 2mm at 300 DPI (0.08 * 300)

        # How many fit?
        avail_w = sheet_w - (2 * margin)
        avail_h = sheet_h - (2 * margin)

        cols = (avail_w + spacing) // (pw + spacing)
        rows = (avail_h + spacing) // (ph + spacing)

        if cols <= 0 or rows <= 0:
            raise ValueError("Photo is too large to fit on a 4R sheet.")

        # Center the grid
        grid_w = cols * pw + (cols - 1) * spacing
        grid_h = rows * ph + (rows - 1) * spacing

        start_x = (sheet_w - grid_w) // 2
        start_y = (sheet_h - grid_h) // 2

        for r in range(rows):
            for c in range(cols):
                x = start_x + c * (pw + spacing)
                y = start_y + r * (ph + spacing)
                sheet.paste(photo, (x, y))

        out_buffer = io.BytesIO()
        if output_format.lower() == "png":
            sheet.save(out_buffer, format="PNG", dpi=(300, 300))
        else:
             sheet.save(out_buffer, format="JPEG", quality=100, dpi=(300, 300))
        return out_buffer.getvalue()
    except Exception as e:
        logger.exception(f"Failed to generate print sheet: {str(e)}")
        raise
