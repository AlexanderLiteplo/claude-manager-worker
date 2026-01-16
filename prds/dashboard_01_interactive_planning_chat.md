# PRD: Interactive Planning Mode Chat Interface

## Overview

Add a real-time chat interface to the dashboard where users can have a back-and-forth conversation with Claude in planning mode before starting an instance. This allows users to refine requirements, discuss approaches, and collaboratively plan the implementation before committing to autonomous execution.

## Goals

1. Add chat UI to instance creation/management
2. Enable planning mode conversation with Claude before starting work
3. Save conversation history with the instance
4. Allow refinement of PRDs through dialogue
5. Seamlessly transition from planning to execution

## Target Directory

`/Users/alexander/claude-manager-worker/dashboard/`

## User Stories

### As a user, I want to:
1. Open a planning chat for a new or existing instance
2. Discuss requirements with Claude before writing PRDs
3. Ask Claude to suggest implementation approaches
4. Refine ideas through conversation
5. Have Claude draft PRDs based on our discussion
6. Review and approve the plan before starting autonomous work
7. Resume planning conversations later
8. See conversation history for reference

## Technical Requirements

### UI Components

```
dashboard/
  app/
    planning/
      [instanceId]/
        page.tsx              # Planning chat interface
    components/
      planning/
        PlanningChat.tsx      # Main chat component
        MessageBubble.tsx     # Chat message display
        PlanningToolbar.tsx   # Actions (export, start work)
        ConversationHistory.tsx # Past conversations
```

### Features

#### Chat Interface
- Text input with markdown support
- Real-time message streaming
- Code block syntax highlighting
- File attachment preview (for context)
- Message history scrolling
- Typing indicators

#### Planning Mode
- Uses Claude API in planning mode (no tool calls)
- Context includes:
  - Instance configuration
  - Existing PRDs
  - Skills available
  - Previous conversation history
- Can discuss:
  - Feature requirements
  - Technical approaches
  - Trade-offs and alternatives
  - Implementation strategies

#### Actions
- **Draft PRD**: Ask Claude to write a PRD from conversation
- **Export Chat**: Download conversation as markdown
- **Start Work**: Transition from planning to autonomous execution
- **Save & Resume**: Save conversation for later
- **Clear Context**: Start fresh conversation

### API Endpoints

```typescript
// New routes in dashboard/app/api/

POST /api/planning/message
{
  instanceId: string;
  message: string;
  conversationId?: string;
}
Response: { reply: string, conversationId: string }

GET /api/planning/history/:instanceId
Response: { conversations: Conversation[] }

POST /api/planning/draft-prd
{
  instanceId: string;
  conversationId: string;
  topic: string;
}
Response: { prd: string }

POST /api/planning/save
{
  instanceId: string;
  conversationId: string;
  title: string;
}
Response: { success: boolean }
```

### Data Storage

```json
// Stored in ~/claude-managers/{instance}/planning/
{
  "conversations": [
    {
      "id": "conv_123",
      "title": "User Auth Feature Discussion",
      "createdAt": "2026-01-15T10:00:00Z",
      "messages": [
        {
          "role": "user",
          "content": "I want to add user authentication",
          "timestamp": "2026-01-15T10:00:00Z"
        },
        {
          "role": "assistant",
          "content": "Let's discuss your authentication needs...",
          "timestamp": "2026-01-15T10:00:15Z"
        }
      ],
      "artifacts": [
        {
          "type": "prd",
          "filename": "user_auth.md",
          "createdAt": "2026-01-15T10:30:00Z"
        }
      ]
    }
  ]
}
```

### Integration with Claude API

```typescript
// Use Claude API directly for planning conversations
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 4096,
  messages: conversationHistory,
  system: `You are helping plan a software implementation.
  Current instance: ${instance.name}
  Existing PRDs: ${instance.prds.list.join(', ')}

  Help the user:
  - Clarify requirements
  - Discuss technical approaches
  - Identify edge cases
  - Draft PRDs when ready

  Be thorough and ask clarifying questions.`,
});
```

## UI/UX Design

### Planning Chat Screen

```
┌─────────────────────────────────────────────────────┐
│ 📋 Planning: my-project                    [X Close] │
├─────────────────────────────────────────────────────┤
│                                                       │
│  👤 User                                              │
│  ┌──────────────────────────────────────────────┐   │
│  │ I want to add a user authentication system   │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
│  🤖 Claude                                            │
│  ┌──────────────────────────────────────────────┐   │
│  │ Great! Let's plan this out. A few questions: │   │
│  │                                               │   │
│  │ 1. Email/password or social auth (OAuth)?    │   │
│  │ 2. Do you need 2FA?                          │   │
│  │ 3. Password reset flow?                      │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
│  👤 User                                              │
│  ┌──────────────────────────────────────────────┐   │
│  │ Email/password for now, yes to 2FA and reset│   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
├─────────────────────────────────────────────────────┤
│ [Type your message...]                    [📎][Send]│
├─────────────────────────────────────────────────────┤
│ [💾 Save] [📝 Draft PRD] [▶️ Start Work] [📤 Export]│
└─────────────────────────────────────────────────────┘
```

### Manager Card Integration

Add "💬 Plan" button to each instance card:
- Opens planning chat in modal or new page
- Shows # of saved conversations
- Recent conversation preview

## Acceptance Criteria

1. [ ] Chat interface loads and displays correctly
2. [ ] Messages send and receive in real-time
3. [ ] Markdown and code blocks render properly
4. [ ] Conversation history persists across sessions
5. [ ] "Draft PRD" generates valid PRD from conversation
6. [ ] Exported chats are readable markdown
7. [ ] "Start Work" transitions instance to running state
8. [ ] Multiple conversations can be saved per instance
9. [ ] Mobile responsive design
10. [ ] Loading states and error handling

## Out of Scope (v1)

- Voice input/output
- Screen sharing or collaborative editing
- Video chat integration
- Real-time collaboration (multi-user)
- Integration with external chat platforms
- Auto-save drafts as you type

## Implementation Phases

### Phase 1: Basic Chat (2-3 iterations)
- Chat UI component
- Message display and input
- Claude API integration
- Basic conversation flow

### Phase 2: Persistence (1-2 iterations)
- Save conversations to disk
- Load conversation history
- Conversation list UI

### Phase 3: PRD Generation (2 iterations)
- Draft PRD from conversation
- Preview PRD before saving
- Add PRD to instance queue

### Phase 4: Polish (1 iteration)
- Export functionality
- Mobile responsive
- Error handling
- Loading states

## Success Metrics

- Users engage in planning conversations before starting instances
- Average conversation length >5 messages (shows engagement)
- PRDs generated from planning have fewer issues
- Reduced need for mid-execution clarifications
- User feedback positive on planning experience

## Technical Notes

### Streaming Responses
Use server-sent events for streaming Claude responses:
```typescript
// API route returns ReadableStream
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  },
});
```

### Context Management
Include relevant context automatically:
- Instance configuration
- Existing PRDs (titles and summaries)
- Previous conversation summaries
- Available skills

### Cost Considerations
- Use Sonnet for planning (faster, cheaper)
- Limit context window appropriately
- Cache system prompts
- Estimated cost: $0.01-0.05 per conversation

## Priority

**High** - This enables better planning and reduces wasted autonomous iterations.

## Estimated Complexity

**Medium** - Requires real-time streaming, state management, and API integration but no complex algorithms.
