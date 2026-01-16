# PRD: Skills & PRD Management UI

## Overview

Add comprehensive UI for managing skills and PRDs within each instance. Users can add skills manually, import from other instances, generate with AI, and organize both skills and PRDs with drag-and-drop, tagging, and search.

## Goals

1. Visual skills library browser
2. Add skills manually or via AI generation
3. Import/export skills between instances
4. PRD organization (tags, categories, search)
5. Drag-and-drop PRD reordering
6. Skill effectiveness tracking
7. Quick actions for common operations

## Target Directory

`/Users/alexander/claude-manager-worker/dashboard/`

## User Stories

### As a user, I want to:
1. Browse all skills in my instance
2. Add a new skill manually with markdown
3. Ask AI to generate a skill from description
4. Import skills from another instance
5. See which skills helped with which PRDs
6. Tag and categorize PRDs
7. Search through PRDs and skills
8. Reorder PRDs by drag-and-drop
9. Archive completed PRDs
10. Export skills for reuse

## Technical Requirements

### UI Components

```
dashboard/
  app/
    manage/
      [instanceId]/
        page.tsx                # Management hub
        skills/
          page.tsx              # Skills library
          [skillId]/
            page.tsx            # Skill detail/edit
        prds/
          page.tsx              # PRD organizer
    components/
      management/
        SkillsLibrary.tsx       # Skills grid/list
        SkillCard.tsx           # Individual skill
        SkillGenerator.tsx      # AI skill generation
        PRDOrganizer.tsx        # PRD management
        ImportExport.tsx        # Import/export UI
        TagManager.tsx          # Tag management
```

### Features

#### Skills Library

**Display Modes:**
- Grid view (cards)
- List view (detailed)
- Timeline view (chronologically)

**Skill Card Shows:**
- Skill name
- Category/tags
- Created date
- Times used
- Success rate
- Quick preview
- Edit/Delete actions

**Operations:**
- **Add Skill**: Manual or AI-generated
- **Import**: From file or another instance
- **Export**: Single or batch export
- **Duplicate**: Copy and modify
- **Archive**: Hide without deleting

#### AI Skill Generator

Prompt-based skill creation:
```
User: "Generate a skill for React hook optimization"

AI: Creates skill file with:
- Title
- Description
- When to use
- Code examples
- Common patterns
- Anti-patterns
```

#### PRD Organizer

**Features:**
- Drag-and-drop reordering
- Multi-select operations
- Tag/category assignment
- Status tracking
- Priority levels
- Estimated complexity
- Dependency visualization

**Views:**
- Kanban board (todo/in-progress/done)
- List view with sorting
- Calendar view (by created/due date)
- Dependency graph

### API Endpoints

```typescript
// Skills Management
GET /api/skills/:instanceId
Response: { skills: Skill[] }

POST /api/skills/:instanceId
{
  name: string;
  content: string;
  category?: string;
  tags?: string[];
}
Response: { filename: string }

PUT /api/skills/:instanceId/:skillFile
{
  content: string;
}
Response: { success: boolean }

DELETE /api/skills/:instanceId/:skillFile
Response: { success: boolean }

POST /api/skills/generate
{
  instanceId: string;
  description: string;
}
Response: { skill: string }

POST /api/skills/import
{
  instanceId: string;
  source: string; // file path or instance ID
  skillFiles: string[];
}
Response: { imported: number }

POST /api/skills/export
{
  instanceId: string;
  skillFiles: string[];
  format: 'zip' | 'json';
}
Response: { downloadUrl: string }

// PRD Management
GET /api/prds/:instanceId
Response: { prds: PRDMetadata[] }

PUT /api/prds/:instanceId/reorder
{
  order: string[];
}
Response: { success: boolean }

POST /api/prds/:instanceId/:prdFile/tag
{
  tags: string[];
}
Response: { success: boolean }

GET /api/prds/:instanceId/search
{
  query: string;
  filters?: { status, tags, priority };
}
Response: { results: PRDSearchResult[] }
```

### Data Models

```typescript
interface Skill {
  filename: string;
  title: string;
  category: string;
  tags: string[];
  createdAt: string;
  usedCount: number;
  successRate: number;
  content: string;
}

interface PRDMetadata {
  filename: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  complexity: 'simple' | 'medium' | 'complex';
  dependencies: string[];
  estimatedIterations: number;
  actualIterations?: number;
  createdAt: string;
  completedAt?: string;
}
```

## UI/UX Design

### Skills Library View

```
┌──────────────────────────────────────────────────────────┐
│ 🎓 Skills Library: my-project    [+ Add] [📥 Import] [▼] │
├──────────────────────────────────────────────────────────┤
│ 🔍 Search: [                    ] 🏷️ Tags: [All ▼]     │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│ │ React Hooks  │ │ API Design   │ │ Error Hand.  │      │
│ │              │ │              │ │              │      │
│ │ Used: 12x    │ │ Used: 8x     │ │ Used: 15x    │      │
│ │ ⭐⭐⭐⭐⭐   │ │ ⭐⭐⭐⭐    │ │ ⭐⭐⭐       │      │
│ │              │ │              │ │              │      │
│ │ [View] [✏️]  │ │ [View] [✏️]  │ │ [View] [✏️]  │      │
│ └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                           │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│ │ Database Opt.│ │ Testing Strat│ │ State Mgmt   │      │
│ │              │ │              │ │              │      │
│ │ Used: 5x     │ │ Used: 10x    │ │ Used: 7x     │      │
│ │ ⭐⭐⭐⭐     │ │ ⭐⭐⭐⭐⭐   │ │ ⭐⭐⭐⭐    │      │
│ │              │ │              │ │              │      │
│ │ [View] [✏️]  │ │ [View] [✏️]  │ │ [View] [✏️]  │      │
│ └──────────────┘ └──────────────┘ └──────────────┘      │
└──────────────────────────────────────────────────────────┘
```

### AI Skill Generator Modal

```
┌────────────────────────────────────────────┐
│ ✨ Generate New Skill                      │
├────────────────────────────────────────────┤
│ Describe what skill you need:              │
│ ┌────────────────────────────────────────┐ │
│ │ A skill for optimizing React hooks    │ │
│ │ to prevent unnecessary re-renders     │ │
│ └────────────────────────────────────────┘ │
│                                             │
│ Category: [React ▼]                        │
│ Tags: [performance, hooks, optimization]   │
│                                             │
│                      [🎯 Generate Skill]   │
├────────────────────────────────────────────┤
│ Generated Skill Preview:                   │
│ ┌────────────────────────────────────────┐ │
│ │ # React Hook Optimization               │ │
│ │                                         │ │
│ │ ## When to Use                          │ │
│ │ - Component re-renders too frequently   │ │
│ │ - useEffect runs unnecessarily          │ │
│ │ ...                                     │ │
│ └────────────────────────────────────────┘ │
│                                             │
│          [✏️ Edit] [💾 Save] [Cancel]     │
└────────────────────────────────────────────┘
```

### PRD Organizer - Kanban View

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 PRD Organizer: my-project            [List] [Kanban] [▼] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────┬──────────────┬──────────────┬───────────┐ │
│ │ 📝 Todo (3)  │ 🔄 In Prog(1)│ ✅ Done (5)  │ 🚫 Blocked│ │
│ ├──────────────┼──────────────┼──────────────┼───────────┤ │
│ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │           │ │
│ │ │User Auth │ │ │Payment   │ │ │Setup DB  │ │           │ │
│ │ │⚡ High   │ │ │⭐ Medium │ │ │✓         │ │           │ │
│ │ │#auth     │ │ │#payments │ │ │#database │ │           │ │
│ │ └──────────┘ │ └──────────┘ │ └──────────┘ │           │ │
│ │              │              │ ┌──────────┐ │           │ │
│ │ ┌──────────┐ │              │ │API Setup │ │           │ │
│ │ │Email     │ │              │ │✓         │ │           │ │
│ │ │🔽 Low    │ │              │ └──────────┘ │           │ │
│ │ │#email    │ │              │              │           │ │
│ │ └──────────┘ │              │ ...          │           │ │
│ └──────────────┴──────────────┴──────────────┴───────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Import/Export Modal

```
┌────────────────────────────────────────┐
│ 📦 Import Skills                       │
├────────────────────────────────────────┤
│ Source:                                 │
│ ○ From another instance                │
│   Instance: [other-project ▼]         │
│                                         │
│ ○ From file                            │
│   [Choose File]                        │
│                                         │
│ ○ From skill library URL               │
│   URL: [                      ]        │
│                                         │
│ Available Skills (5):                  │
│ ☑ react_hooks_correctness.md          │
│ ☑ api_performance.md                  │
│ ☐ database_optimization.md            │
│ ☐ error_handling_patterns.md          │
│ ☐ testing_best_practices.md           │
│                                         │
│ [Select All] [Select None]            │
│                                         │
│        [📥 Import] [Cancel]            │
└────────────────────────────────────────┘
```

## Acceptance Criteria

1. [ ] Skills library displays all skills with metadata
2. [ ] Add skill manually with markdown editor
3. [ ] AI generates valid skills from descriptions
4. [ ] Import skills from files and other instances
5. [ ] Export skills as zip or JSON
6. [ ] Skills show usage statistics
7. [ ] PRD kanban board with drag-and-drop
8. [ ] Tag PRDs and filter by tags
9. [ ] Search works across PRDs and skills
10. [ ] Bulk operations on multiple items
11. [ ] Archive/unarchive without deletion

## Out of Scope (v1)

- Skill marketplace or community sharing
- Automatic skill recommendation
- A/B testing different skills
- Skills with executable code
- Version control for skills
- Skill dependencies/composition

## Implementation Phases

### Phase 1: Skills Library (3 iterations)
- Skills display UI
- Manual skill creation
- Basic CRUD operations
- Usage statistics

### Phase 2: AI Skill Generation (2 iterations)
- Generation prompt UI
- AI integration
- Preview and editing
- Save generated skills

### Phase 3: Import/Export (2 iterations)
- Import from files
- Import from instances
- Export functionality
- Batch operations

### Phase 4: PRD Organizer (3 iterations)
- Kanban board UI
- Drag-and-drop
- Tags and filtering
- Search functionality

## Technical Notes

### Drag-and-Drop Library
Use `@dnd-kit` for React:
```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
```

### Skill Usage Tracking
Track when skills are used:
```typescript
// After each iteration, log which skills were referenced
{
  "skillUsage": {
    "react_hooks.md": {
      "usedInPRDs": ["01_auth.md", "03_profile.md"],
      "successfulIterations": 12,
      "totalIterations": 15,
      "successRate": 0.80
    }
  }
}
```

### Search Implementation
Use Fuse.js for fuzzy search:
```typescript
import Fuse from 'fuse.js';

const fuse = new Fuse(prds, {
  keys: ['title', 'content', 'tags'],
  threshold: 0.3,
});

const results = fuse.search(query);
```

## Priority

**Medium-High** - Important for power users managing many PRDs and skills.

## Estimated Complexity

**Medium** - UI-heavy but straightforward CRUD operations.
