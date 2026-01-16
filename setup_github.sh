#!/bin/bash
#
# Setup script to initialize git and push to GitHub
# Run this after accepting the Xcode license with: sudo xcodebuild -license
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REPO_NAME="claude-manager-worker"

echo "Initializing git repository..."
git init

echo "Adding files..."
git add -A

echo "Creating initial commit..."
git commit -m "Initial commit: Claude Manager-Worker System

A dual-Claude architecture for autonomous PRD implementation:
- Worker Claude: Implements PRDs in a Ralph Wiggum style loop
- Manager Claude: Reviews work, red teams, generates skill files

Features:
- Bash-based orchestration
- File-based state management
- Skill file generation for continuous improvement
- Quality oversight and accountability

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

echo "Creating GitHub repository..."
gh repo create "$REPO_NAME" --public --description "Autonomous PRD implementation system with Manager/Worker Claude architecture using the Ralph Wiggum technique" --source=. --remote=origin --push

echo ""
echo "Done! Your repository is available at:"
gh repo view --web 2>/dev/null || echo "https://github.com/$(gh api user -q .login)/$REPO_NAME"
