# Skill: Maintaining PRD Focus Throughout Implementation

## When to Apply
Apply this skill at the START of every iteration and whenever choosing what to work on next.

## The Problem

Worker Claude has a tendency to:
1. Build features that weren't in the PRD
2. Focus on one part of the PRD while ignoring others
3. Get distracted by iteration reports from unrelated projects
4. Lose sight of acceptance criteria

## The PRD Title Rule

**The PRD title tells you the primary deliverables.**

Example PRD Title: **"Skills & PRD Management UI"**

This means you MUST build:
1. Skills Management UI
2. PRD Management UI

**NOT just one of them.** Both parts are equally important.

## Checklist: Start of Each Iteration

Before writing any code, answer these questions:

1. **What does the PRD title say I should build?**
   - List all nouns in the title
   - Each noun is a required deliverable

2. **What are the acceptance criteria?**
   - Find the acceptance criteria section
   - Count how many you've completed
   - Next iteration should target uncompleted criteria

3. **What have I NOT started yet?**
   - Scan the PRD for sections you haven't touched
   - These are likely blocking approval

4. **Am I looking at the right PRD?**
   - The iteration reports may reference OTHER projects
   - Ignore LinkedIn Auto-Poster if building Skills UI
   - Always refer back to the original PRD

## Example: Skills & PRD Management UI

### PRD Structure Analysis

```markdown
# PRD: Skills & PRD Management UI

## UI Components
dashboard/
  app/
    manage/
      [instanceId]/
        page.tsx                # Management hub
        skills/
          page.tsx              # Skills library     <-- REQUIRED
          [skillId]/
            page.tsx            # Skill detail/edit  <-- REQUIRED
        prds/
          page.tsx              # PRD organizer      <-- REQUIRED
    components/
      management/
        SkillsLibrary.tsx       # Skills grid/list   <-- REQUIRED
        SkillCard.tsx           # Individual skill   <-- REQUIRED
        SkillGenerator.tsx      # AI skill gen       <-- REQUIRED
        PRDOrganizer.tsx        # PRD management     <-- REQUIRED
        ImportExport.tsx        # Import/export UI   <-- REQUIRED
        TagManager.tsx          # Tag management     <-- REQUIRED
```

### What This Means

The PRD explicitly lists files that MUST exist:
- `skills/page.tsx` - Required
- `skills/[skillId]/page.tsx` - Required
- `SkillsLibrary.tsx` - Required
- `SkillCard.tsx` - Required

If these files don't exist, the PRD is not implemented.

## Progress Tracking Pattern

At the end of each iteration report, include:

```markdown
## PRD Acceptance Criteria Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Skills library displays all skills | [ ] Not started |
| 2 | Add skill manually | [ ] Not started |
| 3 | AI generates skills | [ ] Not started |
| 4 | Import skills | [ ] Not started |
| 5 | Export skills | [ ] Not started |
| 6 | Skills show usage stats | [ ] Not started |
| 7 | PRD kanban board | [ ] Not started |
| 8 | Tag PRDs | [ ] Not started |
| 9 | Search PRDs and skills | [ ] Not started |
| 10 | Bulk operations | [x] Partial - PRDs only |
| 11 | Archive without deletion | [ ] Not started |

**Progress: 0.5/11 (5%)**
```

This makes it impossible to miss uncompleted requirements.

## Avoiding Distraction

### Ignore
- Iteration reports from unrelated projects
- Features not in the current PRD
- "Nice to have" until "must have" is complete

### Focus On
- The PRD title deliverables
- Acceptance criteria (in order)
- Files explicitly listed in the PRD
- Security issues flagged in reviews

## Red Flag Detection

If you notice any of these, STOP and refocus:

1. **You're writing code for features not in the PRD**
   - Stop immediately
   - Check the PRD again
   - Delete the unrelated code

2. **Your iteration reports mention different projects**
   - You may be confused about which PRD you're implementing
   - Re-read the original PRD

3. **You've completed "50%" but all from one section**
   - PRD compliance requires ALL sections, not deep progress on one
   - Pivot to untouched sections

4. **Manager review says "PRD mismatch"**
   - This is critical feedback
   - Read the PRD title again
   - List what you've built vs what was requested

## Practical Example

### Wrong Approach
```
PRD: Skills & PRD Management UI

Iteration 1: Build PRD Editor
Iteration 2: Improve PRD Editor
Iteration 3: Add PRD Editor features
Iteration 4: PRD Editor polish
...
Iteration 30: Still no Skills UI
```

### Correct Approach
```
PRD: Skills & PRD Management UI

Iteration 1: Skills Library page (basic)
Iteration 2: SkillCard component
Iteration 3: PRD list view (basic)
Iteration 4: Skill detail page
Iteration 5: PRD organizer improvements
...
Iteration 10: Both features functional
```

**Build breadth first, depth second.**
