# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
