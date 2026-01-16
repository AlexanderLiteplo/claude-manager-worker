# System Improvements Summary

## What Changed

### 1. Task-Based System (Instead of Large PRDs)

**Old Way:**
- Large .md PRD files (50+ pages)
- Worker tries to implement everything at once
- Hard to track progress
- Multiple .md files to manage

**New Way:**
- Single `tasks.json` with bite-sized tasks
- Worker processes ONE task per iteration
- Clear progress tracking (pending → in_progress → completed)
- Easy to see exactly what's done and what's left

**Example tasks.json:**
```json
{
  "projectName": "My App",
  "tasks": [
    {
      "id": "1",
      "title": "Create User model",
      "description": "Define User schema with email, password",
      "acceptanceCriteria": "Model compiles and migrations run",
      "status": "pending",
      "estimatedIterations": 1,
      "dependencies": []
    }
  ]
}
```

### 2. Separate Git Repositories

**Old Way:**
- Code generated in `instance/output/`
- Mixed with orchestration files
- No git repository for the project
- Can't push to GitHub separately

**New Way:**
- Instance management: `/Users/alexander/claude-managers/{instance}/`
  - scripts/, prds/, .state/, logs/, skills/
- Project code: `/Users/alexander/projects/{project-name}/`
  - **Own git repository**
  - Can push to GitHub
  - Clean separation

**Directory Structure:**
```
/Users/alexander/
├── claude-managers/              # Orchestration
│   └── connection app/
│       ├── config.json           # Links to /projects/connection-app
│       ├── prds/tasks.json       # Bite-sized tasks
│       ├── scripts/              # orchestrator, worker, manager
│       ├── .state/               # PIDs, iteration tracking
│       └── logs/                 # Worker/manager logs
│
└── projects/                     # Actual code (separate git repos)
    └── connection-app/
        ├── .git/                 # ✅ Own git repo
        ├── src/
        ├── package.json
        └── README.md
```

## Key Files Changed

### worker.sh
- Now reads `projectPath` from config.json
- Writes code to separate project directory
- Keeps logs/state in instance directory
- Backward compatible (falls back to `output/` if no projectPath)

### orchestrator.sh
- Status command shows task counts instead of PRD counts
- Displays: Total, Completed, In Progress, Pending

### New Scripts

1. **prd-to-tasks.sh** - Convert large PRDs to tasks.json
2. **migrate-to-separate-repo.sh** - Move existing projects to /projects/

## How to Use

### For New Projects

1. **Create tasks.json:**
   ```bash
   cd "/Users/alexander/claude-managers/my-project"
   cat > prds/tasks.json <<'EOF'
   {
     "projectName": "My Project",
     "tasks": [...]
   }
   EOF
   ```

2. **Set project path in config.json:**
   ```json
   {
     "name": "My Project",
     "projectPath": "/Users/alexander/projects/my-project",
     "workerModel": "opus",
     "managerModel": "sonnet"
   }
   ```

3. **Start:**
   ```bash
   ./scripts/orchestrator.sh start
   ```

### For Existing Projects

1. **Stop instance:**
   ```bash
   ./scripts/orchestrator.sh stop
   ```

2. **Migrate to separate repo:**
   ```bash
   /Users/alexander/claude-manager-worker/scripts/migrate-to-separate-repo.sh \
     "/Users/alexander/claude-managers/Real estate agent CRM"
   ```

   This will:
   - Move `output/` → `/Users/alexander/projects/real-estate-crm/`
   - Initialize git repository
   - Create initial commit
   - Update config.json with projectPath

3. **Convert PRD to tasks (optional):**
   ```bash
   /Users/alexander/claude-manager-worker/scripts/prd-to-tasks.sh .
   ```

4. **Restart:**
   ```bash
   ./scripts/orchestrator.sh start
   ```

## Benefits

### Task System
- ✅ Bite-sized, focused work
- ✅ Clear completion criteria
- ✅ Easy progress tracking
- ✅ Worker stays focused on one thing
- ✅ Better for iteration-based development

### Separate Repos
- ✅ Clean separation (orchestration ≠ code)
- ✅ Independent version control
- ✅ Can push each project to GitHub
- ✅ Cleaner project structure
- ✅ Multiple instances can work on same project (future)

## Example: Migrating Real Estate CRM

```bash
# 1. Stop instance
cd "/Users/alexander/claude-managers/Real estate agent CRM"
./scripts/orchestrator.sh stop

# 2. Migrate to separate repo
/Users/alexander/claude-manager-worker/scripts/migrate-to-separate-repo.sh \
  "/Users/alexander/claude-managers/Real estate agent CRM" \
  real-estate-crm

# Result:
# - Project moved to: /Users/alexander/projects/real-estate-crm/
# - Git initialized with initial commit
# - config.json updated with projectPath

# 3. Push to GitHub (optional)
cd "/Users/alexander/projects/real-estate-crm"
git remote add origin https://github.com/yourusername/real-estate-crm.git
git push -u origin main

# 4. Restart instance
cd "/Users/alexander/claude-managers/Real estate agent CRM"
./scripts/orchestrator.sh start
```

## Status Command Example

**Before:**
```
PRDs:
  Total: 4
  Completed: 4
```

**After:**
```
Tasks:
  Total: 30
  Completed: 10
  In Progress: 1
  Pending: 19
```

Much more detailed!

## Documentation

- **TASKS_SYSTEM.md** - Complete guide to task-based system
- **SEPARATE_REPOS.md** - Architecture for separate repositories
- **This file** - Quick summary of changes

## Next Steps

1. **Migrate existing projects:**
   - Real Estate CRM → /projects/real-estate-crm/
   - Connection App → /projects/connection-app/

2. **Create tasks.json for each:**
   - Convert large PRDs into bite-sized tasks
   - 10-30 tasks per project is ideal

3. **Push to GitHub:**
   - Each project can be pushed separately
   - Keep claude-managers/ local (orchestration only)

## Summary

**Before:** Large PRDs, code mixed with orchestration, no git repos
**After:** Bite-sized tasks, clean separation, each project is own git repo

This makes the system:
- Easier to track progress
- Easier to version control projects
- Easier to push to GitHub
- Better for the worker (focused tasks)
- More professional (clean repos)

🚀 Much better system!
