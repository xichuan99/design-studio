from unittest.mock import patch

import numpy as np

from app.services.subject_classifier_service import (
    PRODUCT_SCENE_POLICY_BLOCK_TEXT,
    build_product_scene_policy_result,
    classify_subject_for_product_scene,
    is_product_scene_policy_block_reason,
)


def test_build_product_scene_policy_warn_for_uncertain() -> None:
    policy = build_product_scene_policy_result(
        {
            "subject_type": "uncertain",
            "confidence": 0.4,
            "reason": "uncertain",
        }
    )

    assert policy["policy_action"] == "warn"
    assert policy["recommended_tool"] == "background_swap"
    assert policy["reason_code"] == "PS_WARN_UNCERTAIN"


def test_build_product_scene_policy_block_for_human() -> None:
    policy = build_product_scene_policy_result(
        {
            "subject_type": "human",
            "confidence": 0.9,
            "reason": "human",
        }
    )

    assert policy["policy_action"] == "block"
    assert policy["reason_code"] == "PS_BLOCK_HUMAN_OR_MIXED"


def test_is_product_scene_policy_block_reason() -> None:
    assert is_product_scene_policy_block_reason(
        f"{PRODUCT_SCENE_POLICY_BLOCK_TEXT}. Gunakan Background Swap"
    )
    assert not is_product_scene_policy_block_reason("Random error")


@patch("app.services.subject_classifier_service._prepare_rgb_array")
@patch("app.services.subject_classifier_service._detect_faces")
@patch("app.services.subject_classifier_service._detect_people")
def test_classify_subject_small_face_is_uncertain(
    mock_people,
    mock_faces,
    mock_prepare,
) -> None:
    mock_prepare.return_value = np.zeros((1000, 1000, 3), dtype=np.uint8)
    mock_faces.return_value = [(10, 10, 20, 20)]
    mock_people.return_value = []

    result = classify_subject_for_product_scene(b"dummy")

    assert result["subject_type"] == "uncertain"
    assert "terlalu kecil" in result["reason"].lower()


@patch("app.services.subject_classifier_service._prepare_rgb_array")
@patch("app.services.subject_classifier_service._detect_faces")
@patch("app.services.subject_classifier_service._detect_people")
def test_classify_subject_large_face_is_human(
    mock_people,
    mock_faces,
    mock_prepare,
) -> None:
    mock_prepare.return_value = np.zeros((1000, 1000, 3), dtype=np.uint8)
    mock_faces.return_value = [(10, 10, 160, 160)]
    mock_people.return_value = []

    result = classify_subject_for_product_scene(b"dummy")

    assert result["subject_type"] == "human"


@patch("app.services.subject_classifier_service._prepare_rgb_array")
@patch("app.services.subject_classifier_service._detect_faces")
@patch("app.services.subject_classifier_service._detect_people")
def test_classify_subject_small_person_is_uncertain(
    mock_people,
    mock_faces,
    mock_prepare,
) -> None:
    mock_prepare.return_value = np.zeros((1000, 1000, 3), dtype=np.uint8)
    mock_faces.return_value = []
    mock_people.return_value = [(10, 10, 120, 120)]

    result = classify_subject_for_product_scene(b"dummy")

    assert result["subject_type"] == "uncertain"


@patch("app.services.subject_classifier_service._prepare_rgb_array")
@patch("app.services.subject_classifier_service._detect_faces")
@patch("app.services.subject_classifier_service._detect_people")
def test_classify_subject_large_person_is_mixed(
    mock_people,
    mock_faces,
    mock_prepare,
) -> None:
    mock_prepare.return_value = np.zeros((1000, 1000, 3), dtype=np.uint8)
    mock_faces.return_value = []
    mock_people.return_value = [(10, 10, 350, 350)]

    result = classify_subject_for_product_scene(b"dummy")

    assert result["subject_type"] == "mixed"


@patch("app.services.subject_classifier_service._prepare_rgb_array")
@patch("app.services.subject_classifier_service._detect_faces")
@patch("app.services.subject_classifier_service._detect_people")
def test_classify_subject_no_detection_is_product(
    mock_people,
    mock_faces,
    mock_prepare,
) -> None:
    mock_prepare.return_value = np.zeros((1000, 1000, 3), dtype=np.uint8)
    mock_faces.return_value = []
    mock_people.return_value = []

    result = classify_subject_for_product_scene(b"dummy")

    assert result["subject_type"] == "product"
