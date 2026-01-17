#!/bin/bash
#
# Worker Claude - The Task Implementation Loop
# Part of the Claude Manager-Worker System
#
# This script runs Worker Claude in a loop, processing tasks from tasks.json
# one at a time until all are marked as completed.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANCE_ROOT="$(dirname "$SCRIPT_DIR")"

# Read config to get project path
CONFIG_FILE="$INSTANCE_ROOT/config.json"
if [[ -f "$CONFIG_FILE" ]] && command -v jq &> /dev/null; then
    PROJECT_PATH=$(jq -r '.projectPath // empty' "$CONFIG_FILE" 2>/dev/null)
fi

# Default to output/ if no projectPath set (backward compatibility)
PROJECT_PATH="${PROJECT_PATH:-$INSTANCE_ROOT/output}"

# Configuration
MAX_ITERATIONS="${MAX_ITERATIONS:-999}"
WORKER_MODEL="${WORKER_MODEL:-opus}"
ITERATION_DELAY="${ITERATION_DELAY:-5}"
LOG_FILE="$INSTANCE_ROOT/logs/worker_$(date +%Y%m%d_%H%M%S).log"

# State files (in instance directory)
STATE_DIR="$INSTANCE_ROOT/.state"
ITERATION_FILE="$STATE_DIR/worker_iteration"
STATUS_FILE="$STATE_DIR/worker_status"
TASKS_FILE="$INSTANCE_ROOT/prds/tasks.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$*"; }
log_warn() { log "${YELLOW}WARN${NC}" "$*"; }
log_error() { log "${RED}ERROR${NC}" "$*"; }
log_success() { log "${GREEN}SUCCESS${NC}" "$*"; }

init_state() {
    # Instance directories
    mkdir -p "$STATE_DIR"
    mkdir -p "$INSTANCE_ROOT/logs"
    mkdir -p "$INSTANCE_ROOT/prds"

    # Project directory
    mkdir -p "$PROJECT_PATH"

    if [[ ! -f "$ITERATION_FILE" ]]; then
        echo "0" > "$ITERATION_FILE"
    fi

    echo "running" > "$STATUS_FILE"

    # Create default tasks.json if it doesn't exist
    if [[ ! -f "$TASKS_FILE" ]]; then
        log_warn "No tasks.json found. Creating empty tasks file."
        echo '{"tasks": []}' > "$TASKS_FILE"
    fi

    log_info "Instance: $INSTANCE_ROOT"
    log_info "Project: $PROJECT_PATH"
}

get_iteration() {
    cat "$ITERATION_FILE" 2>/dev/null || echo "0"
}

increment_iteration() {
    local current=$(get_iteration)
    echo $((current + 1)) > "$ITERATION_FILE"
}

get_next_task() {
    # Find first task with status "pending" or "in_progress"
    if [[ ! -f "$TASKS_FILE" ]]; then
        return 1
    fi

    local task=$(jq -r '.tasks[] | select(.status == "pending" or .status == "in_progress") | @json' "$TASKS_FILE" 2>/dev/null | head -n 1)

    if [[ -n "$task" && "$task" != "null" ]]; then
        echo "$task"
        return 0
    fi

    return 1
}

mark_task_in_progress() {
    local task_id="$1"

    jq --arg id "$task_id" \
       '(.tasks[] | select(.id == $id) | .status) = "in_progress" |
        (.tasks[] | select(.id == $id) | .startedAt) = (now | strftime("%Y-%m-%dT%H:%M:%SZ"))' \
       "$TASKS_FILE" > "$TASKS_FILE.tmp" && mv "$TASKS_FILE.tmp" "$TASKS_FILE"
}

mark_task_completed() {
    local task_id="$1"

    jq --arg id "$task_id" \
       '(.tasks[] | select(.id == $id) | .status) = "completed" |
        (.tasks[] | select(.id == $id) | .completedAt) = (now | strftime("%Y-%m-%dT%H:%M:%SZ"))' \
       "$TASKS_FILE" > "$TASKS_FILE.tmp" && mv "$TASKS_FILE.tmp" "$TASKS_FILE"

    log_success "✓ Task $task_id completed!"
}

get_all_tasks_summary() {
    if [[ ! -f "$TASKS_FILE" ]]; then
        echo "No tasks file found"
        return
    fi

    local total=$(jq '.tasks | length' "$TASKS_FILE")
    local completed=$(jq '[.tasks[] | select(.status == "completed")] | length' "$TASKS_FILE")
    local in_progress=$(jq '[.tasks[] | select(.status == "in_progress")] | length' "$TASKS_FILE")
    local pending=$(jq '[.tasks[] | select(.status == "pending")] | length' "$TASKS_FILE")

    cat <<EOF
Total Tasks: $total
Completed: $completed
In Progress: $in_progress
Pending: $pending
EOF
}

load_skills() {
    # Load any skill files created by Manager Claude
    local skills_dir="$PROJECT_ROOT/skills"
    local skills_content=""

    if [[ -d "$skills_dir" ]] && ls "$skills_dir"/*.md 1> /dev/null 2>&1; then
        skills_content+="## Available Skills"$'\n\n'
        for skill in "$skills_dir"/*.md; do
            skills_content+="### $(basename "$skill" .md)"$'\n'
            skills_content+="$(cat "$skill")"$'\n\n'
        done
    else
        skills_content="No skills loaded yet."
    fi

    echo "$skills_content"
}

build_worker_prompt() {
    local task_json="$1"
    local iteration=$(get_iteration)
    local skills=$(load_skills)

    # Parse task details
    local task_id=$(echo "$task_json" | jq -r '.id')
    local task_title=$(echo "$task_json" | jq -r '.title')
    local task_description=$(echo "$task_json" | jq -r '.description')
    local task_acceptance=$(echo "$task_json" | jq -r '.acceptanceCriteria // "None specified"')

    # Get context from previous work
    local previous_work=""
    if [[ -f "$PROJECT_PATH/PROGRESS.md" ]]; then
        previous_work=$(cat "$PROJECT_PATH/PROGRESS.md")
    fi

    # Get summary of all tasks
    local tasks_summary=$(jq -r '.tasks[] | "[\(.status)] Task \(.id): \(.title)"' "$TASKS_FILE")

    cat <<EOF
# Worker Claude - Task Implementation Session

## Iteration: $iteration

## Your Role
You are Worker Claude, an autonomous development agent implementing a project task-by-task.
Each iteration, you work on ONE task from tasks.json. Your job is to complete it fully before moving on.

$skills

## All Tasks Overview
\`\`\`
$tasks_summary
\`\`\`

## Current Task (ID: $task_id)
**Title:** $task_title

**Description:**
$task_description

**Acceptance Criteria:**
$task_acceptance

## Previous Work Context
$previous_work

## Your Tasks This Iteration
1. **Read Context**: Check $PROJECT_PATH/ for existing code and PROGRESS.md
2. **Implement**: Complete the current task fully
3. **Test**: Validate your implementation works
4. **Update Progress**: Update $PROJECT_PATH/PROGRESS.md with what you did
5. **Mark Complete**: When done, create a file: $STATE_DIR/TASK_${task_id}_COMPLETE

## Output Location
- **Project Code**: \`$PROJECT_PATH/\` (write ALL code here)
- **Progress**: \`$PROJECT_PATH/PROGRESS.md\`
- **Completion signal**: \`$STATE_DIR/TASK_${task_id}_COMPLETE\`

## Important
- Write ALL source code to: $PROJECT_PATH/
- This is a separate directory that will be its own git repository
- Keep it clean - only project files, no orchestration files

## Important Rules
- Focus ONLY on the current task - don't work ahead
- Write production-ready code with error handling
- Update PROGRESS.md so next iteration knows what you did
- When task is complete, create the TASK_COMPLETE file
- Manager Claude will review your work

## Completion Signal
When you finish this task, create: \`$STATE_DIR/TASK_${task_id}_COMPLETE\`
Inside, write a brief summary of what you implemented.

Now begin working on Task $task_id.
EOF
}

run_iteration() {
    local iteration=$(get_iteration)

    log_info "=== Iteration $iteration ==="

    # Get next task
    local task_json=$(get_next_task)
    if [[ -z "$task_json" ]]; then
        log_success "🎉 All tasks completed!"
        echo "completed" > "$STATUS_FILE"
        return 1
    fi

    local task_id=$(echo "$task_json" | jq -r '.id')
    local task_title=$(echo "$task_json" | jq -r '.title')

    log_info "Working on Task $task_id: $task_title"

    # Mark task as in progress
    mark_task_in_progress "$task_id"

    # Build prompt
    local prompt=$(build_worker_prompt "$task_json")

    # Run Claude
    log_info "Invoking Claude ($WORKER_MODEL)..."

    local output_file="$INSTANCE_ROOT/logs/iteration_${iteration}_task_${task_id}.md"
    local prompt_file="$STATE_DIR/prompt_${iteration}.txt"

    # Save prompt to file
    echo "$prompt" > "$prompt_file"

    # Run Claude interactively (allows tool use) with prompt from file, bypass permissions
    cd "$PROJECT_PATH" && echo "$prompt" | claude --model "$WORKER_MODEL" \
        --dangerously-skip-permissions \
        --add-dir "$PROJECT_PATH" \
        --add-dir "$INSTANCE_ROOT" \
        --add-dir "$STATE_DIR" \
        > "$output_file" 2>&1

    local claude_exit_code=$?

    if [ $claude_exit_code -ne 0 ]; then
        log_error "Claude invocation failed with exit code $claude_exit_code"
        return 1
    fi

    # Check if task was completed
    local complete_file="$STATE_DIR/TASK_${task_id}_COMPLETE"
    if [[ -f "$complete_file" ]]; then
        mark_task_completed "$task_id"
        rm "$complete_file"
    fi

    increment_iteration

    return 0
}

main() {
    init_state

    log_info "Worker Claude starting..."
    log_info "Model: $WORKER_MODEL"
    log_info "Max Iterations: $MAX_ITERATIONS"
    log_info "Tasks File: $TASKS_FILE"
    echo ""

    local iteration=0
    while [[ $iteration -lt $MAX_ITERATIONS ]]; do
        if ! run_iteration; then
            break
        fi

        iteration=$(get_iteration)

        log_info "Waiting ${ITERATION_DELAY}s before next iteration..."
        sleep "$ITERATION_DELAY"
    done

    log_info "Worker Claude finished"
    echo "stopped" > "$STATUS_FILE"
}

# Handle signals
trap 'echo "stopped" > "$STATUS_FILE"; exit' SIGINT SIGTERM

main
