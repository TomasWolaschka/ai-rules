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

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from rule_base import BaseRuleInjector, SessionFamilyTracker, TechnologyPattern


class RuleInjector(BaseRuleInjector):
    """Enhanced rule injection system with configuration support and session family caching."""
    
    def __init__(self, config_path: Optional[Path] = None) -> None:
        """Initialize rule injector with configuration and session tracker.
        
        Args:
            config_path: Optional path to configuration file. If None, uses default location.
        """
        super().__init__(config_path)
        self.session_tracker = SessionFamilyTracker(self.project_root, self.config)
    
    def analyze_prompt_technologies(self, prompt: str) -> List[TechnologyPattern]:
        """Analyze user prompt to detect technology patterns.
        
        Args:
            prompt: User's prompt to analyze for patterns
            
        Returns:
            List of detected technology patterns, sorted by priority
        """
        detected_techs = []
        
        for tech_config in self.config.technologies:
            for pattern in tech_config.patterns:
                if re.search(pattern, prompt, re.IGNORECASE):
                    detected_techs.append(tech_config)
                    break  # Only add once per technology
        
        # Sort by priority (1=high priority first)
        return sorted(detected_techs, key=lambda x: x.priority)
    
    def generate_context_injection(self, user_prompt: str) -> Tuple[str, List[str]]:
        """Generate context injection content based on user prompt.
        
        Args:
            user_prompt: User's prompt to analyze for technology patterns
            
        Returns:
            Tuple of (formatted context injection string for Claude, list of injected rule names)
        """
        # Detect technologies from prompt
        detected_techs = self.analyze_prompt_technologies(user_prompt)
        
        # Collect rule content
        injected_rules: List[Tuple[str, str]] = []  # (rule_name, content)
        total_size = 0
        
        for tech in detected_techs:
            rule_content = self.load_rule_file(tech.rule_file)
            if rule_content and total_size + len(rule_content) < self.config.max_context_size:
                rule_name = tech.rule_file.replace("-", " ").replace(".md", "").upper()
                injected_rules.append((rule_name, rule_content))
                total_size += len(rule_content)
        
        # Note: Default rules are now handled by SessionStart hook
        # This hook only processes technology-specific rules
        
        # Format output if any rules were loaded
        if not injected_rules:
            return "", []
        
        # Generate user-friendly summary for technology-specific rules only
        tech_names = ', '.join([tech.name.upper() for tech in detected_techs])
        rule_names = ', '.join([f"• {rule_name}" for rule_name, _ in injected_rules])
        
        output_parts = [
            f"🪝 TECH RULES ADDED📋 Detected: {tech_names}",
            f"📚 Technology Rules: {len(injected_rules)} rule sets, {rule_names}",
            "=" * 50,
            "\n" + "=" * 80,
            "AUTOMATICALLY INJECTED TECHNOLOGY RULES - YOU MUST FOLLOW THESE",
            "=" * 80
        ]
        
        # Add full rules content for Claude
        for rule_name, rule_content in injected_rules:
            output_parts.extend([
                f"\n## MANDATORY {rule_name} RULES\n",
                rule_content,
                "\n" + "-" * 40
            ])
        
        output_parts.append("=" * 80 + "\n")
        
        # Return both the injection content and the list of rule names for caching
        injected_rule_names = [tech.name.lower() for tech in detected_techs]
        return "\n".join(output_parts), injected_rule_names
    
    def inject_rules(self) -> None:
        """Main function to inject rules based on user prompt patterns."""
        try:
            # Read JSON input from stdin as per Claude Code hooks specification
            stdin_data = sys.stdin.read().strip()
            if not stdin_data:
                return  # No input data
            
            hook_input: Dict = json.loads(stdin_data)
            user_prompt = hook_input.get("prompt", "")
            session_id = hook_input.get("session_id", "")
            transcript_path = hook_input.get("transcript_path", "")
            
            if not user_prompt:
                return  # No prompt to analyze
            
            # Session family cache check - early exit optimization
            if self.config.session_family_caching_enabled and session_id and transcript_path:
                family_root = self.session_tracker.get_session_family_root(session_id, transcript_path)
                config_hash = self.get_config_hash()
                
                if self.session_tracker.has_family_cache(family_root, config_hash):
                    # Rules already injected for this session family
                    print(f"🪝 FAMILY CACHE HIT📚 Session family {family_root[:8]}... rules already active", file=sys.stderr)
                    return  # Early exit - no injection needed
            
        except json.JSONDecodeError as error:
            print(f"Error: Invalid JSON input: {error}", file=sys.stderr)
            return
        except Exception as error:
            print(f"Error reading hook input: {error}", file=sys.stderr)
            return
        
        # Generate and output context injection
        context_injection, injected_rule_names = self.generate_context_injection(user_prompt)
        
        if context_injection:
            print(context_injection)
            
            # Create cache entry for this session family
            if (self.config.session_family_caching_enabled and session_id and 
                transcript_path and injected_rule_names):
                try:
                    family_root = self.session_tracker.get_session_family_root(session_id, transcript_path)
                    config_hash = self.get_config_hash()
                    self.session_tracker.create_family_cache(family_root, injected_rule_names, config_hash)
                except Exception as error:
                    print(f"Warning: Failed to cache session family: {error}", file=sys.stderr)


def main() -> None:
    """Entry point for the rule injector hook."""
    injector = RuleInjector()
    injector.inject_rules()


if __name__ == "__main__":
    main()