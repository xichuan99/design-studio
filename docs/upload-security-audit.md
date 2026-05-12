# Upload Security Audit

Last audited: 2026-05-12

This audit covers backend endpoints that accept `UploadFile`. The goal is paid-beta readiness: uploaded product photos, brand assets, masks, and guidelines must have size/type validation and authenticated rate limiting before they can consume storage or provider calls.

## Summary

| Endpoint | File type | Validation | Rate limit | Quota impact | Status |
| --- | --- | --- | --- | --- | --- |
| `POST /api/designs/upload` | image | `validate_uploaded_image(max_size_mb=10, user_id, db)` | action | `upload_image_tracked` | Ready |
| `POST /api/designs/remove-background` | image | `validate_uploaded_image(max_size_mb=10, user_id, db)` | action | `upload_image_tracked` | Ready |
| `POST /api/tools/background-swap` | image | `validate_uploaded_image(user_id, db)` | action | AI result upload | Ready |
| `POST /api/tools/product-scene` | image | `validate_uploaded_image(user_id, db)` | action | AI result upload | Ready |
| `POST /api/tools/magic-eraser` | image + mask | `validate_uploaded_image(user_id, db)` for both | action | AI result upload | Ready |
| `POST /api/tools/upscale` | image | `validate_uploaded_image(max_size_mb=10, user_id, db)` | action | AI result upload | Ready |
| `POST /api/tools/id-photo` | image | `validate_uploaded_image(max_size_mb=10, user_id, db)` | action | AI result upload | Ready |
| `POST /api/tools/watermark` | image + logo | `validate_uploaded_image(user_id, db)` for both | action | AI result upload | Ready |
| `POST /api/tools/text-banner` | image | `validate_uploaded_image(user_id, db)` | action | AI result upload | Ready |
| `POST /api/tools/generative-expand` | image | `validate_uploaded_image(user_id, db)` | action | AI result upload | Ready |
| `POST /api/tools/batch` | images + optional logo | `validate_uploaded_image(user_id, db)` for each | action | AI result upload | Ready |
| `POST /api/brand-kits/extract` | image | `validate_uploaded_image(max_size_mb=5)` | action | no upload | Ready |
| `POST /api/brand-kits/{kit_id}/documents` | PDF | content type, 10MB limit, PDF magic bytes | action | RAG chunks only | Ready |

## Beta Notes

- Image magic-byte, Pillow verification, max-size checks, and storage-quota checks are centralized in `backend/app/services/file_validation.py`.
- Endpoints that persist user-visible generated or uploaded assets should use `upload_image_tracked` when the bytes should count against quota. Some AI tool endpoints upload generated results through the lower-level storage helper today; this is acceptable for beta because user-supplied inputs are validated before provider calls, but quota accounting for generated AI tool results should be revisited before wider scale.
- Malware scanning, private signed URLs, and automated temporary-file retention remain post-beta hardening items unless traffic or customer requirements justify pulling them forward.
