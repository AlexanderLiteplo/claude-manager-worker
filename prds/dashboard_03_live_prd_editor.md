# PRD: Live PRD Editor with AI Assistance

## Overview

Add a live PRD editing interface where users can view, edit, and refine PRDs in real-time with AI assistance. Users can prompt "no", "yes", "change this", "edit that" and have Claude make specific changes without losing context or flow.

## Goals

1. Live PRD editing with markdown preview
2. AI-powered editing commands ("change X to Y", "remove section Z")
3. Inline comments and suggestions
4. Track changes and version history
5. Approve/reject AI suggestions
6. Multi-PRD editing (batch operations)

## Target Directory

`/Users/alexander/claude-manager-worker/dashboard/`

## User Stories

### As a user, I want to:
1. Open any PRD in a live editor
2. Say "no" and have AI remove or change something
3. Say "make the goals more specific" and see updates
4. Edit markdown directly while seeing preview
5. Accept or reject AI suggestions inline
6. See what changed (diff view)
7. Revert to previous versions
8. Edit multiple PRDs at once with AI help

## Technical Requirements

### UI Components

```
dashboard/
  app/
    prd-editor/
      [instanceId]/
        [prdFile]/
          page.tsx              # Live editor interface
    components/
      editor/
        LivePRDEditor.tsx       # Split view editor
        AICommandInput.tsx      # Natural language commands
        DiffViewer.tsx          # Show changes
        VersionHistory.tsx      # Past versions
        SuggestionPanel.tsx     # AI suggestions
```

### Features

#### Split-View Editor

```
┌─────────────────────────┬─────────────────────────┐
│     Markdown Source     │      Live Preview       │
├─────────────────────────┼─────────────────────────┤
│ # PRD: User Auth        │  PRD: User Auth         │
│                         │                         │
│ ## Overview             │  Overview               │
│ This implements...      │  This implements...     │
│                         │                         │
│ ## Goals                │  Goals                  │
│ 1. Secure login         │  1. Secure login        │
│ 2. Password reset       │  2. Password reset      │
└─────────────────────────┴─────────────────────────┘
```

#### AI Command System

Natural language editing commands:
```
"no" → Undoes last AI change
"yes" → Accepts and applies change
"change this" → Prompts for what to change
"edit that" → Targets specific section
"add section about X" → Inserts new section
"remove the part about Y" → Deletes content
"make this more detailed" → Expands section
"simplify" → Reduces complexity
"fix grammar" → Proofreading pass
```

#### Suggestion Workflow

1. User types command
2. AI processes and shows diff
3. User reviews changes (highlight what changed)
4. User accepts, rejects, or refines
5. Changes apply to document
6. Version saved automatically

### API Endpoints

```typescript
POST /api/editor/command
{
  instanceId: string;
  prdFile: string;
  currentContent: string;
  command: string;
  selection?: { start: number, end: number };
}
Response: {
  updatedContent: string;
  changes: Diff[];
  explanation: string;
}

POST /api/editor/save
{
  instanceId: string;
  prdFile: string;
  content: string;
  commitMessage: string;
}
Response: { version: string, success: boolean }

GET /api/editor/history/:instanceId/:prdFile
Response: { versions: Version[] }

POST /api/editor/revert
{
  instanceId: string;
  prdFile: string;
  version: string;
}
Response: { content: string }

POST /api/editor/batch-edit
{
  instanceId: string;
  prdFiles: string[];
  command: string;
}
Response: { results: BatchEditResult[] }
```

### AI Command Processing

```typescript
const systemPrompt = `You are editing a PRD. Follow user commands precisely.

Current PRD:
\`\`\`
${currentContent}
\`\`\`

User command: "${command}"

${selection ? `Selected text: "${selectedText}"` : ''}

Apply the requested change. Return ONLY the full updated PRD content, no explanation.

Common commands:
- "no" = undo last change
- "add section about X" = insert new section
- "change X to Y" = replace content
- "remove the part about Z" = delete section
- "make this more detailed" = expand with specifics`;
```

### Version History

Store versions with metadata:
```json
{
  "versions": [
    {
      "id": "v1",
      "timestamp": "2026-01-15T10:00:00Z",
      "content": "...",
      "changes": [
        {
          "type": "addition",
          "line": 15,
          "content": "+ Added acceptance criteria section"
        }
      ],
      "commitMessage": "Added acceptance criteria",
      "author": "ai-command"
    }
  ]
}
```

## UI/UX Design

### Live Editor Interface

```
┌─────────────────────────────────────────────────────────────┐
│ ✏️ Editing: 02_user_auth.md               [Versions ▼] [💾] │
├─────────────────────────────────────────────────────────────┤
│ AI Command:                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Add a section about password requirements              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                          [🎯 Apply Command] │
├──────────────────────┬──────────────────────────────────────┤
│                      │                                       │
│  Markdown Editor     │        Live Preview                  │
│                      │                                       │
│  # PRD: User Auth    │   PRD: User Authentication           │
│                      │                                       │
│  ## Overview         │   Overview                           │
│  Implement...        │   Implement secure authentication... │
│                      │                                       │
│  ## Goals            │   Goals                              │
│  1. Secure...        │   1. Secure login                    │
│                      │   2. Password reset                  │
│  [Suggested Change]  │   3. Two-factor authentication       │
│  + ## Password Req.  │                                       │
│  + - Min 12 chars    │   [New Section Suggested]            │
│  + - Mixed case      │   Password Requirements              │
│                      │   - Minimum 12 characters            │
│  [Accept] [Reject]   │   - Mixed case                       │
│                      │                                       │
└──────────────────────┴──────────────────────────────────────┘
```

### Diff Viewer

Shows changes with colors:
```
┌─────────────────────────────────────────┐
│ 📊 Changes Preview                      │
├─────────────────────────────────────────┤
│ Line 15: + ## Password Requirements     │ ← Green
│ Line 16: + - Minimum 12 characters      │
│ Line 17: + - Must include uppercase     │
│ Line 18: + - Must include numbers       │
│                                          │
│ Line 42: - Simple password OK           │ ← Red
│                                          │
│ Line 50: ~ Updated acceptance criteria  │ ← Yellow
└─────────────────────────────────────────┘
```

### Version History Panel

```
┌─────────────────────────────────────┐
│ 📚 Version History                  │
├─────────────────────────────────────┤
│ v5 - 5 mins ago                     │
│ ├─ Added password requirements      │
│ └─ [Restore]                        │
│                                      │
│ v4 - 15 mins ago                    │
│ ├─ Removed OAuth section            │
│ └─ [Restore]                        │
│                                      │
│ v3 - 1 hour ago                     │
│ ├─ Expanded goals section           │
│ └─ [Restore]                        │
│                                      │
│ v2 - 2 hours ago                    │
│ ├─ Fixed typos                      │
│ └─ [Restore]                        │
│                                      │
│ v1 - 3 hours ago                    │
│ ├─ Initial PRD                      │
│ └─ [Restore]                        │
└─────────────────────────────────────┘
```

## Acceptance Criteria

1. [ ] Split-view editor with real-time preview
2. [ ] Natural language commands work accurately
3. [ ] Changes highlighted with diff view
4. [ ] Accept/reject workflow for suggestions
5. [ ] Version history saves automatically
6. [ ] Revert to any previous version
7. [ ] Markdown syntax highlighting
8. [ ] Code blocks render properly
9. [ ] Batch editing multiple PRDs works
10. [ ] Keyboard shortcuts for common actions
11. [ ] Auto-save prevents data loss

## Out of Scope (v1)

- Collaborative real-time editing (multi-user)
- Conflict resolution for concurrent edits
- Branch/merge workflow
- Integration with Git
- Track changes mode like Word
- Comments and annotations from others

## Implementation Phases

### Phase 1: Basic Editor (2 iterations)
- Split-view layout
- Markdown editing
- Live preview
- File save/load

### Phase 2: AI Commands (3 iterations)
- Command input UI
- AI command processing
- Diff generation
- Apply changes

### Phase 3: Version History (2 iterations)
- Auto-save versions
- Version list UI
- Restore functionality
- Diff between versions

### Phase 4: Advanced Features (2 iterations)
- Batch editing
- Keyboard shortcuts
- Selection-based commands
- Smart suggestions

## Technical Notes

### Markdown Editor Library
Use a robust editor like:
- **Monaco Editor** (VS Code's editor)
- **CodeMirror 6** (lightweight)
- **React Markdown Editor**

### Diff Algorithm
Use a library for computing diffs:
```typescript
import { diffLines } from 'diff';

const differences = diffLines(oldContent, newContent);
// Returns array of {added, removed, value}
```

### Command Parsing
Extract intent from natural language:
```typescript
const commandPatterns = {
  add: /add (section|paragraph) about (.+)/i,
  remove: /remove (the )?(part|section) about (.+)/i,
  change: /change (.+) to (.+)/i,
  expand: /make (.+) more (detailed|specific)/i,
  simplify: /simplify|make (.+) simpler/i,
};
```

### Auto-Save Strategy
- Save to localStorage every 30 seconds
- Create version on manual save
- Keep last 20 versions per PRD

## Priority

**High** - Essential for iterative refinement of PRDs.

## Estimated Complexity

**Medium-High** - Requires sophisticated text editing, diff computation, and AI integration.
