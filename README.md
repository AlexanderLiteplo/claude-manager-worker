# Claude Manager-Worker System

An autonomous PRD implementation system where Worker Claude builds projects while Manager Claude provides quality oversight.

## 🎯 What is This?

A complete orchestration system for building software with Claude autonomously. Give it a list of tasks, and it works through them one at a time, with optional manager oversight for quality control.

## ✨ Features

- **Task-Based Development**: Break projects into bite-sized tasks instead of large PRDs
- **Separate Git Repos**: Generated code goes into separate directories, ready to push to GitHub
- **Worker-Manager Architecture**: Worker builds, Manager reviews (optional)
- **Beautiful Dashboard**: Monitor progress, add tasks, manage instances
- **AI-Powered Task Creation**: Type a quick bullet point, AI expands it into a full task
- **Multiple Model Support**: Choose Opus, Sonnet, or Haiku for worker/manager

## 📁 Project Structure

```
claude-manager-worker/           # This repo (orchestration)
├── scripts/
│   ├── orchestrator.sh          # Main coordinator
│   ├── worker.sh                # Worker Claude loop
│   ├── manager.sh               # Manager Claude reviews
│   └── create-instance.sh       # Create new instances
├── dashboard/                   # Next.js dashboard
└── docs/                        # Documentation

~/claude-managers/               # Your instances (local only)
├── my-project/
│   ├── config.json              # Instance config
│   ├── prds/tasks.json          # Bite-sized tasks
│   ├── scripts/                 # Symlinked from above
│   ├── .state/                  # PIDs, iteration tracking
│   └── logs/                    # Execution logs

~/projects/                      # Your actual code (separate git repos)
└── my-project/
    ├── .git/                    # Own git repository!
    ├── src/
    └── ...
```

## 🚀 Quick Start

### 1. Install

```bash
git clone https://github.com/yourusername/claude-manager-worker.git
cd claude-manager-worker

# Install dashboard dependencies
cd dashboard
npm install
cd ..
```

### 2. Create an Instance

```bash
# Create instance management directory
mkdir -p ~/claude-managers/my-project
cd ~/claude-managers/my-project

# Symlink scripts
ln -s ~/claude-manager-worker/scripts scripts

# Create config
cat > config.json <<EOF
{
  "name": "my-project",
  "projectPath": "~/projects/my-project",
  "workerModel": "opus",
  "managerModel": "sonnet",
  "maxIterations": 999
}
EOF

# Create tasks
mkdir -p prds
cat > prds/tasks.json <<EOF
{
  "projectName": "My Project",
  "description": "Project description",
  "tasks": [
    {
      "id": "1",
      "title": "Setup project structure",
      "description": "Create basic folder structure",
      "acceptanceCriteria": "Project has src/ and tests/ directories",
      "status": "pending",
      "estimatedIterations": 1,
      "dependencies": []
    }
  ]
}
EOF
```

### 3. Start Building

```bash
./scripts/orchestrator.sh start
```

### 4. Monitor via Dashboard

```bash
cd ~/claude-manager-worker/dashboard
npm run dev
```

Open: http://localhost:3000

## 📝 Creating Tasks

### Via Dashboard (Easiest!)

1. Click "➕ Add Task" on any instance
2. Choose type: ✨ Feature / 🐛 Bug / 📋 Task
3. Type a quick description: *"Add user authentication"*
4. AI expands it into a full task automatically!

### Via tasks.json

```json
{
  "projectName": "My App",
  "tasks": [
    {
      "id": "1",
      "title": "Create User model",
      "description": "Define User schema with email, password hash, timestamps",
      "acceptanceCriteria": "User model exists and migrations run successfully",
      "status": "pending",
      "estimatedIterations": 1,
      "dependencies": []
    }
  ]
}
```

## 🎮 Commands

```bash
# In instance directory (~/claude-managers/my-project/)
./scripts/orchestrator.sh start        # Start worker + manager
./scripts/orchestrator.sh stop         # Stop everything
./scripts/orchestrator.sh status       # Check status
./scripts/orchestrator.sh logs         # Watch logs

# Worker only (no manager oversight)
./scripts/orchestrator.sh start --no-manager

# Custom models
./scripts/orchestrator.sh start --worker-model opus --manager-model sonnet
```

## 🏗️ How It Works

### 1. Task Loop

```
1. Worker reads tasks.json
2. Finds first "pending" task
3. Works on ONLY that task
4. Creates completion signal when done
5. Task marked as "completed"
6. Repeat until all tasks done
```

### 2. Manager Reviews (Optional)

```
Every 60 seconds:
1. Manager reviews worker's output
2. Checks for issues
3. Creates skills for patterns
4. Gives feedback if needed
```

### 3. Separate Repositories

```
Worker writes code to: ~/projects/my-project/
                       ↓
                  Own git repo!
                       ↓
                  Push to GitHub
```

## 📚 Documentation

- [TASKS_SYSTEM.md](TASKS_SYSTEM.md) - Complete guide to task-based development
- [SEPARATE_REPOS.md](SEPARATE_REPOS.md) - Architecture details
- [SYSTEM_IMPROVEMENTS_SUMMARY.md](SYSTEM_IMPROVEMENTS_SUMMARY.md) - Recent improvements

## 🎨 Dashboard Features

- **Instance Cards**: See all running instances
- **Quick Add Task**: AI-powered task creation
- **Real-time Status**: Worker iteration, manager reviews
- **Model Switcher**: Change Opus/Sonnet/Haiku on the fly
- **Infrastructure Monitoring**: Track GCloud, Vercel, GitHub resources

## 🔧 Configuration

### Instance config.json

```json
{
  "name": "My Project",
  "projectPath": "~/projects/my-project",
  "workerModel": "opus",           // opus, sonnet, or haiku
  "managerModel": "sonnet",         // opus, sonnet, or haiku
  "maxIterations": 999,
  "createdAt": "2026-01-16T18:00:00Z"
}
```

### Environment Variables

Dashboard supports optional infrastructure monitoring:

```bash
# dashboard/.env.local (optional)
VERCEL_TOKEN=your_token       # For Vercel stats
GITHUB_TOKEN=your_token       # For GitHub stats
GCLOUD_CREDENTIALS={}         # For GCloud stats
```

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 License

MIT - See [LICENSE](LICENSE)

## 🎯 Examples

### Simple Web App

```json
{
  "projectName": "Todo App",
  "tasks": [
    {"id": "1", "title": "Create Next.js project"},
    {"id": "2", "title": "Setup Prisma database"},
    {"id": "3", "title": "Build task list UI"},
    {"id": "4", "title": "Add create task API"},
    {"id": "5", "title": "Add delete task API"}
  ]
}
```

### iOS App

```json
{
  "projectName": "Fitness Tracker",
  "tasks": [
    {"id": "1", "title": "Create Xcode project"},
    {"id": "2", "title": "Define Core Data models"},
    {"id": "3", "title": "Build home view"},
    {"id": "4", "title": "Implement workout tracking"},
    {"id": "5", "title": "Add HealthKit integration"}
  ]
}
```

## 🚨 Best Practices

1. **Keep tasks small**: 1-3 iterations per task
2. **Clear acceptance criteria**: How to verify completion
3. **Logical dependencies**: Order tasks correctly
4. **Use the dashboard**: Easy task creation with AI
5. **Separate repos**: Keep orchestration and code separate

## 💡 Tips

- Use **Opus** for worker (best quality code)
- Use **Sonnet** for manager (cost-effective reviews)
- Start with **--no-manager** for simple projects
- Use **Quick Add Task** for rapid iteration
- Push projects to GitHub regularly

## 🙏 Acknowledgments

Built with Claude by Anthropic

## 🔗 Links

- Dashboard: http://localhost:3000
- Issues: https://github.com/yourusername/claude-manager-worker/issues
- Docs: Full documentation in `/docs`

---

**Made with ❤️ and ☕ by Claude**
