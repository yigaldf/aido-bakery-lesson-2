# Project rules

## 1. GitHub activity log
Every Git/GitHub command run against this repo (commit, push, pull, fetch, merge, branch, PR, issue, comment, GitHub MCP call, etc.) must be recorded in `GITHUB_LOG.md`:
- Add a new row at the **top** of the table (newest first), with the next running number.
- Columns: date & time, exact command, purpose (Hebrew), result (✅/❌ + commit hash or error).
- Log the commit/push that carries the log update itself in the same update (write the row before running it).

## 2. Spec stays in sync with settings
Any change to project settings or decisions (tech stack, colors, design tokens, config files, dependencies, hosting, data model, screens, scope) must be reflected in `SPEC.md` in the same change:
- Update the relevant section.
- Add a row to the "היסטוריית שינויים" (change history) table at the end of `SPEC.md`.

## 3. Language
The user writes in Hebrew; docs and UI are in Hebrew (RTL).
