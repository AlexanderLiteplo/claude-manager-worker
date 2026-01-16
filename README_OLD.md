# Claude Manager-Worker System

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/Claude-Manager--Worker-purple.svg" alt="Claude">
  <img src="https://img.shields.io/badge/Version-1.0.0-green.svg" alt="Version">
</p>

> An autonomous PRD implementation system using the **Ralph Wiggum technique** with a Manager/Worker architecture for quality oversight.

<p align="center">
  <a href="#key-features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#dashboard">Dashboard</a> •
  <a href="#examples">Examples</a> •
  <a href="#documentation">Documentation</a>
</p>

<p align="center">
  <strong>Write a PRD → Go to bed → Wake up to production code</strong>
</p>

## Overview

This system implements a dual-Claude architecture that lets you go from PRDs to production-ready code while you sleep:

- **Worker Claude**: Autonomously implements PRDs (Product Requirements Documents) in a continuous loop
- **Manager Claude**: Reviews work quality, red-teams implementations, and generates skill files to improve Worker Claude over time

The system runs overnight, letting you wake up to implemented features with quality assurance built-in.

## Key Features

- 🤖 **Fully Autonomous**: Write a PRD, start the system, walk away
- 👨‍💼 **Quality Oversight**: Manager Claude reviews every iteration
- 📈 **Self-Improving**: Generates skill files that improve future runs
- 📊 **Real-time Dashboard**: Monitor progress with a beautiful web UI
- 🔄 **Resumable**: Picks up where it left off after restarts
- 🛡️ **Fault Tolerant**: Handles errors gracefully and retries
- 📝 **Complete Audit Trail**: Full logs, reviews, and implementation plans

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRDs (Input)                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Worker Claude                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  while true:                                             │   │
│  │    1. Read PRD & Skills                                  │   │
│  │    2. Pick next task from plan                          │   │
│  │    3. Implement                                          │   │
│  │    4. Validate (tests, lint)                            │   │
│  │    5. Update plan                                        │   │
│  │    6. Signal Manager (every N iterations)               │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ Signals for review
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Manager Claude                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  while worker_running:                                   │   │
│  │    1. Review Worker's output                            │   │
│  │    2. Red team the code                                 │   │
│  │    3. Check PRD requirements                            │   │
│  │    4. Generate/update skill files                       │   │
│  │    5. Approve or request rework                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Output                                    │
│  - Implemented code in output/src/                              │
│  - Reviews in output/reviews/                                   │
│  - Skills in skills/ (improve future runs)                      │
│  - Final report                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites

- [Claude Code CLI](https://github.com/anthropics/claude-code) installed and authenticated
- Bash 4.0+
- macOS or Linux

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/claude-manager-worker.git
cd claude-manager-worker

# Make scripts executable
chmod +x scripts/*.sh

# Optional: Set up the dashboard
cd dashboard
npm install
cd ..

# Create alias (optional)
echo 'alias cmw="$(pwd)/scripts/orchestrator.sh"' >> ~/.zshrc
source ~/.zshrc
```

## Usage

### Quick Start

1. **Add a PRD** to the `prds/` directory:
   ```bash
   cp prds/sample_prd.md prds/my_feature.md
   # Edit my_feature.md with your requirements
   ```

2. **Start the system**:
   ```bash
   ./scripts/orchestrator.sh start
   ```

3. **Monitor progress**:
   ```bash
   ./scripts/orchestrator.sh status
   ./scripts/orchestrator.sh logs
   ```

4. **Stop when done**:
   ```bash
   ./scripts/orchestrator.sh stop
   ```

### Commands

```bash
# Start both Worker and Manager
./scripts/orchestrator.sh start

# Start with custom settings
./scripts/orchestrator.sh start --max-iterations 100 --worker-model sonnet --manager-model opus

# Check status
./scripts/orchestrator.sh status

# Watch logs in real-time
./scripts/orchestrator.sh logs

# Stop everything
./scripts/orchestrator.sh stop

# Clean all output and state
./scripts/orchestrator.sh clean

# Run only Worker (no oversight)
./scripts/orchestrator.sh worker

# Run only Manager (for reviewing existing work)
./scripts/orchestrator.sh manager
```

### Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `MAX_ITERATIONS` | 50 | Maximum worker iterations |
| `WORKER_MODEL` | sonnet | Model for Worker Claude |
| `MANAGER_MODEL` | opus | Model for Manager Claude |
| `ITERATION_DELAY` | 5 | Seconds between worker iterations |
| `REVIEW_INTERVAL` | 60 | Seconds between manager reviews |

## Dashboard

Monitor your claude-manager instances with a beautiful real-time web dashboard.

### Features

- 📊 Real-time status updates (auto-refresh every 5s)
- 🔄 Current PRD progress with animated indicators
- 📈 Iteration count, reviews, and skill generation tracking
- 📝 Expandable logs and skills viewer
- 🌗 Dark mode support
- 👀 Monitor multiple claude-manager instances simultaneously

### Setup

```bash
cd dashboard
npm install
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### Features Overview

- **Status Badges**: See if Worker and Manager are running at a glance
- **Progress Bars**: Visual PRD completion tracking
- **Current Work**: Highlighted current PRD with pulse animation
- **Logs**: Expandable recent logs viewer
- **Skills**: View all generated skills in one place

The dashboard automatically discovers all claude-manager instances on your system and displays their status.

## Directory Structure

```
claude-manager-worker/
├── scripts/
│   ├── orchestrator.sh   # Main entry point
│   ├── worker.sh         # Worker Claude loop
│   └── manager.sh        # Manager Claude loop
├── dashboard/             # Real-time monitoring web UI
│   ├── app/              # Next.js app
│   ├── package.json
│   └── README.md
├── prds/                  # Your PRD files go here
│   └── sample_prd.md     # Example PRD
├── skills/                # Skill files (generated by Manager)
│   └── example_skill.md  # Example skill file
├── output/                # Generated during runs
│   ├── src/              # Implemented code
│   ├── reviews/          # Manager reviews
│   ├── completed/        # Completed PRD markers
│   └── IMPLEMENTATION_PLAN.md
├── logs/                  # Execution logs
├── .state/               # Runtime state files
├── README.md
├── CHANGELOG.md          # Version history
└── CONTRIBUTING.md       # Contribution guidelines
```

## Examples

### Real-World Results

Here are actual results from running the system overnight:

**Example 1: Mobile App Lessons Feature**
- **Input**: PRD for implementing a learning feature with flashcards, concepts, and system design content
- **Output**:
  - 9 new screens created
  - 6 reusable components
  - 10 API endpoints implemented
  - 800+ learning items accessible
  - ~3,500 lines of production-ready code
- **Time**: 4 iterations (~2 hours autonomous work)

**Example 2: App Debugging & Polish**
- **Input**: PRD to fix bugs and improve code quality
- **Output**:
  - 28 TypeScript errors → 0
  - 8 ESLint errors → 0
  - 30+ critical/high severity bugs fixed
  - Comprehensive testing documentation (250+ checks)
  - Security vulnerabilities addressed
- **Time**: 14 iterations (~6 hours autonomous work)

**Example 3: Payment Integration Testing**
- **Input**: PRD for Apple IAP sandbox testing with RevenueCat
- **Output**:
  - Complete RevenueCat integration verified
  - Diagnostic tools created (in-app + CLI)
  - 400+ line troubleshooting guide
  - Offline sync queue implemented
  - Ready for production deployment
- **Time**: Multiple iterations with Opus model

### What Gets Generated

Each successful run produces:

```
output/
├── src/                      # Your implemented features
├── completed/                # Completion reports per PRD
│   └── 01_feature_COMPLETE.md
├── reviews/                  # Manager's quality reviews
│   └── review_iteration_5.md
├── IMPLEMENTATION_PLAN.md    # Living document of progress
└── iteration_*_report.md     # Per-iteration summaries

skills/                       # Cumulative learnings
├── react_hook_dependencies.md
├── offline_sync_patterns.md
└── error_boundary_patterns.md
```

## Writing PRDs

PRDs should be detailed enough for Worker Claude to implement without clarification. Include:

1. **Overview**: What are we building and why?
2. **Goals**: Specific objectives
3. **User Stories**: Who uses this and how?
4. **Technical Requirements**: Language, frameworks, structure
5. **Acceptance Criteria**: Checklist of requirements
6. **Out of Scope**: What NOT to build

See `prds/sample_prd.md` for a complete example.

## Skill Files

Manager Claude generates skill files in `skills/` to improve Worker Claude's performance. These are:

- **Persistent**: Survive between runs
- **Cumulative**: Build up over time
- **Specific**: Tailored to your codebase patterns

Example skill file:
```markdown
# Skill: Error Handling in API Routes

## When to Apply
When implementing any API endpoint

## Guidelines
- Always wrap route handlers in try/catch
- Return consistent error response format
- Log errors with context

## Common Mistakes to Avoid
- Returning stack traces to clients
- Silent failures
```

## The Ralph Wiggum Technique

Named after the Simpsons character, this technique embraces "deterministically bad in an undeterministic world" - it's better to fail predictably than succeed unpredictably.

Core principles:
1. **Bash loop**: Simple `while true` feeding prompts to Claude
2. **File-based state**: All state persisted to disk (plans, progress, skills)
3. **Fresh context each iteration**: Clear memory, reload from files
4. **Backpressure via tests**: Quality enforced through failing tests
5. **Eventual convergence**: Iterate until correct through feedback

Our contribution is the **Manager/Worker split**:
- Worker focuses on implementation
- Manager focuses on quality
- Skills transfer learning between iterations

## FAQ

### How much does it cost?
You pay for Claude API usage. With Sonnet for Worker (~$3-5 per PRD) and Opus for Manager reviews. Total cost depends on PRD complexity but typically $5-15 per overnight run.

### Can I use different models?
Yes! Configure via flags: `--worker-model sonnet --manager-model opus`. Supported: sonnet, opus, haiku.

### What if it makes mistakes?
Manager Claude reviews all code and can reject work. You can also manually review before merging. The system generates complete audit trails.

### Does it work with my tech stack?
Yes. Just specify your stack in the PRD. Works with any language/framework Claude Code supports.

### Can I run it on a server?
Absolutely. Designed for long-running autonomous operation. Run in tmux/screen for persistence.

### How do I stop a runaway iteration?
`./scripts/orchestrator.sh stop` stops gracefully. State is saved and resumable.

## Sources & Inspiration

- [Ralph Wiggum Technique by Geoffrey Huntley](https://github.com/ghuntley/how-to-ralph-wiggum)
- [Ralph Claude Code by Frank Bria](https://github.com/frankbria/ralph-claude-code)
- [Official Claude Code Plugin](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum)

## Community

- 🐛 [Report bugs](https://github.com/YOUR_USERNAME/claude-manager-worker/issues)
- 💡 [Request features](https://github.com/YOUR_USERNAME/claude-manager-worker/issues)
- 💬 [Join discussions](https://github.com/YOUR_USERNAME/claude-manager-worker/discussions)
- 📖 [Read the docs](https://github.com/YOUR_USERNAME/claude-manager-worker/wiki)

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Star History

If you find this project useful, please consider giving it a star ⭐️

---

<p align="center">
  Made with ❤️ by developers who want to ship faster
</p>

<p align="center">
  <a href="https://github.com/YOUR_USERNAME/claude-manager-worker">⭐️ Star on GitHub</a> •
  <a href="https://github.com/YOUR_USERNAME/claude-manager-worker/issues">🐛 Report Bug</a> •
  <a href="https://github.com/YOUR_USERNAME/claude-manager-worker/discussions">💬 Discussions</a>
</p>
