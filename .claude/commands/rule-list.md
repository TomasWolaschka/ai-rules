1. Check if `.claude/rules/` directory exists
2. List all `.md` files (excluding hidden files and `.current-rules`)
3. For each rule file:
   - Show the filename
   - Extract and show the rule title
   - Show the date/time
   - Show first few lines of the overview if available
4. If `.claude/rules/.current-rules` exists, highlight which rules are currently active
5. Sort by most recent first

Present in a clean, readable format.