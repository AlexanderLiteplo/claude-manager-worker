# Task-Based Development System

## Overview
Instead of large PRD .md files, the system now uses a single `tasks.json` file with bite-sized tasks that the worker processes one at a time.

## Why Tasks Instead of PRDs?

**Old System (PRDs):**
- ❌ Large .md files are hard to complete
- ❌ Worker tries to do everything at once
- ❌ Difficult to track granular progress
- ❌ Multiple files to manage

**New System (Tasks):**
- ✅ Bite-sized, focused work
- ✅ One task per iteration
- ✅ Clear completion criteria
- ✅ Single JSON file to manage
- ✅ Easy progress tracking

## tasks.json Format

```json
{
  "projectName": "My Awesome Project",
  "description": "Brief project description",
  "tasks": [
    {
      "id": "1",
      "title": "Setup Core Data models",
      "description": "Create Contact, Connection, and Reminder models with proper relationships",
      "acceptanceCriteria": "Models compile, migrations run successfully",
      "status": "pending",
      "estimatedIterations": 1,
      "dependencies": [],
      "createdAt": null,
      "startedAt": null,
      "completedAt": null
    },
    {
      "id": "2",
      "title": "Build ContactsService",
      "description": "Implement ContactsService to import contacts from iOS Contacts framework",
      "acceptanceCriteria": "Can import and save contacts to Core Data",
      "status": "pending",
      "estimatedIterations": 2,
      "dependencies": ["1"],
      "createdAt": null,
      "startedAt": null,
      "completedAt": null
    }
  ]
}
```

## Task Statuses

- **`pending`** - Not started yet
- **`in_progress`** - Currently being worked on
- **completed`** - Finished and verified

## How It Works

### 1. Worker Loop
```bash
1. Load tasks.json
2. Find first "pending" or "in_progress" task
3. Work on ONLY that task
4. Create completion file when done
5. Move to next task
6. Repeat until all tasks are "completed"
```

### 2. Task Completion
When a task is done, worker creates:
```
.state/TASK_{id}_COMPLETE
```

Worker.sh detects this and updates tasks.json:
```json
{
  "id": "1",
  "status": "completed",
  "completedAt": "2026-01-16T20:30:00Z"
}
```

### 3. Progress Tracking
Worker maintains `output/PROGRESS.md` so each iteration knows what was done before.

## Creating tasks.json

### Option 1: Convert Existing PRDs
```bash
cd "/Users/alexander/claude-managers/your-project"
/Users/alexander/claude-manager-worker/scripts/prd-to-tasks.sh .
```

This will:
- Read all .md files in `prds/`
- Send to Claude to break them into tasks
- Generate `tasks.json` automatically

### Option 2: Manual Creation
```bash
cd "/Users/alexander/claude-managers/your-project"
cat > prds/tasks.json <<'EOF'
{
  "projectName": "Your Project",
  "tasks": [
    {
      "id": "1",
      "title": "First task",
      "description": "What to do",
      "acceptanceCriteria": "How to verify",
      "status": "pending",
      "estimatedIterations": 1,
      "dependencies": []
    }
  ]
}
EOF
```

## Running the System

### Start
```bash
cd "/Users/alexander/claude-managers/your-project"
./scripts/orchestrator.sh start
```

### Check Status
```bash
./scripts/orchestrator.sh status
```

Output:
```
Tasks:
  Total: 25
  Completed: 10
  In Progress: 1
  Pending: 14
```

### Watch Progress
```bash
./scripts/orchestrator.sh logs
```

## Task Design Best Practices

### Good Tasks ✅
- **Small scope**: "Create UserService with login method"
- **Clear acceptance**: "User can log in and see dashboard"
- **1-3 iterations**: Focused and achievable
- **Specific**: Mentions exact files/features

### Bad Tasks ❌
- **Too large**: "Build entire authentication system"
- **Vague acceptance**: "Everything works"
- **No scope limit**: "Implement all features"
- **Unclear**: "Make it better"

### Example Task Breakdown

**Bad (too large):**
```json
{
  "id": "1",
  "title": "Build user system",
  "description": "Authentication and user management"
}
```

**Good (bite-sized):**
```json
[
  {
    "id": "1",
    "title": "Create User model",
    "description": "Define User schema with email, password hash, createdAt",
    "acceptanceCriteria": "User model exists and migrations run"
  },
  {
    "id": "2",
    "title": "Implement register endpoint",
    "description": "POST /api/register validates email, hashes password, creates user",
    "acceptanceCriteria": "Can register new user via API call"
  },
  {
    "id": "3",
    "title": "Implement login endpoint",
    "description": "POST /api/login validates credentials, returns JWT",
    "acceptanceCriteria": "Can login and receive valid token"
  }
]
```

## Dashboard Integration

The dashboard will automatically show:
- Total tasks
- Completed/In Progress/Pending counts
- Current task being worked on
- Progress percentage

## Migrating Existing Projects

To migrate an existing project from PRDs to tasks:

1. **Stop the instance**
   ```bash
   ./scripts/orchestrator.sh stop
   ```

2. **Convert PRDs**
   ```bash
   /Users/alexander/claude-manager-worker/scripts/prd-to-tasks.sh .
   ```

3. **Review tasks.json**
   Edit if needed to ensure tasks are bite-sized

4. **Restart**
   ```bash
   ./scripts/orchestrator.sh start
   ```

## FAQ

**Q: Can I mix .md PRDs and tasks.json?**
A: No. Choose one system. tasks.json is recommended.

**Q: How many tasks should I have?**
A: 10-50 tasks per project is ideal. Too few = tasks are too large. Too many = overhead.

**Q: Can I edit tasks.json while worker is running?**
A: Yes, but be careful. The worker reads it every iteration.

**Q: What if a task takes longer than estimated?**
A: That's fine. Estimates are just guidelines. Worker will keep working until task is marked complete.

**Q: Can I add tasks mid-project?**
A: Yes! Just append to the tasks array in tasks.json.

## Summary

The task-based system is simpler, more trackable, and easier for the worker to handle. Each iteration focuses on ONE thing, making progress steady and measurable.

**Old way:** "Here's a 50-page PRD, implement it all"
**New way:** "Complete Task 5: Build the login form. Here's exactly what's needed."

Much better! 🚀
