#!/bin/bash
#
# PRD to Tasks Converter
# Converts large PRD .md files into bite-sized tasks.json
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${1:-.}"

PRDS_DIR="$PROJECT_ROOT/prds"
TASKS_FILE="$PRDS_DIR/tasks.json"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== PRD to Tasks Converter ===${NC}"
echo ""

if [[ ! -d "$PRDS_DIR" ]]; then
    echo -e "${YELLOW}No prds directory found at: $PRDS_DIR${NC}"
    exit 1
fi

# Check for existing .md PRD files
md_files=$(find "$PRDS_DIR" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

if [[ $md_files -eq 0 ]]; then
    echo -e "${YELLOW}No .md PRD files found. Creating example tasks.json...${NC}"
    cat > "$TASKS_FILE" <<'EOF'
{
  "projectName": "My Project",
  "description": "Project description",
  "tasks": [
    {
      "id": "1",
      "title": "Setup project structure",
      "description": "Create the basic folder structure and configuration files",
      "acceptanceCriteria": "Project has src/, tests/, and config/ directories with necessary files",
      "status": "pending",
      "estimatedIterations": 1,
      "dependencies": [],
      "createdAt": null,
      "startedAt": null,
      "completedAt": null
    },
    {
      "id": "2",
      "title": "Implement core feature",
      "description": "Build the main functionality",
      "acceptanceCriteria": "Feature works as expected with proper error handling",
      "status": "pending",
      "estimatedIterations": 3,
      "dependencies": ["1"],
      "createdAt": null,
      "startedAt": null,
      "completedAt": null
    }
  ]
}
EOF
    echo -e "${GREEN}✓ Created example tasks.json at: $TASKS_FILE${NC}"
    echo ""
    echo "Edit this file with your actual tasks!"
    exit 0
fi

# Found PRD files - help user convert them
echo -e "Found $md_files PRD file(s). Let me help you convert them to tasks.json..."
echo ""
echo "I'll send each PRD to Claude to break it down into bite-sized tasks."
echo ""

# Combine all PRDs
combined_prds=""
for prd in "$PRDS_DIR"/*.md; do
    if [[ -f "$prd" ]]; then
        echo "Reading: $(basename "$prd")"
        combined_prds+="## PRD: $(basename "$prd")"$'\n\n'
        combined_prds+="$(cat "$prd")"$'\n\n'
    fi
done

# Create conversion prompt
prompt=$(cat <<EOF
You are helping convert large PRD files into bite-sized tasks for a task-based development system.

# Input PRDs:
$combined_prds

# Your Task:
Break down these PRDs into small, actionable tasks that can be completed in 1-3 iterations each.

# Output Format (JSON):
\`\`\`json
{
  "projectName": "Project Name Here",
  "description": "Brief project description",
  "tasks": [
    {
      "id": "1",
      "title": "Task title (concise)",
      "description": "What needs to be done in 2-3 sentences",
      "acceptanceCriteria": "How to verify it's complete",
      "status": "pending",
      "estimatedIterations": 1,
      "dependencies": [],
      "createdAt": null,
      "startedAt": null,
      "completedAt": null
    }
  ]
}
\`\`\`

# Guidelines:
- Each task should be small and focused (1 file or 1 feature)
- Order tasks logically (dependencies first)
- Use clear, actionable titles
- Include specific acceptance criteria
- Aim for 10-30 tasks total

Generate the tasks.json now:
EOF
)

echo ""
echo -e "${BLUE}Sending to Claude for conversion...${NC}"
echo ""

# Call Claude
if echo "$prompt" | claude -m haiku > /tmp/tasks_conversion.txt 2>&1; then
    # Extract JSON from response
    if grep -q '```json' /tmp/tasks_conversion.txt; then
        sed -n '/```json/,/```/p' /tmp/tasks_conversion.txt | sed '1d;$d' > "$TASKS_FILE"

        # Validate JSON
        if jq empty "$TASKS_FILE" 2>/dev/null; then
            echo -e "${GREEN}✓ Successfully created tasks.json!${NC}"
            echo ""

            # Show summary
            total=$(jq '.tasks | length' "$TASKS_FILE")
            echo "Total tasks created: $total"
            echo ""
            echo "Preview of first 3 tasks:"
            jq -r '.tasks[0:3][] | "  [\(.id)] \(.title)"' "$TASKS_FILE"
            echo ""
            echo -e "${GREEN}Ready to start! Run: ./scripts/orchestrator.sh start${NC}"
        else
            echo -e "${YELLOW}Warning: Generated JSON is invalid. Please check: $TASKS_FILE${NC}"
        fi
    else
        echo -e "${YELLOW}Could not extract JSON from Claude's response.${NC}"
        echo "Response saved to: /tmp/tasks_conversion.txt"
    fi
else
    echo -e "${YELLOW}Claude invocation failed. Creating manual template instead...${NC}"
    cat > "$TASKS_FILE" <<'EOF'
{
  "projectName": "Your Project",
  "description": "Manually edit this file with your tasks",
  "tasks": [
    {
      "id": "1",
      "title": "Setup project",
      "description": "Initialize the project structure",
      "acceptanceCriteria": "Project structure created",
      "status": "pending",
      "estimatedIterations": 1,
      "dependencies": [],
      "createdAt": null,
      "startedAt": null,
      "completedAt": null
    }
  ]
}
EOF
    echo -e "${GREEN}Created template at: $TASKS_FILE${NC}"
fi
