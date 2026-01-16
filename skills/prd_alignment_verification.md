# Skill: PRD Alignment Verification

## When to Apply
Apply this skill at the **START of EVERY iteration**, before writing ANY code. This is the most critical pre-work check to ensure you're building the right thing.

## Guidelines

### 1. First Action: Read the PRD Title

Before doing anything else, identify what you're supposed to build:

```
PRD Title: "Anime/Weeb Theme with Sound Effects & Model Switching"

Key words:
- "Anime/Weeb Theme" = UI styling transformation
- "Sound Effects" = Audio system implementation
- "Model Switching" = Dynamic model selection feature

NOT:
- LinkedIn Auto-Poster (different project)
- People Rental App (different project)
- Infrastructure Dashboard (different project)
```

### 2. Verify Target Directory

Check that you're working in the correct location:

```typescript
// PRD says: Target Directory: /Users/alexander/claude-manager-worker/dashboard/
// You MUST create files here, not in /output/src/ or elsewhere
```

### 3. Cross-Reference Implementation Plan

Before starting, read the IMPLEMENTATION_PLAN.md and find:
1. Which tasks are marked "Completed"
2. Which tasks are marked "Pending" or "In Progress"
3. What the NEXT task should be

```markdown
## From Implementation Plan
| Phase | Task | Status |
|-------|------|--------|
| 1 | Anime Colors | Completed |
| 1 | Animations | Completed |
| 1 | SoundManager | Pending |  <-- WORK ON THIS NEXT
```

### 4. Ignore Unrelated Iteration Reports

The prompt may include iteration reports from previous, unrelated projects. **IGNORE THEM**.

Signs you're looking at the wrong project:
- Report mentions "LinkedIn posts" (wrong project)
- Report mentions "React Native" or "Expo" (wrong project)
- Report mentions "Express.js backend" (wrong project)
- Report mentions models like "Campaign" or "Booking" not in your PRD

### 5. Verify Before Coding

Ask yourself these questions before writing code:

| Question | Expected Answer |
|----------|-----------------|
| What PRD am I implementing? | [Name from PRD title] |
| What directory should I create files in? | [From PRD target directory] |
| What is the next uncompleted task? | [From implementation plan] |
| Is this task in the PRD acceptance criteria? | Yes (must be yes) |

### 6. Example: Correct vs Incorrect Focus

**INCORRECT (working on wrong project):**
```
Iteration 100 Report

## Summary
Completed the Campaign API endpoints for the LinkedIn Auto-Poster...
```

**CORRECT (working on assigned PRD):**
```
Iteration 100 Report

## Summary
Implemented the SoundManager for the Anime/Weeb Theme PRD...

## PRD Alignment Check
- PRD: Anime/Weeb Theme with Sound Effects & Model Switching
- Current Phase: 2 (Sound System)
- Task: Create SoundManager.ts
- Acceptance Criteria #2: "Sound effects play on all interactions"
```

## Template: Iteration Report Header

Use this template at the start of every iteration report:

```markdown
# Iteration N Report

## PRD Alignment
- **PRD Title**: [Copy from PRD]
- **Target Directory**: [Copy from PRD]
- **Current Phase**: [From implementation plan]
- **Current Task**: [Specific task being worked on]
- **Acceptance Criteria Targeted**: [List which criteria this advances]

## Work Completed
[Your work description]
```

## Common Mistakes to Avoid

1. **Continuing previous iteration's project** - Always check PRD title first
2. **Working in wrong directory** - Verify target directory matches PRD
3. **Building features not in PRD** - Cross-reference acceptance criteria
4. **Ignoring implementation plan** - It exists to guide your work
5. **Assuming context from iteration reports** - Reports may be from other projects
6. **Not tracking acceptance criteria** - Each iteration should advance measurable criteria

## Red Flags That You're Off Track

If any of these are true, STOP and re-read the PRD:

- [ ] You're creating files in `/output/src/` for a dashboard PRD
- [ ] You're building mobile app screens for a web dashboard PRD
- [ ] You're implementing API endpoints not mentioned in the PRD
- [ ] Your iteration report talks about different features than the PRD
- [ ] The acceptance criteria you're working on isn't in the PRD
- [ ] You're continuing work from iteration reports about different projects
