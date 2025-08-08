#!/usr/bin/env python3
"""
Shared base classes and utilities for AI Rules Hooks system.
Eliminates code duplication between session_rules_injector.py and rule_injector.py.

Following Python best practices (2024-2025):
- Type hints for all functions
- f-string formatting
- Pathlib for file operations
- PEP 8 compliance (120 char lines)
- Context managers for resource handling
"""

import hashlib
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import yaml
from pydantic import BaseModel, Field


class TechnologyPattern(BaseModel):
    """Configuration for technology detection patterns."""
    
    name: str = Field(description="Technology name (e.g., 'python', 'javascript')")
    patterns: List[str] = Field(description="Regex patterns to match in user prompts")
    priority: int = Field(default=1, description="Priority level (1=high, 3=low)")
    rule_file: str = Field(description="Associated rule file name")


class RulesConfig(BaseModel):
    """Main configuration for rule injection system."""
    
    project_name: str = Field(default="ai-rules-hooks")
    rule_base_path: str = Field(default="rules")
    cache_base_path: str = Field(default="logs/session_cache")
    max_context_size: int = Field(default=50000, description="Maximum context size in characters")
    
    # Session family caching configuration
    session_family_caching_enabled: bool = Field(default=True, description="Enable session family rule injection caching")
    
    # These fields are now required and must be provided in YAML configuration
    default_rules: List[str] = Field(description="Default rule files to always include")
    technologies: List[TechnologyPattern] = Field(description="Technology detection patterns and rule mappings")


class SessionFamilyCache(BaseModel):
    """Cache entry for session family rule injection tracking."""
    
    family_root_session: str = Field(description="Root session ID of the session family")
    rules_injected: List[str] = Field(description="List of rules already injected in this family")
    injection_timestamp: str = Field(description="ISO timestamp when rules were injected")
    config_hash: str = Field(description="Hash of configuration to detect changes")


class BaseRuleInjector:
    """Base class for rule injection systems with shared functionality."""
    
    def __init__(self, config_path: Optional[Path] = None) -> None:
        """Initialize rule injector with configuration.
        
        Args:
            config_path: Optional path to configuration file. If None, uses default location.
        """
        self.project_root = self._get_project_root()
        self.config_path = config_path or (self.project_root / "config" / "rules_config.yaml")
        self.config = self._load_configuration()
    
    def _get_project_root(self) -> Path:
        # Script-based path detection (universal method)
        # The script is at ai-rules-hooks/.claude/hooks/*.py
        # So go up 3 levels to get to ai-rules-hooks
        script_based_root = Path(__file__).resolve().parent.parent.parent
        config_file = script_based_root / "config" / "rules_config.yaml"
        
        if config_file.exists():
            return script_based_root
        
        # If config file not found, raise clear error
        raise FileNotFoundError(
            f"Cannot locate ai-rules-hooks project root. "
            f"Expected config file at: {config_file}"
        )
    
    def _load_configuration(self) -> RulesConfig:
        """Load configuration from YAML file.
        
        Returns:
            Configuration object with user settings from YAML file.
            
        Raises:
            FileNotFoundError: If configuration file doesn't exist
            yaml.YAMLError: If configuration file is invalid
        """
        if not self.config_path.exists():
            print(f"❌ Error: Configuration file not found: {self.config_path}", file=sys.stderr)
            print("📋 Please create the configuration file with technology patterns and rules.", file=sys.stderr)
            print("💡 Example: Run 'python scripts/setup.py' to create default configuration.", file=sys.stderr)
            sys.exit(1)
        
        try:
            with self.config_path.open("r", encoding="utf-8") as config_file:
                config_data = yaml.safe_load(config_file)
                return RulesConfig(**config_data)
        except yaml.YAMLError as error:
            print(f"❌ Error: Invalid YAML in configuration file: {error}", file=sys.stderr)
            sys.exit(1)
        except Exception as error:
            print(f"❌ Error: Failed to load configuration: {error}", file=sys.stderr)
            sys.exit(1)
    
    def get_rule_file_path(self, rule_filename: str) -> Path:
        """Get full path to rule file based on configuration.
        
        Args:
            rule_filename: Name of the rule file
            
        Returns:
            Full path to the rule file
        """
        return self.project_root / self.config.rule_base_path / rule_filename
    
    def load_rule_file(self, rule_filename: str) -> Optional[str]:
        """Load content from a rule file.
        
        Args:
            rule_filename: Name of the rule file to load
            
        Returns:
            Rule file content as string, or None if file cannot be loaded
        """
        rule_path = self.get_rule_file_path(rule_filename)
        
        try:
            with rule_path.open("r", encoding="utf-8") as rule_file:
                return rule_file.read().strip()
        except FileNotFoundError:
            print(f"Warning: Rule file not found: {rule_path}", file=sys.stderr)
            return None
        except Exception as error:
            print(f"Error: Failed to load rule file {rule_path}: {error}", file=sys.stderr)
            return None
    
    def get_config_hash(self) -> str:
        """Generate hash of configuration for cache invalidation.
        
        Returns:
            Hash string representing configuration state
        """
        # Create hash based on key configuration elements
        config_str = f"{self.config.project_name}|{self.config.rule_base_path}|{self.config.cache_base_path}"
        config_str += f"|{self.config.max_context_size}|{self.config.session_family_caching_enabled}"
        config_str += f"|{sorted(self.config.default_rules)}"
        config_str += f"|{[(t.name, sorted(t.patterns), t.priority, t.rule_file) for t in self.config.technologies]}"
        
        return hashlib.md5(config_str.encode()).hexdigest()[:16]


class SessionFamilyTracker:
    """Manages session family relationships and rule injection caching."""
    
    def __init__(self, project_root: Path, config: RulesConfig) -> None:
        """Initialize session family tracker.
        
        Args:
            project_root: Root directory of the AI Rules project
            config: Configuration object with cache path settings
        """
        self.project_root = project_root
        self.config = config
        self.cache_dir = project_root / config.cache_base_path
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def get_session_family_root(self, session_id: str, transcript_path: Optional[str] = None) -> str:
        """Determine the root session ID for the current session family.
        
        Args:
            session_id: Current session ID from hook input
            transcript_path: Path to session transcript file (optional)
            
        Returns:
            Root session ID for the session family
        """
        if not transcript_path:
            # No transcript path available, assume this is root session
            return session_id
        
        try:
            transcript_file = Path(transcript_path)
            if not transcript_file.exists():
                return session_id
            
            # Read first few lines of transcript to detect session relationships
            with transcript_file.open("r", encoding="utf-8") as file:
                first_line = file.readline().strip()
                if not first_line:
                    return session_id
                
                try:
                    first_message = json.loads(first_line)
                    
                    # Check for compact summary pattern
                    if first_message.get("type") == "summary":
                        return self._extract_root_from_summary(first_message)
                    
                    # Check for resume pattern - UUID references parent session
                    message_uuid = first_message.get("uuid")
                    if message_uuid and message_uuid != session_id:
                        # UUID likely references the parent session ID
                        return message_uuid
                    
                    # Check second line for resume pattern
                    second_line = file.readline().strip()
                    if second_line:
                        second_message = json.loads(second_line)
                        message_content = str(second_message.get("message", {}).get("content", ""))
                        
                        # Check if this is a continued session
                        if "This session is being continued" in message_content:
                            return self._extract_root_from_continuation(message_content)
                    
                except json.JSONDecodeError:
                    # Invalid JSON, assume root session
                    pass
                    
        except Exception:
            # Error reading transcript, assume root session
            pass
        
        # Default: this is a root session
        return session_id
    
    def _extract_root_from_summary(self, summary_message: Dict) -> str:
        """Extract root session ID from compact summary message.
        
        Args:
            summary_message: Summary message from compacted session
            
        Returns:
            Root session ID extracted from summary
        """
        # For now, use leafUuid as potential root session reference
        leaf_uuid = summary_message.get("leafUuid")
        if leaf_uuid:
            return leaf_uuid
        
        # Fallback: return current session as root
        return summary_message.get("sessionId", "unknown")
    
    def _extract_root_from_continuation(self, content: str) -> str:
        """Extract root session ID from continuation message content.
        
        Args:
            content: Content of continuation message
            
        Returns:
            Root session ID if found in content
        """
        # Try to find session ID patterns in continuation summary
        # This is a simplified approach - could be enhanced with better parsing
        
        # Look for UUID patterns in the content
        uuid_pattern = r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
        matches = re.findall(uuid_pattern, content)
        
        if matches:
            # Return the first UUID found - likely the original session
            return matches[0]
        
        # No UUID found in content
        return "unknown"
    
    def has_family_cache(self, family_root: str, config_hash: str) -> bool:
        """Check if session family already has rule injection cache.
        
        Args:
            family_root: Root session ID of the family
            config_hash: Current configuration hash to check for changes
            
        Returns:
            True if valid cache exists for this family
        """
        cache_file = self.cache_dir / f"{family_root}.json"
        if not cache_file.exists():
            return False
        
        try:
            with cache_file.open("r", encoding="utf-8") as file:
                cache_data = json.load(file)
                cache_entry = SessionFamilyCache(**cache_data)
                
                # Check if configuration has changed
                if cache_entry.config_hash != config_hash:
                    # Configuration changed, invalidate cache
                    return False
                
                return True
                
        except Exception:
            # Error reading cache, treat as no cache
            return False
    
    def create_family_cache(self, family_root: str, injected_rules: List[str], config_hash: str) -> None:
        """Create cache entry for session family rule injection.
        
        Args:
            family_root: Root session ID of the family
            injected_rules: List of rules that were injected
            config_hash: Current configuration hash
        """
        cache_entry = SessionFamilyCache(
            family_root_session=family_root,
            rules_injected=injected_rules,
            injection_timestamp=datetime.utcnow().isoformat() + "Z",
            config_hash=config_hash
        )
        
        cache_file = self.cache_dir / f"{family_root}.json"
        try:
            with cache_file.open("w", encoding="utf-8") as file:
                json.dump(cache_entry.model_dump(), file, indent=2)
        except Exception as error:
            print(f"Warning: Failed to create session family cache: {error}", file=sys.stderr)