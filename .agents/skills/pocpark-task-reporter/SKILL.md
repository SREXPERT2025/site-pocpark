---
name: pocpark-task-reporter
description: Use for every POCPARK/РОСПАРК site task that changes files, runs checks, performs audits, prepares content, creates commits, prepares merges, or prepares releases. Always create a structured markdown report and confirm production safety.
---

# POCPARK Task Reporter

Use this instruction-only skill for every РОСПАРК / POCPARK site task that changes files, runs checks, performs audits, prepares content, creates commits, prepares merges, or prepares releases.

## Before Changes

Before modifying files or running task-impacting commands, state:

1. Task goal.
2. Current branch.
3. Target branch.
4. Files planned for modification.
5. Files planned for read-only inspection.
6. Risks.
7. Verification plan.
8. Whether production access is required.
9. Whether director approval is required.

Stop and request explicit approval if the task touches `main`, deploy, VPS, DNS, SSL, nginx, Caddy, GitHub Actions, production configuration, secrets, legal/commercial claims, prices, deadlines, guarantees, client names, case studies, or publication.

## After Changes

Create a markdown report in the appropriate external reports folder. Include:

1. Date.
2. Task ID.
3. Repository path.
4. Current branch.
5. Base branch.
6. Commit hash before changes.
7. Commit hash after changes, if created.
8. Goal.
9. What changed.
10. Changed files.
11. Created files.
12. Deleted files.
13. Files read only.
14. Diff summary.
15. Commands run.
16. Build result.
17. Lint result.
18. Test result.
19. Typecheck result.
20. Manual checks.
21. SEO/GEO impact, if applicable.
22. UX/UI impact, if applicable.
23. Content/commercial/legal risks, if applicable.
24. Remaining risks.
25. What was not checked.
26. Ready for commit: yes/no.
27. Ready for merge: yes/no.
28. Ready for deploy: no unless explicitly approved.
29. Safety confirmation.

## Report Locations

Use these external folders:

```text
/Volumes/POCPARK_AI_DATA/POCPARK_SITE_AI/reports/audits/
/Volumes/POCPARK_AI_DATA/POCPARK_SITE_AI/reports/task_reports/
/Volumes/POCPARK_AI_DATA/POCPARK_SITE_AI/reports/qa_reports/
/Volumes/POCPARK_AI_DATA/POCPARK_SITE_AI/reports/release_reports/
```

Do not add reports from `/Volumes/POCPARK_AI_DATA/POCPARK_SITE_AI/reports/` to the site repository commit unless the director explicitly allows it.

Use `docs/codex/CODEX_TASK_REPORT_TEMPLATE.md` as the default report structure when a task-specific report format is not provided.

## Safety Confirmation Text

End reports with explicit confirmation:

```text
Production не изменялся.
Deploy не выполнялся.
main не менялась.
Push не выполнялся, если не был отдельно разрешен.
Merge не выполнялся, если не был отдельно разрешен.
Commit не создавался, если не был отдельно разрешен.
GitHub Actions не менялись.
VPS/DNS/SSL/nginx/Caddy не менялись.
Production-конфигурация не менялась.
Секреты не коммитились.
Массовая замена бренда не выполнялась.
```
