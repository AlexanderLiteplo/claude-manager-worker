#!/bin/bash
#
# Claude Manager Dashboard Launcher
# Double-click this to start the dashboard!
#

DASHBOARD_DIR="/Users/alexander/claude-manager-worker/dashboard"
PORT=3000

echo "🚀 Starting Claude Manager Dashboard..."
echo ""

# Kill any existing dashboard process
echo "Checking for existing dashboard..."
pkill -f "next dev" 2>/dev/null && echo "✅ Stopped old dashboard" || echo "No existing dashboard running"

# Change to dashboard directory
cd "$DASHBOARD_DIR" || exit 1

# Start the dashboard
echo ""
echo "🎮 Starting dashboard on port $PORT..."
echo ""
npm run dev &

# Wait for dashboard to start
echo "⏳ Waiting for dashboard to start..."
sleep 5

# Check if it's running
if curl -s http://localhost:$PORT > /dev/null 2>&1; then
    echo ""
    echo "✅ Dashboard is running!"
    echo ""
    echo "🌐 Opening in your browser..."
    open "http://localhost:$PORT"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎯 Claude Manager Dashboard"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📍 URL: http://localhost:$PORT"
    echo "🛑 To stop: Press Ctrl+C or run 'pkill -f next'"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Press Ctrl+C to stop the dashboard..."

    # Keep script running so user can see the output
    wait
else
    echo ""
    echo "❌ Dashboard failed to start!"
    echo "Check the logs at: /tmp/dashboard.log"
    echo ""
    exit 1
fi
