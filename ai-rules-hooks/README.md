# AI Rules Hooks - KISS AI Rules Management

A lightweight, KISS-compliant solution for automatic rule injection into Claude Code with configuration and automated rule generation capabilities.

## 🚀 What It Does

**AI Rules Hooks** automatically injects relevant coding best practices into Claude Code based on technology patterns detected in your prompts. When you ask Claude to help with Python, it automatically gets Python best practices. Ask about React, it gets React guidelines. No manual intervention required.

## ✨ Features

✅ **Smart Technology Detection** - Uses regex patterns to identify technologies in your prompts  
✅ **Automatic Rule Injection** - Rules injected via Claude Code's hook system  
✅ **Fully Configurable** - Customize detection patterns, priorities, and rules  
✅ **Auto-Generation** - Generate fresh rules using Claude CLI  
✅ **Complete Lifecycle** - Install, configure, use, update, and uninstall  
✅ **KISS Principle** - Simple, lightweight, no complex dependencies  
✅ **Modern Python** - Type hints, PEP 8 compliant, Python 3.9+ features  

## 🎯 Quick Start

### Prerequisites

- **Python 3.9+** with pip
- **Claude Code CLI** installed and working (`claude --version`)
- **Claude Code** (not Claude Desktop - hooks not supported there)

### Installation

```bash
# 1. Navigate to ai-rules-hooks directory
cd ai-rules-hooks

# 2. Run automated setup (installs dependencies automatically)
python3 scripts/setup.py
```

The setup script will automatically:
- ✅ Install required Python packages (pyyaml, pydantic)
- ✅ Check dependencies (Python 3.9+, Claude Code CLI)
- ✅ Configure Claude Code hooks in `~/.claude/settings.json`
- ✅ Create project directory structure
- ✅ Validate installation with test run

### Verification

Test with technology-specific prompts:
```bash
claude --prompt "Help me write a Python script"
claude --prompt "Create a React component"
claude --prompt "Set up a Docker container"
```

You should see relevant best practices automatically injected into Claude's context.

## 🔧 How It Works

### The Magic Behind the Scenes

1. **User submits prompt** → Claude Code triggers `UserPromptSubmit` hook
2. **Hook analyzes prompt** → Regex patterns detect technologies (`.py`, `npm`, `React`, etc.)
3. **Hook loads relevant rules** → Based on detected technologies and configuration
4. **Hook outputs rules** → Injected into Claude's context automatically
5. **Claude gets enhanced context** → With relevant best practices for your request

### Technology Detection Examples

| Your Prompt Contains | Detected Technology | Rules Injected |
|---------------------|-------------------|---------------|
| `"write a Python script"` | Python | python-best-practices-2025.md |
| `"create React component"` | React | React development guidelines |
| `"setup Docker container"` | Docker | Docker best practices |
| `"git commit message"` | Git | GitHub workflow standards |
| `package.json` in files | JavaScript | JS/Node.js practices |

### Supported Technologies

- **Python**: `.py` files, `python`, `pip`, `conda`, `pyproject.toml`, `requirements.txt`
- **JavaScript/Node**: `.js`/`.ts` files, `npm`, `yarn`, `pnpm`, `package.json`
- **React**: `React`, `JSX`, `TSX`, `Next.js`, `Gatsby`
- **Java**: `.java` files, Maven, Gradle, Spring framework
- **Git/GitHub**: Git repos, GitHub URLs, commit/branch keywords
- **Docker**: Dockerfile, docker-compose, Docker keywords

## ⚙️ Configuration

### Main Configuration (`config/rules_config.yaml`)

The heart of the system - customize rule injection behavior:

```yaml
# Context limits
max_context_size: 50000        # Maximum characters injected
enable_debug: false            # Debug output for troubleshooting

# Always include these rules regardless of technology
default_rules:
  - "solid-best-practices.md"
  - "bifrost-mcp-code-modification-rules-2025-08.md"

# Technology-specific rule mappings
technologies:
  - name: "python"
    priority: 1                # 1=high, 2=medium, 3=low
    rule_file: "python-best-practices-2024-2025.md"
    patterns:                  # Regex patterns for detection
      - '\\.py\b'             # .py files
      - '\bpython\b'          # word "python"
      - '\bpip\b'             # pip command
      - 'requirements\\.txt'   # requirements.txt
      - 'pyproject\\.toml'     # pyproject.toml
  
  - name: "javascript"
    priority: 1
    rule_file: "javascript-best-practices-2025.md"
    patterns:
      - '\\.js\b'
      - '\\.ts\b'
      - '\bnpm\b'
      - 'package\\.json'
      
  - name: "react"
    priority: 2
    rule_file: "react-best-practices-2025.md"
    patterns:
      - '\bReact\b'
      - '\\.jsx\b'
      - '\\.tsx\b'
```

### Rule Generation Templates (`config/generation_prompts.md`)

Customize how Claude CLI generates new rules:

```markdown
# Rule Generation Prompts

## Default Template

Please generate comprehensive {technology} best practices for {year}.

Create a detailed guide that includes:
- Modern development standards
- Security best practices
- Testing methodologies
- Performance guidelines
- Current ecosystem tools
...
```

## Rule Generation

### Generate All Rules

```bash
python scripts/update_rules.py
```

### Generate Specific Technology

```bash
python scripts/update_rules.py python
python scripts/update_rules.py javascript
```

### Customize Generation Prompts

Edit `config/generation_prompts.md` to customize how rules are generated via Claude CLI.

## Directory Structure

```
ai-rules-hooks/
├── .claude/
│   └── hooks/
│       └── rule_injector.py          # Hook script (auto-injects rules)
├── config/
│   ├── rules_config.yaml            # Rule injection configuration
│   ├── update_config.yaml           # Rule generation configuration  
│   └── generation_prompts.md        # Claude prompting templates
├── scripts/
│   ├── setup.py                     # Automated setup script
│   └── update_rules.py              # Rule generation script
├── rules/                           # Generated/updated rule files
│   ├── python-best-practices-2025.md
│   ├── javascript-best-practices-2025.md
│   └── archive/                     # Backup of old rules
├── templates/
│   └── rule_template.md            # Template for new rules
├── pyproject.toml                   # Python project configuration
├── requirements.txt                 # Dependencies
└── README.md                        # This file
```

## How It Works

### 1. Rule Injection Process

1. **User submits prompt** → Claude Code `UserPromptSubmit` hook triggers
2. **Hook analyzes prompt** for technology patterns (`.py`, `npm`, `git`, etc.)
3. **Hook loads relevant rules** from `rules/` directory based on configuration
4. **Hook outputs rules to stdout** → Claude Code injects into context
5. **Claude receives rules** as part of the prompt automatically

### 2. Rule Generation Process

1. **Script analyzes technologies** from configuration
2. **Script generates prompts** using templates
3. **Script calls Claude CLI** with generation prompts
4. **Claude generates fresh rules** based on current best practices
5. **Script saves new rules** and backs up old versions

## Customization

### Adding New Technologies

1. **Add to configuration** (`config/rules_config.yaml`):
   ```yaml
   technologies:
     - name: "rust"
       priority: 1
       rule_file: "rust-best-practices-2025.md"
       patterns:
         - '\\.rs\b'
         - '\brust\b'
         - 'Cargo\\.toml'
   ```

2. **Generate initial rules**:
   ```bash
   python scripts/update_rules.py rust
   ```

### Custom Detection Patterns

Modify `config/rules_config.yaml` to add custom regex patterns:

```yaml
technologies:
  - name: "python"
    patterns:
      - '\\.py\b'           # .py files
      - 'django'            # Django framework
      - 'flask'             # Flask framework
      - 'fastapi'           # FastAPI framework
```

### Rule Priority System

Control rule loading order with priorities:
- Priority 1: High (loaded first)
- Priority 2: Medium  
- Priority 3: Low (loaded last if space available)

## Scheduling Automatic Updates

### Using Cron (Linux/macOS)

```bash
# Add to crontab (crontab -e)
# Update rules every 6 months on 1st of January and July at 2 AM
0 2 1 1,7 * cd /path/to/ai-rules-hooks && python scripts/update_rules.py
```

### Using Task Scheduler (Windows)

Create a scheduled task to run:
```cmd
python C:\path\to\ai-rules-hooks\scripts\update_rules.py
```

### Using GitHub Actions

Add to `.github/workflows/update-rules.yml`:

```yaml
name: Update Rules
on:
  schedule:
    - cron: '0 2 1 1,7 *'  # Every 6 months
  workflow_dispatch:       # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Update rules
        run: python scripts/update_rules.py
        env:
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add rules/
          git commit -m "Auto-update rules" || exit 0
          git push
```

## Troubleshooting

### Hook Not Working

1. **Check Claude Code configuration**:
   ```bash
   # Verify hook is configured
   cat ~/.claude/claude_desktop_config.json
   ```

2. **Test hook script manually**:
   ```bash
   export CLAUDE_USER_PROMPT="test python script"
   python .claude/hooks/rule_injector.py
   ```

3. **Check script permissions**:
   ```bash
   chmod +x .claude/hooks/rule_injector.py
   ```

### Rule Generation Failing

1. **Verify Claude CLI**:
   ```bash
   claude --version
   ```

2. **Test Claude CLI manually**:
   ```bash
   claude --prompt "Generate Python best practices"
   ```

3. **Check API limits and quotas**

### Configuration Issues

1. **Validate YAML syntax**:
   ```bash
   python -c "import yaml; yaml.safe_load(open('config/rules_config.yaml'))"
   ```

2. **Check file permissions**:
   ```bash
   ls -la config/ rules/
   ```

## Benefits of This Solution

### ✅ KISS Compliance
- **Simple**: Few files, minimal complexity
- **Stupid**: Easy to understand and modify
- **Effective**: Solves the problem without over-engineering

### ✅ Python Best Practices
- Type hints throughout
- f-string formatting
- Pathlib for file operations
- PEP 8 compliant (120 char lines)
- Modern Python features (3.9+)

### ✅ No Heavy Dependencies
- Only PyYAML and Pydantic
- No Docker, Redis, or databases
- No complex web servers
- Just downloads, installs, and works

### ✅ Configurable & Extensible
- User-customizable patterns
- Priority-based rule loading
- Automated rule generation
- Easy to add new technologies

## Comparison to Complex Solutions

| Feature | AI Rules Hooks | Complex MCP Solution |
|---------|----------------|---------------------|
| Setup Time | 5 minutes | Hours |
| Dependencies | 2 packages | 20+ packages + Docker |
| Memory Usage | <10MB | 100MB+ |
| Maintenance | Minimal | High |
| Customization | Easy YAML config | Code changes required |
| Installation | `python setup.py` | Docker setup + config |

## Contributing

1. Fork the repository
2. Follow Python best practices (see existing code style)
3. Add type hints to all functions
4. Test your changes
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

*AI Rules Hooks - Keeping it simple, stupid, and effective! 🚀*