"""Stage abstractions and concrete stage implementations for image pipelines."""

from __future__ import annotations

import binascii
from base64 import b64decode
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from app.services import bg_removal_service, image_service, inpaint_service, watermark_service
from app.services.storage_service import download_image


@dataclass
class StageExecutionPayload:
    """In-memory payload passed between pipeline stages."""

    image_bytes: Optional[bytes] = None
    image_url: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class TransformationStage(ABC):
    """Base class for all transformation stages."""

    stage_type: str

    def __init__(self, params: Optional[Dict[str, Any]] = None) -> None:
        self.params = params or {}

    async def validate(self, payload: StageExecutionPayload) -> None:
        """Validate input payload before stage execution."""

    @abstractmethod
    async def execute(self, payload: StageExecutionPayload) -> StageExecutionPayload:
        """Execute stage logic and return a transformed payload."""


class RemoveBackgroundStage(TransformationStage):
    """Stage that removes image background and produces transparent PNG bytes."""

    stage_type = "remove_bg"

    async def validate(self, payload: StageExecutionPayload) -> None:
        if payload.image_bytes is None and not payload.image_url:
            raise ValueError("RemoveBackgroundStage requires image_bytes or image_url")

    async def execute(self, payload: StageExecutionPayload) -> StageExecutionPayload:
        await self.validate(payload)

        source_image_url = payload.image_url
        source_image_bytes = payload.image_bytes

        if payload.image_url:
            transparent_png_bytes = await bg_removal_service.remove_background_from_url(
                payload.image_url
            )
        else:
            transparent_png_bytes = await bg_removal_service.remove_background(
                payload.image_bytes or b""
            )

        merged_metadata = dict(payload.metadata)
        merged_metadata["transparent_png_bytes"] = transparent_png_bytes
        merged_metadata["source_image_url"] = source_image_url
        merged_metadata["source_image_bytes"] = source_image_bytes
        merged_metadata["last_completed_stage"] = self.stage_type

        return StageExecutionPayload(
            image_bytes=transparent_png_bytes,
            image_url=None,
            metadata=merged_metadata,
        )


class InpaintBackgroundStage(TransformationStage):
    """Stage that inpaints background using transparent-mask guidance."""

    stage_type = "inpaint_bg"

    async def validate(self, payload: StageExecutionPayload) -> None:
        if not self.params.get("prompt"):
            raise ValueError("InpaintBackgroundStage requires params.prompt")

        has_mask = (
            payload.metadata.get("transparent_png_bytes") is not None
            or payload.image_bytes is not None
            or self.params.get("mask_url") is not None
        )
        if not has_mask:
            raise ValueError("InpaintBackgroundStage requires transparent PNG or mask_url")

        has_original_context = (
            payload.metadata.get("source_image_url") is not None
            or payload.metadata.get("source_image_bytes") is not None
            or self.params.get("original_url") is not None
            or self.params.get("original_bytes") is not None
        )
        if not has_original_context:
            raise ValueError(
                "InpaintBackgroundStage requires source image context (url or bytes)"
            )

    async def execute(self, payload: StageExecutionPayload) -> StageExecutionPayload:
        await self.validate(payload)

        prompt = str(self.params.get("prompt"))
        transparent_png_bytes = (
            payload.metadata.get("transparent_png_bytes")
            or payload.image_bytes
        )

        original_url = (
            self.params.get("original_url")
            or payload.metadata.get("source_image_url")
        )
        original_bytes = (
            self.params.get("original_bytes")
            or payload.metadata.get("source_image_bytes")
        )

        if transparent_png_bytes is not None and not isinstance(
            transparent_png_bytes, (bytes, bytearray)
        ):
            raise ValueError("transparent PNG payload must be bytes")

        if original_bytes is not None and not isinstance(original_bytes, (bytes, bytearray)):
            raise ValueError("original_bytes must be bytes")

        if isinstance(transparent_png_bytes, bytearray):
            transparent_png_bytes = bytes(transparent_png_bytes)
        if isinstance(original_bytes, bytearray):
            original_bytes = bytes(original_bytes)

        if transparent_png_bytes is None:
            mask_url = self.params.get("mask_url")
            result_data = await inpaint_service.inpaint_image(
                image_url=str(original_url),
                mask_url=str(mask_url),
                prompt=prompt,
            )
            result_url = result_data.get("url")
            if not result_url:
                raise RuntimeError("Inpaint service returned no result URL")
            inpainted_bytes = await download_image(result_url)
        else:
            inpainted_bytes = await bg_removal_service.inpaint_background(
                original_bytes=original_bytes,
                transparent_png_bytes=transparent_png_bytes,
                prompt=prompt,
                original_url=str(original_url) if original_url else None,
            )

        merged_metadata = dict(payload.metadata)
        merged_metadata["last_completed_stage"] = self.stage_type

        return StageExecutionPayload(
            image_bytes=inpainted_bytes,
            image_url=None,
            metadata=merged_metadata,
        )


class GenerateBackgroundStage(TransformationStage):
    """Stage that generates an image background from a text prompt."""

    stage_type = "generate_bg"

    async def validate(self, payload: StageExecutionPayload) -> None:
        if not self.params.get("visual_prompt") and not self.params.get("prompt"):
            raise ValueError("GenerateBackgroundStage requires params.visual_prompt")

    async def execute(self, payload: StageExecutionPayload) -> StageExecutionPayload:
        await self.validate(payload)

        visual_prompt = str(self.params.get("visual_prompt") or self.params.get("prompt"))
        reference_image_url = self.params.get("reference_image_url")
        if reference_image_url is None:
            reference_image_url = payload.metadata.get("source_image_url")

        generated = await image_service.generate_background(
            visual_prompt=visual_prompt,
            reference_image_url=(str(reference_image_url) if reference_image_url else None),
            style=str(self.params.get("style", "auto")),
            aspect_ratio=str(self.params.get("aspect_ratio", "1:1")),
            integrated_text=bool(self.params.get("integrated_text", False)),
            preserve_product=bool(self.params.get("preserve_product", False)),
            seed=self.params.get("seed"),
        )
        result_url = generated.get("image_url")
        if not result_url:
            raise RuntimeError("Generate background returned no image_url")

        generated_bytes = await download_image(result_url)
        merged_metadata = dict(payload.metadata)
        merged_metadata["generated_background_url"] = result_url
        merged_metadata["last_completed_stage"] = self.stage_type

        return StageExecutionPayload(
            image_bytes=generated_bytes,
            image_url=result_url,
            metadata=merged_metadata,
        )


class ApplyWatermarkStage(TransformationStage):
    """Stage that applies a watermark image on top of current image payload."""

    stage_type = "watermark"

    async def validate(self, payload: StageExecutionPayload) -> None:
        if payload.image_bytes is None and not payload.image_url:
            raise ValueError("ApplyWatermarkStage requires image payload")

        has_watermark = (
            self.params.get("watermark_bytes") is not None
            or self.params.get("logo_bytes") is not None
            or self.params.get("watermark_url") is not None
            or self.params.get("logo_url") is not None
        )
        if not has_watermark:
            raise ValueError("ApplyWatermarkStage requires watermark bytes or URL")

    @staticmethod
    def _decode_base64_payload(value: str) -> bytes:
        encoded = value
        if value.startswith("data:") and "," in value:
            encoded = value.split(",", 1)[1]
        try:
            return b64decode(encoded)
        except (ValueError, binascii.Error) as exc:
            raise ValueError("Invalid base64 watermark payload") from exc

    async def _resolve_watermark_bytes(self) -> bytes:
        watermark_bytes = self.params.get("watermark_bytes") or self.params.get("logo_bytes")
        if isinstance(watermark_bytes, bytearray):
            return bytes(watermark_bytes)
        if isinstance(watermark_bytes, bytes):
            return watermark_bytes
        if isinstance(watermark_bytes, str):
            return self._decode_base64_payload(watermark_bytes)

        watermark_url = self.params.get("watermark_url") or self.params.get("logo_url")
        if watermark_url:
            return await download_image(str(watermark_url))

        raise ValueError("Unable to resolve watermark bytes")

    async def _resolve_base_image_bytes(self, payload: StageExecutionPayload) -> bytes:
        if isinstance(payload.image_bytes, bytes):
            return payload.image_bytes
        if isinstance(payload.image_bytes, bytearray):
            return bytes(payload.image_bytes)
        if payload.image_url:
            return await download_image(payload.image_url)
        raise ValueError("Unable to resolve base image bytes")

    async def execute(self, payload: StageExecutionPayload) -> StageExecutionPayload:
        await self.validate(payload)

        base_image_bytes = await self._resolve_base_image_bytes(payload)
        watermark_bytes = await self._resolve_watermark_bytes()

        watermarked_bytes = await watermark_service.apply_watermark(
            base_image_bytes=base_image_bytes,
            watermark_bytes=watermark_bytes,
            position=str(self.params.get("position", "bottom-right")),
            opacity=float(self.params.get("opacity", 0.5)),
            scale=float(self.params.get("scale", 0.2)),
            visibility_preset=str(self.params.get("visibility_preset", "balanced")),
        )

        merged_metadata = dict(payload.metadata)
        merged_metadata["last_completed_stage"] = self.stage_type

        return StageExecutionPayload(
            image_bytes=watermarked_bytes,
            image_url=None,
            metadata=merged_metadata,
        )
