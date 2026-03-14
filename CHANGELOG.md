# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-03-14

### Added
- **Social Media Auto-Resize**: Batch export designs into various social media formats with a new dialog and off-screen resizing.
- **Standalone Tools Cross-linking**: Added "Continue to Editor" functionality to seamlessly transition from standalone tools (Background Swap, Upscaler) to the main Editor.
- **Credit History**: New database model, API endpoints, and frontend settings display to track credit transactions.
- **AI Project Title Generation**: Automatic project naming using Gemini 2.0 Flash Lite based on user prompts.

### Changed
- **AI Studio Visual Polish**: Enhanced aesthetic consistency across AI features with refined typography and container styles.
- **Error Handling & UX**: Migrated simple alerts to a unified 3-tier system (`ErrorModal`, `InlineErrorBanner`, `toast`) and added visual warnings for low credits.
- **Codebase Cleanup**: Audited and removed obsolete features related to earlier AI tool iterations.

### Fixed
- Fixed Brand Settings loading indefinitely in the UI.
- Fixed backend API issues preventing Brand Kits from saving.
- Fixed GitHub Actions CI compile errors related to Recharts Tooltip typings in `ProductDetail.tsx` and general workflow failures.
- Fixed Ruff linting errors (trailing whitespace, blank lines, undefined variables) across backend AI tools services (`ai_tools.py`, `retouch_service.py`, `id_photo_service.py`).

## [1.0.0] - 2026-03-13

### Added
- **AI Design Generator**: Create templates and layouts using text prompts powered by Gemini and Fal.ai.
- **AI Copywriting**: Generate marketing copy and headlines automatically.
- **AI Background Swap**: Remove and replace image backgrounds via Fal.ai.
- **AI Upscaler**: Enhance image resolution via Fal.ai.
- **Advanced Canvas Editor**: Drag-and-drop editor for images, text, and layouts.
- **Freelancer Module**: Manage freelancers, job postings, and applications.
- **Project Management**: Save, edit, and duplicate designs in a centralized dashboard.
- **Authentication**: Secure login and registration flows.

### Changed
- Migrated legacy image generation from Gemini Imagen 4 to Nano Banana 2 (Gemini 3.1 Flash).
- Refined UI/UX for unified preview flows, moving AI copywriting into the central creation editor.

### Fixed
- Fixed aspect ratio mismatch where 16:9 images from Nano Banana 2 were squished to 1:1 in the editor.
- Fixed infinite render loops in React components (`BrandKitPanel`).
- Fixed cross-origin tainting issues preventing canvas exports.
- Resolved various linting (ruff) and build errors in the frontend and backend.

### Security
- Added secure cross-origin proxies for external images used in the canvas editor.

### Chore
- Upgraded backend environment from Python 3.9 to 3.10.
- Configured CI/CD workflows for automated testing, linting, and Docker-based deployment.
