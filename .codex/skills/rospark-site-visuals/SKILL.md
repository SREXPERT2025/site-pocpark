---
name: rospark-site-visuals
description: Create, review, save, and wire project-bound explainer visuals for the Rospak/ROSPARK website. Use when Codex needs to add AI-generated or user-provided bitmap infographics to site pages, especially `/stati`, `/resheniya/*`, and `/vozmozhnosti/*`, based on page text, with correct asset placement, alt text, Next.js integration, build checks, preview, and commit workflow.
---

# ROSPARK Site Visuals

Use this skill to turn existing page text into a project-bound website visual, then connect that visual safely in the Next.js site.

## Workflow

1. Read the target page source and any related markdown content.
2. Extract the page promise, audience, scenario, CTA, and 4-6 concrete visual points.
3. Prepare a short visual brief. Use `references/visual-brief-template.md` when a reusable prompt shape is useful.
4. If generating a new bitmap, use the system `imagegen` skill and generate one page at a time. Do not batch several heavy generations if the session is unstable.
5. Inspect the image before using it. Watch for broken Cyrillic, wrong audience, wrong object type, fake facts, unreadable text, or brand mismatch.
6. Copy the final image into the repository under a stable public path:
   - articles: `public/images/articles/`
   - solution pages: `public/images/solutions/explainers/`
   - feature pages: `public/images/features/explainers/`
7. Wire it into the page using an existing component when possible. Prefer `SolutionVisual` for wide explainer infographics.
8. Add concise, descriptive Russian `alt` text.
9. Run checks:
   - `npm run typecheck`
   - `npm run build`
   - `git diff --check`
10. Restart/update preview if needed, then report the public URL.
11. Commit and push after the user accepts the result or when the requested checkpoint is complete.

## ROSPARK Visual Style

- Use a practical B2B infographic, not a decorative hero.
- Show the actual parking scenario: barrier, camera, terminal, vehicle, object type, dashboard, event log, or payment flow.
- Keep the visual related to the page audience: owner, engineer, security, shopping center, business center, warehouse, residential complex, or client type.
- Use the existing blue/orange/white ROSPARK visual language, with restrained secondary colors for status and roles.
- Avoid unverified promises, invented customer names, fake certificates, fake ratings, exact ROI numbers, or unsupported legal claims.
- Prefer fewer, clearer labels. AI-generated Cyrillic can be imperfect, so do not depend on tiny text for critical meaning.

## Session Stability Rules

- Do not print generated HTML, large image lists, or full `.next` files.
- Use short checks such as `rg -q`, `wc -l`, `git diff --stat`, and `find ... | tail -n 5`.
- Generate and inspect one image at a time if transport errors occur.
- If image generation repeatedly breaks the session, pause generation and continue with docs, wiring, prompts, or non-image site improvements.

## Implementation Notes

- For dynamic pages, keep a slug-to-visual map near the route component instead of duplicating route files.
- Never leave a project-referenced asset only in `$CODEX_HOME/generated_images`.
- Do not overwrite accepted assets unless the user explicitly asks for a replacement.
- Commit generated images with the code that references them.
