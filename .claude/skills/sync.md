# /sync - Update docs, commit, and push

Use this skill when the user wants to sync their work to GitHub after making changes.

## What this skill does

1. **Update CLAUDE.md** - Add a changelog entry for the current session's changes
2. **Commit** - Stage modified files and create a commit with a descriptive message
3. **Push to GitHub** - Push the commit to origin/main

## Instructions

When the user runs `/sync`:

1. First, ask the user (or infer from conversation context):
   - What version number to use (increment from last version in changelog)
   - A brief title for the changes (e.g., "Guest Mode & Landing Page")

2. Read the current CLAUDE.md file to understand the changelog format

3. Add a new changelog entry at the top of the Changelog section with:
   - Version number and date (use today's date: YYYY-MM-DD format)
   - Title describing the changes
   - Sections as appropriate: Major Change, New Features, Data Model Changes, UI Changes, Calculation Changes, etc.
   - Keep it concise but complete

4. Run `git status` to see what files changed

5. Stage the relevant files (exclude untracked files unless they're part of the feature)

6. Create a commit with format: `type: description` where type is usually `feat`, `fix`, `refactor`, or `docs`

7. Push to origin/main

8. Report back the commit hash and confirm success

## Example

User: `/sync`