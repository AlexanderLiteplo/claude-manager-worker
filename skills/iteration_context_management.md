# Skill: Iteration Context Management

## When to Apply
Apply this skill when you receive a prompt that includes iteration reports, prior work summaries, or context from previous sessions. This is critical for maintaining focus on the correct project.

## The Problem

Worker Claude sessions may receive context that includes:
- Iteration reports from multiple different PRDs
- Code samples from unrelated projects
- Implementation plans from previous work
- File structures from other codebases

This creates **context pollution** where Worker Claude may mistakenly continue working on a previous project instead of the assigned PRD.

## Guidelines

### 1. Identify the Authoritative Source

The **PRD** is the single source of truth. Not the iteration reports.

```
Priority Order:
1. PRD Requirements (HIGHEST - this defines what to build)
2. Implementation Plan (track progress against PRD)
3. Manager Directives (corrections from Manager Claude)
4. Previous Iteration Reports (LOWEST - may be from wrong project!)
```

### 2. Filter Iteration Reports by Project

When you see iteration reports, check if they match the current PRD:

**Step 1: Extract the project name from the PRD**
```
PRD Title: "Anime/Weeb Theme with Sound Effects & Model Switching"
Project: Anime Theme Dashboard
```

**Step 2: Check each iteration report's focus**
```
Iteration 636: "LinkedIn Auto-Poster" - WRONG PROJECT, IGNORE
Iteration 637: "People Rental App" - WRONG PROJECT, IGNORE
Iteration 2210: "Infrastructure Monitoring" - WRONG PROJECT, IGNORE
```

**Step 3: Only consider reports that match**
```
Look for reports mentioning:
- "Anime theme"
- "Sound effects"
- "Model switching"
- "AnimeButton", "AnimeCard", "SoundManager"
- Target directory: dashboard/
```

### 3. Recognize Project Indicators

| Indicator | Project Type | Action |
|-----------|--------------|--------|
| "Campaign", "LinkedIn", "posts" | LinkedIn Auto-Poster | IGNORE |
| "Expo", "React Native", "Booking" | People Rental App | IGNORE |
| "Vercel", "GitHub", "GCloud", "Infrastructure" | Infra Dashboard | IGNORE |
| "AnimeButton", "SoundManager", "ModelSwitcher" | Anime Theme | FOLLOW |

### 4. Handle Mixed Context

If the prompt contains reports from multiple projects:

```typescript
// Mental model for context filtering
function shouldUseReport(report: IterationReport, currentPRD: PRD): boolean {
  // Check if report mentions features from the PRD
  const prdKeywords = extractKeywords(currentPRD.title);
  const reportMentionsPRDFeatures = prdKeywords.some(kw =>
    report.content.toLowerCase().includes(kw.toLowerCase())
  );

  // Check if report uses the same target directory
  const sameDirectory = report.targetDirectory === currentPRD.targetDirectory;

  return reportMentionsPRDFeatures && sameDirectory;
}
```

### 5. Start Fresh When Unsure

If you cannot determine which iteration reports are relevant:
1. **Start from the PRD** - treat it as a fresh project
2. **Read the Implementation Plan** - see what's marked completed
3. **Check the filesystem** - see what files actually exist
4. **Ignore all iteration reports** - they may all be from wrong projects

### 6. Document Context Filtering

In your iteration report, explicitly state what you filtered:

```markdown
## Context Analysis

### Reports Reviewed
- iteration_636_report.md: LinkedIn Auto-Poster (IGNORED - different project)
- iteration_2210_report.md: Infrastructure Dashboard (IGNORED - different project)

### Relevant Context
- IMPLEMENTATION_PLAN.md: Shows anime-colors.ts and animations.ts completed
- Filesystem check: Found 2 files in dashboard/lib/theme/

### Starting Point
Continuing from Phase 1, Task 1.2: SoundManager implementation
```

## Example: Correct Context Handling

### Prompt Contains:
```
Recent Iteration Reports:
- iteration_640_report.md (People Rental App reviews)
- iteration_2211_report.md (Infrastructure Dashboard completion)

PRD: Anime/Weeb Theme with Sound Effects & Model Switching
```

### Correct Response:
```markdown
# Iteration 2212 Report

## Context Filtering
The provided iteration reports (640, 2211) are for different projects:
- iteration_640: People Rental App (mobile) - NOT RELEVANT
- iteration_2211: Infrastructure Dashboard - NOT RELEVANT

I am implementing: **Anime/Weeb Theme with Sound Effects & Model Switching**

## Current State Assessment
Checking dashboard/ directory for existing anime theme files...
- Found: lib/theme/anime-colors.ts
- Found: lib/theme/animations.ts
- Missing: lib/sounds/SoundManager.ts (Phase 1, Task 1.2)

## Work This Iteration
Implementing SoundManager.ts as per Implementation Plan Task 1.2...
```

## Common Mistakes to Avoid

1. **Continuing the "latest" iteration report** - It might be from a different project
2. **Assuming iteration numbers are sequential for one project** - Multiple projects share iteration numbers
3. **Building features mentioned in reports but not in PRD** - The PRD is authoritative
4. **Not verifying target directory** - Different projects have different targets
5. **Trusting "## Summary" sections blindly** - Verify against PRD acceptance criteria
