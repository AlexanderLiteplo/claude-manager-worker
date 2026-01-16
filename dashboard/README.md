# Claude Manager Dashboard

Beautiful real-time web interface for monitoring and controlling your Claude Manager instances.

## Features

### 🎯 Instance Management
- **Create New Instances**: Click "+ New Instance" to create a new claude-manager
- **Configure Models**: Choose Worker (Sonnet/Opus/Haiku) and Manager (Opus/Sonnet/Haiku) models
- **Set Iterations**: Configure max iterations per instance

### 🎮 Instance Control
- **Start/Stop/Restart**: One-click controls for each instance
- **Real-time Status**: Live status updates every 5 seconds
- **Model Badges**: See which models each instance is using

### 📊 Monitoring
- **Progress Tracking**: Visual progress bars for PRD completion
- **Live Logs**: Expandable logs viewer with recent activity
- **Skills Display**: View all generated skills per instance
- **Iteration Counter**: Track how many iterations completed

### 🎨 UI Features
- **Dark Mode**: Automatic dark mode support
- **Responsive**: Works on desktop and mobile
- **Color-coded Badges**:
  - Worker models: Opus (purple), Sonnet (blue), Haiku (green)
  - Status: Running (green, pulsing), Stopped (red)

## Quick Start

```bash
cd dashboard
npm install
npm run dev
```

Dashboard will be available at `http://localhost:3000`

## Creating an Instance

1. Click **"+ New Instance"** button
2. Enter instance name (e.g., "my-project")
3. Select Worker model (Sonnet recommended for speed)
4. Select Manager model (Opus recommended for quality)
5. Set max iterations (default: 50)
6. Click **Create**

Your new instance will be created at `~/claude-managers/{name}/`

## Controlling Instances

### Start
Starts both Worker and Manager Claude with configured models.

### Stop
Gracefully stops the instance, preserving state for resume.

### Restart
Stops and restarts the instance (useful after adding new PRDs).

## Instance Location

All managed instances are stored in:
```
~/claude-managers/
  ├── my-project/
  │   ├── prds/           # Your PRD files
  │   ├── skills/         # Generated skills
  │   ├── output/         # Implementation output
  │   ├── logs/           # Execution logs
  │   ├── scripts/        # Orchestrator scripts
  │   ├── .state/         # Runtime state
  │   └── config.json     # Instance configuration
  └── another-project/
      └── ...
```
