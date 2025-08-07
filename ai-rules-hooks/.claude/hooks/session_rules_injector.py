#!/usr/bin/env python3
"""
Claude Code SessionStart Hook: Default Rules Injection
Injects default rule content once per session when Claude Code starts or clears.

Following Python best practices (2024-2025):
- Type hints for all functions
- f-string formatting
- Pathlib for file operations
- PEP 8 compliance (120 char lines)
- Context managers for resource handling
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import yaml
from pydantic import BaseModel, Field


class TechnologyPattern(BaseModel):
    """Configuration for technology detection patterns."""
    
    name: str = Field(description="Technology name")
    patterns: List[str] = Field(description="Regex patterns to detect this technology")
    priority: int = Field(default=1, description="Priority level (1=high, 3=low)")
    rule_file: str = Field(description="Associated rule file name")


class RulesConfig(BaseModel):
    """Main configuration for rule injection system."""
    
    project_name: str = Field(default="ai-rules-hooks")
    rule_base_path: str = Field(default="rules")
    max_context_size: int = Field(default=50000, description="Maximum context size in characters")
    
    # These fields are now required and must be provided in YAML configuration
    default_rules: List[str] = Field(description="Default rule files to always include")
    technologies: List[TechnologyPattern] = Field(description="Technology detection patterns and rule mappings")


class SessionRuleInjector:
    """Session rule injection system for default rules only."""
    
    def __init__(self, config_path: Optional[Path] = None) -> None:
        """Initialize session rule injector with configuration.
        
        Args:
            config_path: Optional path to configuration file. If None, uses default location.
        """
        self.project_root = self._get_project_root()
        self.config_path = config_path or (self.project_root / "config" / "rules_config.yaml")
        self.config = self._load_configuration()
        
    def _get_project_root(self) -> Path:
        """Get project root directory from environment or default."""
        env_path = os.environ.get("CLAUDE_PROJECT_DIR")
        if env_path:
            return Path(env_path)
        
        # Try to find project root by looking for config directory
        current_path = Path(__file__).parent
        while current_path != current_path.parent:
            if (current_path / "config").exists():
                return current_path
            current_path = current_path.parent
        
        return Path.cwd()
    
    def _load_configuration(self) -> RulesConfig:
        """Load configuration from YAML file.
        
        Returns:
            Configuration object with user settings from YAML file.
            
        Raises:
            SystemExit: If configuration file is missing or invalid.
        """
        if not self.config_path.exists():
            print(f"❌ Error: Configuration file not found: {self.config_path}", file=sys.stderr)
            print(f"📋 Please create the configuration file with technology patterns and rules.", file=sys.stderr)
            print(f"💡 Example: Run 'python scripts/setup.py' to create default configuration.", file=sys.stderr)
            sys.exit(1)
        
        try:
            with self.config_path.open("r", encoding="utf-8") as config_file:
                config_data = yaml.safe_load(config_file)
                
                if not config_data:
                    print(f"❌ Error: Configuration file is empty: {self.config_path}", file=sys.stderr)
                    sys.exit(1)
                    
                return RulesConfig(**config_data)
                
        except yaml.YAMLError as error:
            print(f"❌ Error: Invalid YAML syntax in {self.config_path}: {error}", file=sys.stderr)
            sys.exit(1)
        except TypeError as error:
            print(f"❌ Error: Invalid configuration structure in {self.config_path}: {error}", file=sys.stderr)
            print(f"💡 Hint: Make sure 'technologies' and 'default_rules' fields are present.", file=sys.stderr)
            sys.exit(1)
        except Exception as error:
            print(f"❌ Error: Failed to load configuration from {self.config_path}: {error}", file=sys.stderr)
            sys.exit(1)
    
    def load_rule_file(self, rule_filename: str) -> Optional[str]:
        """Load content from a rule file.
        
        Args:
            rule_filename: Name of the rule file to load
            
        Returns:
            Rule file content or None if file not found
        """
        rule_path = self.project_root / self.config.rule_base_path / rule_filename
        
        try:
            with rule_path.open("r", encoding="utf-8") as rule_file:
                return rule_file.read()
        except FileNotFoundError:
            print(f"Warning: Rule file not found: {rule_path}", file=sys.stderr)
            return None
        except Exception as error:
            print(f"Error: Failed to load rule file {rule_path}: {error}", file=sys.stderr)
            return None
    
    def generate_session_rules_injection(self) -> str:
        """Generate session rules injection content (default rules only).
        
        Returns:
            Formatted context injection string for Claude
        """
        # Collect default rule content only
        injected_rules: List[Tuple[str, str]] = []  # (rule_name, content)
        total_size = 0
        
        # Add default rules
        for default_rule in self.config.default_rules:
            rule_content = self.load_rule_file(default_rule)
            if rule_content and total_size + len(rule_content) < self.config.max_context_size:
                rule_name = default_rule.replace("-", " ").replace(".md", "").upper()
                injected_rules.append((f"{rule_name} RULES", rule_content))
                total_size += len(rule_content)
        
        # Format output if any rules were loaded
        if not injected_rules:
            return ""
        
        # Generate user-friendly summary followed by full content for Claude
        rule_names = ', '.join([f"• {rule_name}" for rule_name, _ in injected_rules])
        
        output_parts = [
            f"🪝 SESSION RULES LOADED📚 Default rules: {rule_names}",
            "=" * 50,
            "\n" + "=" * 80,
            "AUTOMATICALLY INJECTED RULES - YOU MUST FOLLOW THESE",
            "=" * 80
        ]
        
        # Add full rules content for Claude
        for rule_name, rule_content in injected_rules:
            output_parts.extend([
                f"\n## MANDATORY {rule_name}\n",
                rule_content,
                "\n" + "-" * 40
            ])
        
        output_parts.append("=" * 80 + "\n")
        
        return "\n".join(output_parts)
    
    def inject_session_rules(self) -> None:
        """Main function to inject default rules at session start."""
        try:
            # Read JSON input from stdin as per Claude Code hooks specification
            stdin_data = sys.stdin.read().strip()
            if not stdin_data:
                return  # No input data
            
            hook_input: Dict = json.loads(stdin_data)
            hook_event = hook_input.get("hook_event_name", "")
            
            # Only process SessionStart events
            if hook_event != "SessionStart":
                return
            
        except json.JSONDecodeError as error:
            print(f"Error: Invalid JSON input: {error}", file=sys.stderr)
            return
        except Exception as error:
            print(f"Error reading hook input: {error}", file=sys.stderr)
            return
        
        # Generate and output session rules injection
        context_injection = self.generate_session_rules_injection()
        
        if context_injection:
            print(context_injection)


def main() -> None:
    """Entry point for the session rule injector hook."""
    try:
        injector = SessionRuleInjector()
        injector.inject_session_rules()
    except Exception as error:
        print(f"Error in session rule injector: {error}", file=sys.stderr)


if __name__ == "__main__":
    main()