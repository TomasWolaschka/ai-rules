#!/usr/bin/env python3
"""
AI Rules Hooks Setup Script

Automated setup for the AI Rules Hooks system. This script:
1. Configures Claude Code hooks
2. Installs dependencies
3. Sets up the project structure
4. Validates the installation

Following Python best practices (2024-2025):
- Type hints for all functions
- f-string formatting
- Pathlib for file operations  
- Proper error handling
- User-friendly output
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional

from pydantic import BaseModel


class ClaudeConfig(BaseModel):
    """Claude Code configuration structure."""
    
    hooks: Dict[str, List[Dict]] = {}


class SetupManager:
    """Manages the setup process for AI Rules Hooks."""
    
    def __init__(self) -> None:
        """Initialize setup manager."""
        self.project_root = Path(__file__).parent.parent
        self.claude_config_path = None
        self.installation_scope = None
        
    def _get_user_preferences(self) -> None:
        """Get user preferences for installation."""
        print("🛠️  AI Rules Hooks Setup Configuration")
        print("=" * 50)
        
        # Ask about Claude version
        print("\n📋 Which Claude application do you want to configure?")
        print("1. Claude Code CLI (supports hooks) - Recommended")
        print("2. Claude Desktop (MCP servers only)")
        
        while True:
            choice = input("\nEnter choice (1-2): ").strip()
            if choice in ["1", "2"]:
                break
            print("Please enter 1 or 2")
        
        # Ask about installation scope
        print("\n📁 Installation scope:")
        print("1. User-wide (recommended) - Affects your user account")
        print("2. Local project only - Only for this project directory")
        
        while True:
            scope_choice = input("Enter choice (1-2): ").strip()
            if scope_choice in ["1", "2"]:
                break
            print("Please enter 1 or 2")
        
        # Set configuration based on choices
        if choice == "1":  # Claude Code
            self.claude_config_path = Path.home() / ".claude" / "settings.json"
            self.installation_scope = "user" if scope_choice == "1" else "local"
        else:  # Claude Desktop
            print("\n❌ Claude Desktop does not support hooks.")
            print("   Claude Desktop only supports MCP servers.")
            print("   This tool requires hook functionality.")
            print("   Please install Claude Code CLI instead:")
            print("   https://github.com/anthropics/claude-code")
            sys.exit(1)
        
        print(f"\n✅ Configuration:")
        print(f"   • Target: Claude Code CLI")
        print(f"   • Scope: {self.installation_scope}")
        print(f"   • Config file: {self.claude_config_path}")
        print("")
    
    def _find_claude_config_path(self) -> Path:
        """Find Claude Code configuration file location.
        
        Returns:
            Path to Claude Code settings.json file
        """
        # Claude Code uses ~/.claude/settings.json for hooks configuration
        return Path.home() / ".claude" / "settings.json"
    
    def check_dependencies(self) -> bool:
        """Check if required dependencies are available.
        
        Returns:
            True if all dependencies are available
        """
        print("🔍 Checking dependencies...")
        
        # Check Python version
        if sys.version_info < (3, 9):
            print(f"❌ Python 3.9+ required, found {sys.version_info.major}.{sys.version_info.minor}")
            return False
        
        print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
        
        # Check Claude Code CLI
        try:
            result = subprocess.run(
                ["claude", "--version"], 
                capture_output=True, 
                text=True, 
                check=True,
                timeout=10
            )
            print("✅ Claude Code CLI available")
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            print("❌ Claude Code CLI not found")
            print("   Please install Claude Code: https://github.com/anthropics/claude-code")
            return False
        
        return True
    
    def install_python_dependencies(self) -> bool:
        """Install Python dependencies.
        
        Returns:
            True if installation successful
        """
        print("📦 Installing Python dependencies...")
        
        try:
            requirements_file = self.project_root / "requirements.txt"
            
            subprocess.run([
                sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
            ], check=True, capture_output=True)
            
            print("✅ Dependencies installed successfully")
            return True
            
        except subprocess.CalledProcessError as error:
            print(f"❌ Failed to install dependencies: {error}")
            return False
    
    def setup_project_structure(self) -> bool:
        """Create necessary project directories and files.
        
        Returns:
            True if setup successful
        """
        print("📁 Setting up project structure...")
        
        try:
            # Create directories
            directories = [
                self.project_root / "rules" / "archive",
                self.project_root / "logs",
                self.project_root / "config",
            ]
            
            for directory in directories:
                directory.mkdir(parents=True, exist_ok=True)
            
            print("✅ Project structure created")
            return True
            
        except Exception as error:
            print(f"❌ Failed to create project structure: {error}")
            return False
    
    def configure_claude_hooks(self) -> bool:
        """Configure Claude Code hooks.
        
        Returns:
            True if configuration successful
        """
        print("🪝 Configuring Claude Code hooks...")
        
        try:
            # Load existing configuration or create new
            config_data: Dict = {}
            if self.claude_config_path.exists():
                with self.claude_config_path.open("r", encoding="utf-8") as file:
                    config_data = json.load(file)
            
            # Ensure hooks section exists
            if "hooks" not in config_data:
                config_data["hooks"] = {}
            
            # Configure UserPromptSubmit hook with absolute path
            hook_script_path = str(self.project_root / ".claude" / "hooks" / "rule_injector.py")
            
            # Claude Code hooks structure: hooks.UserPromptSubmit = [hook_config]
            config_data["hooks"]["UserPromptSubmit"] = [{
                "command": ["python", hook_script_path],
                "matcher": ".*"
            }]
            
            # Create config directory if needed
            self.claude_config_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write configuration with proper formatting
            with self.claude_config_path.open("w", encoding="utf-8") as file:
                json.dump(config_data, file, indent=2, ensure_ascii=False)
            
            print(f"✅ Claude Code hooks configured in: {self.claude_config_path}")
            return True
            
        except Exception as error:
            print(f"❌ Failed to configure Claude hooks: {error}")
            return False
    
    def validate_installation(self) -> bool:
        """Validate the installation by testing components.
        
        Returns:
            True if validation successful
        """
        print("🧪 Validating installation...")
        
        try:
            # Test hook script execution
            hook_script = self.project_root / ".claude" / "hooks" / "rule_injector.py"
            if not hook_script.exists():
                print("❌ Hook script not found")
                return False
            
            # Test with dummy environment
            test_env = os.environ.copy()
            test_env["CLAUDE_USER_PROMPT"] = "test python script"
            test_env["CLAUDE_PROJECT_DIR"] = str(self.project_root)
            
            result = subprocess.run([
                sys.executable, str(hook_script)
            ], env=test_env, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                print("✅ Hook script working correctly")
            else:
                print(f"⚠️  Hook script test warning: {result.stderr}")
            
            # Test configuration loading
            config_file = self.project_root / "config" / "rules_config.yaml"
            if config_file.exists():
                print("✅ Configuration file found")
            else:
                print("⚠️  Configuration file not found (using defaults)")
            
            return True
            
        except Exception as error:
            print(f"❌ Validation failed: {error}")
            return False
    
    def print_setup_summary(self) -> None:
        """Print setup completion summary and usage instructions."""
        print("\n" + "=" * 60)
        print("🎉 AI Rules Hooks Setup Complete!")
        print("=" * 60)
        print("\n📋 What was configured:")
        print(f"   • Project root: {self.project_root}")
        print(f"   • Claude Code settings: {self.claude_config_path}")
        print(f"   • Hook script: {self.project_root / '.claude/hooks/rule_injector.py'}")
        print(f"   • Configuration: {self.project_root / 'config/rules_config.yaml'}")
        
        print("\n🚀 Usage:")
        print("   • Rules are now automatically injected into Claude Code!")
        print("   • Customize behavior by editing config/rules_config.yaml")
        print("   • Generate new rules with: python scripts/update_rules.py")
        print("   • Update specific technology: python scripts/update_rules.py python")
        
        print("\n📚 Next steps:")
        print("   1. Test by using Claude Code with technology keywords")
        print("   2. Customize config/rules_config.yaml to your preferences")
        print("   3. Run initial rule generation: python scripts/update_rules.py")
        print("   4. Set up periodic rule updates (cron, scheduled task, etc.)")
        
        print(f"\n📁 Project structure:")
        print(f"   {self.project_root.name}/")
        print(f"   ├── .claude/hooks/rule_injector.py    # Hook script")
        print(f"   ├── config/rules_config.yaml          # Configuration")
        print(f"   ├── scripts/update_rules.py           # Rule generator")
        print(f"   ├── rules/                            # Rule files")
        print(f"   └── README.md                         # Documentation")
    
    def run_setup(self) -> bool:
        """Run the complete setup process.
        
        Returns:
            True if setup successful
        """
        print("🚀 Starting AI Rules Hooks setup...\n")
        
        # Get user preferences first
        self._get_user_preferences()
        
        steps = [
            ("dependencies", self.check_dependencies),
            ("python_deps", self.install_python_dependencies),
            ("project_structure", self.setup_project_structure),
            ("claude_hooks", self.configure_claude_hooks),
            ("validation", self.validate_installation),
        ]
        
        for step_name, step_function in steps:
            if not step_function():
                print(f"\n❌ Setup failed at step: {step_name}")
                return False
            print()  # Add spacing between steps
        
        self.print_setup_summary()
        return True


def main() -> None:
    """Main entry point for setup script."""
    setup_manager = SetupManager()
    
    try:
        success = setup_manager.run_setup()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup interrupted by user")
        sys.exit(1)
    except Exception as error:
        print(f"\n❌ Unexpected error during setup: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()