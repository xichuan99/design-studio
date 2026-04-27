"""Lightweight subject classification for product scene policy gating."""

from typing import Any, Dict, Iterable, Tuple
import io
import logging

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

PRODUCT_SCENE_POLICY_BLOCK_TEXT = "AI Product Scene hanya untuk foto produk tanpa manusia"
REASON_CODE_PRODUCT_SCENE_ALLOW_PRODUCT = "PS_ALLOW_PRODUCT"
REASON_CODE_PRODUCT_SCENE_BLOCK_HUMAN_OR_MIXED = "PS_BLOCK_HUMAN_OR_MIXED"
REASON_CODE_PRODUCT_SCENE_WARN_UNCERTAIN = "PS_WARN_UNCERTAIN"

_FACE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
_HOG_DETECTOR = cv2.HOGDescriptor()
_HOG_DETECTOR.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())


def _prepare_rgb_array(image_bytes: bytes) -> np.ndarray:
    """Decode bytes into an RGB numpy array, resizing down for fast detection."""
    with Image.open(io.BytesIO(image_bytes)) as pil_image:
        rgb_image = pil_image.convert("RGB")
        width, height = rgb_image.size
        max_side = max(width, height)
        if max_side > 960:
            ratio = 960.0 / float(max_side)
            rgb_image = rgb_image.resize(
                (int(width * ratio), int(height * ratio)),
                Image.Resampling.LANCZOS,
            )
        return np.array(rgb_image)


def _detect_faces(rgb_array: np.ndarray) -> Any:
    gray = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2GRAY)
    faces = _FACE_CASCADE.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30),
    )
    return faces


def _detect_people(rgb_array: np.ndarray) -> Any:
    bgr = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2BGR)
    rects, _weights = _HOG_DETECTOR.detectMultiScale(
        bgr,
        winStride=(8, 8),
        padding=(8, 8),
        scale=1.05,
    )
    return rects


def _max_box_area_ratio(
    boxes: Iterable[Tuple[int, int, int, int]],
    image_shape: Tuple[int, int, int],
) -> float:
    """Return the max detected bbox area ratio against whole image area."""
    img_h, img_w = image_shape[:2]
    total_area = float(max(1, img_h * img_w))
    max_ratio = 0.0
    for box in boxes:
        if len(box) < 4:
            continue
        _x, _y, width, height = box[:4]
        box_area = max(0, int(width)) * max(0, int(height))
        if box_area <= 0:
            continue
        ratio = float(box_area) / total_area
        if ratio > max_ratio:
            max_ratio = ratio
    return max_ratio


def classify_subject_for_product_scene(image_bytes: bytes) -> Dict[str, Any]:
    """
    Classify whether an input image is suitable for product scene generation.

    Returns a dictionary with these keys:
    - subject_type: product | human | mixed | uncertain
    - confidence: float [0, 1]
    - reason: human-readable explanation
    - face_count: int
    - person_count: int
    """
    try:
        rgb_array = _prepare_rgb_array(image_bytes)
        faces = _detect_faces(rgb_array)
        people = _detect_people(rgb_array)
        face_count = len(faces)
        person_count = len(people)
        face_area_ratio = _max_box_area_ratio(faces, rgb_array.shape)
        person_area_ratio = _max_box_area_ratio(people, rgb_array.shape)
    except Exception as exc:
        logger.warning("Subject classification failed, returning uncertain: %s", exc)
        return {
            "subject_type": "uncertain",
            "confidence": 0.2,
            "reason": "Gagal menganalisis subjek gambar.",
            "face_count": 0,
            "person_count": 0,
            "face_area_ratio": 0.0,
            "person_area_ratio": 0.0,
        }

    if face_count > 0:
        # Ignore tiny face detections that are often false positives on product textures.
        if face_area_ratio < 0.01:
            return {
                "subject_type": "uncertain",
                "confidence": 0.45,
                "reason": "Deteksi wajah terlalu kecil untuk dipastikan.",
                "face_count": face_count,
                "person_count": person_count,
                "face_area_ratio": face_area_ratio,
                "person_area_ratio": person_area_ratio,
            }
        return {
            "subject_type": "human",
            "confidence": 0.95,
            "reason": "Terdeteksi wajah manusia pada gambar.",
            "face_count": face_count,
            "person_count": person_count,
            "face_area_ratio": face_area_ratio,
            "person_area_ratio": person_area_ratio,
        }

    if person_count > 0:
        # Small body boxes are noisy; treat as uncertain instead of hard blocking.
        if person_area_ratio < 0.06:
            return {
                "subject_type": "uncertain",
                "confidence": 0.45,
                "reason": "Deteksi figur manusia terlalu kecil untuk dipastikan.",
                "face_count": face_count,
                "person_count": person_count,
                "face_area_ratio": face_area_ratio,
                "person_area_ratio": person_area_ratio,
            }
        return {
            "subject_type": "mixed",
            "confidence": 0.82,
            "reason": "Terdeteksi figur manusia pada gambar.",
            "face_count": face_count,
            "person_count": person_count,
            "face_area_ratio": face_area_ratio,
            "person_area_ratio": person_area_ratio,
        }

    return {
        "subject_type": "product",
        "confidence": 0.68,
        "reason": "Tidak terdeteksi subjek manusia dominan.",
        "face_count": face_count,
        "person_count": person_count,
        "face_area_ratio": face_area_ratio,
        "person_area_ratio": person_area_ratio,
    }


def build_product_scene_policy_result(classification: Dict[str, Any]) -> Dict[str, Any]:
    """Map subject classification to product-scene policy decision."""
    subject_type = str(classification.get("subject_type", "uncertain"))

    if subject_type == "product":
        return {
            "subject_type": "product",
            "confidence": float(classification.get("confidence", 0.0)),
            "policy_action": "allow",
            "reason_code": REASON_CODE_PRODUCT_SCENE_ALLOW_PRODUCT,
            "recommended_tool": "product_scene",
            "allowed_tools": ["product_scene", "background_swap"],
            "reason": "Gambar cocok untuk AI Product Scene.",
        }

    if subject_type in {"human", "mixed"}:
        return {
            "subject_type": subject_type,
            "confidence": float(classification.get("confidence", 0.0)),
            "policy_action": "block",
            "reason_code": REASON_CODE_PRODUCT_SCENE_BLOCK_HUMAN_OR_MIXED,
            "recommended_tool": "background_swap",
            "allowed_tools": ["background_swap"],
            "reason": (
                f"{PRODUCT_SCENE_POLICY_BLOCK_TEXT}. "
                "Gunakan Background Swap untuk foto manusia atau portrait."
            ),
        }

    return {
        "subject_type": "uncertain",
        "confidence": float(classification.get("confidence", 0.0)),
        "policy_action": "warn",
        "reason_code": REASON_CODE_PRODUCT_SCENE_WARN_UNCERTAIN,
        "recommended_tool": "background_swap",
        "allowed_tools": ["background_swap", "product_scene"],
        "reason": (
            "Subjek gambar tidak terdeteksi dengan yakin. "
            "Disarankan gunakan Background Swap untuk hasil yang lebih aman."
        ),
    }


def is_product_scene_policy_block_reason(message: str) -> bool:
    """Return True when an error message indicates product-scene policy blocking."""
    return PRODUCT_SCENE_POLICY_BLOCK_TEXT.lower() in str(message or "").lower()
