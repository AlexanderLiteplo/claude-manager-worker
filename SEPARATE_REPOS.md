# Separate Repository Architecture

## Problem
Currently, generated code goes into `instance/output/` which is NOT a separate git repo. This makes it hard to:
- Version control the actual project
- Push to GitHub separately
- Keep orchestration separate from code

## Solution: Two-Directory System

### 1. Instance Management Directory
**Location:** `/Users/alexander/claude-managers/{instance-name}/`

**Contains:**
- `scripts/` - orchestrator, worker, manager
- `prds/` - tasks.json
- `.state/` - iteration tracking, PIDs
- `logs/` - worker/manager logs
- `skills/` - learned skills
- `config.json` - instance configuration

**Purpose:** Orchestration only, NOT versioned code

### 2. Project Code Directory
**Location:** `/Users/alexander/projects/{project-name}/`

**Contains:**
- All source code (`src/`, `app/`, etc.)
- `package.json`, dependencies
- `.git/` - **Own git repository**
- `README.md`, docs
- Tests, config files

**Purpose:** The actual project, versioned separately

## Updated config.json

```json
{
  "instanceName": "connection app",
  "projectPath": "/Users/alexander/projects/connection-app",
  "workerModel": "opus",
  "managerModel": "sonnet",
  "maxIterations": 9999,
  "createdAt": "2026-01-16T21:19:55.593Z",
  "githubRepo": "yourusername/connection-app"
}
```

## How It Works

### Instance Creation
```bash
./scripts/create-instance.sh "Connection App" \
  --project-dir "/Users/alexander/projects/connection-app" \
  --init-git
```

This will:
1. Create `/Users/alexander/claude-managers/connection app/`
2. Create `/Users/alexander/projects/connection-app/`
3. Initialize git in project directory
4. Link them in config.json

### Worker Behavior
```bash
# Worker reads config.json
PROJECT_PATH=$(jq -r '.projectPath' config.json)

# Writes code to project directory
cd "$PROJECT_PATH"
# Create files here...

# Writes logs to instance directory
cd "$INSTANCE_DIR"
# Write logs here...
```

### Directory Structure

```
/Users/alexander/
├── claude-managers/                    # Orchestration
│   ├── connection app/
│   │   ├── config.json                 # Links to /projects/connection-app
│   │   ├── prds/tasks.json
│   │   ├── scripts/
│   │   ├── .state/
│   │   ├── logs/
│   │   └── skills/
│   └── Real estate agent CRM/
│       └── ... (same structure)
│
└── projects/                            # Actual code (each is own git repo)
    ├── connection-app/
    │   ├── .git/                        # ✅ Own git repo
    │   ├── ConnectionApp.xcodeproj
    │   ├── ConnectionApp/
    │   │   ├── App/
    │   │   ├── Models/
    │   │   ├── Views/
    │   │   └── ...
    │   └── README.md
    │
    └── real-estate-crm/
        ├── .git/                        # ✅ Own git repo
        ├── package.json
        ├── src/
        ├── prisma/
        └── README.md
```

## Benefits

1. **Clean separation**: Orchestration ≠ Code
2. **Independent versioning**: Each project has own git history
3. **Easy GitHub push**: Each project can be pushed separately
4. **Cleaner repos**: No orchestration files in project code
5. **Multiple instances**: Could have 2 instances working on same project

## Migration Steps

### For Existing Instances

1. **Stop instance**
   ```bash
   cd "/Users/alexander/claude-managers/Real estate agent CRM"
   ./scripts/orchestrator.sh stop
   ```

2. **Move code to projects/**
   ```bash
   mkdir -p "/Users/alexander/projects/real-estate-crm"
   cp -r output/* "/Users/alexander/projects/real-estate-crm/"
   ```

3. **Initialize git**
   ```bash
   cd "/Users/alexander/projects/real-estate-crm"
   git init
   git add .
   git commit -m "Initial commit from claude-manager"
   ```

4. **Update config.json**
   ```json
   {
     "projectPath": "/Users/alexander/projects/real-estate-crm"
   }
   ```

5. **Update worker.sh** to use $PROJECT_PATH from config

6. **Restart**
   ```bash
   ./scripts/orchestrator.sh start
   ```

## Implementation TODO

- [ ] Update `config.json` schema to include `projectPath`
- [ ] Update `worker.sh` to read `projectPath` and write code there
- [ ] Update `create-instance.sh` to support `--project-dir` flag
- [ ] Add `--init-git` flag to auto-initialize git repo
- [ ] Update dashboard to show both instance and project paths
- [ ] Create migration script for existing instances
- [ ] Update all documentation

## Example: Creating New Instance

```bash
# Create new instance with separate project directory
./scripts/create-instance.sh "My iOS App" \
  --project-dir "/Users/alexander/projects/my-ios-app" \
  --init-git \
  --worker-model opus \
  --manager-model sonnet

# Result:
# - Instance created at: /Users/alexander/claude-managers/my-ios-app/
# - Project created at: /Users/alexander/projects/my-ios-app/
# - Git initialized in project directory
# - Ready to add tasks.json and start
```

This is the proper way to structure it! 🎯
