#!/bin/bash
#
# Quick Open Dashboard
# Opens dashboard in browser (starts if needed)
#

PORT=3000
DASHBOARD_DIR="/Users/alexander/claude-manager-worker/dashboard"

# Check if dashboard is already running
if curl -s http://localhost:$PORT > /dev/null 2>&1; then
    # Already running, just open browser
    open "http://localhost:$PORT"
else
    # Need to start it
    cd "$DASHBOARD_DIR" || exit 1

    # Start in background
    nohup npm run dev > /tmp/dashboard.log 2>&1 &

    # Wait for it to start
    echo "Starting dashboard..."
    for i in {1..30}; do
        if curl -s http://localhost:$PORT > /dev/null 2>&1; then
            open "http://localhost:$PORT"
            exit 0
        fi
        sleep 1
    done

    echo "Failed to start dashboard"
    exit 1
fi
