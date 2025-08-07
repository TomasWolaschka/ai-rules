# Self-Updating AI Rule Management System - Python Implementation Plan

## Architecture Overview

Create a sophisticated **autonomous rule management ecosystem** that combines:
1. **Claude Code as MCP Server** - Exposes rule generation/management functions via Python SDK
2. **External Rule Management Service** - Python-based service monitoring tech trends
3. **Clean Context Injection** - No terminal pollution, intelligent rule loading
4. **Version-Controlled Rule Evolution** - Automated rule updates with archival

## Implementation Stack

- **MCP Server**: Python SDK with FastMCP framework
- **Web Research**: Python requests + BeautifulSoup/Scrapy for trend analysis
- **Scheduling**: Python APScheduler or system cron
- **Database**: SQLite/PostgreSQL for metadata storage
- **APIs**: Brave Search, GitHub API, Stack Overflow API

## Phase 1: Claude Code MCP Server Setup

### 1.1 MCP Server Configuration
```bash
# Install dependencies
uv add "mcp[cli]" httpx requests beautifulsoup4 apscheduler

# Configure Claude Code as MCP server
claude mcp serve
```

### 1.2 Custom MCP Functions
```python
# src/rule_management_server.py
from mcp.server.fastmcp import FastMCP, Context
from pathlib import Path
import requests
from datetime import datetime
import json

# Initialize FastMCP server
mcp = FastMCP("ai-rules-management")

@mcp.tool()
def generate_best_practices(
    technology: str, 
    year: str, 
    context: str = "",
    ctx: Context = None
) -> str:
    """
    Generate updated best practices via web research + AI analysis
    
    Args:
        technology: Programming language or framework (e.g., 'python', 'react')
        year: Target year for best practices (e.g., '2025')
        context: Additional context for rule generation
    """
    ctx.info(f"Generating best practices for {technology} {year}")
    
    # 1. Research latest trends and practices
    trends = analyze_technology_trends(technology, year)
    
    # 2. Generate comprehensive best practices
    best_practices = generate_rules_content(technology, year, trends, context)
    
    # 3. Format and validate content
    formatted_rules = format_rule_content(best_practices, technology, year)
    
    ctx.info(f"Generated {len(formatted_rules.split('\\n'))} lines of best practices")
    return formatted_rules

@mcp.tool()
def update_rule_file(
    rule_type: str, 
    content: str, 
    version: str,
    ctx: Context = None
) -> bool:
    """
    Update rule file with new content and archive old version
    
    Args:
        rule_type: Type of rule (e.g., 'python-best-practices')
        content: New rule content
        version: Version identifier (e.g., '2025-01')
    """
    try:
        rule_manager = RuleVersionManager()
        
        # Archive existing rule
        success = rule_manager.archive_current_rule(rule_type, version)
        if not success:
            ctx.error(f"Failed to archive current {rule_type} rule")
            return False
        
        # Deploy new rule
        success = rule_manager.deploy_new_rule(rule_type, content, version)
        if not success:
            ctx.error(f"Failed to deploy new {rule_type} rule")
            return False
            
        ctx.info(f"Successfully updated {rule_type} to version {version}")
        return True
        
    except Exception as e:
        ctx.error(f"Error updating rule file: {e}")
        return False

@mcp.tool()
def inject_context_rules(
    prompt: str, 
    technologies: list[str] = None,
    ctx: Context = None
) -> str:
    """
    Clean context injection based on prompt analysis
    
    Args:
        prompt: User's prompt to analyze
        technologies: Optional list of technologies to prioritize
    """
    rule_injector = ContextRuleInjector()
    
    # Analyze prompt for technology patterns
    detected_techs = rule_injector.analyze_prompt_technologies(prompt)
    
    if technologies:
        detected_techs.extend(technologies)
    
    # Load relevant rules
    relevant_rules = rule_injector.load_relevant_rules(detected_techs)
    
    # Format for clean injection
    context_content = rule_injector.format_for_context(relevant_rules)
    
    ctx.info(f"Injected {len(relevant_rules)} rules for technologies: {detected_techs}")
    return context_content

@mcp.tool()
def analyze_technology_trends(
    technology: str = None,
    ctx: Context = None
) -> dict:
    """
    Analyze current tech trends for rule update scheduling
    
    Args:
        technology: Specific technology to analyze, or None for all
    """
    trend_analyzer = TechnologyTrendAnalyzer()
    
    if technology:
        trends = trend_analyzer.analyze_single_technology(technology)
    else:
        trends = trend_analyzer.analyze_all_technologies()
    
    ctx.info(f"Analyzed trends for: {list(trends.keys())}")
    return trends

if __name__ == "__main__":
    mcp.run()
```

### 1.3 Supporting Classes
```python
# src/rule_version_manager.py
class RuleVersionManager:
    def __init__(self, base_path: Path = None):
        self.base_path = base_path or Path("/home/tomaswolaschka/workspace/ai-rules")
        self.active_path = self.base_path / "ai-rules"
        self.archive_path = self.base_path / "archive"
        self.metadata_path = self.base_path / "metadata"
        
    def archive_current_rule(self, rule_type: str, version: str) -> bool:
        """Archive the current active rule before updating"""
        current_file = self.active_path / f"{rule_type}.md"
        
        if not current_file.exists():
            return True  # No current rule to archive
            
        # Create archive filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_file = self.archive_path / f"{rule_type}-{version}-{timestamp}.md"
        
        # Ensure archive directory exists
        archive_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy current to archive
        import shutil
        shutil.copy2(current_file, archive_file)
        
        # Update metadata
        self._update_archive_metadata(rule_type, version, archive_file)
        
        return True
        
    def deploy_new_rule(self, rule_type: str, content: str, version: str) -> bool:
        """Deploy new rule content to active directory"""
        active_file = self.active_path / f"{rule_type}.md"
        
        # Write new content
        with open(active_file, 'w', encoding='utf-8') as f:
            f.write(content)
            
        # Update deployment metadata
        self._update_deployment_metadata(rule_type, version, active_file)
        
        return True
        
    def _update_archive_metadata(self, rule_type: str, version: str, archive_file: Path):
        """Update archive metadata with rule information"""
        metadata_file = self.metadata_path / "archive_log.json"
        metadata_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Load existing metadata
        try:
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            metadata = []
            
        # Add new archive entry
        metadata.append({
            "rule_type": rule_type,
            "version": version,
            "archived_at": datetime.now().isoformat(),
            "archive_file": str(archive_file),
        })
        
        # Save updated metadata
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)

# src/context_rule_injector.py
import re
from typing import List, Dict

class ContextRuleInjector:
    def __init__(self):
        self.technology_patterns = {
            'python': r'\.py|python|pip|conda|pyproject\.toml|requirements\.txt|poetry\.lock',
            'javascript': r'\.js|\.ts|javascript|typescript|npm|node|package\.json',
            'java': r'\.java|\.kt|\.scala|pom\.xml|build\.gradle|maven|gradle|spring',
            'react': r'react|jsx|tsx|next\.js|gatsby',
            'git': r'\.git|github\.com|commit|branch|pull request|workflow|\.github',
        }
        
    def analyze_prompt_technologies(self, prompt: str) -> List[str]:
        """Analyze prompt text to detect relevant technologies"""
        detected = []
        
        for tech, pattern in self.technology_patterns.items():
            if re.search(pattern, prompt, re.IGNORECASE):
                detected.append(tech)
                
        return list(set(detected))  # Remove duplicates
        
    def load_relevant_rules(self, technologies: List[str]) -> Dict[str, str]:
        """Load rule content for detected technologies"""
        rules = {}
        base_path = Path("/home/tomaswolaschka/workspace/ai-rules/ai-rules")
        
        # Technology-specific rules
        for tech in technologies:
            rule_files = {
                'python': 'python-best-practices-2024-2025.md',
                'javascript': 'javascript-best-practices-2024-2025.md',  # Future
                'java': 'java-best-practices-2024-2025.md',
                'git': 'github-best-practices-2024-2025.md',
            }
            
            if tech in rule_files:
                rule_file = base_path / rule_files[tech]
                if rule_file.exists():
                    with open(rule_file, 'r', encoding='utf-8') as f:
                        rules[tech] = f.read()
        
        # Always include default rules
        default_rules = [
            'solid-best-practices.md',
            'bifrost-mcp-code-modification-rules-2025-08.md',
            'vscode-ju-mcp-2025-08.md'
        ]
        
        for rule_file in default_rules:
            rule_path = base_path / rule_file
            if rule_path.exists():
                with open(rule_path, 'r', encoding='utf-8') as f:
                    rule_name = rule_file.replace('.md', '').replace('-', '_')
                    rules[f'default_{rule_name}'] = f.read()
                    
        return rules
        
    def format_for_context(self, rules: Dict[str, str]) -> str:
        """Format rules for clean context injection"""
        if not rules:
            return ""
            
        context_parts = ["<system-reminder>"]
        context_parts.append("AUTOMATICALLY INJECTED RULES - YOU MUST FOLLOW THESE")
        context_parts.append("=" * 60)
        
        for rule_name, content in rules.items():
            context_parts.append(f"## {rule_name.upper().replace('_', ' ')} RULES")
            context_parts.append(content)
            context_parts.append("-" * 40)
            
        context_parts.append("=" * 60)
        context_parts.append("</system-reminder>")
        
        return "\\n".join(context_parts)

# src/technology_trend_analyzer.py
class TechnologyTrendAnalyzer:
    def __init__(self):
        self.github_api_base = "https://api.github.com"
        self.stackoverflow_api_base = "https://api.stackexchange.com/2.3"
        
    def analyze_single_technology(self, technology: str) -> dict:
        """Analyze trends for a specific technology"""
        trends = {
            'github_trends': self._get_github_trends(technology),
            'stackoverflow_trends': self._get_stackoverflow_trends(technology),
            'package_trends': self._get_package_trends(technology),
            'documentation_changes': self._get_documentation_changes(technology)
        }
        
        # Analyze trend significance
        trends['update_priority'] = self._calculate_update_priority(trends)
        trends['last_analyzed'] = datetime.now().isoformat()
        
        return trends
        
    def analyze_all_technologies(self) -> dict:
        """Analyze trends for all tracked technologies"""
        technologies = ['python', 'javascript', 'java', 'react', 'node']
        all_trends = {}
        
        for tech in technologies:
            all_trends[tech] = self.analyze_single_technology(tech)
            
        return all_trends
```

## Phase 2: External Rule Management Service

### 2.1 Scheduled Automation System
```python
# src/rule_update_scheduler.py
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

class RuleUpdateScheduler:
    def __init__(self):
        self.scheduler = BlockingScheduler()
        self.mcp_client = MCPClient()  # Client to communicate with MCP server
        
    def start(self):
        """Start the scheduled rule update system"""
        
        # Major update every 6 months (January 1st and July 1st)
        self.scheduler.add_job(
            func=self.perform_major_update,
            trigger=CronTrigger(month='1,7', day=1, hour=0, minute=0),
            id='major_rule_update',
            max_instances=1
        )
        
        # Minor trend analysis every week (Sunday at midnight)
        self.scheduler.add_job(
            func=self.perform_trend_analysis,
            trigger=CronTrigger(day_of_week='sun', hour=0, minute=0),
            id='weekly_trend_analysis',
            max_instances=1
        )
        
        # Emergency update check daily
        self.scheduler.add_job(
            func=self.check_emergency_updates,
            trigger=CronTrigger(hour=2, minute=0),
            id='daily_emergency_check',
            max_instances=1
        )
        
        logging.info("Rule update scheduler started")
        self.scheduler.start()
        
    def perform_major_update(self):
        """Perform comprehensive rule updates"""
        technologies = ['python', 'java', 'javascript', 'react', 'git']
        
        for tech in technologies:
            try:
                # Analyze trends
                trends = self.mcp_client.analyze_technology_trends(tech)
                
                # Generate new rules if significant changes detected
                if trends.get('update_priority', 0) > 0.7:
                    new_rules = self.mcp_client.generate_best_practices(
                        technology=tech,
                        year=str(datetime.now().year),
                        context=f"Trends: {trends}"
                    )
                    
                    # Update rule file
                    version = f"{datetime.now().year}-{datetime.now().month:02d}"
                    success = self.mcp_client.update_rule_file(
                        rule_type=f"{tech}-best-practices",
                        content=new_rules,
                        version=version
                    )
                    
                    if success:
                        logging.info(f"Successfully updated {tech} rules to version {version}")
                    else:
                        logging.error(f"Failed to update {tech} rules")
                        
            except Exception as e:
                logging.error(f"Error updating {tech} rules: {e}")
```

### 2.2 MCP Client for External Communication
```python
# src/mcp_client.py
import subprocess
import json
import tempfile
from pathlib import Path

class MCPClient:
    """Client to communicate with Claude Code MCP server"""
    
    def __init__(self):
        self.claude_command = "claude"
        
    def generate_best_practices(self, technology: str, year: str, context: str = "") -> str:
        """Call MCP server to generate best practices"""
        
        # Create temporary config for MCP server
        config = {
            "mcpServers": {
                "ai-rules": {
                    "command": "python",
                    "args": [str(Path(__file__).parent / "rule_management_server.py")],
                    "env": {}
                }
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(config, f)
            config_file = f.name
            
        try:
            # Call Claude with MCP server
            cmd = [
                self.claude_command, 
                "--config", config_file,
                "--prompt", f"Generate best practices for {technology} {year}. Context: {context}"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                return result.stdout.strip()
            else:
                raise Exception(f"MCP call failed: {result.stderr}")
                
        finally:
            Path(config_file).unlink()  # Clean up temp config
            
    def analyze_technology_trends(self, technology: str) -> dict:
        """Call MCP server to analyze technology trends"""
        # Similar implementation to generate_best_practices
        # Returns trend analysis data
        pass
        
    def update_rule_file(self, rule_type: str, content: str, version: str) -> bool:
        """Call MCP server to update rule file"""
        # Similar implementation to generate_best_practices
        # Returns success boolean
        pass
```

## Phase 3: Integration and Testing

### 3.1 Configuration Management
```python
# config/mcp_server_config.json
{
  "server": {
    "name": "ai-rules-management",
    "version": "1.0.0",
    "description": "Autonomous AI rule management system"
  },
  "rule_sources": {
    "github_api_token": "${GITHUB_TOKEN}",
    "stackoverflow_api_key": "${STACKOVERFLOW_KEY}",
    "brave_search_api_key": "${BRAVE_SEARCH_KEY}"
  },
  "rule_management": {
    "base_path": "/home/tomaswolaschka/workspace/ai-rules",
    "archive_retention_months": 24,
    "update_frequency_months": 6
  },
  "logging": {
    "level": "INFO",
    "file": "logs/rule_management.log"
  }
}
```

### 3.2 Testing Framework
```python
# tests/test_rule_management.py
import pytest
from src.rule_management_server import *

class TestRuleManagement:
    def test_technology_detection(self):
        injector = ContextRuleInjector()
        
        prompt = "Help me debug this Python script with a .py file"
        detected = injector.analyze_prompt_technologies(prompt)
        
        assert 'python' in detected
        
    def test_rule_generation(self):
        # Mock test for rule generation
        result = generate_best_practices("python", "2025", "test context")
        
        assert len(result) > 0
        assert "Python" in result
        
    def test_rule_archival(self):
        manager = RuleVersionManager()
        
        # Test archiving functionality
        success = manager.archive_current_rule("test-rule", "2025-01")
        assert success
```

## Deployment and Operations

### 3.3 Deployment Script
```bash
#!/bin/bash
# deploy/deploy.sh

set -e

echo "Deploying AI Rule Management System..."

# Install dependencies
uv sync

# Setup directory structure
mkdir -p logs archive metadata

# Configure Claude Code MCP server
echo "Configuring Claude Code MCP server..."
cp config/mcp_server_config.json ~/.claude/servers/ai-rules.json

# Start the scheduler service
echo "Starting rule update scheduler..."
python -m src.rule_update_scheduler &

echo "AI Rule Management System deployed successfully!"
```

## Expected Benefits

1. **Autonomous Updates**: Rules automatically stay current with technology evolution
2. **AI-Powered Generation**: Leverages Claude's capabilities for intelligent rule creation
3. **Clean Integration**: No terminal pollution, seamless context injection
4. **Version Control**: Complete rule history with rollback capabilities
5. **Extensible Architecture**: Easy to add new technologies and rule types

## Future Enhancements

- **Machine Learning**: Train models to predict optimal update timing
- **Community Integration**: Incorporate community feedback and contributions  
- **Performance Optimization**: Cache frequently accessed rules
- **Multi-Language Support**: Extend beyond English-language best practices

---

*Implementation Plan v1.0 - Created August 2025*