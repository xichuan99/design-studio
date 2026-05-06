---
goal: UI and UX breakdown for ready-to-export workflow
version: 1.0
date_created: 2026-04-17
status: Draft
tags: [ui, ux, audit, refactor]
---

# UI/UX Breakdown: Ready-to-Export Core Workflow

![Status: Draft](https://img.shields.io/badge/status-Draft-orange)

## 1. Executive Decision

- The current product should be evolved, not redesigned from zero.
- The main UI/UX problem is not missing capability. It is narrative fragmentation across landing, create, tools, and editor surfaces.
- The current experience mixes three mental models at once:
  - pre-launch waitlist marketing
  - intent-first workflow entry
  - legacy tool-first and Smart Ad entry patterns
- The first UI/UX objective is consolidation, not expansion.

## 2. Surface Relevance Audit

| Surface | Current relevance | Why it still matters | Main issue | Action |
|---|---|---|---|---|
| `frontend/src/app/page.tsx` | Partial | It is still the first product promise users see. | The page still speaks like a pre-launch marketing site and a tool catalog, not a workflow product. | Refactor now |
| `frontend/src/components/layout/AppHeader.tsx` | High | It defines app navigation hierarchy after login. | Labels still treat tools as a parallel primary destination instead of a supporting utility. | Refactor now |
| `frontend/src/app/create/page.tsx` | High | This is the best existing candidate for the primary workflow entry. | The intent-first path is promising, but the legacy fallback path still reintroduces old mental models such as Smart Ad Creator. | Refactor now |
| `frontend/src/components/create/SidebarInputForm.tsx` | Medium | It already contains the essential create controls. | The form still exposes technical mode switches and configuration too early for non-expert users. | Refactor now |
| `frontend/src/components/create/SidebarActionBar.tsx` | Medium | It controls the next step in the most critical funnel state. | CTA labels describe system actions, not user outcomes. | Refactor now |
| `frontend/src/components/create/UnifiedResultsView.tsx` | Medium | It is the bridge between prompt interpretation and image generation. | The screen is framed as AI analysis instead of a decision step toward a ready-to-export design. | Refactor now |
| `frontend/src/components/create/UnifiedPreviewEditor.tsx` | High | This is the strongest bridge into editing without losing generation context. | The layout is functional but still feels like a component assembly, not a guided workflow milestone. | Refactor now |
| `frontend/src/app/tools/page.tsx` | Medium | Tools remain valuable for focused photo tasks and power users. | The hub still positions tools as a top-level product promise instead of a supporting path. | Refactor now |
| `frontend/src/app/tools/background-swap/page.tsx` | High | This page already has a step-based flow and a continuation CTA. | The success state is stronger than other tools, but the action model is not standardized across all tools. | Keep and standardize |
| `frontend/src/components/editor/BackgroundRemovalPanel.tsx` | High | It already solves one anti-dead-end use case well. | It is stronger than the surrounding product architecture and should become the new baseline pattern. | Keep and reuse |
| `frontend/src/components/editor/SmartAdPanel.tsx` | Low | Some generation logic and handoff behavior are still useful. | The name and positioning overlap with the primary create flow and preserve legacy product language. | Demote or rename |

## 3. Keep / Refactor / Archive / Postpone

### Keep

- The three intent-first entry choices in `frontend/src/app/create/page.tsx`.
- The anti-dead-end CTA pattern in `frontend/src/components/editor/BackgroundRemovalPanel.tsx`.
- Step-based tools that show progress, before-after comparison, and result continuation.
- The create-to-preview-to-editor architecture in `frontend/src/components/create/UnifiedPreviewEditor.tsx`.
- Projects, assets, and history as support surfaces for continuation and recovery.

### Refactor Now

- Landing promise and CTA hierarchy in `frontend/src/app/page.tsx`.
- Navigation labels and destination emphasis in `frontend/src/components/layout/AppHeader.tsx`.
- Legacy create entry cards inside `frontend/src/app/create/page.tsx`.
- Technical copy, placeholders, and mode naming inside `frontend/src/components/create/SidebarInputForm.tsx`.
- CTA wording and next-step hierarchy in `frontend/src/components/create/SidebarActionBar.tsx`.
- Results framing in `frontend/src/components/create/UnifiedResultsView.tsx`.
- Preview milestone framing and continuation emphasis in `frontend/src/components/create/UnifiedPreviewEditor.tsx`.
- Tool hub descriptions and cross-links in `frontend/src/app/tools/page.tsx`.
- Success-state action sets across all tool pages.

### Archive or Demote

- `Smart Ad Creator` as a separate branded front-door concept.
- Any copy that frames AI tools as the primary product narrative.
- Pre-launch waitlist language that no longer matches the current app reality.
- Redundant route entry points that bypass the main create workflow without strong justification.

### Postpone

- Full automated intent routing beyond the existing manual entry cards.
- Major editor visual redesign.
- Advanced personalization and persona presets.
- A full onboarding rewrite.

## 4. Current UX Debt Themes

### UX-001: Narrative fragmentation

- Marketing says one thing, create says another, tools say a third.
- Users can still interpret the product as either a waitlist landing page, an AI toolbox, or a Smart Ad generator.

### UX-002: Duplicate ways to start

- `frontend/src/app/create/page.tsx` still contains legacy paths that overlap with the newer intent-first entry.
- This makes the product feel additive instead of curated.

### UX-003: Technical-first input framing

- `generate` versus `redesign` is a system concept.
- For users, the question should be about desired outcome, not model mode.

### UX-004: Inconsistent success actions

- Some flows already suggest a strong next step.
- Other flows still end in download-only or canvas-only behavior.
- The platform needs one consistent result action model: continue, save, retry, back.

### UX-005: Legacy naming debt

- `Smart Ad Creator` is still present as a concept inside the create surface and editor.
- This competes with the newer ready-to-export workflow positioning.

### UX-006: Screen purpose is sometimes unclear

- `UnifiedResultsView` and `UnifiedPreviewEditor` are structurally capable, but their copy and hierarchy do not always tell users what decision they should make next.

## 5. Target UI/UX Direction

### Primary product journey

1. Start with a goal.
2. Give the minimum input needed.
3. Review AI direction only when it helps confidence.
4. See a usable result quickly.
5. Continue to editor for finishing touches.
6. Export or save without losing work.

### Product information architecture

- Primary surfaces:
  - Landing
  - Create
  - Preview
  - Editor
  - Export
- Secondary surfaces:
  - Tools
  - My Assets
  - Projects
  - Brand Kit
- Advanced or legacy surfaces should not become alternative product identities.

### Interaction principles

- Goal first, tool second.
- One primary CTA per state.
- Intermediate success must always offer a next meaningful action.
- Advanced controls should appear progressively, not at the first decision point.
- Copy should describe benefit and next step, not internal mechanics.

## 6. Two-Week UI/UX Cut

### Week 1: Alignment and hierarchy cleanup

| Task | Outcome | File(s) |
|---|---|---|
| UIUX-001 | Replace pre-launch and waitlist framing with workflow positioning. | `frontend/src/app/page.tsx` |
| UIUX-002 | Reorder app navigation to support the workflow hierarchy. | `frontend/src/components/layout/AppHeader.tsx` |
| UIUX-003 | Make the intent-first create entry the only clearly promoted start point. | `frontend/src/app/create/page.tsx` |
| UIUX-004 | Convert technical create labels into outcome-based copy. | `frontend/src/components/create/SidebarInputForm.tsx` |
| UIUX-005 | Change CTA labels to user-outcome language. | `frontend/src/components/create/SidebarActionBar.tsx` |
| UIUX-006 | Reframe the results screen as a confidence checkpoint before generation, not an AI analysis report. | `frontend/src/components/create/UnifiedResultsView.tsx` |

### Week 2: Continuation consistency and dead-end removal

| Task | Outcome | File(s) |
|---|---|---|
| UIUX-007 | Standardize result action sets across tools. | `frontend/src/app/tools/background-swap/page.tsx`, `frontend/src/app/tools/retouch/page.tsx`, `frontend/src/app/tools/upscaler/page.tsx`, `frontend/src/app/tools/product-scene/page.tsx` |
| UIUX-008 | Define a shared result action card pattern for continue, save, retry, and back. | `frontend/src/components/tools/ResultActionCard.tsx` |
| UIUX-009 | Demote or rename Smart Ad language inside the editor. | `frontend/src/components/editor/SmartAdPanel.tsx` |
| UIUX-010 | Promote preview to editor handoff as the main milestone after generation. | `frontend/src/components/create/UnifiedPreviewEditor.tsx` |
| UIUX-011 | Standardize copy and recovery on error and credit constraints. | `frontend/src/components/feedback/InlineErrorBanner.tsx`, `frontend/src/components/feedback/ErrorModal.tsx` |

## 7. Acceptance Checks

- A new user can describe the product in one sentence without mentioning a specific tool.
- The create page has one obviously primary way to start.
- No tool success state ends with download as the only meaningful next action.
- The terms `generate`, `redesign`, and `Smart Ad Creator` are not used as primary product framing for new users.
- The landing page, create page, tools hub, and editor all describe the same product promise.
- The preview state clearly answers: what was made, what can be changed, and what happens next.
- Mobile users can identify the next step without opening multiple panels or guessing hidden actions.

## 8. Recommendation

- Do not restart the UI from zero.
- Consolidate the current product into one workflow-oriented visual system and one decision model.
- Treat the existing intent-first entry and anti-dead-end tool patterns as the new baseline, then refactor older surfaces until they conform to that baseline.