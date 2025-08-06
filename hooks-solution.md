# Claude Code Hooks Solution for Automatic Rule Enforcement

## Problem Statement

Claude consistently failed to follow explicit rule enforcement requirements in CLAUDE.md files, requiring manual user reminders to execute mandatory Read and Edit tools for contextual rules.

## Solution: UserPromptSubmit Hook with Context Injection

Based on 2025 research into Claude Code hooks, the solution uses the `UserPromptSubmit` hook to automatically inject rule content directly into Claude's context window.

## Key Discovery

**UserPromptSubmit hook stdout gets injected directly into Claude's context** if exit code is 0. This means we can force rule content into Claude's active context without relying on Claude's behavioral compliance.

## Implementation

### 1. Hook Configuration (settings.json)

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "python /home/tomaswolaschka/workspace/ai-rules/.claude/hooks/rule-injector.py"
          }
        ]
      }
    ]
  }
}
```

### 2. Rule Injector Script

```python
#!/usr/bin/env python3
"""
Claude Code Hook: Automatic Rule Context Injection
Injects relevant rule content directly into Claude's context based on user prompt patterns.
"""

import re
import sys
import os
from pathlib import Path

# Rule mappings: pattern -> (file_path, rule_name)
RULE_MAPPINGS = {
    r'\.py|python|pip|conda|pyproject\.toml|requirements\.txt|poetry\.lock': (
        'ai-rules/ai-rules/python-best-practices-2024-2025.md',
        'Python Best Practices'
    ),
    r'\.git|github\.com|commit|branch|pull request|workflow|\.github': (
        'ai-rules/ai-rules/github-best-practices-2024-2025.md', 
        'GitHub Best Practices'
    ),
    r'\.java|\.kt|\.scala|pom\.xml|build\.gradle|maven|gradle|spring': (
        'ai-rules/ai-rules/java-best-practices-2024-2025.md',
        'Java Best Practices'
    ),
}

DEFAULT_RULES = [
    'ai-rules/ai-rules/solid-best-practices.md',
    'ai-rules/ai-rules/bifrost-mcp-code-modification-rules-2025-08.md',
    'ai-rules/ai-rules/vscode-ju-mcp-2025-08.md'
]

def get_project_root():
    """Get project root directory."""
    return Path(os.environ.get('CLAUDE_PROJECT_DIR', '/home/tomaswolaschka/workspace'))

def load_rule_file(file_path):
    """Load rule file content."""
    try:
        full_path = get_project_root() / file_path
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return f"ERROR: Rule file not found: {file_path}"
    except Exception as e:
        return f"ERROR: Failed to load {file_path}: {e}"

def inject_rules():
    """Main function to inject rules based on user prompt patterns."""
    user_prompt = os.environ.get('CLAUDE_USER_PROMPT', '')
    
    if not user_prompt:
        return  # No prompt to analyze
    
    injected_rules = []
    
    # Check for contextual rule triggers
    for pattern, (file_path, rule_name) in RULE_MAPPINGS.items():
        if re.search(pattern, user_prompt, re.IGNORECASE):
            rule_content = load_rule_file(file_path)
            injected_rules.append(f"## MANDATORY {rule_name.upper()} RULES\\n\\n{rule_content}")
    
    # Always inject default rules
    for rule_file in DEFAULT_RULES:
        rule_content = load_rule_file(rule_file)
        rule_name = Path(rule_file).stem.replace('-', ' ').title()
        injected_rules.append(f"## MANDATORY {rule_name.upper()} RULES\\n\\n{rule_content}")
    
    # Output to stdout (gets injected into Claude's context)
    if injected_rules:
        print("\\n\\n" + "="*80)
        print("AUTOMATICALLY INJECTED RULES - YOU MUST FOLLOW THESE")
        print("="*80)
        for rule in injected_rules:
            print(rule)
            print("\\n" + "-"*40 + "\\n")
        print("="*80 + "\\n")

if __name__ == "__main__":
    inject_rules()
```

### 3. Directory Structure

```
ai-rules/
├── .claude/
│   └── hooks/
│       └── rule-injector.py
├── ai-rules/
│   ├── python-best-practices-2024-2025.md
│   ├── github-best-practices-2024-2025.md
│   ├── java-best-practices-2024-2025.md
│   ├── solid-best-practices.md
│   ├── bifrost-mcp-code-modification-rules-2025-08.md
│   └── vscode-ju-mcp-2025-08.md
├── README.md
├── hooks-solution.md
└── settings.json (with hook configuration)
```

## How It Works

1. **User submits any prompt** → `UserPromptSubmit` hook automatically fires
2. **Hook script analyzes prompt** for patterns like `*.py`, `git`, `commit`, etc.
3. **Script loads relevant rule files** from `ai-rules/` directory
4. **Script outputs rule content to stdout** with clear headers
5. **Claude Code injects stdout into Claude's context** - rules become part of the prompt
6. **Claude receives rules as mandatory instructions** in context window
7. **Claude cannot ignore rules** - they're literally part of the input

## Benefits

- **Automatic**: No user intervention required
- **Contextual**: Only loads relevant rules based on prompt content  
- **Reliable**: Rules are injected into context, not dependent on Claude's behavior
- **Simple**: One hook + one script (KISS principle)
- **Transparent**: User can see injected rules in transcript
- **Enforceable**: Rules become part of Claude's input, not external guidance

## Testing

To test the hook:

1. Configure the hook in Claude Code settings
2. Make the Python script executable: `chmod +x rule-injector.py`
3. Submit a prompt containing `config.py` or `python`
4. Verify that Python Best Practices rules appear in Claude's context
5. Confirm Claude follows the injected rules automatically

## Advantages Over Previous Approaches

- **No complex enforcement systems** (15+ files → 1 script)
- **No manual timestamp updates** (automatic context injection)
- **No behavioral consistency issues** (rules forced into context)
- **No user reminders required** (completely automatic)
- **Follows KISS principle** (simple, stupid, effective)

## Future Enhancements

- Add more contextual triggers for other languages/frameworks
- Implement rule caching for performance
- Add logging of which rules were injected
- Support for user-specific rule customization

---

*Solution developed through analysis of Claude Code hooks documentation and 2025 research into LLM runtime enforcement mechanisms.*