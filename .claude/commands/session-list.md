List all development sessions by:

1. Check if `.claude/sessions/` directory exists:
!'find  ".claude/sessions/" -type d'
2. List all `.md` files (excluding hidden files and `.current-session`):
!'find .claude/sessions/ -maxdepth 1 -type f -name "*.md" ! -name ".*" ! -name ".current-session"'
3. For each session file:
   - Show the filename
   - Extract and show the session title
   - Show the date/time
   - Show first few lines of the overview if available
4. If `.claude/sessions/.current-session` exists, highlight which session is currently active
5. Sort by most recent first

Present in a clean, readable format.