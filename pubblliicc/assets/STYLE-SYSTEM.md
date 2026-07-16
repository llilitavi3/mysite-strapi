# RoyalBet Style System (Centralized)

## Main Control Files

- `/assets/css/rb-shell.css`  
  Shared page shell rules (html/body/app-root/sr-only).

- `/assets/css/rb-core.css`  
  Main centralized CSS entrypoint for site-wide styles.

## Page-Level Overrides

- Keep unique page behavior in page-specific override files only (for example: `/sport/live-line/live-line-overrides.css`).
- Override files should be loaded **after** `rb-core.css`.

## Update Rule

When changing global visual behavior (colors, spacing, typography, common components), edit:

1. `rb-core.css` imports (if needed)
2. the underlying shared css file referenced by `rb-core.css`

Do not duplicate the same change in multiple page html files.

