---
name: sync
description: Update CLAUDE.md changelog, commit changes, and push to GitHub. Use after completing a feature or making significant changes.
---

You are helping the user sync their work to GitHub.

## What to do

1. **Check git status** - See what files have changed
2. **Update CLAUDE.md** - Add a changelog entry for the session's changes (if significant changes were made)
3. **Commit** - Stage modified files and create a commit
4. **Push** - Push to origin/main

## Steps

### Step 1: Check status
Run `git status` and `git diff --stat` to see what changed.

### Step 2: Update CLAUDE.md (if needed)
If significant feature work was done, add a changelog entry:
- Read CLAUDE.md to see the current version (look at the Changelog section)
- Increment the version number appropriately
- Add entry at the top of the Changelog section with today's date
- Include relevant sections: New Features, UI Changes, Data Model Changes, etc.

### Step 3: Commit
- Stage relevant files with `git add` (be specific, don't add unrelated files)
- Commit with format: `type: brief description`
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation only
  - `refactor:` for code changes that don't add features or fix bugs
- Include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>` in commit body

### Step 4: Push
Run `git push origin main`

### Step 5: Confirm
Report the commit hash and confirm success.

## Notes
- If no significant changes were made, skip the CLAUDE.md update
- Ask the user for clarification if unsure what to include in the changelog
- Don't include untracked files unless they're part of the feature
