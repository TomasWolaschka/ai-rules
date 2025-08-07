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
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from rule_base import BaseRuleInjector


class SessionRuleInjector(BaseRuleInjector):
    """Session rule injection system for default rules only."""
    
    def generate_session_rules_injection(self) -> str:
        """Generate context injection content for session-level default rules.
        
        Returns:
            Formatted context injection string for Claude with default rules only
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
        
        output_parts.append("=" * 80)
        
        return "\n".join(output_parts)
    
    def inject_session_rules(self) -> None:
        """Main function to inject session-level default rules."""
        try:
            # Read JSON input from stdin as per Claude Code hooks specification
            stdin_data = sys.stdin.read().strip()
            if not stdin_data:
                return  # No input data
            
            hook_input: Dict = json.loads(stdin_data)
            hook_event_name = hook_input.get("hook_event_name", "")
            
            # Only process SessionStart events
            if hook_event_name != "SessionStart":
                return  # Not a SessionStart event
            
        except json.JSONDecodeError as error:
            print(f"Error: Invalid JSON input: {error}", file=sys.stderr)
            return
        except Exception as error:
            print(f"Error reading hook input: {error}", file=sys.stderr)
            return
        
        # Generate and output context injection
        context_injection = self.generate_session_rules_injection()
        
        if context_injection:
            print(context_injection)


def main() -> None:
    """Entry point for the session rule injector hook."""
    injector = SessionRuleInjector()
    injector.inject_session_rules()


if __name__ == "__main__":
    main()