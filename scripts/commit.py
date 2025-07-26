#!/usr/bin/env python3
"""
Simple commit script for TeleDrive development.
Commits changes with a descriptive message but does not push to remote.
"""

import subprocess
import sys
from datetime import datetime


def run_command(command, check=True):
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, check=check
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(f"Error: {e.stderr}")
        return None


def get_git_status():
    """Get current git status."""
    return run_command("git status --porcelain")


def commit_changes():
    """Commit all changes with a descriptive message."""
    print("🔍 Checking git status...")
    
    status = get_git_status()
    if not status:
        print("✅ No changes to commit.")
        return
    
    print("📝 Changes detected:")
    print(run_command("git status --short"))
    
    # Add all changes
    print("\n📦 Adding all changes...")
    run_command("git add .")
    
    # Create commit message
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    commit_message = f"feat: major UI overhaul with Google Drive design - {timestamp}"
    
    # Extended commit message
    extended_message = f"""feat: major UI overhaul with Google Drive design

- Complete redesign with Google Drive-inspired interface
- Improved file cards with proper icons and layout
- Enhanced drag and drop functionality with visual feedback
- Added loading states and smooth animations
- Restructured project following international standards
- Removed redundant CSS and JS files
- Added comprehensive testing framework
- Improved documentation and development tools
- Enhanced accessibility with ARIA labels
- Mobile-responsive design improvements

Technical improvements:
- Consolidated CSS into single gdrive.css file
- Enhanced JavaScript with modern ES6+ features
- Added proper error handling and user feedback
- Implemented keyboard shortcuts and navigation
- Added development tools (Makefile, pre-commit hooks)
- Created comprehensive test suite structure

Files changed: UI components, CSS/JS assets, documentation, project structure

Timestamp: {timestamp}
"""
    
    # Commit changes
    print(f"\n💾 Committing changes with message:")
    print(f"'{commit_message}'")
    
    # Use the extended message for the actual commit
    result = run_command(f'git commit -m "{extended_message}"')
    
    if result is not None:
        print("✅ Changes committed successfully!")
        print("\n📊 Commit summary:")
        print(run_command("git log --oneline -1"))
        
        print("\n📋 Note: Changes have been committed locally.")
        print("💡 To push to remote repository, run: git push origin main")
        print("🔍 To view changes, run: git show HEAD")
    else:
        print("❌ Failed to commit changes.")
        sys.exit(1)


def main():
    """Main function."""
    print("🚀 TeleDrive Commit Script")
    print("=" * 50)
    
    # Check if we're in a git repository
    if not run_command("git rev-parse --git-dir", check=False):
        print("❌ Not in a git repository!")
        sys.exit(1)
    
    # Check git configuration
    user_name = run_command("git config user.name", check=False)
    user_email = run_command("git config user.email", check=False)
    
    if not user_name or not user_email:
        print("⚠️  Git user not configured. Please run:")
        print("   git config --global user.name 'Your Name'")
        print("   git config --global user.email 'your.email@example.com'")
        sys.exit(1)
    
    print(f"👤 Git user: {user_name} <{user_email}>")
    
    # Commit changes
    commit_changes()
    
    print("\n🎉 All done!")


if __name__ == "__main__":
    main()
