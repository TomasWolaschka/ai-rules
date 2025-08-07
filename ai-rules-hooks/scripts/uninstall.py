#!/usr/bin/env python3
"""
AI Rules Hooks Uninstallation Script

Safely removes the AI Rules Hooks system components. This script:
1. Removes Claude Code hook configuration
2. Optionally cleans generated project directories
3. Optionally removes Python dependencies
4. Validates successful removal

Following Python best practices (2024-2025):
- Type hints for all functions
- f-string formatting
- Pathlib for file operations  
- Proper error handling
- User-friendly interactive prompts
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional

from pydantic import BaseModel


class UninstallManager:
    """Manages the uninstallation process for AI Rules Hooks."""
    
    def __init__(self) -> None:
        """Initialize uninstall manager."""
        self.project_root = Path(__file__).parent.parent
        self.claude_config_path = Path.home() / ".claude" / "settings.json"
        self.removed_items: List[str] = []
        self.preserved_items: List[str] = []
        
    def _confirm_uninstallation(self) -> bool:
        """Get user confirmation for uninstallation.
        
        Returns:
            True if user confirms uninstallation
        """
        print("🗑️  AI Rules Hooks Uninstallation")
        print("=" * 50)
        print("\n⚠️  This will remove the AI Rules Hooks system from your setup.")
        
        print(f"\n📋 What will be removed:")
        print(f"   • Claude Code hook configuration from: {self.claude_config_path}")
        print(f"   • Generated directories: logs/, rules/archive/")
        
        print(f"\n📋 What will be preserved:")
        print(f"   • Your rule files in rules/")
        print(f"   • Configuration file: config/rules_config.yaml")
        print(f"   • Core project files (.claude/hooks/, scripts/)")
        
        while True:
            choice = input("\nProceed with uninstallation? (y/N): ").strip().lower()
            if choice in ['y', 'yes']:
                return True
            elif choice in ['', 'n', 'no']:
                print("\n✅ Uninstallation cancelled.")
                return False
            print("Please enter 'y' or 'n'")
    
    def _get_removal_options(self) -> Dict[str, bool]:
        """Get user preferences for what to remove.
        
        Returns:
            Dictionary of removal options
        """
        options = {}
        
        print("\n🛠️  Removal Options:")
        
        # Ask about generated directories
        while True:
            choice = input("Remove generated directories (logs/, rules/archive/)? (Y/n): ").strip().lower()
            if choice in ['', 'y', 'yes']:
                options['directories'] = True
                break
            elif choice in ['n', 'no']:
                options['directories'] = False
                break
            print("Please enter 'y' or 'n'")
        
        # Ask about Python dependencies
        while True:
            choice = input("Remove Python dependencies (pyyaml, pydantic)? (y/N): ").strip().lower()
            if choice in ['y', 'yes']:
                options['dependencies'] = True
                break
            elif choice in ['', 'n', 'no']:
                options['dependencies'] = False
                break
            print("Please enter 'y' or 'n'")
        
        return options
    
    def remove_claude_configuration(self) -> bool:
        """Remove Claude Code hook configuration.
        
        Returns:
            True if removal successful or config didn't exist
        """
        print("🪝 Removing Claude Code hook configuration...")
        
        if not self.claude_config_path.exists():
            print("ℹ️  Claude configuration file doesn't exist - nothing to remove")
            self.preserved_items.append("Claude config (didn't exist)")
            return True
        
        try:
            # Load existing configuration
            with self.claude_config_path.open("r", encoding="utf-8") as file:
                config_data: Dict = json.load(file)
            
            # Remove our hook if it exists
            hooks_section = config_data.get("hooks", {})
            user_prompt_hooks = hooks_section.get("UserPromptSubmit", [])
            
            # Find and remove our hook (look for rule_injector.py in command)
            original_count = len(user_prompt_hooks)
            filtered_hooks = []
            
            for hook in user_prompt_hooks:
                command = hook.get("command", [])
                if isinstance(command, list) and len(command) >= 2:
                    if "rule_injector.py" not in command[1]:
                        filtered_hooks.append(hook)
                else:
                    filtered_hooks.append(hook)
            
            # Update configuration
            if filtered_hooks != user_prompt_hooks:
                if filtered_hooks:
                    config_data["hooks"]["UserPromptSubmit"] = filtered_hooks
                else:
                    # Remove UserPromptSubmit entirely if empty
                    config_data["hooks"].pop("UserPromptSubmit", None)
                    
                    # Remove hooks section if completely empty
                    if not config_data["hooks"]:
                        config_data.pop("hooks", None)
                
                # Write updated configuration
                with self.claude_config_path.open("w", encoding="utf-8") as file:
                    json.dump(config_data, file, indent=2, ensure_ascii=False)
                
                removed_count = original_count - len(filtered_hooks)
                print(f"✅ Removed {removed_count} AI Rules hook(s) from Claude configuration")
                self.removed_items.append(f"Claude Code hooks ({removed_count} hooks)")
            else:
                print("ℹ️  No AI Rules hooks found in Claude configuration")
                self.preserved_items.append("Claude config (no AI Rules hooks found)")
            
            return True
            
        except json.JSONDecodeError as error:
            print(f"❌ Failed to parse Claude configuration: {error}")
            return False
        except Exception as error:
            print(f"❌ Failed to update Claude configuration: {error}")
            return False
    
    def remove_generated_directories(self) -> bool:
        """Remove generated project directories.
        
        Returns:
            True if removal successful
        """
        print("📁 Removing generated directories...")
        
        directories_to_remove = [
            self.project_root / "logs",
            self.project_root / "rules" / "archive"
        ]
        
        removed_count = 0
        for directory in directories_to_remove:
            if directory.exists():
                try:
                    # Remove directory and contents
                    import shutil
                    shutil.rmtree(directory)
                    print(f"✅ Removed directory: {directory.relative_to(self.project_root)}")
                    removed_count += 1
                except Exception as error:
                    print(f"⚠️  Failed to remove {directory}: {error}")
            else:
                print(f"ℹ️  Directory doesn't exist: {directory.relative_to(self.project_root)}")
        
        if removed_count > 0:
            self.removed_items.append(f"Generated directories ({removed_count} dirs)")
        else:
            self.preserved_items.append("Generated directories (didn't exist)")
        
        return True
    
    def remove_python_dependencies(self) -> bool:
        """Remove Python dependencies installed for AI Rules Hooks.
        
        Returns:
            True if removal successful
        """
        print("📦 Removing Python dependencies...")
        
        dependencies = ["pyyaml", "pydantic"]
        
        try:
            for dependency in dependencies:
                result = subprocess.run([
                    sys.executable, "-m", "pip", "uninstall", dependency, "-y"
                ], capture_output=True, text=True)
                
                if result.returncode == 0:
                    print(f"✅ Removed {dependency}")
                else:
                    # Check if it was because package wasn't installed
                    if "not installed" in result.stdout.lower() or "not installed" in result.stderr.lower():
                        print(f"ℹ️  {dependency} was not installed")
                    else:
                        print(f"⚠️  Failed to remove {dependency}: {result.stderr}")
            
            self.removed_items.append(f"Python dependencies ({len(dependencies)} packages)")
            return True
            
        except Exception as error:
            print(f"❌ Failed to remove Python dependencies: {error}")
            return False
    
    def validate_removal(self) -> bool:
        """Validate that components were successfully removed.
        
        Returns:
            True if validation successful
        """
        print("🧪 Validating removal...")
        
        validation_passed = True
        
        # Check Claude configuration
        if self.claude_config_path.exists():
            try:
                with self.claude_config_path.open("r", encoding="utf-8") as file:
                    config_data = json.load(file)
                
                user_prompt_hooks = config_data.get("hooks", {}).get("UserPromptSubmit", [])
                ai_rules_hooks = [
                    hook for hook in user_prompt_hooks 
                    if isinstance(hook.get("command"), list) and 
                       len(hook["command"]) >= 2 and 
                       "rule_injector.py" in hook["command"][1]
                ]
                
                if ai_rules_hooks:
                    print("⚠️  AI Rules hooks still found in Claude configuration")
                    validation_passed = False
                else:
                    print("✅ No AI Rules hooks found in Claude configuration")
                    
            except Exception as error:
                print(f"⚠️  Could not validate Claude configuration: {error}")
        else:
            print("✅ Claude configuration file doesn't exist")
        
        # Check for generated directories
        generated_dirs = [
            self.project_root / "logs",
            self.project_root / "rules" / "archive"
        ]
        
        remaining_dirs = [d for d in generated_dirs if d.exists()]
        if remaining_dirs:
            print(f"ℹ️  Some generated directories still exist: {[d.name for d in remaining_dirs]}")
        else:
            print("✅ No generated directories remain")
        
        return validation_passed
    
    def print_removal_summary(self) -> None:
        """Print removal completion summary."""
        print("\n" + "=" * 60)
        print("🎉 AI Rules Hooks Uninstallation Complete!")
        print("=" * 60)
        
        if self.removed_items:
            print(f"\n🗑️  Removed:")
            for item in self.removed_items:
                print(f"   • {item}")
        
        if self.preserved_items:
            print(f"\n📋 Preserved:")
            for item in self.preserved_items:
                print(f"   • {item}")
        
        print(f"\n📁 Remaining project structure:")
        preserved_items = [
            ".claude/hooks/rule_injector.py",
            "config/rules_config.yaml", 
            "scripts/",
            "rules/ (your rule files)",
            "pyproject.toml",
            "requirements.txt"
        ]
        
        for item in preserved_items:
            print(f"   • {item}")
        
        print(f"\n💡 To completely remove AI Rules Hooks:")
        print(f"   • Delete the entire project directory: {self.project_root}")
        print(f"   • Remove any remaining Python dependencies manually if needed")
        
        print(f"\n✅ AI Rules Hooks has been successfully uninstalled!")
        print(f"   Claude Code will no longer automatically inject rules.")
    
    def run_uninstall(self) -> bool:
        """Run the complete uninstallation process.
        
        Returns:
            True if uninstallation successful
        """
        # Get user confirmation
        if not self._confirm_uninstallation():
            return False
        
        # Get removal preferences
        options = self._get_removal_options()
        
        print("\n🚀 Starting uninstallation...\n")
        
        # Core removal steps
        steps = [
            ("claude_config", self.remove_claude_configuration)
        ]
        
        # Optional removal steps based on user preferences
        if options.get('directories', False):
            steps.append(("directories", self.remove_generated_directories))
        
        if options.get('dependencies', False):
            steps.append(("python_deps", self.remove_python_dependencies))
        
        # Add validation step
        steps.append(("validation", self.validate_removal))
        
        # Execute steps
        for step_name, step_function in steps:
            if not step_function():
                print(f"\n⚠️  Uninstallation had issues at step: {step_name}")
                print("Some components may not have been fully removed.")
            print()  # Add spacing between steps
        
        self.print_removal_summary()
        return True


def main() -> None:
    """Main entry point for uninstall script."""
    uninstall_manager = UninstallManager()
    
    try:
        success = uninstall_manager.run_uninstall()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Uninstallation interrupted by user")
        sys.exit(1)
    except Exception as error:
        print(f"\n❌ Unexpected error during uninstallation: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()