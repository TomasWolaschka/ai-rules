#!/usr/bin/env python3
"""
Enhanced Claude Code Hook: Automatic Rule Context Injection
Injects relevant rule content directly into Claude's context based on user prompt patterns
and configuration file settings.

Following Python best practices (2024-2025):
- Type hints for all functions
- f-string formatting
- Pathlib for file operations
- PEP 8 compliance (120 char lines)
- Context managers for resource handling
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Optional, Tuple

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


class RuleInjector:
    """Enhanced rule injection system with configuration support."""
    
    def __init__(self, config_path: Optional[Path] = None) -> None:
        """Initialize rule injector with configuration.
        
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
    
    def analyze_prompt_technologies(self, prompt: str) -> List[TechnologyPattern]:
        """Analyze user prompt to detect relevant technologies.
        
        Args:
            prompt: User prompt to analyze
            
        Returns:
            List of detected technology patterns, sorted by priority
        """
        detected_technologies: List[TechnologyPattern] = []
        
        for tech_config in self.config.technologies:
            for pattern in tech_config.patterns:
                if re.search(pattern, prompt, re.IGNORECASE):
                    detected_technologies.append(tech_config)
                    break  # Only add each technology once
        
        # Sort by priority (lower number = higher priority)
        return sorted(detected_technologies, key=lambda tech: tech.priority)
    
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
    
    def generate_context_injection(self, user_prompt: str) -> str:
        """Generate context injection content based on user prompt.
        
        Args:
            user_prompt: User's prompt to analyze for technology patterns
            
        Returns:
            Formatted context injection string for Claude
        """
        # Detect technologies from prompt
        detected_techs = self.analyze_prompt_technologies(user_prompt)
        
        # Collect rule content
        injected_rules: List[Tuple[str, str]] = []  # (rule_name, content)
        total_size = 0
        
        # Add technology-specific rules first (higher priority)
        for tech in detected_techs:
            rule_content = self.load_rule_file(tech.rule_file)
            if rule_content and total_size + len(rule_content) < self.config.max_context_size:
                rule_name = tech.name.upper()
                injected_rules.append((f"{rule_name} BEST PRACTICES", rule_content))
                total_size += len(rule_content)
        
        # Add default rules if space allows
        for default_rule in self.config.default_rules:
            rule_content = self.load_rule_file(default_rule)
            if rule_content and total_size + len(rule_content) < self.config.max_context_size:
                rule_name = default_rule.replace("-", " ").replace(".md", "").upper()
                injected_rules.append((f"{rule_name} RULES", rule_content))
                total_size += len(rule_content)
        
        # Format output if any rules were loaded
        if not injected_rules:
            return ""
        
        # Generate formatted context injection
        context_parts = [
            "\n" + "=" * 80,
            "AUTOMATICALLY INJECTED RULES - YOU MUST FOLLOW THESE",
            "=" * 80
        ]
        
        for rule_name, rule_content in injected_rules:
            context_parts.extend([
                f"\n## MANDATORY {rule_name} RULES\n",
                rule_content,
                "\n" + "-" * 40
            ])
        
        context_parts.append("=" * 80 + "\n")
        
        return "\n".join(context_parts)
    
    def inject_rules(self) -> None:
        """Main function to inject rules based on user prompt patterns."""
        user_prompt = os.environ.get("CLAUDE_USER_PROMPT", "")
        
        if not user_prompt:
            return  # No prompt to analyze
        
        # Generate and output context injection
        context_injection = self.generate_context_injection(user_prompt)
        
        if context_injection:
            print(context_injection)


def main() -> None:
    """Entry point for the rule injector hook."""
    try:
        injector = RuleInjector()
        injector.inject_rules()
    except Exception as error:
        print(f"Error in rule injector: {error}", file=sys.stderr)


if __name__ == "__main__":
    main()