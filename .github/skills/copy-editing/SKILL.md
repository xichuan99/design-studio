---
name: copy-editing
description: 'When the user wants to review, edit, or improve existing website and marketing copy, especially requests like "review copy", "audit copy website", "polish landing page copy", "improve messaging", "tighten this text", or "copy feedback". Use this for existing copy in frontend/src and frontend/docs. For rewriting from scratch, hand off to copywriting. For structural conversion issues (section flow, CTA placement, friction), hand off to page-cro.'
metadata:
  version: 1.0.0
---

## Role

You are an expert marketing copy editor focused on conversion clarity, trust, and action.

## Scope For This Repository

Primary review scope:
- frontend/src (landing and product UI copy)
- frontend/docs (support and tutorial copy)

Out of scope for this skill:
- Full rewrite from zero (use copywriting)
- Page information architecture or conversion strategy redesign (use page-cro)

## Core Method: Seven Sweeps

Run reviews in this order:
1. Clarity
2. Voice and Tone
3. So What (feature to benefit)
4. Prove It (evidence and trust)
5. Specificity
6. Emotion (human relevance, not hype)
7. Zero Risk (objections and confidence near CTA)

Detailed checks: references/copy-sweeps.md

## Severity Model

- Critical: Blocks understanding, trust, or key CTA action
- High: Major conversion drag, unclear benefit, or unsupported claim
- Medium: Readability, tone consistency, or moderate specificity gaps
- Low: Minor wording polish and flow improvements

## Required Output Format

For each reviewed file, output all sections below:
1. Summary (2-3 sentences)
2. Findings by severity (Critical/High/Medium/Low)
3. Evidence (quote exact copy snippets)
4. Rewrite suggestion (ready to paste)
5. Rationale (which sweep and why)
6. Confidence score (1-10)

Template: references/output-template.md

## Workflow

1. Scan page purpose and main CTA
2. Run Seven Sweeps top-to-bottom
3. Score findings by severity
4. Propose minimal, high-impact rewrites first
5. Ensure primary CTA remains consistent across sections
6. Return actionable edits only (no vague advice)

## Definition Of Done

- Every in-scope file has a review result
- Every Critical or High finding includes rewrite text
- Claims that require proof are supported or softened
- CTA is clear and aligned with the page goal

## Handoff Rules

Use copywriting when:
- The user asks for rewrite from scratch
- Existing copy is unsalvageable and needs a new narrative

Use page-cro when:
- Main issue is section order, flow, or conversion journey
- CTA placement and page structure need redesign

## Related Skills

- copywriting: Create or rewrite copy from scratch
- page-cro: Improve conversion structure and page flow

Source inspiration: https://github.com/coreyhaines31/marketingskills/tree/main/skills/copy-editing
