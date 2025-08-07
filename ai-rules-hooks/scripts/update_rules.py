#!/usr/bin/env python3
"""
AI Rules Update Script

Automatically generates and updates best practice rules by prompting Claude CLI.
This script maintains fresh, current best practices without manual intervention.

Following Python best practices (2024-2025):
- Type hints for all functions
- f-string formatting  
- Pathlib for file operations
- PEP 8 compliance
- Proper error handling
"""

import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import yaml
from pydantic import BaseModel, Field


class UpdateConfig(BaseModel):
    """Configuration for rule updating process."""
    
    claude_command: str = Field(default="claude")
    update_frequency_months: int = Field(default=6)
    backup_old_rules: bool = Field(default=True)
    prompt_template_file: str = Field(default="config/generation_prompts.md")
    
    technologies: List[str] = Field(
        default=["python", "javascript", "java", "react", "git", "docker"]
    )


class RuleUpdater:
    """Automated rule generation and updating system."""
    
    def __init__(self, project_root: Optional[Path] = None) -> None:
        """Initialize the rule updater.
        
        Args:
            project_root: Optional project root path. Auto-detected if None.
        """
        self.project_root = project_root or self._detect_project_root()
        self.config = self._load_config()
        self.rules_dir = self.project_root / "rules"
        self.backup_dir = self.project_root / "rules" / "archive"
    
    def _detect_project_root(self) -> Path:
        """Auto-detect project root directory."""
        current_path = Path(__file__).parent.parent
        
        # Look for config directory as project root indicator
        while current_path != current_path.parent:
            if (current_path / "config").exists():
                return current_path
            current_path = current_path.parent
        
        return Path.cwd()
    
    def _load_config(self) -> UpdateConfig:
        """Load configuration for rule updates."""
        config_file = self.project_root / "config" / "update_config.yaml"
        
        if config_file.exists():
            try:
                with config_file.open("r", encoding="utf-8") as file:
                    config_data = yaml.safe_load(file)
                    return UpdateConfig(**config_data)
            except Exception as error:
                print(f"Warning: Failed to load update config: {error}", file=sys.stderr)
        
        return UpdateConfig()
    
    def _check_claude_available(self) -> bool:
        """Check if Claude CLI is available and working."""
        try:
            result = subprocess.run(
                [self.config.claude_command, "--version"],
                capture_output=True,
                text=True,
                check=True,
                timeout=10
            )
            return True
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    def _load_prompt_template(self, technology: str) -> str:
        """Load prompt template for generating rules.
        
        Args:
            technology: Technology name to generate rules for
            
        Returns:
            Formatted prompt template for Claude
        """
        template_path = self.project_root / self.config.prompt_template_file
        
        if not template_path.exists():
            return self._get_default_prompt_template(technology)
        
        try:
            with template_path.open("r", encoding="utf-8") as file:
                template = file.read()
                return template.format(
                    technology=technology,
                    year=datetime.now().year,
                    date=datetime.now().strftime("%Y-%m-%d")
                )
        except Exception as error:
            print(f"Warning: Failed to load prompt template: {error}", file=sys.stderr)
            return self._get_default_prompt_template(technology)
    
    def _get_default_prompt_template(self, technology: str) -> str:
        """Get default prompt template for rule generation.
        
        Args:
            technology: Technology name
            
        Returns:
            Default prompt template
        """
        current_year = datetime.now().year
        
        return f"""Please generate comprehensive {technology} best practices for {current_year}.

Create a detailed guide that includes:

## Core Principles
- Modern {technology} development standards
- Industry-accepted conventions and patterns
- Performance optimization guidelines

## Code Quality Standards  
- Naming conventions and style guidelines
- Code organization and structure
- Documentation requirements

## Security Best Practices
- Common security vulnerabilities to avoid
- Secure coding patterns
- Dependency management security

## Testing and Quality Assurance
- Testing frameworks and methodologies
- Code coverage expectations
- Quality metrics and tools

## Modern Tooling and Ecosystem
- Recommended development tools
- Build and deployment practices
- Popular libraries and frameworks

## Performance Guidelines
- Optimization techniques
- Monitoring and profiling
- Resource management

Please format as a comprehensive Markdown document with clear sections, 
practical examples, and actionable guidance. Focus on current {current_year} 
standards and emerging trends in the {technology} ecosystem.

The output should be production-ready content that developers can immediately 
apply to improve their {technology} development practices."""
    
    def _backup_existing_rule(self, rule_file: Path) -> None:
        """Create backup of existing rule file.
        
        Args:
            rule_file: Path to rule file to backup
        """
        if not rule_file.exists():
            return
            
        # Create backup directory if needed
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Create timestamped backup
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{rule_file.stem}_{timestamp}.md"
        backup_path = self.backup_dir / backup_name
        
        try:
            rule_file.rename(backup_path)
            print(f"✅ Backed up existing rule to: {backup_path}")
        except Exception as error:
            print(f"⚠️  Warning: Failed to backup {rule_file}: {error}", file=sys.stderr)
    
    def _generate_rule_via_claude(self, technology: str) -> Optional[str]:
        """Generate rule content by calling Claude CLI.
        
        Args:
            technology: Technology to generate rules for
            
        Returns:
            Generated rule content or None if failed
        """
        prompt = self._load_prompt_template(technology)
        
        try:
            print(f"🤖 Generating {technology} best practices via Claude CLI...")
            
            result = subprocess.run(
                [self.config.claude_command, "--prompt", prompt],
                capture_output=True,
                text=True,
                check=True,
                timeout=180  # 3 minutes timeout
            )
            
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
            else:
                print(f"❌ Claude CLI returned empty response for {technology}", file=sys.stderr)
                return None
                
        except subprocess.TimeoutExpired:
            print(f"⏰ Timeout: Claude CLI took too long for {technology}", file=sys.stderr)
            return None
        except subprocess.CalledProcessError as error:
            print(f"❌ Claude CLI failed for {technology}: {error}", file=sys.stderr)
            return None
        except Exception as error:
            print(f"❌ Unexpected error generating {technology} rules: {error}", file=sys.stderr)
            return None
    
    def update_single_technology(self, technology: str) -> bool:
        """Update rules for a single technology.
        
        Args:
            technology: Technology name to update
            
        Returns:
            True if successful, False otherwise
        """
        rule_filename = f"{technology}-best-practices-{datetime.now().year}.md"
        rule_path = self.rules_dir / rule_filename
        
        print(f"\n📝 Updating {technology} best practices...")
        
        # Generate new content via Claude
        new_content = self._generate_rule_via_claude(technology)
        if not new_content:
            print(f"❌ Failed to generate content for {technology}")
            return False
        
        # Backup existing rule if configured
        if self.config.backup_old_rules:
            self._backup_existing_rule(rule_path)
        
        # Write new rule file
        try:
            self.rules_dir.mkdir(parents=True, exist_ok=True)
            
            with rule_path.open("w", encoding="utf-8") as file:
                file.write(new_content)
                file.write(f"\n\n---\n\n*Last Updated: {datetime.now().strftime('%Y-%m-%d')}*\n")
                file.write("*Generated via automated Claude CLI rule updater*\n")
            
            print(f"✅ Successfully updated: {rule_path}")
            return True
            
        except Exception as error:
            print(f"❌ Failed to write rule file for {technology}: {error}", file=sys.stderr)
            return False
    
    def update_all_technologies(self) -> Dict[str, bool]:
        """Update rules for all configured technologies.
        
        Returns:
            Dictionary mapping technology names to success status
        """
        print("🚀 Starting automated rule update process...")
        print(f"📂 Project root: {self.project_root}")
        print(f"📁 Rules directory: {self.rules_dir}")
        print(f"🔧 Technologies: {', '.join(self.config.technologies)}")
        
        results: Dict[str, bool] = {}
        
        for technology in self.config.technologies:
            results[technology] = self.update_single_technology(technology)
        
        # Print summary
        successful = sum(results.values())
        total = len(results)
        
        print(f"\n📊 Update Summary:")
        print(f"✅ Successful: {successful}/{total}")
        print(f"❌ Failed: {total - successful}/{total}")
        
        for tech, success in results.items():
            status = "✅" if success else "❌"
            print(f"  {status} {tech}")
        
        return results


def main() -> None:
    """Main entry point for rule updater script."""
    updater = RuleUpdater()
    
    # Check if Claude CLI is available
    if not updater._check_claude_available():
        print("❌ Error: Claude CLI not found or not working", file=sys.stderr)
        print("Please ensure Claude Code is installed and accessible via 'claude' command", file=sys.stderr)
        sys.exit(1)
    
    # Handle command line arguments
    if len(sys.argv) > 1:
        # Update specific technology
        technology = sys.argv[1]
        if technology in updater.config.technologies:
            success = updater.update_single_technology(technology)
            sys.exit(0 if success else 1)
        else:
            print(f"❌ Error: Unknown technology '{technology}'", file=sys.stderr)
            print(f"Available: {', '.join(updater.config.technologies)}", file=sys.stderr)
            sys.exit(1)
    else:
        # Update all technologies
        results = updater.update_all_technologies()
        failed_count = sum(1 for success in results.values() if not success)
        sys.exit(failed_count)  # Exit with number of failures


if __name__ == "__main__":
    main()