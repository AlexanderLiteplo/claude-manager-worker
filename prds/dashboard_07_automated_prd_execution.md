# PRD: Automated PRD Execution from Planning Mode

## Overview

Enhance the planning mode to automatically generate PRDs from planning conversations and immediately start implementation. After discussing requirements with the user, Claude will create detailed PRDs and trigger the claude-manager to start building them autonomously.

## Goals

1. Seamless flow from planning conversation to execution
2. Automatic PRD generation from conversation context
3. One-click implementation start after planning
4. Progress tracking of auto-generated PRDs
5. Ability to review and edit PRDs before execution
6. Multi-PRD generation from complex plans
7. Automatic task breakdown and prioritization

## Target Directory

`/Users/alexander/claude-manager-worker/dashboard/`

## User Stories

### As a user, I want to:
1. Chat with Claude about what I want to build
2. Have Claude automatically create PRDs from our conversation
3. Review the generated PRDs before starting work
4. Click one button to start implementation
5. See progress as Claude builds my features
6. Have Claude break down complex projects into multiple PRDs
7. Get notified when PRDs are complete
8. Iterate on PRDs if they need refinement

## Technical Requirements

### Architecture

```
dashboard/
  app/
    api/
      planning/
        message/
          route.ts              # Enhanced with PRD extraction
        generate-prds/
          route.ts              # POST generate PRDs from conversation
        execute-plan/
          route.ts              # POST start implementation
        review/
          route.ts              # GET PRDs for review, POST edits
  components/
    planning/
      PlanningChat.tsx          # Enhanced with PRD preview
      PrdPreviewModal.tsx       # Modal to review generated PRDs
      PrdReviewCard.tsx         # Card showing single PRD
      ExecutionProgress.tsx     # Real-time progress tracker
      PlanSummary.tsx           # Summary of generated plan
```

### 1. Enhanced Planning Flow

```typescript
// Flow:
// 1. User chats with Claude about requirements
// 2. When ready, user clicks "Generate Plan"
// 3. Claude analyzes conversation and creates:
//    - Project breakdown
//    - Multiple PRDs (if complex)
//    - Implementation order
// 4. User reviews PRDs in modal
// 5. User can edit or approve PRDs
// 6. Click "Start Implementation" to begin
// 7. Dashboard shows live progress

interface GeneratedPlan {
  title: string;
  summary: string;
  prds: GeneratedPRD[];
  estimatedComplexity: 'simple' | 'medium' | 'complex';
  suggestedOrder: number[];
}

interface GeneratedPRD {
  id: string;
  filename: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  dependencies: string[]; // IDs of other PRDs this depends on
  estimatedIterations: number;
}
```

### 2. PRD Generation API

```typescript
// app/api/planning/generate-prds/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import path from 'path';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { instancePath, conversationId, messages, userRequest } = await request.json();

    // Build prompt for PRD generation
    const systemPrompt = `You are an expert software architect and technical writer.

Analyze the conversation below and generate detailed PRDs (Product Requirements Documents) for the project.

For each distinct feature or component, create a separate PRD following this structure:

# PRD: [Feature Name]

## Overview
[Clear description of what this builds]

## Goals
[3-5 bullet points of what success looks like]

## User Stories
As a [role], I want to [action] so that [benefit]
[3-8 user stories]

## Technical Requirements

### Architecture
[File structure, components, data flow]

### Implementation Details
[Specific code examples, API endpoints, database schema]

### Dependencies
[External libraries, services, prerequisites]

## Acceptance Criteria
- [ ] [Specific testable criterion]
- [ ] [Another criterion]
[5-10 criteria]

## Out of Scope (v1)
[What we're NOT building in this version]

## Priority
[High/Medium/Low]

## Estimated Complexity
[Simple/Medium/High]

Return your response as a JSON object:
{
  "plan": {
    "title": "Project Title",
    "summary": "Overall project summary",
    "prds": [
      {
        "filename": "feature_name.md",
        "title": "Feature Name",
        "content": "Full PRD markdown content",
        "priority": "high|medium|low",
        "dependencies": ["other_feature.md"],
        "estimatedIterations": 25
      }
    ],
    "estimatedComplexity": "simple|medium|complex",
    "suggestedOrder": [0, 1, 2]
  }
}`;

    // Prepare conversation context
    const conversationText = messages
      .map((m: any) => `${m.role === 'user' ? 'User' : 'Claude'}: ${m.content}`)
      .join('\n\n');

    const prompt = `${conversationText}\n\nUser's final request: ${userRequest}\n\nPlease analyze this conversation and generate PRDs.`;

    // Call Claude to generate PRDs
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract JSON from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON (Claude might wrap it in markdown code blocks)
    let jsonText = content.text;
    const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const generatedPlan = JSON.parse(jsonText);

    // Save PRDs to files
    const prdDir = path.join(instancePath, 'prds');
    await fs.mkdir(prdDir, { recursive: true });

    const savedPrds = [];
    for (const prd of generatedPlan.plan.prds) {
      const filePath = path.join(prdDir, prd.filename);
      await fs.writeFile(filePath, prd.content, 'utf-8');
      savedPrds.push({
        ...prd,
        path: filePath,
      });
    }

    // Save plan metadata
    const planMetaPath = path.join(instancePath, '.state', 'generated_plan.json');
    await fs.mkdir(path.dirname(planMetaPath), { recursive: true });
    await fs.writeFile(
      planMetaPath,
      JSON.stringify(
        {
          ...generatedPlan.plan,
          generatedAt: new Date().toISOString(),
          conversationId,
        },
        null,
        2
      )
    );

    return NextResponse.json({
      success: true,
      plan: {
        ...generatedPlan.plan,
        prds: savedPrds,
      },
    });
  } catch (error) {
    console.error('Error generating PRDs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PRDs' },
      { status: 500 }
    );
  }
}
```

### 3. Execution API

```typescript
// app/api/planning/execute-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { instancePath, workerModel, managerModel, maxIterations } = await request.json();

    // Start the orchestrator with the generated PRDs
    const scriptPath = `${instancePath}/scripts/orchestrator.sh`;
    const command = `cd "${instancePath}" && "${scriptPath}" start --worker-model ${workerModel} --manager-model ${managerModel} --max-iterations ${maxIterations}`;

    const { stdout, stderr } = await execAsync(command);

    return NextResponse.json({
      success: true,
      output: stdout,
      message: 'Implementation started',
    });
  } catch (error: any) {
    console.error('Execution error:', error);
    return NextResponse.json(
      {
        error: error.message,
        stderr: error.stderr,
      },
      { status: 500 }
    );
  }
}
```

### 4. PRD Preview Modal

```typescript
// components/planning/PrdPreviewModal.tsx
'use client';

import { useState } from 'react';
import { AnimeButton } from '../theme/AnimeButton';
import { PrdReviewCard } from './PrdReviewCard';

interface PRD {
  id: string;
  filename: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  estimatedIterations: number;
}

interface PrdPreviewModalProps {
  isOpen: boolean;
  plan: {
    title: string;
    summary: string;
    prds: PRD[];
    estimatedComplexity: string;
    suggestedOrder: number[];
  };
  onClose: () => void;
  onExecute: () => void;
  onEdit: (prdId: string, newContent: string) => void;
}

export function PrdPreviewModal({
  isOpen,
  plan,
  onClose,
  onExecute,
  onEdit,
}: PrdPreviewModalProps) {
  const [selectedPrdIndex, setSelectedPrdIndex] = useState(0);
  const [executing, setExecuting] = useState(false);

  if (!isOpen) return null;

  const handleExecute = async () => {
    setExecuting(true);
    await onExecute();
  };

  const selectedPrd = plan.prds[selectedPrdIndex];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{plan.title}</h2>
              <p className="text-white/90">{plan.summary}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Plan stats */}
          <div className="flex gap-4 mt-4 text-sm text-white/90">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{plan.prds.length}</span>
              <span>PRD{plan.prds.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{plan.estimatedComplexity}</span>
              <span>complexity</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                ~{plan.prds.reduce((sum, prd) => sum + prd.estimatedIterations, 0)}
              </span>
              <span>iterations</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* PRD List */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Generated PRDs
            </h3>
            <div className="space-y-2">
              {plan.prds.map((prd, index) => (
                <button
                  key={prd.id}
                  onClick={() => setSelectedPrdIndex(index)}
                  className={`
                    w-full text-left p-3 rounded-lg transition-colors
                    ${
                      selectedPrdIndex === index
                        ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{index + 1}</span>
                    <span
                      className={`
                      px-2 py-0.5 rounded text-xs font-medium
                      ${prd.priority === 'high' ? 'bg-red-100 text-red-700' : ''}
                      ${prd.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${prd.priority === 'low' ? 'bg-green-100 text-green-700' : ''}
                    `}
                    >
                      {prd.priority}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    {prd.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ~{prd.estimatedIterations} iterations
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* PRD Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedPrd && (
              <PrdReviewCard prd={selectedPrd} onEdit={(content) => onEdit(selectedPrd.id, content)} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Review the generated PRDs and start implementation when ready
          </div>
          <div className="flex gap-3">
            <AnimeButton onClick={onClose} variant="ghost">
              Cancel
            </AnimeButton>
            <AnimeButton
              onClick={handleExecute}
              variant="primary"
              disabled={executing}
              loading={executing}
              icon="🚀"
            >
              {executing ? 'Starting...' : 'Start Implementation'}
            </AnimeButton>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5. Enhanced Planning Chat

```typescript
// Update PlanningChat.tsx to include "Generate Plan" button

const handleGeneratePlan = useCallback(async () => {
  setIsGeneratingPlan(true);
  try {
    const response = await fetch('/api/planning/generate-prds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instancePath,
        conversationId,
        messages,
        userRequest: 'Generate PRDs based on our conversation',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate plan');
    }

    const data = await response.json();
    setGeneratedPlan(data.plan);
    setShowPrdPreview(true);
    play('success');
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Failed to generate plan');
    play('error');
  } finally {
    setIsGeneratingPlan(false);
  }
}, [instancePath, conversationId, messages, play]);

const handleExecutePlan = useCallback(async () => {
  if (!generatedPlan) return;

  try {
    const response = await fetch('/api/planning/execute-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instancePath,
        workerModel: 'opus',
        managerModel: 'opus',
        maxIterations: 999999,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start execution');
    }

    play('victory');
    onStartWork?.();
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Failed to execute plan');
    play('error');
  }
}, [generatedPlan, instancePath, onStartWork, play]);
```

## Acceptance Criteria

1. [ ] Planning chat works correctly (currently broken - shows Claude responses)
2. [ ] "Generate Plan" button appears after sufficient conversation
3. [ ] Claude analyzes conversation and creates structured plan
4. [ ] Plan includes multiple PRDs if project is complex
5. [ ] PRDs follow standard format and structure
6. [ ] PRD preview modal shows all generated PRDs
7. [ ] User can review and edit PRDs before execution
8. [ ] "Start Implementation" triggers orchestrator
9. [ ] Dashboard shows real-time progress of implementation
10. [ ] PRD dependencies are respected in execution order
11. [ ] User receives notifications on completion
12. [ ] Execution logs are visible in dashboard
13. [ ] Can cancel execution mid-flight
14. [ ] Can iterate on PRDs if first version needs changes
15. [ ] Works with all model types (Opus, Sonnet, Haiku)

## Out of Scope (v1)

- Multi-user collaboration
- PRD versioning and history
- Automatic rollback on failures
- Cost estimation before execution
- Integration with external project management tools
- Email notifications
- Scheduled execution

## Implementation Phases

### Phase 1: Fix Current Issues (2 iterations)
- Debug and fix planning chat message display
- Add console logging for debugging
- Fix model name if needed
- Ensure streaming works correctly

### Phase 2: PRD Generation (5 iterations)
- Build generate-prds API endpoint
- Implement Claude-powered PRD extraction
- Create plan metadata structure
- Save PRDs to files
- Handle multiple PRDs

### Phase 3: UI Components (5 iterations)
- PrdPreviewModal component
- PrdReviewCard component
- Plan summary display
- Edit PRD interface
- Priority and dependency visualization

### Phase 4: Execution (4 iterations)
- Execute-plan API endpoint
- Start orchestrator from UI
- Progress tracking integration
- Real-time log streaming
- Error handling

### Phase 5: Polish (3 iterations)
- Animations and transitions
- Sound effects for key events
- Loading states
- Error messages
- Documentation

## Technical Notes

### PRD Quality
Use Claude Opus for PRD generation to ensure high quality, detailed requirements documents.

### Dependency Resolution
Suggested order array indicates which PRDs should be built first based on dependencies.

### Error Recovery
If execution fails, allow user to:
1. Review error logs
2. Edit problematic PRD
3. Restart execution

### Performance
- Limit conversation history to last 50 messages when generating PRDs
- Use streaming for PRD generation to show progress
- Cache generated plans for 1 hour

## Priority

**Critical** - Fixes broken planning mode and adds killer feature for automated execution.

## Estimated Complexity

**High** - Involves Claude integration, multi-PRD generation, complex UI, and execution orchestration.

## Success Metrics

- Planning conversations successfully generate accurate PRDs
- 90%+ of generated PRDs can execute without edits
- Users report faster time-to-implementation
- Reduced back-and-forth in planning phase
- Higher user satisfaction with planning mode
