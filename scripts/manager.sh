#!/bin/bash
#
# Manager Claude - The Quality Oversight & Skill Generation Loop
# Part of the Claude Manager-Worker System
#
# This script runs Manager Claude, which:
# 1. Reviews Worker Claude's output for quality
# 2. Red teams the implementation
# 3. Creates skill files to improve Worker Claude's performance
# 4. Ensures PRD requirements are fully met
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
MANAGER_MODEL="${MANAGER_MODEL:-sonnet}"
REVIEW_INTERVAL="${REVIEW_INTERVAL:-60}"
LOG_FILE="$PROJECT_ROOT/logs/manager_$(date +%Y%m%d_%H%M%S).log"

# State files
STATE_DIR="$PROJECT_ROOT/.state"
STATUS_FILE="$STATE_DIR/manager_status"
REVIEW_COUNT_FILE="$STATE_DIR/manager_reviews"
LAST_REVIEWED_FILE="$STATE_DIR/last_reviewed_iteration"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [MANAGER] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$*"; }
log_warn() { log "${YELLOW}WARN${NC}" "$*"; }
log_error() { log "${RED}ERROR${NC}" "$*"; }
log_success() { log "${GREEN}SUCCESS${NC}" "$*"; }
log_review() { log "${MAGENTA}REVIEW${NC}" "$*"; }

init_state() {
    mkdir -p "$STATE_DIR"
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/skills"
    mkdir -p "$PROJECT_ROOT/output/reviews"

    if [[ ! -f "$REVIEW_COUNT_FILE" ]]; then
        echo "0" > "$REVIEW_COUNT_FILE"
    fi

    if [[ ! -f "$LAST_REVIEWED_FILE" ]]; then
        echo "0" > "$LAST_REVIEWED_FILE"
    fi

    echo "running" > "$STATUS_FILE"
}

get_review_count() {
    cat "$REVIEW_COUNT_FILE" 2>/dev/null || echo "0"
}

increment_review_count() {
    local current=$(get_review_count)
    echo $((current + 1)) > "$REVIEW_COUNT_FILE"
}

get_last_reviewed() {
    cat "$LAST_REVIEWED_FILE" 2>/dev/null || echo "0"
}

set_last_reviewed() {
    echo "$1" > "$LAST_REVIEWED_FILE"
}

check_ready_for_review() {
    local signal_file="$STATE_DIR/ready_for_review"
    if [[ -f "$signal_file" ]]; then
        local iteration=$(cat "$signal_file")
        local last_reviewed=$(get_last_reviewed)

        if [[ $iteration -gt $last_reviewed ]]; then
            echo "$iteration"
            return 0
        fi
    fi
    return 1
}

get_current_prd() {
    local prd_file="$STATE_DIR/current_prd"
    if [[ -f "$prd_file" ]]; then
        cat "$prd_file"
    fi
}

gather_worker_output() {
    # Collect ONLY the most recent iteration report (token-optimized)
    local output=""

    # Get ONLY the latest iteration report
    local latest_report=$(ls -t "$PROJECT_ROOT"/output/iteration_*_report.md 2>/dev/null | head -1)
    if [[ -f "$latest_report" ]]; then
        output+="## Latest Iteration\n"
        output+="$(cat "$latest_report" | head -100)\n"  # Only first 100 lines
    fi

    # Count files changed (not content)
    local file_count=$(find "$PROJECT_ROOT/output" -type f -newer "$PROJECT_ROOT/.state/last_manager_check" 2>/dev/null | wc -l | tr -d ' ')
    output+="## Changes Since Last Check\n"
    output+="Files modified: $file_count\n"

    echo -e "$output"
}

get_existing_skills() {
    # Just list skill names (not full content)
    local skills_list=""
    local count=0
    for skill in "$PROJECT_ROOT"/skills/*.md; do
        if [[ -f "$skill" ]]; then
            ((count++))
        fi
    done
    echo "Skills available: $count"
}

build_manager_prompt() {
    local iteration="$1"
    local prd_file=$(get_current_prd)
    local prd_name="$(basename "$prd_file" 2>/dev/null || echo "unknown")"

    local worker_output=$(gather_worker_output)
    local existing_skills=$(get_existing_skills)
    local review_count=$(get_review_count)

    cat <<EOF
# Manager Review #$review_count (Iteration $iteration)

## Quick Check
PRD: $prd_name
$existing_skills

$worker_output

## Your Tasks (Be Concise)

1. Create \`$PROJECT_ROOT/output/reviews/review_${review_count}.md\`:
   - Score (1-10)
   - Issues found (if any)
   - Create skill file if you spot a pattern

2. If Worker needs redirection, create \`$PROJECT_ROOT/.state/manager_directive.md\`

3. Create APPROVED_${review_count}.md OR NEEDS_WORK_${review_count}.md

Done. Keep it brief.
EOF
}

run_manager_review() {
    local iteration="$1"
    local review_count=$(get_review_count)

    log_review "Starting review #$review_count for iteration $iteration"

    local prompt=$(build_manager_prompt "$iteration")
    local prompt_file="$STATE_DIR/manager_prompt.md"
    echo "$prompt" > "$prompt_file"

    log_info "Invoking Claude ($MANAGER_MODEL) for review..."

    local retry_count=0
    local max_retries=10
    local wait_time=60

    while [[ $retry_count -lt $max_retries ]]; do
        local temp_output=$(mktemp)

        if cat "$prompt_file" | claude -p \
            --dangerously-skip-permissions \
            --model "$MANAGER_MODEL" \
            2>&1 | tee "$temp_output" | tee -a "$LOG_FILE"; then
            log_success "Review #$review_count completed"
            rm -f "$temp_output"
            increment_review_count
            set_last_reviewed "$iteration"
            # Touch file for tracking changes
            touch "$PROJECT_ROOT/.state/last_manager_check"
            return 0
        else
            # Check if the error is due to rate limiting or credit exhaustion
            if grep -q -i -E "(rate limit|429|quota|credit|overloaded)" "$temp_output"; then
                ((retry_count++))
                log_warn "Rate limit or credit exhaustion detected (attempt $retry_count/$max_retries)"
                log_info "Waiting ${wait_time}s for credits to replenish..."

                # Show countdown
                for ((i=wait_time; i>0; i-=10)); do
                    log_info "Resuming in ${i}s..."
                    sleep 10
                done

                # Exponential backoff: double wait time for next retry
                wait_time=$((wait_time * 2))

                # Cap at 30 minutes
                if [[ $wait_time -gt 1800 ]]; then
                    wait_time=1800
                fi

                rm -f "$temp_output"
                continue
            else
                # Different error - fail normally
                log_error "Review #$review_count failed (non-rate-limit error)"
                cat "$temp_output" | tail -20 | tee -a "$LOG_FILE"
                rm -f "$temp_output"
                return 1
            fi
        fi
    done

    log_error "Max retries reached for rate limiting. Will retry next review cycle."
    return 2  # Special return code for rate limit exhaustion
}

check_worker_status() {
    local worker_status="$STATE_DIR/worker_status"
    if [[ -f "$worker_status" ]]; then
        cat "$worker_status"
    else
        echo "unknown"
    fi
}

generate_final_report() {
    log_info "Generating final report..."

    local report_file="$PROJECT_ROOT/output/FINAL_REPORT.md"
    local review_count=$(get_review_count)

    cat > "$report_file" <<EOF
# Manager Claude Final Report

Generated: $(date)
Total Reviews Conducted: $review_count

## Summary of Reviews

EOF

    for summary in "$PROJECT_ROOT"/output/reviews/review_*_summary.md; do
        if [[ -f "$summary" ]]; then
            echo "### $(basename "$summary")" >> "$report_file"
            cat "$summary" >> "$report_file"
            echo "" >> "$report_file"
        fi
    done

    cat >> "$report_file" <<EOF

## Skills Generated

EOF

    for skill in "$PROJECT_ROOT"/skills/*.md; do
        if [[ -f "$skill" ]]; then
            echo "- $(basename "$skill")" >> "$report_file"
        fi
    done

    log_success "Final report generated: $report_file"
}

cleanup() {
    echo "stopping" > "$STATUS_FILE"
    generate_final_report
    log_info "Manager Claude shutting down"
}

trap cleanup EXIT INT TERM

main() {
    log_info "========================================"
    log_info "Manager Claude Starting"
    log_info "Model: $MANAGER_MODEL"
    log_info "Review Interval: ${REVIEW_INTERVAL}s"
    log_info "========================================"

    init_state

    while true; do
        # Check if worker has signaled for review
        local iteration
        if iteration=$(check_ready_for_review); then
            log_info "Worker signaled for review at iteration $iteration"

            local result
            run_manager_review "$iteration"
            result=$?

            if [[ $result -eq 0 ]]; then
                # Success - clear the signal
                rm -f "$STATE_DIR/ready_for_review"
            elif [[ $result -eq 2 ]]; then
                # Rate limit - keep the signal for retry later
                log_info "Rate limit hit during review, will retry after interval"
                sleep 60
            else
                # Other error - clear signal anyway to avoid infinite loop
                log_warn "Review failed with non-rate-limit error, clearing signal"
                rm -f "$STATE_DIR/ready_for_review"
            fi
        fi

        # Check worker status
        local worker_status=$(check_worker_status)
        if [[ "$worker_status" == "stopping" ]] || [[ "$worker_status" == "stopped" ]]; then
            log_info "Worker has stopped, conducting final review"

            # Do one final review
            local last_iteration=$(cat "$STATE_DIR/worker_iteration" 2>/dev/null || echo "0")
            run_manager_review "$last_iteration"

            break
        fi

        # Wait before next check
        sleep "$REVIEW_INTERVAL"
    done

    log_info "Manager Claude finished"
}

main "$@"
