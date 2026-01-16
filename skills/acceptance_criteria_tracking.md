# Skill: Acceptance Criteria Tracking

## When to Apply
Apply this skill throughout every implementation to ensure you're making measurable progress toward PRD completion. Track acceptance criteria explicitly in every iteration report.

## Guidelines

### 1. Extract Acceptance Criteria at Project Start

From the PRD, create a numbered list of all acceptance criteria:

```markdown
## PRD Acceptance Criteria

1. [ ] Full anime theme applied to all components
2. [ ] Sound effects play on all interactions
3. [ ] Model switching works for Worker
4. [ ] Model switching works for Manager
5. [ ] Particle background animates smoothly
6. [ ] Character avatars display correct model
7. [ ] Sound toggle works (on/off)
8. [ ] Volume control adjusts sound levels
9. [ ] Multiple sound packs available
10. [ ] Anime buttons have shine and sparkle effects
11. [ ] Cards have gradient borders and hover effects
12. [ ] Victory music plays on PRD completion
13. [ ] Error sounds play on failures
14. [ ] Settings persist in localStorage
15. [ ] Performance: 60fps animations
```

### 2. Include Status in Every Iteration Report

At the end of each iteration report, include the full acceptance criteria status:

```markdown
## Acceptance Criteria Status

| # | Criterion | Status | Implementation Notes |
|---|-----------|--------|---------------------|
| 1 | Full anime theme applied | ⏳ 20% | AnimeCard done, AnimeButton pending |
| 2 | Sound effects on interactions | ✅ Complete | SoundManager + useSoundEffect hook |
| 3 | Worker model switching | ❌ Not started | Blocked on API route |
...

**Progress: 2/15 (13%)**
```

### 3. Link Work to Criteria

Every piece of code you write should advance at least one acceptance criterion:

```markdown
## Work Completed This Iteration

### 1. Created SoundManager.ts
- **File**: `lib/sounds/SoundManager.ts`
- **Lines**: 150
- **Advances Criteria**: #2, #7, #8, #9
  - #2: Provides play() method for sound effects
  - #7: Implements setEnabled() for toggle
  - #8: Implements setVolume() for volume control
  - #9: Implements loadSoundPack() for pack switching
```

### 4. Prioritize Criteria Completion

Work on criteria in dependency order:

```
Phase 1 (Foundation):
- Criteria #10, #11: AnimeButton, AnimeCard (UI components)
- Criteria #14: localStorage persistence (enables #7, #8, #9)

Phase 2 (Sound):
- Criteria #2: Sound effects
- Criteria #7: Sound toggle
- Criteria #8: Volume control
- Criteria #9: Sound packs
- Criteria #12, #13: Victory/error sounds

Phase 3 (Model Switching):
- Criteria #3, #4: Worker/Manager model switching
- Criteria #6: Character avatars

Phase 4 (Polish):
- Criteria #1: Full theme application
- Criteria #5: Particle background
- Criteria #15: 60fps performance
```

### 5. Don't Declare Victory Prematurely

A criterion is only "Complete" when:
1. The code is written and working
2. It handles edge cases
3. It's integrated into the UI
4. It's been tested manually

```markdown
## Criterion #2: Sound effects play on all interactions

### Requirements Check
- [x] SoundManager singleton created
- [x] useSoundEffect hook works in components
- [x] Click sounds play on AnimeButton
- [x] Hover sounds play on interactive elements
- [x] Success/error sounds play on API responses
- [x] Sounds respect enabled/disabled setting
- [x] Sounds respect volume setting

### Status: ✅ COMPLETE
```

### 6. Track Blockers Explicitly

If a criterion can't be completed, document why:

```markdown
## Criterion #3: Model switching works for Worker

### Status: ⏳ BLOCKED

### Blockers
1. API route `/api/control/models/route.ts` not yet created
2. Need to understand orchestrator.sh restart mechanism
3. Character avatar component not ready (dependency)

### Unblocking Action
Create `/api/control/models/route.ts` in next iteration
```

## Template: Iteration Report Acceptance Tracking Section

```markdown
## Acceptance Criteria Progress

### Criteria Advanced This Iteration
- **#2** (Sound effects): Completed SoundManager.ts ✅
- **#7** (Sound toggle): Completed toggle logic ✅
- **#8** (Volume control): Completed volume API ✅

### Criteria Not Yet Started
- #3, #4 (Model switching): Phase 3
- #5 (Particle background): Phase 4
- #6 (Character avatars): Phase 3

### Full Status Table

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Full anime theme | ⏳ 10% |
| 2 | Sound effects | ✅ Complete |
| 3 | Worker model switch | ❌ Not started |
| 4 | Manager model switch | ❌ Not started |
| 5 | Particle background | ❌ Not started |
| 6 | Character avatars | ❌ Not started |
| 7 | Sound toggle | ✅ Complete |
| 8 | Volume control | ✅ Complete |
| 9 | Sound packs | ⏳ 50% |
| 10 | Anime buttons | ❌ Not started |
| 11 | Anime cards | ❌ Not started |
| 12 | Victory music | ❌ Not started |
| 13 | Error sounds | ❌ Not started |
| 14 | Settings persist | ✅ Complete |
| 15 | 60fps animations | ⏳ Testing |

**Overall Progress: 4/15 (27%)**
```

## Common Mistakes to Avoid

1. **Not tracking criteria at all** - Makes it impossible to measure progress
2. **Marking "complete" without testing** - Leads to false completion claims
3. **Working on features not in criteria** - Wasted effort on non-requirements
4. **Ignoring blocked criteria** - Blockers should be documented and addressed
5. **Not updating status each iteration** - Status gets stale and misleading
6. **Focusing on one criterion too long** - Spread work across phases
