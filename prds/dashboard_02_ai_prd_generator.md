# PRD: AI-Powered PRD Generator & Queue Manager

## Overview

Add an AI-assisted PRD creation interface that lets users describe features in natural language and have Claude generate properly formatted PRDs that get added to the instance's work queue. Users can prompt, refine, and approve PRDs before they're added.

## Goals

1. Generate PRDs from natural language descriptions
2. Interactive refinement through prompting
3. Preview and edit generated PRDs before adding
4. Add PRDs directly to instance queue
5. Bulk PRD generation for related features
6. Template-based PRD creation with AI fill-in

## Target Directory

`/Users/alexander/claude-manager-worker/dashboard/`

## User Stories

### As a user, I want to:
1. Click "Generate PRD" and describe a feature
2. Have AI create a structured PRD from my description
3. Ask AI to refine specific sections
4. Preview the PRD before adding it
5. Edit the PRD inline if needed
6. Add the PRD to my instance's queue
7. Generate multiple related PRDs at once
8. Save PRD templates for reuse

## Technical Requirements

### UI Components

```
dashboard/
  app/
    prd-generator/
      [instanceId]/
        page.tsx                # PRD generator interface
    components/
      prd/
        PRDGenerator.tsx        # Main generator UI
        PRDPreview.tsx          # Markdown preview
        PRDEditor.tsx           # Inline editor
        TemplateSelector.tsx    # PRD templates
        QueueManager.tsx        # View/manage PRD queue
```

### Features

#### Generation Flow

1. **Prompt Input**
   ```
   User: "Add user authentication with email/password"
   ```

2. **AI Processing**
   - Analyzes prompt
   - Asks clarifying questions if needed
   - Generates structured PRD

3. **Preview & Edit**
   - Shows generated PRD
   - Inline editing
   - Section-by-section refinement

4. **Approval & Queue**
   - Add to instance queue
   - Set priority
   - Auto-number PRD files

#### PRD Templates

Pre-defined templates users can choose:
- **Feature Addition**: New feature implementation
- **Bug Fix**: Bug investigation and fix
- **Refactoring**: Code quality improvement
- **API Integration**: External service integration
- **Testing**: Test suite creation
- **Documentation**: Documentation writing
- **Performance**: Optimization work

Each template has AI fill in specific sections based on user prompts.

### API Endpoints

```typescript
POST /api/prd/generate
{
  instanceId: string;
  prompt: string;
  template?: string;
  context?: {
    existingPRDs: string[];
    technologies: string[];
    constraints: string[];
  };
}
Response: { prd: string, suggestions: string[] }

POST /api/prd/refine
{
  instanceId: string;
  currentPRD: string;
  refinementPrompt: string;
}
Response: { updatedPRD: string }

POST /api/prd/add-to-queue
{
  instanceId: string;
  prdContent: string;
  priority?: number;
}
Response: { filename: string, success: boolean }

GET /api/prd/queue/:instanceId
Response: { prds: PRDQueueItem[] }

POST /api/prd/reorder
{
  instanceId: string;
  prdOrder: string[];
}
Response: { success: boolean }
```

### PRD Generation Prompt

```typescript
const systemPrompt = `You are a PRD generator for the Claude Manager-Worker system.

Instance: ${instance.name}
Tech Stack: ${instance.config.technologies || 'Unknown'}
Existing PRDs: ${instance.prds.list.join(', ')}

Generate a comprehensive PRD following this structure:

# PRD: [Feature Name]

## Overview
[2-3 sentences describing what we're building]

## Goals
[Numbered list of specific objectives]

## Target Directory
[Where code should be implemented]

## User Stories
[As a X, I want to Y, so that Z]

## Technical Requirements
[Detailed technical specs with code examples]

## Acceptance Criteria
[Checkboxes for completion criteria]

## Out of Scope
[What NOT to do]

## Priority
[High/Medium/Low]

## Estimated Complexity
[Simple/Medium/Complex]

Be specific, actionable, and include code examples where relevant.`;
```

### PRD Queue Management

Store queue state in instance config:
```json
{
  "prdQueue": [
    {
      "filename": "01_feature.md",
      "title": "User Authentication",
      "priority": 1,
      "status": "pending",
      "addedAt": "2026-01-15T10:00:00Z",
      "estimatedIterations": 5
    }
  ]
}
```

## UI/UX Design

### PRD Generator Interface

```
┌────────────────────────────────────────────────────────────┐
│ 🎯 Generate PRD for: my-project              [Template ▼] │
├────────────────────────────────────────────────────────────┤
│ Step 1: Describe Your Feature                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Add user authentication with email/password login.     │ │
│ │ Include password reset and 2FA.                        │ │
│ │                                                         │ │
│ └────────────────────────────────────────────────────────┘ │
│                                       [✨ Generate PRD]    │
├────────────────────────────────────────────────────────────┤
│ Step 2: Review & Refine                                    │
│                                                             │
│ ┌─── Generated PRD ───────────────────────────────────┐   │
│ │ # PRD: User Authentication System                    │   │
│ │                                                       │   │
│ │ ## Overview                                          │   │
│ │ Implement secure email/password authentication...    │   │
│ │                                                       │   │
│ │ ## Goals                                             │   │
│ │ 1. User registration with email validation          │   │
│ │ 2. Secure password storage (bcrypt)                 │   │
│ │ ...                                                  │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ Refinement Prompt:                                          │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Add section about session management                   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                        [🔄 Refine]         │
├────────────────────────────────────────────────────────────┤
│ Step 3: Add to Queue                                       │
│                                                             │
│ Priority: [High ▼]   Filename: [02_user_auth.md]          │
│                                                             │
│ [ ✓ ] Add to instance PRD queue                            │
│ [ ✓ ] Auto-start instance after adding                     │
│                                                             │
│                           [💾 Save] [✅ Add to Queue]      │
└────────────────────────────────────────────────────────────┘
```

### Queue Manager View

```
┌────────────────────────────────────────────────┐
│ 📋 PRD Queue: my-project          [+ New PRD] │
├────────────────────────────────────────────────┤
│ ⚡ High Priority (2)                           │
│ ├─ 01_user_auth.md          [▶️] [✏️] [🗑️]   │
│ └─ 02_payment_integration   [▶️] [✏️] [🗑️]   │
│                                                 │
│ 📌 Medium Priority (3)                         │
│ ├─ 03_email_notifications                      │
│ ├─ 04_profile_settings                         │
│ └─ 05_search_functionality                     │
│                                                 │
│ 🔽 Low Priority (1)                            │
│ └─ 06_dark_mode                                │
│                                                 │
│ ✓ Completed (2)                                │
│ ├─ 00_project_setup                            │
│ └─ 01_database_schema                          │
└────────────────────────────────────────────────┘
```

## Acceptance Criteria

1. [ ] AI generates valid PRDs from natural language
2. [ ] Generated PRDs follow standard format
3. [ ] Refinement prompts update specific sections
4. [ ] Preview shows markdown rendering
5. [ ] Inline editing works for all sections
6. [ ] PRDs added to queue with correct numbering
7. [ ] Queue displays all PRDs with status
8. [ ] Drag-and-drop reordering works
9. [ ] Priority levels affect execution order
10. [ ] Templates speed up common PRD types

## Out of Scope (v1)

- AI analyzing existing code to suggest PRDs
- Multi-user collaboration on PRD editing
- Version control for PRD changes
- PRD approval workflow with multiple reviewers
- Integration with external project management tools

## Implementation Phases

### Phase 1: Basic Generation (2 iterations)
- Prompt input UI
- Claude API integration
- Basic PRD generation
- Preview display

### Phase 2: Refinement (2 iterations)
- Refinement prompt handling
- Inline editing
- Section-specific updates

### Phase 3: Queue Management (2 iterations)
- Add to queue functionality
- Queue display UI
- File numbering system
- Priority management

### Phase 4: Templates & Polish (1-2 iterations)
- Template system
- Drag-and-drop reordering
- Bulk operations
- Error handling

## Technical Notes

### PRD Numbering
Auto-increment filenames:
```typescript
function getNextPRDNumber(existingPRDs: string[]): string {
  const numbers = existingPRDs
    .map(f => parseInt(f.match(/^(\d+)_/)?.[1] || '0'))
    .filter(n => !isNaN(n));

  const next = Math.max(0, ...numbers) + 1;
  return String(next).padStart(2, '0');
}
```

### Context-Aware Generation
Include instance context in generation:
```typescript
const context = {
  existingPRDs: instance.prds.list,
  technologies: instance.config.technologies,
  completedWork: instance.prds.completed,
  skills: instance.skills.list,
};
```

### Cost Estimation
- ~$0.02-0.10 per PRD generation (depending on complexity)
- Use Sonnet for speed and cost efficiency
- Cache common templates

## Priority

**High** - Makes the system much more accessible to non-technical users.

## Estimated Complexity

**Medium** - Requires AI integration, file management, and queue state tracking.
