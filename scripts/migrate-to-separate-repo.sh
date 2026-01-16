#!/bin/bash
#
# Migrate Instance to Separate Repository
# Moves code from instance/output/ to separate /projects/ directory
#

set -e

INSTANCE_DIR="${1}"
PROJECT_NAME="${2}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [[ -z "$INSTANCE_DIR" ]]; then
    echo -e "${RED}Usage: $0 <instance-dir> [project-name]${NC}"
    echo ""
    echo "Example:"
    echo "  $0 \"/Users/alexander/claude-managers/Real estate agent CRM\""
    echo "  $0 \"/Users/alexander/claude-managers/connection app\" connection-app"
    exit 1
fi

if [[ ! -d "$INSTANCE_DIR" ]]; then
    echo -e "${RED}Error: Instance directory not found: $INSTANCE_DIR${NC}"
    exit 1
fi

# Auto-generate project name from instance name if not provided
if [[ -z "$PROJECT_NAME" ]]; then
    INSTANCE_NAME=$(basename "$INSTANCE_DIR")
    PROJECT_NAME=$(echo "$INSTANCE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
fi

OUTPUT_DIR="$INSTANCE_DIR/output"
PROJECTS_DIR="/Users/alexander/projects"
PROJECT_PATH="$PROJECTS_DIR/$PROJECT_NAME"

echo -e "${BLUE}=== Migrating to Separate Repository ===${NC}"
echo ""
echo "Instance: $INSTANCE_DIR"
echo "Output:   $OUTPUT_DIR"
echo "→ Moving to: $PROJECT_PATH"
echo ""

# Check if output directory exists
if [[ ! -d "$OUTPUT_DIR" ]]; then
    echo -e "${YELLOW}No output/ directory found. Nothing to migrate.${NC}"
    exit 0
fi

# Check if output has any files
if [[ -z "$(ls -A "$OUTPUT_DIR")" ]]; then
    echo -e "${YELLOW}Output directory is empty. Nothing to migrate.${NC}"
    exit 0
fi

# Stop the instance if running
echo -e "${YELLOW}Stopping instance if running...${NC}"
if [[ -f "$INSTANCE_DIR/scripts/orchestrator.sh" ]]; then
    "$INSTANCE_DIR/scripts/orchestrator.sh" stop 2>/dev/null || true
fi

# Create projects directory
mkdir -p "$PROJECTS_DIR"

# Check if project path already exists
if [[ -d "$PROJECT_PATH" ]]; then
    echo -e "${RED}Error: Project directory already exists: $PROJECT_PATH${NC}"
    echo "Please remove it first or choose a different name."
    exit 1
fi

# Move code to project directory
echo -e "${GREEN}Moving code to project directory...${NC}"
mv "$OUTPUT_DIR" "$PROJECT_PATH"

# Initialize git repository
echo -e "${GREEN}Initializing git repository...${NC}"
cd "$PROJECT_PATH"
git init

# Create .gitignore
if [[ ! -f ".gitignore" ]]; then
    cat > .gitignore <<'EOF'
# Dependencies
node_modules/
vendor/

# Build outputs
.next/
build/
dist/
*.xcodeproj/xcuserdata/
*.xcworkspace/xcuserdata/
DerivedData/

# Environment
.env
.env.local

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# Testing
coverage/
.nyc_output/
EOF
fi

# Initial commit
git add .
git commit -m "Initial commit (migrated from claude-manager)" --author="Claude Worker <claude@anthropic.com>"

# Update instance config.json
CONFIG_FILE="$INSTANCE_DIR/config.json"
if [[ -f "$CONFIG_FILE" ]]; then
    echo -e "${GREEN}Updating config.json...${NC}"

    # Add projectPath to config
    if command -v jq &> /dev/null; then
        jq --arg path "$PROJECT_PATH" '. + {projectPath: $path}' "$CONFIG_FILE" > "$CONFIG_FILE.tmp"
        mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    else
        echo -e "${YELLOW}jq not found. Please manually add to config.json:${NC}"
        echo "  \"projectPath\": \"$PROJECT_PATH\""
    fi
fi

# Create symlink for convenience (optional)
ln -s "$PROJECT_PATH" "$INSTANCE_DIR/project" 2>/dev/null || true

echo ""
echo -e "${GREEN}✓ Migration complete!${NC}"
echo ""
echo "Project code: $PROJECT_PATH"
echo "Git initialized: Yes"
echo "Initial commit: Yes"
echo ""
echo "Next steps:"
echo "  1. cd \"$PROJECT_PATH\""
echo "  2. git remote add origin https://github.com/yourusername/$PROJECT_NAME.git"
echo "  3. git push -u origin main"
echo ""
echo "Or restart the instance:"
echo "  cd \"$INSTANCE_DIR\""
echo "  ./scripts/orchestrator.sh start"
echo ""
